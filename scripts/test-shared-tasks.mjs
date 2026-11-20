import assert from 'node:assert/strict'
import { build } from 'esbuild'
const b = await build({ entryPoints: ['src/sharedTaskRules.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
const { applySharedTasks } = await import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'))
const ctx = { today: '2026-11-20', xpMult: 1, goldMult: 1 }
const base = { title: 'Payer le loyer', difficulty: 'moyen', skill_ids: ['finance'], created_at: '2026-11-15T10:00:00' }
// Faite par l'autre : chacun reçoit XP + or, une seule fois.
let r = applySharedTasks([{ ...base, id: 'a', due_date: '2026-11-20', done_at: '2026-11-20T09:00:00' }], undefined, undefined, ctx)
assert.equal(r.goldLedger.events[0].amount, 2); assert.equal(r.xpLedger.events[0].amountPerSkill, 10)
const again = applySharedTasks([{ ...base, id: 'a', due_date: '2026-11-20', done_at: '2026-11-20T09:00:00' }], r.xpLedger, r.goldLedger, ctx)
assert.equal(again.goldLedger.events.length, 1)
// En retard depuis le 17, pas faite : 17, 18, 19 pénalisés (pas aujourd'hui), le 18 protégé par un joker.
r = applySharedTasks([{ ...base, id: 'b', due_date: '2026-11-17', done_at: null }], undefined, undefined, { ...ctx, protectedDays: ['2026-11-18'] })
assert.deepEqual(r.xpLedger.events.map(e => e.key), ['late-shared:b:2026-11-17', 'late-shared:b:2026-11-19'])
// Faite le 19 avec échéance le 17 : retard le 17 et le 18.
r = applySharedTasks([{ ...base, id: 'c', due_date: '2026-11-17', done_at: '2026-11-19T12:00:00' }], undefined, undefined, ctx)
assert.deepEqual(r.xpLedger.events.filter(e => e.source === 'penalty').map(e => e.key), ['late-shared:c:2026-11-17', 'late-shared:c:2026-11-18'])
console.log('Tests des tâches à deux réussis : récompense pour chacun, retard, joker.')
