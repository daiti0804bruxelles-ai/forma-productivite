import { preserveLevels, upsertXpEvent } from './skillModel.ts'
import type { SkillId, XpLedger } from './skillModel.ts'

export type XpTask = { id: string; date: string; done: boolean; recurring?: boolean; skillIds?: SkillId[]; xpRewardId?: string }
type TaskData = { tasks: XpTask[]; xpLedger?: XpLedger }
export const taskRewardId = (task: XpTask) => task.xpRewardId ?? (task.recurring ? 'task:' + task.id + ':' + task.date : 'task:' + task.id)
export const taskMissedId = (task: XpTask, day: string) => 'task-missed:' + task.id + ':' + day

/** Ancien schéma : récompense ordinaire datée. Migration locale idempotente,
 * sans toucher aux gains historiques des tâches répétitives ni aux niveaux acquis. */
export function migrateTaskXp<T extends TaskData>(data: T): T {
  const tasks = data.tasks.map(task => task.xpRewardId ? task : { ...task, xpRewardId: taskRewardId(task) })
  if (!data.xpLedger) return { ...data, tasks }
  const events = new Map<string, XpLedger['events'][number]>()
  for (const event of data.xpLedger.events) {
    const legacy = /^task:(.+):(\d{4}-\d{2}-\d{2})$/.exec(event.id)
    const id = legacy && event.status === 'missed' ? 'task-missed:' + legacy[1] + ':' + legacy[2]
      : legacy && event.action === 'task' ? 'task:' + legacy[1] : event.id
    const old = events.get(id)
    if (!old || old.occurredAt <= event.occurredAt) events.set(id, { ...event, id })
  }
  return { ...data, tasks, xpLedger: preserveLevels({ ...data.xpLedger, events: [...events.values()] }) }
}

export function toggleTaskXp<T extends TaskData>(data: T, taskId: string, at = new Date().toISOString()): T {
  const task = data.tasks.find(item => item.id === taskId)
  if (!task) return data
  const ledger = data.xpLedger ?? { events: [] }
  const id = taskRewardId(task)
  const current = ledger.events.find(event => event.id === id)
  return { ...data,
    tasks: data.tasks.map(item => item.id === taskId ? { ...item, done: !item.done, xpRewardId: id } : item),
    xpLedger: upsertXpEvent(ledger, { id, action: current?.action ?? (task.recurring ? 'repetitive_task' : 'task'),
      skillIds: current?.skillIds ?? task.skillIds ?? [], status: task.done ? 'reversed' : 'completed', occurredAt: at }),
  }
}
