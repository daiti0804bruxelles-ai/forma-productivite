import test from 'node:test'
import assert from 'node:assert/strict'
import { isGoalComplete, progressPercent } from '../src/goalModel.ts'
import type { Goal } from '../src/goalModel.ts'
import { reconcileGoalXp } from '../src/goalXp.ts'
import { calculateXp } from '../src/skillModel.ts'
const goal = (patch: Partial<Goal> = {}): Goal => ({ id: 'g', title: 'Livres', category: 'Personnel', unit: 'pages', current: 0, target: 200, difficulty: 'moderate', skillIds: ['reading'], ...patch })

test('99,5 % ne déclenche ni 100 % affichés ni récompense', () => {
  const g = goal({ current: 199 })
  assert.equal(isGoalComplete(g), false)
  assert.equal(progressPercent(g), 99)
  assert.equal(reconcileGoalXp({ events: [] }, [g], [goal()]).events.length, 0)
})
test('objectifs mesurés croissants et décroissants : atteindre ou dépasser la vraie cible', () => {
  for (const [start, target, current, complete] of [[80, 70, 70.01, false], [80, 70, 70, true], [80, 70, 69, true], [10, 20, 19.99, false], [10, 20, 20, true], [10, 20, 21, true]] as const) {
    assert.equal(isGoalComplete(goal({ mode: 'measured', start, target, current })), complete)
  }
})
test('difficulté modifiée : annulation effective puis revalidation unique au barème initial', () => {
  const complete = goal({ current: 200 })
  let ledger = reconcileGoalXp({ events: [] }, [complete], [goal()])
  const edited = goal({ current: 200, difficulty: 'exceptional', skillIds: ['focus'] })
  ledger = reconcileGoalXp(ledger, [edited], [complete])
  assert.equal(calculateXp(ledger).skills.reading, 100)
  assert.equal(calculateXp(ledger).skills.focus, 0)
  ledger = reconcileGoalXp(ledger, [goal({ current: 199, difficulty: 'exceptional' })], [edited])
  assert.equal(calculateXp(ledger).skills.reading, 0)
  ledger = reconcileGoalXp(ledger, [edited], [goal()])
  ledger = reconcileGoalXp(ledger, [edited], [edited])
  assert.equal(calculateXp(ledger).skills.reading, 100)
  assert.equal(ledger.events.length, 1)
  assert.ok((ledger.levelFloors?.reading ?? 1) > 1)
})
test('récompenses 100/300/750, catégories à 20 %, aucune récompense rétroactive', () => {
  for (const [difficulty, amount] of [['moderate', 100], ['ambitious', 300], ['exceptional', 750]] as const) {
    const g = goal({ current: 200, difficulty })
    const xp = calculateXp(reconcileGoalXp({ events: [] }, [g], [goal()]))
    assert.equal(xp.skills.reading, amount)
    assert.equal(xp.groups.knowledge, amount * .2)
    assert.equal(xp.skills.consistency, 0)
    assert.equal(reconcileGoalXp({ events: [] }, [g], [g]).events.length, 0)
  }
})
test('un ancien gain prématuré est annulé au rapprochement sans perdre le niveau acquis', () => {
  const complete = goal({ current: 200 })
  const ledger = reconcileGoalXp({ events: [] }, [complete], [goal()])
  const almost = goal({ current: 199 })
  const repaired = reconcileGoalXp(ledger, [almost], [almost])
  assert.equal(calculateXp(repaired).skills.reading, 0)
  assert.equal(repaired.levelFloors?.reading, ledger.levelFloors?.reading)
})
