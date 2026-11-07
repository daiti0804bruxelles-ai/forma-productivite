import assert from 'node:assert/strict'
import { build } from 'esbuild'

// Teste la fusion entre appareils et le fuseau horaire de référence (vrai code TypeScript).
const load = async entry => {
  const bundle = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
  return import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))
}
const { merge3, deepEqual } = await load('src/syncMerge.ts')
const { dateKeyInZone, isValidTimeZone } = await load('src/timeZone.ts')

const base = {
  habits: [{ id: 'h1', title: 'Méditer' }, { id: 'h2', title: 'Lire' }],
  tasks: [{ id: 't1', title: 'Appeler', done: false }, { id: 't2', title: 'Courses', done: false }],
  completedHabits: { '2026-11-07': ['h1'] },
  activityDays: ['2026-11-06'],
  xpLedger: { events: [{ key: 'habit:h1:2026-11-07', amountPerSkill: 10 }] },
  appearance: { theme: 'sombre' },
}

// Téléphone : coche h2, termine t1, ajoute une tâche. Ordinateur : ajoute une habitude, supprime t2, change le thème.
const phone = structuredClone(base)
phone.completedHabits['2026-11-07'].push('h2')
phone.tasks[0].done = true
phone.tasks.push({ id: 't3', title: 'Nouvelle tâche', done: false })
phone.xpLedger.events.push({ key: 'habit:h2:2026-11-07', amountPerSkill: 10 }, { key: 'task:t1', amountPerSkill: 10 })
phone.activityDays.push('2026-11-07')
const desktop = structuredClone(base)
desktop.habits.push({ id: 'h3', title: 'Sport' })
desktop.tasks = desktop.tasks.filter(t => t.id !== 't2')
desktop.appearance.theme = 'rose'
desktop.xpLedger.events.push({ key: 'habit:h3:2026-11-07', amountPerSkill: 5 })
desktop.activityDays.push('2026-11-07')

const merged = merge3(base, phone, desktop)
assert.deepEqual(merged.habits.map(h => h.id), ['h1', 'h2', 'h3'], 'les ajouts des deux appareils sont gardés')
assert.deepEqual(merged.tasks.map(t => t.id), ['t1', 't3'], 'la suppression de t2 est appliquée, t3 est gardée')
assert.equal(merged.tasks[0].done, true, 'la validation sur le téléphone est gardée')
assert.deepEqual(merged.completedHabits['2026-11-07'], ['h1', 'h2'])
assert.deepEqual(merged.activityDays, ['2026-11-06', '2026-11-07'], 'pas de doublon de jour')
assert.equal(merged.appearance.theme, 'rose', 'un réglage changé d’un seul côté est gardé')
assert.deepEqual(merged.xpLedger.events.map(e => e.key).sort(),
  ['habit:h1:2026-11-07', 'habit:h2:2026-11-07', 'habit:h3:2026-11-07', 'task:t1'], 'aucune XP perdue ni comptée deux fois')

// Symétrie : même résultat de contenu dans l'autre sens.
const reverse = merge3(base, desktop, phone)
assert.deepEqual(reverse.habits.map(h => h.id).sort(), ['h1', 'h2', 'h3'])
assert.deepEqual(reverse.tasks.map(t => t.id).sort(), ['t1', 't3'])

// Supprimé d'un côté mais modifié de l'autre : on garde l'élément (pas de perte de travail).
const edited = structuredClone(base); edited.tasks[1].title = 'Courses du samedi'
const removed = structuredClone(base); removed.tasks = removed.tasks.filter(t => t.id !== 't2')
assert.deepEqual(merge3(base, removed, edited).tasks.map(t => t.title), ['Appeler', 'Courses du samedi'])

// Habitude décochée d'un côté : retirée de la liste.
const unchecked = structuredClone(base); unchecked.completedHabits['2026-11-07'] = []
assert.deepEqual(merge3(base, unchecked, desktop).completedHabits['2026-11-07'], [])

// Champ supprimé d'un seul côté.
const withDue = { ...base, tasks: [{ id: 't1', title: 'A', dueDate: '2026-11-05' }] }
const noDue = { ...base, tasks: [{ id: 't1', title: 'A' }] }
assert.equal('dueDate' in merge3(withDue, noDue, withDue).tasks[0], false)

// Conflit sur la même valeur : cet appareil l'emporte. Rien n'a changé : identique.
const a = structuredClone(base); a.habits[0].title = 'Méditer 10 min'
const b = structuredClone(base); b.habits[0].title = 'Méditer 20 min'
assert.equal(merge3(base, a, b).habits[0].title, 'Méditer 10 min')
assert.equal(deepEqual(merge3(base, base, base), base), true)
assert.equal(deepEqual({ a: 1, b: undefined }, { a: 1 }), true)

// Fuseau horaire de référence : même instant, jour différent selon le fuseau.
const instant = new Date('2026-11-07T21:30:00Z') // 05:30 le 8 à Kuala Lumpur, 01:30 le 8 à Dubaï, 22:30 le 7 à Bruxelles
assert.equal(dateKeyInZone(instant, 'Asia/Kuala_Lumpur'), '2026-11-08')
assert.equal(dateKeyInZone(instant, 'Asia/Dubai'), '2026-11-08')
assert.equal(dateKeyInZone(instant, 'Europe/Brussels'), '2026-11-07')
assert.equal(isValidTimeZone('Asia/Bangkok'), true)
assert.equal(isValidTimeZone('Pas/Un_Fuseau'), false)
assert.equal(isValidTimeZone(42), false)

console.log('Tests de synchronisation réussis : fusion entre appareils, suppressions, XP sans doublon, fuseaux horaires.')
