import { upsertXpEvent } from './skillModel.ts'
import type { SkillId, XpLedger } from './skillModel.ts'
import { taskMissedId } from './taskXp.ts'

type DailyData = {
  habits: { id: string; skillIds?: SkillId[]; createdOn?: string }[]
  tasks: { id: string; date: string; done: boolean; recurring?: boolean; skillIds?: SkillId[] }[]
  completedHabits: Record<string, string[]>
  xpLedger?: XpLedger
  xpProcessedThrough?: string
}

function nextDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, date + 1))
  return next.toISOString().slice(0, 10)
}

function isDay(day: string): boolean {
  const parsed = new Date(day + 'T00:00:00.000Z')
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day
}

/** À appeler AVANT de reporter les tâches. Le curseur est le premier jour non traité.
 * La première ouverture active le suivi sans sanctionner l'historique antérieur.
 * Les dates sont des jours locaux fournis par l'application ; UTC sert seulement
 * à l'arithmétique, pour traverser les changements d'heure sans sauter de jour.
 */
export function reconcileDailyXp<T extends DailyData>(data: T, today: string): T {
  if (!isDay(today)) return data
  if (!data.xpProcessedThrough || !isDay(data.xpProcessedThrough)) return { ...data, xpProcessedThrough: today }
  if (data.xpProcessedThrough >= today) return data

  let ledger = data.xpLedger ?? { events: [], levelFloors: {} }
  for (let day = data.xpProcessedThrough; day < today; day = nextDay(day)) {
    const occurredAt = day + 'T23:59:59.000Z'
    for (const habit of data.habits) {
      if (habit.createdOn && habit.createdOn > day) continue
      const eventId = `habit:${habit.id}:${day}`
      const current = ledger.events.find(event => event.id === eventId)
      if (current?.status === 'completed') continue
      ledger = upsertXpEvent(ledger, {
        id: eventId, action: 'habit', skillIds: current?.skillIds ?? habit.skillIds ?? [],
        status: data.completedHabits[day]?.includes(habit.id) ? 'completed' : 'missed', occurredAt,
      })
    }
    for (const task of data.tasks) {
      if (task.date > day || (task.done && (!task.recurring || task.date === day))) continue
      const eventId = taskMissedId(task, day)
      ledger = upsertXpEvent(ledger, {
        id: eventId, action: task.recurring ? 'repetitive_task' : 'task',
        skillIds: task.skillIds ?? [], status: 'missed', occurredAt,
      })
    }
  }
  return { ...data, xpLedger: ledger, xpProcessedThrough: today }
}

/** Clôture les XP avant de reporter les tâches. Une répétition obtient une
 * nouvelle occurrence quotidienne, une tâche ordinaire conserve son identité. */
export function rollOverDailyTasks<T extends DailyData>(value: T, today: string): T {
  const data = reconcileDailyXp(value, today)
  const tasks = data.tasks.flatMap(task => {
    if (task.date >= today) return [task]
    if (task.recurring) return [{ ...task, date: today, done: false, xpRewardId: 'task:' + task.id + ':' + today }]
    if (task.done) return []
    return [{ ...task, date: today }]
  })
  return tasks.length !== data.tasks.length || tasks.some((task, i) => task !== data.tasks[i]) ? { ...data, tasks } : data
}
