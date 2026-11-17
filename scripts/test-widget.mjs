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
  memos: [{ id: 'm1', title: 'Payer le loyer', due: '2026-11-16T09:00' }, { id: 'm2', title: 'Visa', due: '2026-12-01T10:00' }, { id: 'm3', title: 'Fait', due: '2026-11-01T10:00', doneAt: '2026-11-01T11:00' }, { id: 'n1', title: 'Payer Doola', when: 'au prochain withdraw' }],
  goals: [{ id: 'g1', title: 'CA', mode: 'add', unit: '$', start: 0, target: 10000, monthly: true, history: [{ at: '2026-10-20T10:00:00Z', value: 9000 }, { at: '2026-11-03T10:00:00Z', value: 2500 }] }], focusGoalId: 'g1',
}
const s = summarize(data, day, '15:00')
assert.equal(s.streak, 5, '12 → 16 avec le 13 protégé')
assert.deepEqual([s.done, s.total], [2, 2], 'course et muscu en repos : ne comptent pas')
assert.deepEqual(s.memo, { title: 'Payer le loyer', when: '2026-11-16T09:00', overdue: true, more: 0 })
assert.deepEqual(s.pending, { count: 1, first: 'Payer Doola', when: 'au prochain withdraw' })
assert.deepEqual([s.goal.current, s.goal.progress, s.goal.monthly], [2500, 0.25, true])
assert.deepEqual(s.remaining, [], 'tout fait ou en repos')
assert.deepEqual(s.memos.map(m => [m.title, m.overdue]), [['Payer le loyer', true], ['Payer Doola', false], ['Visa', false]])
const w = summarize({ ...data, habits: [{ id: 'a', title: 'Méditer', period: 'Soir' }, { id: 'b', title: 'Eau', period: 'Matin' }], restPeriods: [], events: [{ id: 'e', title: 'Muscu', date: day, time: '18:00', skillIds: ['strength'] }],
  goals: [{ id: 'p', title: 'Perdre 12 kg', mode: 'value', unit: 'kg', start: 96, target: 84, history: [{ at: '2026-11-09', value: 96 }, { at: '2026-11-12', value: 93 }] }], focusGoalId: 'p' }, day, '15:00')
assert.deepEqual(w.remaining, [{ title: 'Muscu', time: '18:00' }, { title: 'Eau' }, { title: 'Méditer' }])
assert.deepEqual([w.goal.mode, w.goal.current, w.goal.start, w.goal.progress], ['value', 93, 96, 0.25])
// Objectif atteint (même « Sur Aujourd'hui ») : remplacé par les objectifs en cours.
const g2 = summarize({ goals: [
  { id: 'done', title: 'Perdre 12 kg', mode: 'value', unit: 'kg', start: 96, target: 84, history: [{ at: '2026-11-10', value: 18 }], completedOn: '2026-11-10' },
  { id: 'ca', title: 'CA', mode: 'add', unit: '$', start: 0, target: 30000, monthly: true, history: [{ at: '2026-11-03T10:00:00Z', value: 5000 }] },
  { id: 'livres', title: 'Lire 12 livres', mode: 'add', start: 0, target: 12, history: [{ at: '2026-11-03', value: 3 }] } ], focusGoalId: 'done' }, day, '10:00')
assert.deepEqual(g2.goals.map(g => g.title), ['CA', 'Lire 12 livres']); assert.equal(g2.goal.title, 'CA')
assert.equal(summarize({}, day, '10:00').total, 0)
console.log('Tests du widget réussis : série, progression, rappel, objectif.')
