import assert from 'node:assert/strict'
import { build } from 'esbuild'
const load = async f => { const b = await build({ entryPoints: [f], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' }); return import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64')) }
const { summarize } = await load('supabase/functions/widget/summary.ts')
const day = '2026-11-16' // lundi
const data = {
  habits: [{ id: 'h1', title: 'Lire', skillIds: ['reading'] }, { id: 'h2', title: 'Courir', skillIds: ['cardio'] }, { id: 'h3', title: 'Yoga', days: [3] }],
  tasks: [{ id: 't1', title: 'Comptable', date: day, done: true }, { id: 't2', title: 'Hier', date: '2026-11-15', done: false }],
  events: [{ id: 'e1', title: 'Muscu', date: '2026-11-02', repeatDays: [1], skillIds: ['strength'] }],
  completedHabits: { [day]: ['h1'], '2026-11-15': ['h1'], '2026-11-14': ['h1'] }, activityDays: ['2026-11-12'], frozenDays: ['2026-11-13'],
  restPeriods: [{ from: '2026-11-10', skillIds: ['strength', 'cardio'] }],
  memos: [{ id: 'm1', title: 'Payer le loyer', due: '2026-11-16T09:00' }, { id: 'm2', title: 'Visa', due: '2026-12-01T10:00' }, { id: 'm3', title: 'Fait', due: '2026-11-01T10:00', doneAt: '2026-11-01T11:00' }],
  goals: [{ id: 'g1', title: 'CA', mode: 'add', unit: '$', start: 0, target: 10000, monthly: true, history: [{ at: '2026-10-20T10:00:00Z', value: 9000 }, { at: '2026-11-03T10:00:00Z', value: 2500 }] }], focusGoalId: 'g1',
}
const s = summarize(data, day, '15:00')
assert.equal(s.streak, 5, '12 → 16 avec le 13 protégé')
assert.deepEqual([s.done, s.total], [2, 2], 'course et muscu en repos : ne comptent pas')
assert.deepEqual(s.memo, { title: 'Payer le loyer', when: '2026-11-16T09:00', overdue: true, more: 0 })
assert.deepEqual([s.goal.current, s.goal.progress, s.goal.monthly], [2500, 0.25, true])
assert.equal(summarize({}, day, '10:00').total, 0)
console.log('Tests du widget réussis : série, progression, rappel, objectif.')
