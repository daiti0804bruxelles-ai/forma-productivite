/**
 * Résumé pour le widget iPhone (Scriptable) — sans dépendance, testé par scripts/test-widget.mjs.
 * Mêmes règles que l'écran Aujourd'hui : série, progression du jour (hors repos/excusés), prochain rappel, objectif mis en avant.
 */
type Item = { id: string; title: string; skillIds?: string[] }
type Data = {
  habits?: (Item & { days?: number[]; period?: string })[]; tasks?: (Item & { date: string; done: boolean })[]
  events?: (Item & { date: string; time?: string; repeatDays?: number[] })[]
  completedHabits?: Record<string, string[]>; completedEvents?: Record<string, string[]>
  activityDays?: string[]; frozenDays?: string[]
  restPeriods?: { from: string; to?: string; skillIds: string[] }[]; excused?: Record<string, string[]>
  memos?: { id: string; title: string; due?: string; when?: string; snoozedUntil?: string; doneAt?: string }[]
  goals?: { id: string; title: string; mode: 'add' | 'value'; unit?: string; start: number; target: number; monthly?: boolean; history: { at: string; value: number }[]; completedOn?: string }[]
  focusGoalId?: string
}
export type WidgetSummary = {
  day: string; streak: number; activeToday: boolean; done: number; total: number
  memo?: { title: string; when: string; overdue: boolean; more: number }
  pending: { count: number; first?: string; when?: string }
  goal?: WidgetGoal
  /** Ce qu'il reste à faire aujourd'hui (activités par heure, tâches, habitudes par moment), hors repos/excusés. */
  remaining: { title: string; time?: string }[]
  /** Rappels en retard puis notes en attente puis prochains rappels. */
  memos: { title: string; when?: string; overdue: boolean }[]
  goals: WidgetGoal[]
}
export type WidgetGoal = { id: string; title: string; mode: 'add' | 'value'; current: number; start: number; target: number; unit?: string; progress: number; monthly: boolean }

const weekday = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
const prev = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10) }
const occurs = (e: { date: string; repeatDays?: number[] }, day: string) => e.date === day || (day > e.date && Array.isArray(e.repeatDays) && e.repeatDays.includes(weekday(day)))

export function summarize(data: Data, day: string, time: string): WidgetSummary {
  const now = `${day}T${time}`
  const completed = data.completedHabits?.[day] ?? []
  const doneEvents = data.completedEvents?.[day] ?? []
  const paused = new Set((data.restPeriods ?? []).filter(p => p.from <= day && (!p.to || day <= p.to)).flatMap(p => p.skillIds))
  const isPaused = (i: Item) => Boolean(data.excused?.[day]?.includes(i.id) || i.skillIds?.some(s => paused.has(s)))
  const counts = <T extends Item>(list: T[], isDone: (x: T) => boolean) => list.filter(x => isDone(x) || !isPaused(x))

  const habits = (data.habits ?? []).filter(h => !h.days?.length || h.days.includes(weekday(day)))
  const tasks = (data.tasks ?? []).filter(t => t.date === day)
  const xpEvents = (data.events ?? []).filter(e => e.skillIds?.length && occurs(e, day))
  const done = tasks.filter(t => t.done).length + habits.filter(h => completed.includes(h.id)).length + xpEvents.filter(e => doneEvents.includes(e.id)).length
  const total = counts(tasks, t => t.done).length + counts(habits, h => completed.includes(h.id)).length + counts(xpEvents, e => doneEvents.includes(e.id)).length

  const active = new Set([...(data.activityDays ?? []), ...Object.entries(data.completedHabits ?? {}).filter(([, ids]) => ids.length).map(([d]) => d)])
  const streakDays = new Set([...active, ...(data.frozenDays ?? [])])
  let d = streakDays.has(day) ? day : prev(day), streak = 0
  while (streakDays.has(d) && streak < 20000) { streak++; d = prev(d) }

  const waiting = (data.memos ?? []).filter(m => !m.doneAt && !m.due)
  const pending = { count: waiting.length, first: waiting[0]?.title, when: waiting[0]?.when }
  const open = (data.memos ?? []).filter(m => !m.doneAt && m.due).map(m => ({ ...m, trigger: m.snoozedUntil && m.snoozedUntil > m.due! ? m.snoozedUntil : m.due! })).sort((a, b) => a.trigger.localeCompare(b.trigger))
  const first = open[0]
  const memo = first ? { title: first.title, when: first.trigger, overdue: first.trigger <= now, more: open.filter(m => m.trigger <= now).length - (first.trigger <= now ? 1 : 0) } : undefined

  const toGoal = (g: NonNullable<Data['goals']>[number]): WidgetGoal => {
    const month = day.slice(0, 7)
    const current = g.mode === 'value' ? (g.history.length ? g.history[g.history.length - 1].value : g.start)
      : (g.monthly ? 0 : g.start) + g.history.filter(e => !g.monthly || e.at.slice(0, 7) === month).reduce((s, e) => s + e.value, 0)
    const progress = g.mode === 'add' ? (g.target > 0 ? current / g.target : 0) : (g.start === g.target ? 0 : (current - g.start) / (g.target - g.start))
    return { id: g.id, title: g.title, mode: g.mode, current: Math.round(current * 100) / 100, start: g.start, target: g.target, unit: g.unit, progress: Math.max(0, Math.min(1, progress)), monthly: Boolean(g.monthly) }
  }
  // Objectifs en cours seulement (un objectif atteint ne s'affiche plus ; un mensuel repart chaque mois). L'objectif « Sur Aujourd'hui » passe en premier.
  const activeGoals = (data.goals ?? []).filter(x => (!x.completedOn || x.monthly) && toGoal(x).progress < 1 || (x.monthly && x.id === data.focusGoalId))
    .sort((a, b) => Number(b.id === data.focusGoalId) - Number(a.id === data.focusGoalId))
  const focus = activeGoals[0]
  const goal = focus ? toGoal(focus) : undefined
  const goals = activeGoals.slice(0, 10).map(toGoal)

  const order: Record<string, number> = { 'Matin': 0, 'Après-midi': 1, 'Soir': 2 }
  const remaining = [
    ...xpEvents.filter(e => !doneEvents.includes(e.id) && !isPaused(e)).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')).map(e => ({ title: e.title, time: e.time })),
    ...tasks.filter(t => !t.done && !isPaused(t)).map(t => ({ title: t.title })),
    ...habits.filter(h => !completed.includes(h.id) && !isPaused(h)).sort((a, b) => (order[a.period ?? ''] ?? 3) - (order[b.period ?? ''] ?? 3)).map(h => ({ title: h.title })),
  ].slice(0, 8)
  const memos = [
    ...open.filter(m => m.trigger <= now).map(m => ({ title: m.title, when: m.trigger, overdue: true })),
    ...waiting.map(m => ({ title: m.title, when: m.when, overdue: false })),
    ...open.filter(m => m.trigger > now).map(m => ({ title: m.title, when: m.trigger, overdue: false })),
  ].slice(0, 8)
  return { day, streak, activeToday: active.has(day), done, total, memo, pending, goal, remaining, memos, goals }
}
