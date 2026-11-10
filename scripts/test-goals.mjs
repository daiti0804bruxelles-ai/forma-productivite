import assert from 'node:assert/strict'
import { build } from 'esbuild'

const load = async entry => {
  const bundle = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
  return import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))
}
const { parseGoal } = await load('src/goalParse.ts')
const M = await load('src/goalModel.ts')
const today = '2026-11-10'

// Une phrase → mesure ou total, cible, échéance, mensuel.
let g = parseGoal('Perdre 12 kg d’ici février', today)
assert.deepEqual([g.mode, g.delta, g.unit, g.deadline, g.title], ['value', -12, 'kg', '2027-02-28', 'Perdre 12 kg'])
g = parseGoal('10 000 $ de CA par mois', today)
assert.deepEqual([g.mode, g.target, g.unit, g.monthly, g.deadline, g.title], ['add', 10000, '$', true, undefined, '10 000 $ de CA'])
g = parseGoal('CA 30k€ d’ici mars', today)
assert.deepEqual([g.mode, g.target, g.monthly, g.deadline], ['add', 30000, undefined, '2027-03-31'])
g = parseGoal('Lire 12 livres en 2027', today)
assert.deepEqual([g.mode, g.target, g.unit, g.deadline], ['add', 12, 'livres', '2027-12-31'])
g = parseGoal('Passer de 92 à 80 kg', today)
assert.deepEqual([g.mode, g.start, g.target, g.unit], ['value', 92, 80, 'kg'])
g = parseGoal('Créer la société', today); assert.equal(g.mode, null, 'sans chiffre : pas un objectif chiffré')

// Mesure (poids) : progression et rythme.
const weight = { id: 'w', title: 'Poids', mode: 'value', createdOn: '2026-11-01', deadline: '2027-02-28', start: 92, target: 80, unit: 'kg', history: [{ at: '2026-11-01', value: 92 }, { at: '2026-11-08', value: 89 }] }
assert.equal(M.goalCurrent(weight, today), 89)
assert.equal(M.goalProgress(weight, today), 0.25)
let pace = M.goalPace(weight, today)
assert.equal(pace.status, 'ahead'); assert.equal(pace.word, 'En avance'); assert.match(pace.detail, /^−0,6 kg par semaine/)
assert.equal(M.goalValueLabel(weight, today), '89 kg → 80 kg')

// CA mensuel : repart à zéro chaque mois, mois atteints.
const ca = { id: 'c', title: 'CA', mode: 'add', monthly: true, createdOn: '2026-09-01', start: 0, target: 10000, unit: '$', history: [
  { at: '2026-09-10T10:00:00', value: 6000 }, { at: '2026-09-25T10:00:00', value: 5000 },
  { at: '2026-10-12T10:00:00', value: 7000 },
  { at: '2026-11-03T10:00:00', value: 2500 }, { at: '2026-11-09T10:00:00', value: 500 } ] }
assert.equal(M.goalCurrent(ca, today), 3000, 'seulement novembre')
assert.deepEqual(M.monthlyWins(ca), ['2026-09'])
assert.equal(M.isComplete({ ...ca, history: [...ca.history, { at: '2026-11-10T09:00:00', value: 8000 }] }, today), false, 'un objectif mensuel n’est jamais terminé')
assert.deepEqual(M.monthlyResults(ca, today, 3).map(r => [r.month, r.reached]), [['2026-09', true], ['2026-10', false], ['2026-11', false]])
pace = M.goalPace(ca, today); assert.equal(pace.status, 'late', '3 000 / 10 000 au 10 du mois : légèrement sous le rythme'); assert.equal(pace.detail.replace(/\s/g, ' '), 'Encore 7 000 $ en 21 jours')

// Total à date.
const books = { id: 'b', title: 'Livres', mode: 'add', createdOn: '2026-01-01', deadline: '2026-12-31', start: 0, target: 12, unit: 'livres', history: [{ at: '2026-05-01', value: 4 }] }
assert.equal(M.goalPace(books, today).status, 'late')
assert.equal(M.withCompletion({ ...books, history: [{ at: today, value: 12 }] }, today).completedOn, today)

// Migration : v1 et v2 convertis, projets/caps retirés, « Perdre 12KG » retiré.
const migrated = M.migrateGoals([
  { id: 'a', title: 'Perdre 12KG', unit: 'kg', target: 12, current: 0, mode: 'measured', start: 0 },
  { id: 'b', title: 'Ventes', unit: 'ventes', target: 50, current: 7, mode: 'cumulative' },
  { id: 'c', title: 'Perdre du poids', kind: 'measure', createdOn: '2026-11-09', start: 92, target: 80, current: 91, unit: 'kg', history: [{ at: '2026-11-09T10:00:00Z', value: 92 }, { at: '2026-11-10T10:00:00Z', value: 91 }] },
  { id: 'd', title: 'Société', kind: 'project', createdOn: '2026-11-09', steps: [] },
  { id: 'e', title: 'Perdre 12 kg', kind: 'measure', createdOn: '2026-11-09', start: 92, target: 80, current: 92, unit: 'kg', history: [] },
], today)
assert.deepEqual(migrated.map(x => [x.id, x.mode]), [['b', 'add'], ['c', 'value'], ['e', 'value']], '« Perdre 12 kg » recréé correctement est gardé')
assert.equal(M.goalCurrent(migrated[0], today), 7); assert.equal(M.goalCurrent(migrated[1], today), 91)
assert.ok(migrated.every(M.isValidGoal))

console.log('Tests des objectifs réussis : phrase, mesure, CA mensuel, rythme, migration.')
