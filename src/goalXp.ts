import { progressPercent } from './goalModel'
import type { Goal } from './goalModel'
import type { XpLedger, XpEvent, XpAction } from './skillModel'
import { upsertXpEvent } from './skillModel'

/** Synchronise une récompense unique par objectif et annule si la progression retombe sous 100 %. */
export function reconcileGoalXp(ledger: XpLedger, goals: Goal[], previousGoals: Goal[]): XpLedger {
  let next = ledger
  const previous = new Map(previousGoals.map(goal => [goal.id, goal]))
  for (const goal of goals) {
    const old = previous.get(goal.id)
    const wasComplete = old ? progressPercent(old) === 100 : false
    const isComplete = progressPercent(goal) === 100
    if (wasComplete === isComplete) continue
    const action: XpAction = goal.difficulty === 'exceptional' ? 'goal_exceptional'
      : goal.difficulty === 'ambitious' ? 'goal_ambitious' : 'goal_moderate'
    const event: XpEvent = {
      id: 'goal:' + goal.id,
      action,
      skillIds: goal.skillIds || [],
      status: isComplete ? 'completed' : 'reversed',
      occurredAt: new Date().toISOString(),
    }
    next = upsertXpEvent(next, event)
  }
  return next
}
