import { isSkillId, type SkillId } from './skillsCatalog'

/**
 * Objectifs chiffrés (v3, novembre 2026) : un seul type, deux façons d'avancer.
 * - mode 'add'   : on ajoute des montants (CA, ventes, séances) ; peut repartir à zéro chaque mois (monthly).
 * - mode 'value' : on saisit la nouvelle mesure (poids, tour de taille) ; la progression va du départ à la cible.
 * Le chiffre actuel n'est pas stocké : il se calcule à partir de l'historique (aucune incohérence possible).
 */
export type GoalMode = 'add' | 'value'
export type GoalDifficulty = 'moderate' | 'ambitious' | 'exceptional'
export type GoalEntry = { at: string; value: number } // add : montant ajouté ; value : mesure
export type GoalReminder = { every: 'week'; weekday: number } | { every: 'month'; day: number }
export type Goal = {
  id: string; title: string; mode: GoalMode; createdOn: string
  unit?: string; start: number; target: number
  monthly?: boolean; deadline?: string
  history: GoalEntry[]
  difficulty?: GoalDifficulty; skillIds?: SkillId[]; reminder?: GoalReminder; completedOn?: string
}

export const GOAL_GOLD: Record<GoalDifficulty, number> = { moderate: 50, ambitious: 100, exceptional: 200 }
export const GOAL_XP: Record<GoalDifficulty, number> = { moderate: 100, ambitious: 300, exceptional: 750 }

export const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const toDate = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d) }
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000)
export const monthOf = (isoOrDay: string) => isoOrDay.slice(0, 7)
const localDay = (iso: string) => iso.length === 10 ? iso : keyOf(new Date(iso))

/** Chiffre actuel : somme (du mois pour un objectif mensuel) ou dernière mesure. */
export function goalCurrent(goal: Goal, today: string): number {
  if (goal.mode === 'value') return goal.history.length ? goal.history[goal.history.length - 1].value : goal.start
  const entries = goal.monthly ? goal.history.filter(e => monthOf(localDay(e.at)) === monthOf(today)) : goal.history
  return round((goal.monthly ? 0 : goal.start) + entries.reduce((s, e) => s + e.value, 0))
}

/** Progression de 0 à 1. */
export function goalProgress(goal: Goal, today: string): number {
  const current = goalCurrent(goal, today)
  if (goal.mode === 'add') return goal.target > 0 ? Math.max(0, Math.min(1, current / goal.target)) : 0
  if (goal.start === goal.target) return current === goal.target ? 1 : 0
  return Math.max(0, Math.min(1, (current - goal.start) / (goal.target - goal.start)))
}
/** Un objectif mensuel n'est jamais « terminé » : il recommence chaque mois. */
export const isComplete = (goal: Goal, today: string) => !goal.monthly && goalProgress(goal, today) >= 1

/** Mois où un objectif mensuel a été atteint (pour les récompenses et la série de mois). */
export function monthlyWins(goal: Goal): string[] {
  if (!goal.monthly) return []
  const sums: Record<string, number> = {}
  for (const e of goal.history) { const m = monthOf(localDay(e.at)); sums[m] = (sums[m] ?? 0) + e.value }
  return Object.keys(sums).filter(m => sums[m] >= goal.target).sort()
}
export function monthlyResults(goal: Goal, today: string, count = 6) {
  const sums: Record<string, number> = {}
  for (const e of goal.history) { const m = monthOf(localDay(e.at)); sums[m] = (sums[m] ?? 0) + e.value }
  const t = toDate(today)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(t.getFullYear(), t.getMonth() - (count - 1 - i), 1)
    const m = keyOf(d).slice(0, 7)
    return { month: m, value: round(sums[m] ?? 0), reached: (sums[m] ?? 0) >= goal.target }
  }).filter(r => r.month >= monthOf(goal.createdOn))
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: Math.abs(n) < 10 ? 1 : 0 }).format(n)
export const formatNumber = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n)

/** Statut court + phrase de rythme (affichée seulement dans la fiche). */
export function goalPace(goal: Goal, today: string): { status: 'ahead' | 'late' | 'done' | 'none'; word: string; detail: string } {
  const current = goalCurrent(goal, today)
  const progress = goalProgress(goal, today)
  const unit = goal.unit ? ` ${goal.unit}` : ''
  if (progress >= 1) return { status: 'done', word: goal.monthly ? 'Atteint ce mois' : 'Atteint', detail: '' }
  let start = goal.createdOn, end = goal.deadline
  if (goal.monthly) {
    const t = toDate(today)
    start = keyOf(new Date(t.getFullYear(), t.getMonth(), 1))
    end = keyOf(new Date(t.getFullYear(), t.getMonth() + 1, 0))
    if (start < goal.createdOn) start = goal.createdOn
  }
  if (!end) return { status: 'none', word: '', detail: '' }
  const left = daysBetween(today, end)
  if (left < 0) return { status: 'late', word: 'Échéance dépassée', detail: '' }
  const expected = Math.min(1, Math.max(0, (daysBetween(start, today) + 1) / Math.max(1, daysBetween(start, end) + 1)))
  const status = progress + 0.03 >= expected ? 'ahead' : 'late'
  const remaining = Math.abs(goal.target - current)
  const detail = goal.mode === 'value'
    ? `${goal.target < current ? '−' : '+'}${fmt(remaining / Math.max(1, left / 7))}${unit} par semaine pour y arriver`
    : `Encore ${fmt(remaining)}${unit} en ${left + 1} jour${left ? 's' : ''}`
  return { status, word: status === 'ahead' ? 'En avance' : 'En retard', detail }
}

export function goalValueLabel(goal: Goal, today: string) {
  const unit = goal.unit ? ` ${goal.unit}` : ''
  const current = goalCurrent(goal, today)
  return goal.mode === 'add' ? `${formatNumber(current)} / ${formatNumber(goal.target)}${unit}` : `${formatNumber(current)}${unit} → ${formatNumber(goal.target)}${unit}`
}

/** Marque la date d'atteinte la première fois (objectifs non mensuels). */
export const withCompletion = (goal: Goal, today: string): Goal =>
  isComplete(goal, today) ? (goal.completedOn ? goal : { ...goal, completedOn: today }) : (goal.completedOn ? { ...goal, completedOn: undefined } : goal)

/* ---------- Conversion des anciens formats ---------- */
type V1 = { id: string; title: string; skillIds?: SkillId[]; difficulty?: GoalDifficulty; unit?: string; target: number; current: number; deadline?: string; history?: { at: string; from: number; to: number }[]; mode?: 'cumulative' | 'measured'; start?: number }
type V2 = { id: string; title: string; kind: string; createdOn: string; deadline?: string; difficulty?: GoalDifficulty; skillIds?: SkillId[]; unit?: string; start?: number; target?: number; current?: number; history?: { at: string; value: number }[]; reminder?: GoalReminder; completedOn?: string }
const isV3 = (g: unknown) => !!g && typeof g === 'object' && 'mode' in g && ((g as Goal).mode === 'add' || (g as Goal).mode === 'value')

/** Convertit les objectifs v1 (mode cumulative/measured) et v2 (kind) ; seuls les objectifs chiffrés sont gardés. */
export function migrateGoals(goals: unknown[] | undefined, today: string): Goal[] | undefined {
  if (!goals || goals.every(isV3)) return goals as Goal[] | undefined
  return goals.flatMap((raw): Goal[] => {
    if (isV3(raw)) return [raw as Goal]
    if (raw && typeof raw === 'object' && 'kind' in raw) {
      const g = raw as V2
      const common = { id: g.id, title: g.title, unit: g.unit || undefined, deadline: g.deadline, difficulty: g.difficulty, skillIds: g.skillIds, reminder: g.reminder }
      if (g.kind === 'measure') {
        const history = (g.history ?? []).map(h => ({ at: h.at, value: h.value }))
        return [{ ...common, mode: 'value', createdOn: g.createdOn, start: g.start ?? g.current ?? 0, target: g.target ?? 0, history: history.length ? history : [{ at: g.createdOn, value: g.current ?? g.start ?? 0 }] }]
      }
      if (g.kind === 'count') return [{ ...common, mode: 'add', createdOn: g.createdOn, start: 0, target: g.target ?? 1, history: (g.current ?? 0) ? [{ at: g.createdOn, value: g.current ?? 0 }] : [] }]
      return [] // projets et caps de vie : retirés (objectifs chiffrés uniquement)
    }
    const g = raw as V1
    // L'ancien « Perdre 12KG » mal configuré (départ 0, cible 12) est retiré à la demande ; un objectif recréé correctement est gardé.
    if (/^perdre\s*12\s*kg$/i.test(String(g.title).trim()) && !g.start) return []
    const common = { id: g.id, title: g.title, unit: g.unit || undefined, deadline: g.deadline, difficulty: g.difficulty, skillIds: g.skillIds }
    const createdOn = (g.history?.[0]?.at ?? today).slice(0, 10)
    if (g.mode === 'measured') return [{ ...common, mode: 'value', createdOn, start: g.start ?? g.current, target: g.target, history: [{ at: createdOn, value: g.current }] }]
    return [{ ...common, mode: 'add', createdOn, start: 0, target: g.target, history: g.current ? [{ at: createdOn, value: g.current }] : [] }]
  }).filter(g => isValidGoal(g))
}

export function isValidGoal(g: Goal) {
  const num = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e10
  const str = (s: unknown, max = 200) => typeof s === 'string' && s.length <= max
  const day = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
  if (!g || !str(g.id) || !str(g.title) || !g.title.trim() || (g.mode !== 'add' && g.mode !== 'value') || !day(g.createdOn)) return false
  if (!num(g.start) || !num(g.target) || (g.mode === 'add' && !(g.target > 0)) || (g.mode === 'value' && g.start === g.target)) return false
  if (g.unit !== undefined && !str(g.unit, 20)) return false
  if (g.monthly !== undefined && typeof g.monthly !== 'boolean') return false
  if (g.monthly && g.mode !== 'add') return false
  if (g.deadline !== undefined && !day(g.deadline)) return false
  if (g.completedOn !== undefined && !day(g.completedOn)) return false
  if (g.difficulty !== undefined && !['moderate', 'ambitious', 'exceptional'].includes(g.difficulty)) return false
  if (g.skillIds !== undefined && (!Array.isArray(g.skillIds) || g.skillIds.length > 3 || !g.skillIds.every(isSkillId))) return false
  if (!Array.isArray(g.history) || g.history.length > 100000 || !g.history.every(h => h && str(h.at, 40) && num(h.value))) return false
  if (g.reminder !== undefined) {
    const r = g.reminder as GoalReminder
    if (!(r.every === 'week' && Number.isInteger(r.weekday) && r.weekday >= 0 && r.weekday <= 6) && !(r.every === 'month' && Number.isInteger(r.day) && r.day >= 1 && r.day <= 28)) return false
  }
  return true
}
