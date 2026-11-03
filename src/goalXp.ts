import { isGoalComplete } from './goalModel.ts'
import type { Goal } from './goalModel.ts'
import type { XpLedger, XpAction } from './skillModel.ts'
import { upsertXpEvent } from './skillModel.ts'

/** Une récompense par objectif. Son barème et ses compétences sont figés au premier gain,
 * pour qu'une édition de difficulté ne crée pas de gain supplémentaire ni ne bloque l'annulation. */
export function reconcileGoalXp(ledger: XpLedger, goals: Goal[], previousGoals: Goal[]): XpLedger {
  let next = ledger
  const previous = new Map(previousGoals.map(goal => [goal.id, goal]))
  for (const goal of goals) {
    const current = next.events.find(event => event.id === 'goal:' + goal.id)
    const complete = isGoalComplete(goal)
    if (current) {
      const status = complete ? 'completed' : 'reversed'
      if (current.status !== status) next = upsertXpEvent(next, { ...current, status, occurredAt: new Date().toISOString() })
      continue
    }
    // Pas de récompense rétroactive pour les objectifs déjà complets avant activation.
    const old = previous.get(goal.id)
    if (!complete || (old && isGoalComplete(old))) continue
    const action: XpAction = goal.difficulty === 'exceptional' ? 'goal_exceptional'
      : goal.difficulty === 'ambitious' ? 'goal_ambitious' : 'goal_moderate'
    next = upsertXpEvent(next, { id: 'goal:' + goal.id, action, skillIds: goal.skillIds || [], status: 'completed', occurredAt: new Date().toISOString() })
  }
  return next
}
