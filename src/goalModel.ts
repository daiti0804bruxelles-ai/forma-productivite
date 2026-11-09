import { isSkillId, type SkillId } from './skillsCatalog'

/**
 * Objectifs v2 : 4 types.
 * - count   : un chiffre à atteindre (12 livres, 10 000 $) — on ajoute (+1).
 * - measure : une valeur qui doit monter ou baisser (92 → 80 kg) — on saisit la nouvelle valeur.
 * - project : une liste d'étapes à cocher.
 * - vision  : un cap de vie, noté de 1 à 10 chaque mois.
 */
export type GoalKind = 'count' | 'measure' | 'project' | 'vision'
export type GoalDifficulty = 'moderate' | 'ambitious' | 'exceptional'
export type GoalStep = { id: string; title: string; done: boolean; taskId?: string }
export type GoalEntry = { at: string; value: number }
export type GoalReminder = { every: 'week'; weekday: number } | { every: 'month'; day: number }
export type Goal = {
  id: string; title: string; kind: GoalKind; createdOn: string
  deadline?: string; difficulty?: GoalDifficulty; skillIds?: SkillId[]
  unit?: string; start?: number; target?: number; current?: number
  steps?: GoalStep[]; history?: GoalEntry[]; ratings?: Record<string, number>
  reminder?: GoalReminder; completedOn?: string
}
/** Ancien format (avant novembre 2026), converti au chargement. */
type LegacyGoal = { id: string; title: string; category?: string; skillIds?: SkillId[]; difficulty?: GoalDifficulty; unit: string; target: number; current: number; deadline?: string; history?: { at: string; from: number; to: number }[]; mode?: 'cumulative' | 'measured'; start?: number }

export const GOAL_GOLD: Record<GoalDifficulty, number> = { moderate: 50, ambitious: 100, exceptional: 200 }
export const GOAL_XP: Record<GoalDifficulty, number> = { moderate: 100, ambitious: 300, exceptional: 750 }
export const KIND_LABEL: Record<GoalKind, string> = { count: 'Chiffre', measure: 'Mesure', project: 'Projet', vision: 'Cap de vie' }

export const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const toDate = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d) }
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000)

/** Progression de 0 à 1 (null pour un cap de vie). */
export function goalProgress(goal: Goal): number | null {
  if (goal.kind === 'vision') return null
  if (goal.kind === 'project') { const steps = goal.steps ?? []; return steps.length ? steps.filter(s => s.done).length / steps.length : 0 }
  const target = goal.target ?? 0, current = goal.current ?? 0
  if (goal.kind === 'count') return target > 0 ? Math.max(0, Math.min(1, current / target)) : 0
  const start = goal.start ?? current
  if (start === target) return current === target ? 1 : 0
  return Math.max(0, Math.min(1, (current - start) / (target - start)))
}
export const isComplete = (goal: Goal) => goal.kind !== 'vision' && (goal.kind !== 'project' || (goal.steps?.length ?? 0) > 0) && goalProgress(goal) === 1

export type Horizon = 'month' | 'quarter' | 'year' | 'long'
export const HORIZONS: { id: Horizon; label: string }[] = [{ id: 'month', label: 'Ce mois' }, { id: 'quarter', label: 'Ce trimestre' }, { id: 'year', label: 'Cette année' }, { id: 'long', label: 'Long terme' }]
export function horizonOf(goal: Goal, today: string): Horizon {
  if (!goal.deadline) return 'long'
  const t = toDate(today)
  if (goal.deadline <= keyOf(new Date(t.getFullYear(), t.getMonth() + 1, 0))) return 'month'
  const days = daysBetween(today, goal.deadline)
  return days <= 92 ? 'quarter' : days <= 366 ? 'year' : 'long'
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: n < 10 ? 1 : 0 }).format(n)
/** Rythme nécessaire et statut (en avance / en retard), d'après l'échéance. */
export function goalPace(goal: Goal, today: string): { label: string; status: 'ahead' | 'late' | 'done' | 'none' } {
  if (goal.kind === 'vision') { const last = Object.keys(goal.ratings ?? {}).sort().pop(); return { label: last ? `${goal.ratings![last]}/10 en ${new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(toDate(last + '-01'))}` : 'Pas encore noté', status: 'none' } }
  if (isComplete(goal)) return { label: 'Atteint', status: 'done' }
  if (!goal.deadline) return { label: '', status: 'none' }
  const left = daysBetween(today, goal.deadline)
  if (left < 0) return { label: 'Échéance dépassée', status: 'late' }
  const total = Math.max(1, daysBetween(goal.createdOn, goal.deadline))
  const expected = Math.min(1, Math.max(0, daysBetween(goal.createdOn, today) / total))
  const status = (goalProgress(goal) ?? 0) + 0.03 >= expected ? 'ahead' : 'late'
  const word = status === 'ahead' ? 'en avance' : 'en retard'
  const weeks = Math.max(1, left) / 7
  if (goal.kind === 'project') return { label: `${left} j restants · ${word}`, status }
  const remaining = Math.abs((goal.target ?? 0) - (goal.current ?? 0))
  const unit = goal.unit ? ` ${goal.unit}` : ''
  const perWeek = remaining / weeks
  if (goal.kind === 'measure') {
    const sign = (goal.target ?? 0) < (goal.current ?? 0) ? '−' : '+'
    return { label: `${sign}${fmt(perWeek)}${unit}/sem · ${word}`, status }
  }
  if (perWeek >= 1 || perWeek === 0) return { label: `${fmt(perWeek)}${unit}/sem · ${word}`, status }
  return { label: `1 tous les ${Math.max(1, Math.round(7 / perWeek))} j · ${word}`, status }
}

export function goalValueLabel(goal: Goal) {
  const unit = goal.unit ? ` ${goal.unit}` : ''
  if (goal.kind === 'count') return `${fmt(goal.current ?? 0)} / ${fmt(goal.target ?? 0)}${unit}`
  if (goal.kind === 'measure') return `${fmt(goal.current ?? 0)}${unit} → ${fmt(goal.target ?? 0)}${unit}`
  if (goal.kind === 'project') { const s = goal.steps ?? []; return s.length ? `${s.filter(x => x.done).length} / ${s.length} étapes` : 'Ajoute des étapes' }
  return ''
}

/** Marque la date d'atteinte la première fois qu'un objectif est complété. */
export const withCompletion = (goal: Goal, today: string): Goal =>
  isComplete(goal) ? (goal.completedOn ? goal : { ...goal, completedOn: today }) : (goal.completedOn ? { ...goal, completedOn: undefined } : goal)

const isLegacy = (g: unknown): g is LegacyGoal => !!g && typeof g === 'object' && !('kind' in g)
/** Convertit les anciens objectifs ; « Perdre 12 kg » (mal configuré) est retiré à la demande de l'utilisateur. */
export function migrateGoals(goals: unknown[] | undefined, today: string): Goal[] | undefined {
  if (!goals || !goals.some(isLegacy)) return goals as Goal[] | undefined
  return goals.flatMap((g): Goal[] => {
    if (!isLegacy(g)) return [g as Goal]
    if (/^perdre\s*12\s*kg$/i.test(g.title.trim())) return []
    const history = (g.history ?? []).map(h => ({ at: h.at, value: h.to }))
    const createdOn = (g.history?.[0]?.at ?? today).slice(0, 10)
    const base = { id: g.id, title: g.title, createdOn, deadline: g.deadline, difficulty: g.difficulty, skillIds: g.skillIds, unit: g.unit, target: g.target, current: g.current, history }
    return [g.mode === 'measured' ? { ...base, kind: 'measure', start: g.start ?? g.current } : { ...base, kind: 'count', start: 0 }]
  })
}

export function isValidGoal(g: Goal) {
  const num = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e9
  const str = (s: unknown, max = 200) => typeof s === 'string' && s.length <= max
  const day = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
  if (!g || !str(g.id) || !str(g.title) || !g.title.trim() || !['count', 'measure', 'project', 'vision'].includes(g.kind) || !day(g.createdOn)) return false
  if (g.deadline !== undefined && !day(g.deadline)) return false
  if (g.completedOn !== undefined && !day(g.completedOn)) return false
  if (g.difficulty !== undefined && !['moderate', 'ambitious', 'exceptional'].includes(g.difficulty)) return false
  if (g.skillIds !== undefined && (!Array.isArray(g.skillIds) || g.skillIds.length > 3 || !g.skillIds.every(isSkillId))) return false
  if (g.unit !== undefined && !str(g.unit, 40)) return false
  for (const k of ['start', 'target', 'current'] as const) if (g[k] !== undefined && !num(g[k])) return false
  if ((g.kind === 'count' || g.kind === 'measure') && (!num(g.target) || !num(g.current))) return false
  if (g.kind === 'count' && !(g.target! > 0)) return false
  if (g.kind === 'measure' && (!num(g.start) || g.start === g.target)) return false
  if (g.steps !== undefined && (!Array.isArray(g.steps) || g.steps.length > 200 || !g.steps.every(s => s && str(s.id) && str(s.title) && typeof s.done === 'boolean' && (s.taskId === undefined || str(s.taskId))))) return false
  if (g.history !== undefined && (!Array.isArray(g.history) || g.history.length > 100000 || !g.history.every(h => h && str(h.at) && num(h.value)))) return false
  if (g.ratings !== undefined && (typeof g.ratings !== 'object' || Array.isArray(g.ratings) || !Object.entries(g.ratings).every(([m, v]) => /^\d{4}-\d{2}$/.test(m) && Number.isInteger(v) && v >= 1 && v <= 10))) return false
  if (g.reminder !== undefined) {
    const r = g.reminder as GoalReminder
    if (!(r.every === 'week' && Number.isInteger(r.weekday) && r.weekday >= 0 && r.weekday <= 6) && !(r.every === 'month' && Number.isInteger(r.day) && r.day >= 1 && r.day <= 28)) return false
  }
  return true
}
