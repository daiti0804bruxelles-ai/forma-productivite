import { SKILL_GROUPS, isSkillId, type SkillId } from './skillsCatalog'

export type XpSource = 'habit' | 'task' | 'goal'
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

export function isValidXpLedger(value: unknown): value is XpLedger {
  if (!value || typeof value !== 'object' || !('events' in value)) return false
  const events = (value as XpLedger).events
  if (!Array.isArray(events) || events.length > 100000) return false
  const keys = new Set<string>()
  for (const event of events) {
    if (!event || typeof event.key !== 'string' || event.key.length > 300 || keys.has(event.key)) return false
    keys.add(event.key)
    if (!['habit', 'task', 'goal'].includes(event.source) ||
      typeof event.at !== 'string' || event.at.length > 60 ||
      !Array.isArray(event.skillIds) || event.skillIds.length < 1 || event.skillIds.length > 19 ||
      !event.skillIds.every(isSkillId) || new Set(event.skillIds).size !== event.skillIds.length ||
      !Number.isFinite(event.amountPerSkill) || event.amountPerSkill <= 0 || event.amountPerSkill > 750) return false
  }
  return true
}

export function xpBySkill(ledger: XpLedger | undefined): Record<SkillId, number> {
  const result = {} as Record<SkillId, number>
  for (const group of SKILL_GROUPS) for (const skill of group.skills) result[skill.id] = 0
  for (const event of ledger?.events ?? []) for (const skillId of event.skillIds) {
    if (isSkillId(skillId)) result[skillId] += event.amountPerSkill
  }
  return result
}

export function xpByDomain(ledger: XpLedger | undefined) {
  const bySkill = xpBySkill(ledger)
  return SKILL_GROUPS.map(group => ({
    id: group.id,
    name: group.name,
    xp: group.skills.reduce((total, skill) => total + bySkill[skill.id] * 0.2, 0),
  }))
}
