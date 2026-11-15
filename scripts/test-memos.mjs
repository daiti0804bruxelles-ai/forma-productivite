import assert from 'node:assert/strict'
import { build } from 'esbuild'
const bundle = await build({ entryPoints: ['src/memos.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
const M = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))
const now = '2026-11-15T15:30'
assert.equal(M.nextDue('2026-01-31T09:00', 'month'), '2026-02-28T09:00', '31 janvier → 28 février')
assert.equal(M.nextDue('2026-11-15T09:00', 'week'), '2026-11-22T09:00')
assert.equal(M.nextDue('2024-02-29T09:00', 'year'), '2025-02-28T09:00')
const rent = { id: 'r', title: 'Payer le loyer', due: '2026-10-01T09:00', repeat: 'month', createdOn: '2026-10-01' }
assert.equal(M.isDue(rent, now), true)
assert.equal(M.complete(rent, now).due, '2026-12-01T09:00', 'jamais dans le passé')
const once = { id: 'o', title: 'Appeler la banque', due: '2026-11-15T15:00', createdOn: '2026-11-15' }
assert.equal(M.complete(once, now).doneAt, now)
const later = { ...once, snoozedUntil: M.SNOOZES[0].at(now) }
assert.equal(later.snoozedUntil, '2026-11-15T16:30'); assert.equal(M.isDue(later, now), false)
assert.equal(M.SNOOZES[1].at('2026-11-15T21:00'), null, 'plus de « ce soir » après 20 h')
assert.equal(M.whenLabel('2026-11-16T09:00', now), 'Demain 09:00')
assert.ok(M.isMemo(rent) && !M.isMemo({ ...rent, due: '2026-10-01' }))
console.log('Tests des rappels importants réussis : répétition, report, fait, libellés.')
