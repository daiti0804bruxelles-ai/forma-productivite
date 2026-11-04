import { penalizeXp, type XpLedger } from './xpEngine'
import type { SkillId } from './skillsCatalog'

export type ScheduledHabit = { id: string; skillIds?: SkillId[]; createdOn?: string }
export type ScheduledTask = { id: string; date: string; done: boolean; recurring?: boolean; skillIds?: SkillId[]; dueDate?: string; createdOn?: string }
export type ScheduledData<H extends ScheduledHabit, T extends ScheduledTask> = {
  habits: H[]
  tasks: T[]
  completedHabits: Record<string, string[]>
  xpLedger?: XpLedger
  lastPenaltyCheckDate?: string
}
const toDate = (s: string) => { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d) }
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const nextDay = (d: Date) => { const result = new Date(d); result.setDate(result.getDate()+1); return result }

/** Idempotent daily rollover. Never backfills penalties before the first check. */
export function rollOverTasks<H extends ScheduledHabit, T extends ScheduledTask>(
  value: ScheduledData<H,T>,
  today: string,
): ScheduledData<H,T> {
  const lastCheck = value.lastPenaltyCheckDate
  let xpLedger = value.xpLedger
  let nextCheck = today
  if (lastCheck && lastCheck < today) {
    let day = toDate(lastCheck)
    let processed = 0
    while (keyOf(day) < today && processed < 366) {
      const key = keyOf(day)
      const overdueDay = keyOf(nextDay(day))
      for (const habit of value.habits) {
        if (habit.createdOn && habit.createdOn > key) continue
        if (!(value.completedHabits[key] || []).includes(habit.id)) {
          xpLedger = penalizeXp(xpLedger, `missed-habit:${habit.id}:${key}`, habit.skillIds, -5)
        }
      }
      for (const task of value.tasks) {
        if (task.createdOn && task.createdOn > key) continue
        if (task.recurring) {
          // Les validations des jours précédents restent dans le journal XP.
          // Le champ done ne décrit que l'occurrence actuellement affichée.
          const completedInLedger = xpLedger?.events.some(event =>
            event.key === `task:${task.id}:${key}` && event.source === 'task'
          ) ?? false
          if (task.createdOn && task.createdOn > key) continue
          if (task.date > key || (task.done && task.date === key) || completedInLedger) continue
          xpLedger = penalizeXp(xpLedger, `late-task:${task.id}:${key}`, task.skillIds, -1.5)
        } else if (!task.done && (task.dueDate || task.date) < overdueDay) {
          xpLedger = penalizeXp(xpLedger, `late-task:${task.id}:${overdueDay}`, task.skillIds, -5)
        }
      }
      day = nextDay(day)
      processed++
    }
    if (keyOf(day) < today) nextCheck = keyOf(day)
  }
  const tasks = value.tasks.flatMap(task => {
    if (task.date >= today) return [task]
    if (task.recurring) return [{ ...task, date: today, done: false }]
    if (task.done) return []
    return [{ ...task, date: today, dueDate: task.dueDate || task.date }]
  }) as T[]
  if (tasks.length === value.tasks.length && tasks.every((task,i) => task === value.tasks[i]) &&
      value.lastPenaltyCheckDate === nextCheck && xpLedger === value.xpLedger) return value
  return { ...value, tasks, xpLedger, lastPenaltyCheckDate: nextCheck }
}
