/**
 * Tâches à deux : récompenses et pénalités calculées dans le compte de chaque membre (une fois par clé).
 * - Faite (par n'importe qui) : XP + or de la difficulté, pour chacun.
 * - Pas faite à temps : −5 XP par compétence et par jour de retard, pour chacun (sauf repos / excusé / joker).
 */
import { addGold, GOLD_BY_DIFFICULTY, type GoldLedger } from './game'
import { awardXp, penalizeXp, xpForDifficulty, type Difficulty, type XpLedger } from './xpEngine'
import { isPaused, type Excused, type RestPeriod } from './rest'
import { isSkillId, type SkillId } from './skillsCatalog'

export type SharedTaskLike = { id: string; title: string; due_date: string; difficulty: Difficulty; skill_ids: string[]; created_at: string; done_at: string | null }
type Ctx = { today: string; xpMult: number; goldMult: number; restPeriods?: RestPeriod[]; excused?: Excused; protectedDays?: string[] }

const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toDate = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }
const localDay = (iso: string) => keyOf(new Date(iso))

export function applySharedTasks(tasks: readonly SharedTaskLike[], xp: XpLedger | undefined, gold: GoldLedger | undefined, ctx: Ctx) {
  let xpLedger = xp, goldLedger = gold
  for (const t of tasks) {
    const skills = t.skill_ids.filter(isSkillId) as SkillId[]
    if (t.done_at) {
      const key = `shared-task:${t.id}`
      if (!goldLedger?.events.some(e => e.key === `gold:${key}`)) {
        goldLedger = addGold(goldLedger, `gold:${key}`, GOLD_BY_DIFFICULTY[t.difficulty] * ctx.goldMult, `Tâche à deux : ${t.title}`)
        if (skills.length) xpLedger = awardXp(xpLedger, key, 'task', skills, xpForDifficulty(t.difficulty) * ctx.xpMult)
      }
    }
    if (!skills.length) continue
    // Jours de retard : du jour d'échéance (une fois terminé) jusqu'à la veille de la validation, ou jusqu'à hier.
    const created = localDay(t.created_at)
    const last = t.done_at ? keyOf(new Date(toDate(localDay(t.done_at)).getTime() - 86400000)) : keyOf(new Date(toDate(ctx.today).getTime() - 86400000))
    const d = toDate(t.due_date > created ? t.due_date : created)
    for (let i = 0; i < 60 && keyOf(d) <= last; i++, d.setDate(d.getDate() + 1)) {
      const day = keyOf(d)
      if (ctx.protectedDays?.includes(day) || isPaused({ id: t.id, skillIds: skills }, day, ctx.restPeriods, ctx.excused)) continue
      xpLedger = penalizeXp(xpLedger, `late-shared:${t.id}:${day}`, skills, -5)
    }
  }
  return { xpLedger, goldLedger }
}
