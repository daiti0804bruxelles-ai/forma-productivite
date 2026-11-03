import test from 'node:test'
import assert from 'node:assert/strict'
import { migrateTaskXp, toggleTaskXp, taskRewardId } from '../src/taskXp.ts'
import type { XpTask } from '../src/taskXp.ts'
import { calculateXp } from '../src/skillModel.ts'
import type { XpLedger } from '../src/skillModel.ts'
import { reconcileDailyXp, rollOverDailyTasks } from '../src/dailyXp.ts'
const fixture = (recurring = false) => ({ habits: [], completedHabits: {}, xpProcessedThrough: '2026-11-01', tasks: [{ id: 't', date: '2026-11-01', done: false, recurring, skillIds: ['reading'] } as XpTask], xpLedger: { events: [] } as XpLedger })

test('cocher/décocher, modifier la date puis recocher : une seule récompense', () => {
  let data = toggleTaskXp(migrateTaskXp(fixture()), 't')
  data.tasks[0] = { ...data.tasks[0], date: '2026-11-03' }
  data = toggleTaskXp(data, 't')
  assert.equal(calculateXp(data.xpLedger).skills.reading, 0)
  data = toggleTaskXp(data, 't')
  assert.equal(calculateXp(data.xpLedger).skills.reading, 10)
  assert.equal(data.xpLedger.events.length, 1)
})
test('répétition : le report conserve l’occurrence, le lendemain reçoit une nouvelle occurrence', () => {
  let data = migrateTaskXp(fixture(true))
  const id = taskRewardId(data.tasks[0])
  data.tasks[0] = { ...data.tasks[0], date: '2026-11-03' }
  data = toggleTaskXp(data, 't')
  assert.equal(data.xpLedger.events[0].id, id)
  data.tasks[0] = { ...data.tasks[0], date: '2026-11-04', done: false, xpRewardId: 'task:t:2026-11-04' }
  data = toggleTaskXp(data, 't')
  assert.equal(calculateXp(data.xpLedger).skills.reading, 6)
})
test('migration des anciennes récompenses datées : dédoublonnage et niveaux conservés', () => {
  const data = fixture()
  data.xpLedger = { levelFloors: { reading: 4 }, events: ['2026-10-30', '2026-10-31'].map(day => ({ id: 'task:t:' + day, action: 'task', skillIds: ['reading'], status: 'completed', occurredAt: day + 'T12:00:00Z' })) }
  const migrated = migrateTaskXp(data)
  assert.equal(calculateXp(migrated.xpLedger).skills.reading, 10)
  assert.equal(migrated.xpLedger.levelFloors?.reading, 4)
  assert.deepEqual(migrateTaskXp(migrated), migrated)
})
test('report avant échéance sans pénalité ; report après échéance conserve la pénalité déjà due', () => {
  const before = fixture()
  before.tasks[0].date = '2026-11-03'
  assert.equal(reconcileDailyXp(before, '2026-11-02').xpLedger.events.length, 0)
  const late = reconcileDailyXp(fixture(), '2026-11-02')
  late.tasks[0].date = '2026-11-03'
  assert.equal(calculateXp(reconcileDailyXp(late, '2026-11-03').xpLedger).skills.reading, -5)
})
test('retard cumulé et récompense restent séparés : 2 jours manqués puis réalisation', () => {
  const late = reconcileDailyXp(migrateTaskXp(fixture()), '2026-11-03')
  const done = toggleTaskXp(late, 't')
  assert.equal(calculateXp(done.xpLedger).skills.reading, 0)
  assert.equal(done.xpLedger.events.length, 3)
})
test('changement du mode répétitif après validation : annulation non bloquée', () => {
  let data = toggleTaskXp(migrateTaskXp(fixture()), 't')
  data.tasks[0].recurring = true
  data = toggleTaskXp(data, 't')
  assert.equal(calculateXp(data.xpLedger).skills.reading, 0)
})

test('vrai report automatique : récompense répétitive nouvelle, pénalités distinctes et rafraîchissement idempotent', () => {
  const first = toggleTaskXp(migrateTaskXp(fixture(true)), 't')
  const rolled = rollOverDailyTasks(first, '2026-11-03')
  assert.equal(rolled.tasks[0].date, '2026-11-03')
  assert.equal(rolled.tasks[0].done, false)
  assert.equal(rolled.tasks[0].xpRewardId, 'task:t:2026-11-03')
  const done = toggleTaskXp(rolled, 't')
  assert.equal(calculateXp(done.xpLedger).skills.reading, 4.5)
  assert.equal(rollOverDailyTasks(done, '2026-11-03'), done)
})
test('changement de mois et année bissextile sans jour oublié', () => {
  const data = fixture()
  data.xpProcessedThrough = '2024-02-28'
  data.tasks[0].date = '2024-02-28'
  assert.equal(rollOverDailyTasks(data, '2024-03-01').xpLedger.events.length, 2)
})
