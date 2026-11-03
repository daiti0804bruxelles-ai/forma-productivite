import test from 'node:test'
import assert from 'node:assert/strict'
import { reconcileDailyXp } from '../src/dailyXp.ts'
import { calculateXp, upsertXpEvent, skillProgress } from '../src/skillModel.ts'
import type { XpLedger, SkillId } from '../src/skillModel.ts'

const fixture = () => ({
  habits: [{ id: 'h', skillIds: ['reading'] as SkillId[] }],
  tasks: [{ id: 't', date: '2026-10-31', done: false, skillIds: ['focus'] as SkillId[] }],
  completedHabits: {} as Record<string, string[]>,
  xpLedger: { events: [] } as XpLedger,
  xpProcessedThrough: '2026-10-31',
})

test('activation sans pénalité rétroactive', () => {
  const { xpProcessedThrough: _cursor, ...data } = fixture()
  assert.equal(reconcileDailyXp(data, '2026-11-01').xpLedger.events.length, 0)
})
test('50 % de pénalité, catégories à 20 %, aucun doublon au rechargement', () => {
  const result = reconcileDailyXp(fixture(), '2026-11-01')
  const xp = calculateXp(result.xpLedger)
  assert.equal(xp.skills.reading, -5)
  assert.equal(xp.skills.focus, -5)
  assert.equal(xp.skills.consistency, -10)
  assert.equal(xp.groups.knowledge, -1)
  assert.equal(reconcileDailyXp(result, '2026-11-01'), result)
  assert.deepEqual(reconcileDailyXp(fixture(), '2026-11-01'), result)
})
test('les jours d’absence sont traités une fois, à cheval sur un mois', () => {
  const result = reconcileDailyXp(fixture(), '2026-11-03')
  assert.equal(result.xpLedger.events.length, 6)
  assert.equal(new Set(result.xpLedger.events.map(e => e.id)).size, 6)
})
test('les actions terminées sont protégées et les tâches futures attendent', () => {
  const data = fixture()
  data.tasks[0].done = true
  data.tasks.push({ ...data.tasks[0], id: 'future', done: false, date: '2026-11-02' })
  data.completedHabits['2026-10-31'] = ['h']
  const result = reconcileDailyXp(data, '2026-11-01')
  assert.equal(result.xpLedger.events.length, 1)
  assert.equal(calculateXp(result.xpLedger).skills.reading, 10)
})
test('une tâche répétitive terminée hier peut être manquée ensuite', () => {
  const data = { ...fixture(), habits: [], tasks: [{ id: 'r', date: '2026-10-31', done: true, recurring: true }] }
  const result = reconcileDailyXp(data, '2026-11-03')
  assert.equal(result.xpLedger.events.length, 2)
  assert.equal(calculateXp(result.xpLedger).skills.consistency, -3)
})
test('aucune sanction avant la création d’une habitude', () => {
  const data = { ...fixture(), tasks: [], habits: [{ id: 'new', createdOn: '2026-11-02' }] }
  const result = reconcileDailyXp(data, '2026-11-03')
  assert.deepEqual(result.xpLedger.events.map(e => e.id), ['habit:new:2026-11-02'])
})
test('revalidation et annulation remplacent l’occurrence et conservent le niveau', () => {
  const result = reconcileDailyXp(fixture(), '2026-11-01')
  const missed = result.xpLedger.events.find(e => e.action === 'habit')!
  const completed = upsertXpEvent(result.xpLedger, { ...missed, status: 'completed' })
  assert.equal(completed.events.length, 2)
  assert.equal(calculateXp(completed).skills.reading, 10)
  const reversed = upsertXpEvent(completed, { ...missed, status: 'reversed' })
  assert.equal(calculateXp(reversed).skills.reading, 0)
  assert.equal(skillProgress(0, reversed.levelFloors?.reading).level, 2)
})
test('les objectifs ne reçoivent aucune pénalité', () => {
  const ledger = upsertXpEvent({ events: [] }, {
    id: 'goal:g', action: 'goal_exceptional', skillIds: ['reading'],
    status: 'missed', occurredAt: '2026-11-01T00:00:00Z',
  })
  assert.equal(calculateXp(ledger).skills.reading, 0)
  assert.equal(calculateXp(ledger).skills.consistency, 0)
})
