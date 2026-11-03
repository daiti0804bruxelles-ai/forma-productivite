import { SKILL_GROUPS, isSkillId, type SkillId } from './skillsCatalog'

export type XpSource = 'habit' | 'task' | 'goal' | 'penalty'
export type XpEvent = {
  key: string
  source: XpSource
  at: string
  skillIds: SkillId[]
  amountPerSkill: number
}
export type XpLedger = { events: XpEvent[] }

// Les gains sont immuables : décocher, modifier ou supprimer une action
// ne permet pas de gagner plusieurs fois les XP de la même réalisation.
export function awardXp(
  ledger: XpLedger | undefined,
  key: string,
  source: XpSource,
  skillIds: readonly SkillId[] | undefined,
  amountPerSkill: number,
  at = new Date().toISOString()
): XpLedger {
  const events = ledger?.events ?? []
  if (!skillIds?.length || events.some(event => event.key === key)) return ledger ?? { events }
  const uniqueSkills = [...new Set(skillIds)].filter(isSkillId)
  if (!uniqueSkills.length || !Number.isFinite(amountPerSkill) || amountPerSkill <= 0) return ledger ?? { events }
  return { events: [...events, { key, source, at, skillIds: uniqueSkills, amountPerSkill }] }
}

export function penalizeXp(
  ledger: XpLedger | undefined,
  key: string,
  skillIds: readonly SkillId[] | undefined,
  amountPerSkill: number,
  at = new Date().toISOString()
): XpLedger {
  const events = ledger?.events ?? []
  if (!skillIds?.length || events.some(event => event.key === key)) return ledger ?? { events }
  const uniqueSkills = [...new Set(skillIds)].filter(isSkillId)
  if (!uniqueSkills.length || !Number.isFinite(amountPerSkill) || amountPerSkill >= 0 || amountPerSkill < -5) return ledger ?? { events }
  return { events: [...events, { key, source: 'penalty', at, skillIds: uniqueSkills, amountPerSkill }] }
}

export type XpProgress = { xp: number; level: number; current: number; required: number }
const XP_PER_LEVEL = 100
export function progressFromEvents(events: readonly { amountPerSkill: number }[]): XpProgress {
  let xp = 0
  let highestLevel = 1
  for (const event of events) {
    xp = Math.max((highestLevel - 1) * XP_PER_LEVEL, xp + event.amountPerSkill)
    highestLevel = Math.max(highestLevel, Math.floor(xp / XP_PER_LEVEL) + 1)
  }
  return { xp, level: highestLevel, current: xp - (highestLevel - 1) * XP_PER_LEVEL, required: XP_PER_LEVEL }
}

export function skillProgress(ledger: XpLedger | undefined, skillId: SkillId): XpProgress {
  return progressFromEvents((ledger?.events ?? []).filter(event => event.skillIds.includes(skillId)))
}

export function domainProgress(ledger: XpLedger | undefined, groupId: string): XpProgress {
  const group = SKILL_GROUPS.find(group => group.id === groupId)
  if (!group) return progressFromEvents([])
  return progressFromEvents((ledger?.events ?? []).map(event => ({
    amountPerSkill: event.amountPerSkill * 0.2 * group.skills.filter(skill => event.skillIds.includes(skill.id)).length,
  })))
}

export type GoalXpSnapshot = {
  id: string
  skillIds?: SkillId[]
  difficulty?: 'moderate' | 'ambitious' | 'exceptional'
  history?: readonly unknown[]
}

export function awardCompletedGoals<T extends GoalXpSnapshot>(
  ledger: XpLedger | undefined,
  previousGoals: readonly T[],
  nextGoals: readonly T[],
  completionPercent: (goal: T) => number,
): XpLedger | undefined {
  let nextLedger = ledger
  for (const goal of nextGoals) {
    const previous = previousGoals.find(item => item.id === goal.id)
    if (!previous) continue
    // Un changement de cible ou de difficulté n'est pas une réalisation.
    if ((goal.history?.length ?? 0) <= (previous.history?.length ?? 0)) continue
    if (completionPercent(previous) >= 100 || completionPercent(goal) !== 100) continue
    const xp = goal.difficulty === 'exceptional' ? 750 : goal.difficulty === 'ambitious' ? 300 : 100
    nextLedger = awardXp(nextLedger, `goal:${goal.id}`, 'goal', goal.skillIds, xp)
  }
  return nextLedger
}

export function isValidXpLedger(value: unknown): value is XpLedger {
  if (!value || typeof value !== 'object' || !('events' in value)) return false
  const events = (value as XpLedger).events
  if (!Array.isArray(events) || events.length > 100000) return false
  const keys = new Set<string>()
  for (const event of events) {
    if (!event || typeof event.key !== 'string' || event.key.length > 300 || keys.has(event.key)) return false
    keys.add(event.key)
    if (!['habit', 'task', 'goal', 'penalty'].includes(event.source) ||
      typeof event.at !== 'string' || event.at.length > 60 ||
      !Array.isArray(event.skillIds) || event.skillIds.length < 1 || event.skillIds.length > 19 ||
      !event.skillIds.every(isSkillId) || new Set(event.skillIds).size !== event.skillIds.length ||
      !Number.isFinite(event.amountPerSkill) || (event.source === 'penalty' ? event.amountPerSkill >= 0 || event.amountPerSkill < -5 : event.amountPerSkill <= 0 || event.amountPerSkill > 750)) return false
  }
  return true
}

export function xpBySkill(ledger: XpLedger | undefined): Record<SkillId, number> {
  const result = {} as Record<SkillId, number>
  for (const group of SKILL_GROUPS) for (const skill of group.skills) result[skill.id] = skillProgress(ledger, skill.id).xp
  return result
}

export function xpByDomain(ledger: XpLedger | undefined) {
  return SKILL_GROUPS.map(group => ({
    id: group.id,
    name: group.name,
    xp: domainProgress(ledger, group.id).xp,
  }))
}
