import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { loadUserSnapshot, saveUserSnapshot } from '../src/userDataStore.ts'
import { SnapshotWriter, SaveConflictError } from '../src/snapshotWriter.ts'
import type { AppData } from '../src/appData.ts'

const fixture = (): AppData => ({ habits: [], tasks: [], events: [], completedHabits: {} })
type Row = { data: AppData; updated_at: string | null }
// Faux serveur HTTP PostgREST : aucun accès réseau ni donnée de production.
function server() {
  const rows = new Map<string, Row>()
  const writes: { user: string; method: string }[] = []
  function client(account: string) {
    return createClient('https://example.supabase.co', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: async (input, init) => {
        const url = new URL(String(input))
        const method = init?.method ?? 'GET'
        const body = init?.body ? JSON.parse(String(init.body)) : {}
        const user = method === 'POST' ? body.user_id : url.searchParams.get('user_id')?.replace(/^eq\./, '')
        if (!user || user !== account) return new Response(JSON.stringify([]), { status: 200 })
        const row = rows.get(user)
        if (method === 'GET') return new Response(JSON.stringify(row ? [row] : []), { status: 200 })
        writes.push({ user, method })
        if (method === 'POST' && row) return new Response(JSON.stringify({ code: '23505', message: 'duplicate' }), { status: 409 })
        if (method === 'PATCH') {
          const version = url.searchParams.get('updated_at')
          if (!row || (version === 'is.null' ? row.updated_at !== null : version !== 'eq.' + row.updated_at)) return new Response('[]', { status: 200 })
        }
        rows.set(user, { data: body.data, updated_at: body.updated_at })
        return new Response(JSON.stringify([{ updated_at: body.updated_at }]), { status: 200 })
      } },
    })
  }
  return { rows, writes, client }
}

test('lecture invalide refusée sans écriture ni remplacement par des données de démonstration', async () => {
  const db = server()
  db.rows.set('a', { data: { ...fixture(), xpLedger: { events: [null] } } as never, updated_at: null })
  await assert.rejects(loadUserSnapshot(db.client('a'), 'a'), /invalides/)
  assert.equal(db.writes.length, 0)
})
test('deux appareils : le second détecte le conflit et ne remplace pas le premier', async () => {
  const db = server()
  db.rows.set('a', { data: fixture(), updated_at: '2026-01-01T00:00:00.000Z' })
  const client = db.client('a')
  const first = await loadUserSnapshot(client, 'a')
  const second = await loadUserSnapshot(client, 'a')
  const one = { ...fixture(), completedHabits: { '2026-11-01': ['first'] } }
  await saveUserSnapshot(client, 'a', one, first.revision)
  await assert.rejects(saveUserSnapshot(client, 'a', fixture(), second.revision), SaveConflictError)
  assert.deepEqual(db.rows.get('a')?.data, one)
})
test('création concurrente : insert refuse de remplacer un compte créé entre-temps', async () => {
  const db = server()
  const client = db.client('a')
  const missing = await loadUserSnapshot(client, 'a')
  await saveUserSnapshot(client, 'a', fixture(), missing.revision)
  await assert.rejects(saveUserSnapshot(client, 'a', fixture(), missing.revision), SaveConflictError)
})
test('versions initialement nulles et sauvegardes successives sont prises en charge', async () => {
  const db = server()
  db.rows.set('a', { data: fixture(), updated_at: null })
  const client = db.client('a')
  const saved = await loadUserSnapshot(client, 'a')
  const writer = new SnapshotWriter(saved.revision, (data: AppData, revision) => saveUserSnapshot(client, 'a', data, revision))
  await Promise.all([writer.save(fixture()), writer.save({ ...fixture(), completedHabits: { '2026-11-01': ['last'] } })])
  assert.deepEqual(db.rows.get('a')?.data.completedHabits, { '2026-11-01': ['last'] })
})
test('la file s’arrête après conflit au lieu de retenter un écrasement', async () => {
  let calls = 0
  const writer = new SnapshotWriter({ exists: false, updatedAt: null }, async () => { calls++; throw new SaveConflictError() })
  const results = await Promise.allSettled([writer.save(fixture()), writer.save(fixture())])
  assert.deepEqual(results.map(result => result.status), ['rejected', 'rejected'])
  assert.equal(calls, 1)
})
test('sauvegardes filtrées par utilisateur ; aucun mélange des comptes', async () => {
  const db = server()
  for (const user of ['a', 'b']) {
    const client = db.client(user)
    const loaded = await loadUserSnapshot(client, user)
    await saveUserSnapshot(client, user, { ...fixture(), completedHabits: { '2026-11-01': [user] } }, loaded.revision)
  }
  assert.deepEqual(db.rows.get('a')?.data.completedHabits, { '2026-11-01': ['a'] })
  assert.deepEqual(db.rows.get('b')?.data.completedHabits, { '2026-11-01': ['b'] })
  assert.deepEqual(db.writes.map(write => write.user), ['a', 'b'])
})
