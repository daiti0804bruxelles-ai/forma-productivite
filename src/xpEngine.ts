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

/** Difficulté d'une tâche ou d'une habitude : XP gagnée par compétence choisie. */
export type Difficulty = 'facile' | 'moyen' | 'difficile' | 'epique'
export const DIFFICULTIES: readonly { id: Difficulty; label: string; xp: number }[] = [
  { id: 'facile', label: 'Facile', xp: 5 },
  { id: 'moyen', label: 'Moyen', xp: 10 },
  { id: 'difficile', label: 'Difficile', xp: 20 },
  { id: 'epique', label: 'Épique', xp: 40 },
]
export const isDifficulty = (value: unknown): value is Difficulty => DIFFICULTIES.some(d => d.id === value)
export const xpForDifficulty = (difficulty?: Difficulty) => (DIFFICULTIES.find(d => d.id === difficulty) ?? DIFFICULTIES[1]).xp
export const difficultyLabel = (difficulty?: Difficulty) => (DIFFICULTIES.find(d => d.id === difficulty) ?? DIFFICULTIES[1]).label
/** Au-delà de 3 compétences, une même action rapporterait trop d'XP. */
export const MAX_SKILLS_PER_ITEM = 3

/** Courbe RPG : 50 XP pour le niveau 2, puis 25 XP de plus à chaque niveau (75, 100, 125…). */
export const xpToNextLevel = (level: number) => 50 + 25 * (level - 1)
export function totalXpForLevel(level: number) {
  const steps = Math.max(0, level - 1)
  return 50 * steps + 25 * steps * (steps - 1) / 2
}

/** Rangs d'une compétence. */
export const RANKS: readonly { level: number; name: string }[] = [
  { level: 5, name: 'Apprenti' },
  { level: 10, name: 'Initié' },
  { level: 20, name: 'Confirmé' },
  { level: 40, name: 'Maître' },
  { level: 60, name: 'Légende' },
]
export const rankFor = (level: number) => [...RANKS].reverse().find(rank => level >= rank.level)?.name ?? null
export const nextRank = (level: number) => RANKS.find(rank => rank.level > level) ?? null

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
export function progressFromEvents(events: readonly { amountPerSkill: number }[]): XpProgress {
  let xp = 0
  let highestLevel = 1
  for (const event of events) {
    // Une pénalité ne fait jamais redescendre sous le niveau déjà atteint.
    xp = Math.max(totalXpForLevel(highestLevel), xp + event.amountPerSkill)
    while (xp >= totalXpForLevel(highestLevel + 1)) highestLevel++
  }
  const base = totalXpForLevel(highestLevel)
  return { xp, level: highestLevel, current: xp - base, required: xpToNextLevel(highestLevel) }
}

export function skillProgress(ledger: XpLedger | undefined, skillId: SkillId): XpProgress {
  return progressFromEvents((ledger?.events ?? []).filter(event => event.skillIds.includes(skillId)))
}

/**
 * Un domaine reflète la moyenne de ses compétences : son niveau est la moyenne (arrondie vers le bas)
 * des niveaux de ses compétences, donc il ne peut pas redescendre. La barre montre où il en est
 * jusqu'au niveau suivant (0 à 100). Une compétence jamais travaillée compte comme niveau 1.
 */
export function domainProgress(ledger: XpLedger | undefined, groupId: string): XpProgress {
  const group = SKILL_GROUPS.find(group => group.id === groupId)
  if (!group) return progressFromEvents([])
  const skills = group.skills.map(skill => skillProgress(ledger, skill.id))
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
  const level = Math.floor(mean(skills.map(skill => skill.level)))
  const exact = mean(skills.map(skill => skill.level + skill.current / skill.required))
  const ratio = Math.min(0.99, Math.max(0, exact - level))
  return { xp: Math.round(mean(skills.map(skill => skill.xp))), level, current: Math.round(ratio * 100), required: 100 }
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
