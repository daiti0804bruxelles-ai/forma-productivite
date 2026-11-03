import { upsertXpEvent } from './skillModel.ts'
import type { SkillId, XpLedger } from './skillModel.ts'
type HabitData = { habits: { id: string; skillIds?: SkillId[] }[]; completedHabits: Record<string, string[]>; xpLedger?: XpLedger }
export function toggleHabitXp<T extends HabitData>(data: T, habitId: string, day: string, at = new Date().toISOString()): T {
  const habit = data.habits.find(item => item.id === habitId)
  if (!habit) return data
  const completed = data.completedHabits[day] ?? []
  const done = completed.includes(habitId)
  const id = 'habit:' + habitId + ':' + day
  const ledger = data.xpLedger ?? { events: [] }
  const current = ledger.events.find(event => event.id === id)
  return { ...data,
    completedHabits: { ...data.completedHabits, [day]: done ? completed.filter(item => item !== habitId) : [...completed, habitId] },
    xpLedger: upsertXpEvent(ledger, { id, action: 'habit', skillIds: current?.skillIds ?? habit.skillIds ?? [], status: done ? 'reversed' : 'completed', occurredAt: at }),
  }
}
