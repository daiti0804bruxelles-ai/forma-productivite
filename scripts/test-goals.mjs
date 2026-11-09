import assert from 'node:assert/strict'
import { build } from 'esbuild'

const load = async entry => {
  const bundle = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
  return import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))
}
const { parseGoal } = await load('src/goalParse.ts')
const M = await load('src/goalModel.ts')
const today = '2026-11-09'

// Une phrase → type, cible, échéance.
let g = parseGoal('Perdre 12 kg d’ici février', today)
assert.deepEqual([g.kind, g.delta, g.unit, g.deadline, g.title], ['measure', -12, 'kg', '2027-02-28', 'Perdre 12 kg'])
g = parseGoal("Perdre 12 kg d'ici février", today); assert.equal(g.deadline, '2027-02-28')
g = parseGoal('Lire 12 livres en 2027', today)
assert.deepEqual([g.kind, g.target, g.unit, g.deadline, g.title], ['count', 12, 'livres', '2027-12-31', 'Lire 12 livres'])
g = parseGoal('10 000 $ ce mois', today)
assert.deepEqual([g.kind, g.target, g.unit, g.deadline], ['count', 10000, '$', '2026-11-30'])
g = parseGoal('Atteindre 10k€ de revenus ce trimestre', today)
assert.deepEqual([g.kind, g.target, g.deadline], ['count', 10000, '2026-12-31'])
g = parseGoal('Passer de 92 à 80 kg', today)
assert.deepEqual([g.kind, g.start, g.target, g.unit], ['measure', 92, 80, 'kg'])
g = parseGoal('Créer la société à Dubaï avant mars', today)
assert.deepEqual([g.kind, g.title, g.deadline], ['project', 'Créer la société à Dubaï', '2027-03-31'])
g = parseGoal('Être plus discipliné', today); assert.equal(g.kind, 'vision')
g = parseGoal('100 séances de sport dans 6 mois', today)
assert.deepEqual([g.kind, g.target, g.unit, g.deadline], ['count', 100, 'séances', '2027-05-09'])

// Progression, rythme, horizon.
const weight = { id: 'w', title: 'Poids', kind: 'measure', createdOn: '2026-11-01', deadline: '2027-02-28', start: 92, target: 80, current: 89, unit: 'kg' }
assert.equal(M.goalProgress(weight), 0.25)
let pace = M.goalPace(weight, today)
assert.equal(pace.status, 'ahead'); assert.match(pace.label, /^−0,6 kg\/sem · en avance$/)
assert.equal(M.horizonOf(weight, today), 'year')
assert.equal(M.horizonOf({ ...weight, deadline: '2026-11-30' }, today), 'month')
assert.equal(M.horizonOf({ ...weight, deadline: '2027-01-20' }, today), 'quarter')
assert.equal(M.horizonOf({ ...weight, deadline: undefined }, today), 'long')
const books = { id: 'b', title: 'Livres', kind: 'count', createdOn: '2026-01-01', deadline: '2026-12-31', target: 12, current: 4, unit: 'livres' }
pace = M.goalPace(books, today); assert.equal(pace.status, 'late'); assert.match(pace.label, /livres\/sem · en retard$/)
const project = { id: 'p', title: 'Société', kind: 'project', createdOn: today, steps: [{ id: 's1', title: 'A', done: true }, { id: 's2', title: 'B', done: false }] }
assert.equal(M.goalProgress(project), 0.5); assert.equal(M.isComplete(project), false)
assert.equal(M.isComplete({ ...project, steps: project.steps.map(s => ({ ...s, done: true })) }), true)
assert.equal(M.isComplete({ ...project, steps: [] }), false, 'un projet sans étape n’est pas atteint')
assert.equal(M.withCompletion({ ...books, current: 12 }, today).completedOn, today)
assert.equal(M.goalPace({ id: 'v', title: 'Discipline', kind: 'vision', createdOn: today, ratings: { '2026-10': 6 } }, today).label, '6/10 en octobre')

// Migration de l'ancien format : « Perdre 12KG » retiré, les autres convertis.
const migrated = M.migrateGoals([
  { id: 'old1', title: 'Perdre 12KG', category: 'Sport', unit: 'kg', target: 12, current: 0, mode: 'measured', start: 0 },
  { id: 'old2', title: 'Lire', category: 'Perso', unit: 'livres', target: 12, current: 3, history: [{ at: '2026-10-01T10:00:00Z', from: 2, to: 3 }] },
], today)
assert.equal(migrated.length, 1); assert.equal(migrated[0].kind, 'count'); assert.equal(migrated[0].createdOn, '2026-10-01')
assert.equal(M.isValidGoal(migrated[0]), true); assert.equal(M.isValidGoal(weight), true)

console.log('Tests des objectifs réussis : phrase → type, échéances, progression, rythme, horizons, migration.')
