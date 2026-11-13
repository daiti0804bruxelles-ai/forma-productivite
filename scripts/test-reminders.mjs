import assert from 'node:assert/strict'
import { build } from 'esbuild'

const bundle = await build({ entryPoints: ['supabase/functions/notifications/reminders.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
const { dueReminders, localNow } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))

const day = '2026-11-09' // lundi
const data = {
  habits: [{ id: 'h1', title: 'Méditer', skillIds: ['mental', 'consistency'] }, { id: 'h2', title: 'Yoga', days: [3], skillIds: ['mental'] }],
  tasks: [{ id: 't1', title: 'Appeler le comptable', date: day, done: false, skillIds: ['finance'] }, { id: 't2', title: 'Pompes', date: day, done: false, recurring: true, skillIds: ['strength'] }],
  events: [{ id: 'e1', title: 'Musculation', date: '2026-11-02', time: '18:00', repeatDays: [1, 3, 5], skillIds: ['strength', 'cardio'] }],
  completedHabits: {}, completedEvents: {},
}
const keys = (d, t) => dueReminders(d, day, t).map(r => r.dedupeKey)

assert.deepEqual(keys(data, '17:40'), [], '20 min avant : trop tôt')
let r = dueReminders(data, day, '17:45')
assert.deepEqual(r.map(x => x.dedupeKey), ['event:e1:2026-11-09']); assert.equal(r[0].title, 'Dans 15 min : Musculation')
assert.deepEqual(keys(data, '18:00'), [], 'à l’heure pile : plus de rappel')
assert.deepEqual(keys(data, '07:00'), [], 'avant 8h : pas de résumé')
r = dueReminders(data, day, '08:05')
assert.equal(r[0].dedupeKey, 'morning:2026-11-09'); assert.equal(r[0].body, '2 tâches · 1 habitude — Musculation à 18:00', 'yoga (mercredi) exclu')
r = dueReminders(data, day, '21:00')
assert.equal(r[0].title, 'Il te reste 4 éléments aujourd’hui')
assert.equal(r[0].body, 'Méditer · Musculation · Appeler le comptable… — sinon −26,5 XP')
// Tout fait : pas de rappel du soir.
const done = { ...data, completedHabits: { [day]: ['h1'] }, completedEvents: { [day]: ['e1'] }, tasks: data.tasks.map(t => ({ ...t, done: true })) }
assert.deepEqual(keys(done, '21:30'), [])
// Mode repos (sport) + méditation excusée : seulement le comptable, et pas de rappel avant la musculation.
const sick = { ...data, restPeriods: [{ from: '2026-11-08', skillIds: ['strength', 'cardio'] }], excused: { [day]: ['h1'] } }
r = dueReminders(sick, day, '21:00'); assert.equal(r[0].title, 'Il te reste 1 élément aujourd’hui'); assert.equal(r[0].body, 'Appeler le comptable — sinon −5 XP')
assert.deepEqual(keys(sick, '17:50'), [], 'pas de rappel pour une activité en repos')
// Préférences : tout coupé.
assert.deepEqual(keys({ ...data, notifications: { beforeEvent: false, evening: false, morning: false } }, '21:00'), [])
// Heure locale selon le fuseau.
assert.deepEqual(localNow(new Date('2026-11-08T23:30:00Z'), 'Asia/Kuala_Lumpur'), { day: '2026-11-09', time: '07:30' })
// Objectifs : rappel hebdo du lundi (9h) et note de fin de mois des caps de vie.
const withGoals = { ...done, goals: [
  { id: 'g1', title: 'Poids', kind: 'measure', reminder: { every: 'week', weekday: 1 } },
  { id: 'g2', title: 'Revenus', kind: 'count', reminder: { every: 'month', day: 9 } },
  { id: 'g3', title: 'Lire', kind: 'count', reminder: { every: 'week', weekday: 3 } },
  { id: 'g4', title: 'Discipline', kind: 'vision' },
  { id: 'g5', title: 'Ancien', kind: 'count', completedOn: '2026-11-01', reminder: { every: 'week', weekday: 1 } },
] }
assert.deepEqual(dueReminders(withGoals, day, '09:05').filter(r => r.dedupeKey.startsWith('goal:')).map(r => r.dedupeKey), ['goal:g1:2026-11-09', 'goal:g2:2026-11-09'])
assert.deepEqual(dueReminders(withGoals, '2026-11-30', '20:10').filter(r => r.dedupeKey.startsWith('vision:')).map(r => r.title), ['Ta note du mois : Discipline'])
assert.deepEqual(dueReminders({ ...withGoals, goals: [{ ...withGoals.goals[3], ratings: { '2026-11': 7 } }] }, '2026-11-30', '20:10').filter(r => r.dedupeKey.startsWith('vision:')), [], 'déjà noté')
console.log('Tests des rappels réussis : activité −15 min, soir 21h, matin, préférences, fuseau.')
