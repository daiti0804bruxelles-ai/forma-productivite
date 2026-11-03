import test from 'node:test'
import assert from 'node:assert/strict'
import { toggleHabitXp } from '../src/habitXp.ts'
import { reconcileDailyXp } from '../src/dailyXp.ts'
import { calculateXp } from '../src/skillModel.ts'
import type { SkillId } from '../src/skillModel.ts'
test('une habitude récompense une seule fois par jour et fige les compétences de cette occurrence', () => {
  const initial = { habits: [{ id: 'h', skillIds: ['reading'] as SkillId[] }], tasks: [], completedHabits: {}, xpProcessedThrough: '2026-11-01' }
  let data = toggleHabitXp(initial, 'h', '2026-11-01')
  data.habits[0] = { ...data.habits[0], skillIds: ['focus'] }
  data = toggleHabitXp(data, 'h', '2026-11-01')
  data = toggleHabitXp(data, 'h', '2026-11-01')
  assert.equal(calculateXp(data.xpLedger!).skills.reading, 10)
  assert.equal(calculateXp(data.xpLedger!).skills.focus, 0)
  assert.equal(data.xpLedger!.events.length, 1)
  data = toggleHabitXp(data, 'h', '2026-11-01')
  const missed = reconcileDailyXp(data, '2026-11-02')
  assert.equal(calculateXp(missed.xpLedger!).skills.reading, -5)
})
test('la validation du lendemain est une nouvelle occurrence', () => {
  const initial = { habits: [{ id: 'h', skillIds: ['reading'] as SkillId[] }], completedHabits: {} }
  const first = toggleHabitXp(initial, 'h', '2026-11-01')
  const next = toggleHabitXp(first, 'h', '2026-11-02')
  assert.equal(calculateXp(next.xpLedger!).skills.reading, 20)
})
