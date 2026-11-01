/**
 * Forma V1.9 — règles de progression (sans dépendance React).
 * Les XP sont comptabilisés par événement unique et par sous-compétence.
 * Les grandes catégories reçoivent automatiquement 20 % du total.
 */
export const SKILL_GROUPS = [
  { id: 'appearance', name: 'Apparence & Physique', skills: [
    { id: 'aesthetics', name: 'Esthétique & Soins' },
    { id: 'strength', name: 'Musculation' },
    { id: 'cardio', name: 'Cardio & Endurance' },
  ] },
  { id: 'health', name: 'Santé & Équilibre', skills: [
    { id: 'nutrition', name: 'Nutrition' },
    { id: 'sleep', name: 'Sommeil & Récupération' },
    { id: 'mental', name: 'Bien-être mental' },
  ] },
  { id: 'knowledge', name: 'Connaissances', skills: [
    { id: 'reading', name: 'Lecture' },
    { id: 'learning', name: 'Apprentissage' },
    { id: 'practical', name: 'Compétences pratiques' },
  ] },
  { id: 'ambition', name: 'Ambition & Finances', skills: [
    { id: 'business', name: 'Entrepreneuriat' },
    { id: 'finance', name: 'Finances personnelles' },
    { id: 'investing', name: 'Investissement' },
  ] },
  { id: 'discipline', name: 'Discipline & Maîtrise', skills: [
    { id: 'consistency', name: 'Régularité', automatic: true },
    { id: 'organization', name: 'Organisation' },
    { id: 'focus', name: 'Concentration' },
  ] },
  { id: 'relations', name: 'Relations & Épanouissement', skills: [
    { id: 'couple', name: 'Couple & Relations' },
    { id: 'family', name: 'Famille & Vie sociale' },
    { id: 'creativity', name: 'Créativité' },
    { id: 'leisure', name: 'Loisirs & Découvertes' },
  ] },
] as const

export type SkillId = (typeof SKILL_GROUPS)[number]['skills'][number]['id']
export type SkillGroupId = (typeof SKILL_GROUPS)[number]['id']
export type XpAction = 'habit' | 'task' | 'repetitive_task' | 'goal_moderate' | 'goal_ambitious' | 'goal_exceptional'
export type XpEvent = {
  /** Identifiant stable : une action et une occurrence ne doivent pas être récompensées deux fois. */
  id: string
  action: XpAction
  skillIds: SkillId[]
  /** completed = récompense ; missed = pénalité ; reversed = aucune récompense. */
  status: 'completed' | 'missed' | 'reversed'
  occurredAt: string
}
export type XpLedger = { events: XpEvent[]; levelFloors?: Partial<Record<SkillId | SkillGroupId, number>> }

const REWARDS: Record<XpAction, number> = {
  habit: 10,
  task: 10,
  repetitive_task: 3,
  goal_moderate: 100,
  goal_ambitious: 300,
  goal_exceptional: 750,
}
const SKILL_TO_GROUP = Object.fromEntries(SKILL_GROUPS.flatMap(group => group.skills.map(skill => [skill.id, group.id]))) as Record<SkillId, SkillGroupId>
const ALL_SKILLS = new Set<string>(Object.keys(SKILL_TO_GROUP))
const AUTOMATIC_SKILL: SkillId = 'consistency'
export const MAX_LEVEL = 100
export const CATEGORY_XP_SHARE = 0.2

export function xpForEvent(event: XpEvent): number {
  const reward = REWARDS[event.action]
  if (event.status === 'reversed') return 0
  if (event.status === 'missed') return event.action.startsWith('goal_') ? 0 : -reward / 2
  return reward
}

/** Régularité est calculée automatiquement pour les tâches/habitudes, jamais pour les objectifs. */
export function affectedSkills(event: XpEvent): SkillId[] {
  const ids = event.skillIds.filter((id): id is SkillId => ALL_SKILLS.has(id) && id !== AUTOMATIC_SKILL)
  if (event.action === 'habit' || event.action === 'task' || event.action === 'repetitive_task') ids.push(AUTOMATIC_SKILL)
  return [...new Set(ids)]
}

/** Une courbe croissante calibrable : ~3 300 XP pour atteindre le niveau 100. */
export function xpToNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0
  return Math.ceil(8 + (level - 1) * 0.5)
}
export function totalXpForLevel(level: number): number {
  let total = 0
  for (let i = 1; i < Math.min(Math.max(1, level), MAX_LEVEL); i++) total += xpToNextLevel(i)
  return total
}
export function levelFromXp(xp: number): number {
  let level = 1
  while (level < MAX_LEVEL && xp >= totalXpForLevel(level + 1)) level++
  return level
}
export function skillProgress(xp: number, levelFloor = 1) {
  const level = Math.max(levelFloor, levelFromXp(Math.max(0, xp)))
  const start = totalXpForLevel(level)
  const next = totalXpForLevel(level + 1)
  return {
    level,
    xp: Math.max(0, xp),
    towardNext: level === MAX_LEVEL ? 0 : Math.max(0, xp - start),
    neededForNext: level === MAX_LEVEL ? 0 : next - start,
    percent: level === MAX_LEVEL ? 100 : Math.max(0, Math.min(100, Math.round(100 * (xp - start) / (next - start)))),
  }
}
export function calculateXp(ledger: XpLedger) {
  const skills = Object.fromEntries([...ALL_SKILLS].map(id => [id, 0])) as Record<SkillId, number>
  const groups = Object.fromEntries(SKILL_GROUPS.map(g => [g.id, 0])) as Record<SkillGroupId, number>
  const seen = new Set<string>()
  for (const event of ledger.events) {
    if (!event.id || seen.has(event.id)) continue
    seen.add(event.id)
    const value = xpForEvent(event)
    for (const skill of affectedSkills(event)) {
      skills[skill] += value
      groups[SKILL_TO_GROUP[skill]] += value * CATEGORY_XP_SHARE
    }
  }
  return { skills, groups }
}
/**
 * Un niveau acquis ne doit jamais disparaître : enregistrer les floors au moment
 * de chaque mutation du ledger, puis les conserver lors des pénalités/annulations.
 */
export function preserveLevels(ledger: XpLedger): XpLedger {
  const { skills, groups } = calculateXp(ledger)
  const floors = { ...ledger.levelFloors }
  for (const [id, xp] of [...Object.entries(skills), ...Object.entries(groups)]) {
    const key = id as SkillId | SkillGroupId
    floors[key] = Math.max(floors[key] ?? 1, levelFromXp(Math.max(0, xp)))
  }
  return { ...ledger, levelFloors: floors }
}
export function upsertXpEvent(ledger: XpLedger, event: XpEvent): XpLedger {
  if (!event.id || !Number.isFinite(Date.parse(event.occurredAt))) return ledger
  const current = ledger.events.find(e => e.id === event.id)
  // Revalidation : mettre à jour le même événement, jamais en ajouter un second.
  if (current && current.action !== event.action) return ledger
  const next = { ...ledger, events: [...ledger.events.filter(e => e.id !== event.id), event] }
  return preserveLevels(next)
}
