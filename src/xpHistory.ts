/**
 * Évolution de l'XP dans le temps : XP net (gains − pénalités) par jour ou par semaine, par compétence et par domaine.
 */
import { SKILL_GROUPS, type SkillId } from './skillsCatalog'
import type { XpLedger } from './xpEngine'

export type Step = 'day' | 'week'
const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toDate = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d) }
const monday = (key: string) => { const d = toDate(key); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return keyOf(d) }
const eventDay = (at: string) => at.length === 10 ? at : keyOf(new Date(at))

/** Débuts de périodes (jours ou lundis), du plus ancien au plus récent, se terminant à `today`. */
export function buckets(today: string, step: Step, count: number) {
  const out: string[] = []
  const d = toDate(step === 'week' ? monday(today) : today)
  for (let i = 0; i < count; i++) { out.unshift(keyOf(d)); d.setDate(d.getDate() - (step === 'week' ? 7 : 1)) }
  return out
}

/** XP net par compétence pour chaque période. */
export function skillSeries(ledger: XpLedger | undefined, today: string, step: Step, count: number) {
  const keys = buckets(today, step, count)
  const index = new Map(keys.map((k, i) => [k, i]))
  const series: Record<string, number[]> = {}
  for (const g of SKILL_GROUPS) for (const s of g.skills) series[s.id] = keys.map(() => 0)
  for (const e of ledger?.events ?? []) {
    const day = eventDay(e.at)
    const i = index.get(step === 'week' ? monday(day) : day)
    if (i === undefined) continue
    for (const id of e.skillIds) if (series[id]) series[id][i] += e.amountPerSkill
  }
  return { keys, series: series as Record<SkillId, number[]> }
}

/** XP net par domaine (somme de ses compétences) pour chaque période. */
export function domainSeries(ledger: XpLedger | undefined, today: string, step: Step, count: number) {
  const { keys, series } = skillSeries(ledger, today, step, count)
  const domains = Object.fromEntries(SKILL_GROUPS.map(g => [g.id, keys.map((_, i) => g.skills.reduce((s, sk) => s + series[sk.id][i], 0))]))
  return { keys, domains, skills: series }
}

const fmtDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
export const bucketLabel = (key: string, step: Step) => step === 'week' ? `Sem. du ${fmtDay.format(toDate(key))}` : fmtDay.format(toDate(key))
export const shortLabel = (key: string) => fmtDay.format(toDate(key))

/** Somme glissante sur `window` périodes (lissage : « XP des 7 derniers jours », jour par jour). Garde les `count` dernières valeurs. */
export const rolling = (values: number[], window: number, count: number) =>
  values.map((_, i) => values.slice(Math.max(0, i - window + 1), i + 1).reduce((a, b) => a + b, 0)).slice(-count)
