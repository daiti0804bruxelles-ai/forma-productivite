import assert from 'node:assert/strict'
import { build } from 'esbuild'
const b = await build({ entryPoints: ['src/xpHistory.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
const H = await import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'))
const today = '2026-11-18' // mercredi
assert.deepEqual(H.buckets(today, 'day', 3), ['2026-11-16', '2026-11-17', '2026-11-18'])
assert.deepEqual(H.buckets(today, 'week', 2), ['2026-11-09', '2026-11-16'], 'semaines du lundi')
const ledger = { events: [
  { key: 'a', source: 'habit', at: '2026-11-18T03:00:00', skillIds: ['strength', 'cardio'], amountPerSkill: 10 },
  { key: 'b', source: 'penalty', at: '2026-11-17T23:00:00', skillIds: ['reading'], amountPerSkill: -5 },
  { key: 'c', source: 'task', at: '2026-11-10T12:00:00', skillIds: ['finance'], amountPerSkill: 20 },
  { key: 'd', source: 'task', at: '2025-01-01T12:00:00', skillIds: ['finance'], amountPerSkill: 99 },
] }
const d = H.domainSeries(ledger, today, 'day', 3)
assert.deepEqual(d.domains.appearance, [0, 0, 20]); assert.deepEqual(d.domains.knowledge, [0, -5, 0])
const w = H.domainSeries(ledger, today, 'week', 2)
assert.deepEqual(w.domains.ambition, [20, 0]); assert.deepEqual(w.domains.appearance, [0, 20])
assert.deepEqual(H.rolling([1, 2, 3, 4], 2, 3), [3, 5, 7])
console.log('Tests de l’évolution XP réussis : jours, semaines, domaines, pénalités.')
