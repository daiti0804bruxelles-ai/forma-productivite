/**
 * « À ne pas oublier » : rappels importants, sans XP ni pénalité.
 * Heures locales « AAAA-MM-JJTHH:MM » (fuseau de référence). Un rappel répété avance à sa prochaine date quand on le coche.
 * Tant qu'il n'est pas fait, la notification revient toutes les heures (8 h – 22 h) — calcul côté serveur.
 */
export type MemoRepeat = 'week' | 'month' | 'year'
/** Sans `due` : note en attente (« au prochain withdraw »), remise sous les yeux matin et soir jusqu'à ce qu'elle soit faite ou planifiée. */
export type Memo = { id: string; title: string; due?: string; when?: string; repeat?: MemoRepeat; snoozedUntil?: string; doneAt?: string; createdOn: string }

const pad = (n: number) => String(n).padStart(2, '0')
const toDate = (stamp: string) => { const [d, t = '09:00'] = stamp.split('T'); const [y, m, day] = d.split('-').map(Number); const [h, mi] = t.split(':').map(Number); return new Date(y, m - 1, day, h, mi) }
export const stampOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

/** Prochaine échéance d'un rappel répété (le 31 d'un mois court devient le dernier jour du mois). */
export function nextDue(due: string, repeat: MemoRepeat): string {
  const d = toDate(due)
  if (repeat === 'week') { d.setDate(d.getDate() + 7); return stampOf(d) }
  const day = d.getDate()
  const months = repeat === 'month' ? 1 : 12
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1, d.getHours(), d.getMinutes())
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, last))
  return stampOf(target)
}

/** Moment où le rappel se déclenche (report compris). */
export const triggerOf = (m: Memo) => !m.due ? '' : m.snoozedUntil && m.snoozedUntil > m.due ? m.snoozedUntil : m.due
export const isPending = (m: Memo) => !m.doneAt && !m.due
export const isOpen = (m: Memo) => !m.doneAt
export const isDue = (m: Memo, now: string) => isOpen(m) && Boolean(m.due) && triggerOf(m) <= now

/** « Fait » : un rappel répété passe à sa prochaine date (jamais dans le passé), sinon il est rangé. */
export function complete(m: Memo, now: string): Memo {
  if (!m.repeat || !m.due) return { ...m, doneAt: now, snoozedUntil: undefined }
  let due = nextDue(m.due, m.repeat)
  while (due <= now) due = nextDue(due, m.repeat)
  return { ...m, due, snoozedUntil: undefined }
}

export const SNOOZES = [
  { label: 'Dans 1 h', at: (now: string) => { const d = toDate(now); d.setHours(d.getHours() + 1); return stampOf(d) } },
  { label: 'Ce soir', at: (now: string) => { const d = toDate(now); return d.getHours() >= 20 ? null : `${now.slice(0, 10)}T20:00` } },
  { label: 'Demain matin', at: (now: string) => { const d = toDate(now); d.setDate(d.getDate() + 1); return `${stampOf(d).slice(0, 10)}T09:00` } },
] as const

const DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
/** « Aujourd'hui 15:00 », « Demain 09:00 », « sam. 21 nov. 10:00 ». */
export function whenLabel(stamp: string, now: string) {
  const day = stamp.slice(0, 10), today = now.slice(0, 10)
  const t = toDate(today); t.setDate(t.getDate() + 1)
  const tomorrow = stampOf(t).slice(0, 10)
  const prefix = day === today ? 'Aujourd’hui' : day === tomorrow ? 'Demain' : DAY.format(toDate(stamp))
  return `${prefix} ${stamp.slice(11, 16)}`
}
export const REPEAT_LABEL: Record<MemoRepeat, string> = { week: 'Chaque semaine', month: 'Chaque mois', year: 'Chaque année' }

const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
export const isMemo = (m: unknown): m is Memo => {
  const x = m as Memo
  return !!x && typeof x.id === 'string' && typeof x.title === 'string' && x.title.length > 0 && x.title.length <= 200 && (x.due === undefined || STAMP.test(x.due))
    && (x.when === undefined || (typeof x.when === 'string' && x.when.length <= 80)) && (x.repeat === undefined || x.due !== undefined)
    && /^\d{4}-\d{2}-\d{2}$/.test(x.createdOn) && (x.repeat === undefined || ['week', 'month', 'year'].includes(x.repeat))
    && (x.snoozedUntil === undefined || STAMP.test(x.snoozedUntil)) && (x.doneAt === undefined || STAMP.test(x.doneAt))
}

/** Note rapide : « Payer Doola au prochain withdraw » → titre « Payer Doola », quand « au prochain withdraw ». */
export function parseCapture(text: string): { title: string; when?: string } {
  const clean = text.trim().replace(/\s+/g, ' ')
  const m = clean.match(/\s((?:au|à la|lors du|lors de la) prochaine?\s.+|quand\s.+|dès que\s.+|avant (?:de|d’|d')\s?.+)$/i)
  if (!m || m.index === undefined || m.index < 3) return { title: clean.slice(0, 200) }
  return { title: clean.slice(0, m.index).slice(0, 200), when: m[1].slice(0, 80) }
}
