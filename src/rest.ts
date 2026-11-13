/**
 * Mode repos et éléments excusés : quand tu ne peux pas faire quelque chose (malade, blessé, voyage),
 * les éléments concernés ne donnent aucune pénalité. La série n'est pas touchée : tu continues le reste.
 * - Période de repos : du `from` au `to` inclus (sans `to` : jusqu'à ce que tu l'arrêtes), pour les compétences choisies.
 * - Excuser : un élément précis, un jour donné.
 */
import type { SkillId } from './skillsCatalog'

export type RestPeriod = { id: string; from: string; to?: string; skillIds: SkillId[]; reason?: string }
export type Excused = Record<string, string[]>

export const activeRests = (periods: readonly RestPeriod[] | undefined, day: string) =>
  (periods ?? []).filter(p => p.from <= day && (!p.to || day <= p.to))

/** L'élément est en repos ce jour-là (excusé, ou une de ses compétences est en pause). */
export function isPaused(item: { id: string; skillIds?: readonly string[] }, day: string, periods?: readonly RestPeriod[], excused?: Excused) {
  if (excused?.[day]?.includes(item.id)) return true
  const paused = new Set(activeRests(periods, day).flatMap(p => p.skillIds))
  return Boolean(item.skillIds?.some(s => paused.has(s as SkillId)))
}

export const REST_REASONS = ['Malade', 'Blessé', 'Voyage', 'Autre'] as const
export const SPORT_SKILLS: SkillId[] = ['strength', 'cardio']

const day = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
export const isRestPeriod = (p: unknown): p is RestPeriod => {
  const r = p as RestPeriod
  return !!r && typeof r.id === 'string' && day(r.from) && (r.to === undefined || (day(r.to) && r.to >= r.from)) && Array.isArray(r.skillIds) && r.skillIds.length > 0 && r.skillIds.length <= 19
    && r.skillIds.every(s => typeof s === 'string') && (r.reason === undefined || (typeof r.reason === 'string' && r.reason.length <= 40))
}
export const isExcused = (e: unknown): e is Excused => !!e && typeof e === 'object' && !Array.isArray(e)
  && Object.entries(e).every(([d, ids]) => day(d) && Array.isArray(ids) && ids.length <= 500 && ids.every(i => typeof i === 'string'))
