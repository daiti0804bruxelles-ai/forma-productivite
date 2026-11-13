/**
 * Calcul des rappels Forma (sans dépendance : utilisé par la fonction serveur et par les tests).
 * À partir des données d'un compte et de l'heure locale, renvoie les notifications à envoyer maintenant.
 * Chaque rappel a une clé unique (dedupeKey) pour ne jamais être envoyé deux fois.
 */
export type NotificationPrefs = { beforeEvent?: boolean; evening?: boolean; morning?: boolean; leadMinutes?: number; eveningTime?: string; morningTime?: string }
type Item = { id: string; title: string; skillIds?: string[] }
type Habit = Item & { days?: number[]; createdOn?: string }
type Task = Item & { date: string; done: boolean; recurring?: boolean }
type Event = Item & { date: string; time: string; repeatDays?: number[] }
type GoalLike = { id: string; title: string; kind: string; completedOn?: string; ratings?: Record<string, number>; reminder?: { every: 'week'; weekday: number } | { every: 'month'; day: number } }
export type FormaData = {
  habits?: Habit[]; tasks?: Task[]; events?: Event[]
  completedHabits?: Record<string, string[]>; completedEvents?: Record<string, string[]>
  timeZone?: string; notifications?: NotificationPrefs; goals?: GoalLike[]
  restPeriods?: { from: string; to?: string; skillIds: string[] }[]; excused?: Record<string, string[]>
}
export type Reminder = { dedupeKey: string; title: string; body: string; url: string; tag: string }

export const DEFAULT_PREFS: Required<NotificationPrefs> = { beforeEvent: true, evening: true, morning: true, leadMinutes: 15, eveningTime: '21:00', morningTime: '08:00' }

const minutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
const weekday = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
const occursOn = (e: Event, day: string) => e.date === day || (day > e.date && Array.isArray(e.repeatDays) && e.repeatDays.includes(weekday(day)))
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

/** Date (AAAA-MM-JJ) et heure (HH:MM) locales dans un fuseau donné. */
export function localNow(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  return { day: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}

/** Mode repos / excusé (même règle que src/rest.ts) : pas de rappel pour ces éléments. */
const pausedOn = (data: FormaData, item: Item, day: string) => {
  if (data.excused?.[day]?.includes(item.id)) return true
  const paused = new Set((data.restPeriods ?? []).filter(p => p.from <= day && (!p.to || day <= p.to)).flatMap(p => p.skillIds))
  return Boolean(item.skillIds?.some(s => paused.has(s)))
}

export function dueReminders(data: FormaData, day: string, time: string): Reminder[] {
  const prefs = { ...DEFAULT_PREFS, ...(data.notifications ?? {}) }
  const now = minutes(time)
  const out: Reminder[] = []
  const events = (data.events ?? []).filter(e => occursOn(e, day)).sort((a, b) => a.time.localeCompare(b.time))
  const doneEvents = data.completedEvents?.[day] ?? []
  const doneHabits = data.completedHabits?.[day] ?? []
  const habitsToday = (data.habits ?? []).filter(h => (!h.days?.length || h.days.includes(weekday(day))) && (!h.createdOn || h.createdOn <= day))
  const tasksToday = (data.tasks ?? []).filter(t => t.date <= day)

  // 1. Avant une activité (fenêtre : de « lead » minutes avant jusqu'au début).
  if (prefs.beforeEvent) for (const e of events) {
    if (pausedOn(data, e, day)) continue
    const until = minutes(e.time) - now
    if (until > 0 && until <= prefs.leadMinutes) out.push({
      dedupeKey: `event:${e.id}:${day}`, tag: `event-${e.id}`, url: '/',
      title: `Dans ${until} min : ${e.title}`,
      body: e.skillIds?.length ? `${e.time} · pense à la cocher pour gagner ton XP` : `À ${e.time}`,
    })
  }

  // 2. Rappel du soir : seulement s'il reste quelque chose qui coûte de l'XP.
  if (prefs.evening && now >= minutes(prefs.eveningTime)) {
    const habits = habitsToday.filter(h => !doneHabits.includes(h.id) && !pausedOn(data, h, day))
    const xpEvents = events.filter(e => e.skillIds?.length && !doneEvents.includes(e.id) && !pausedOn(data, e, day))
    const tasks = tasksToday.filter(t => !t.done && !pausedOn(data, t, day))
    const risk = habits.reduce((s, h) => s + 5 * (h.skillIds?.length ?? 0), 0)
      + xpEvents.reduce((s, e) => s + 5 * (e.skillIds?.length ?? 0), 0)
      + tasks.reduce((s, t) => s + (t.recurring ? 1.5 : 5) * (t.skillIds?.length ?? 0), 0)
    const count = habits.length + xpEvents.length + tasks.length
    if (count > 0) {
      const names = [...habits, ...xpEvents, ...tasks].slice(0, 3).map(i => i.title)
      out.push({
        dedupeKey: `evening:${day}`, tag: 'evening', url: '/',
        title: `Il te reste ${plural(count, 'élément')} aujourd’hui`,
        body: `${names.join(' · ')}${count > 3 ? '…' : ''}${risk > 0 ? ` — sinon −${String(Math.round(risk * 10) / 10).replace('.', ',')} XP` : ''}`,
      })
    }
  }

  // 3. Résumé du matin (entre l'heure choisie et midi).
  if (prefs.morning && now >= minutes(prefs.morningTime) && now < 12 * 60) {
    const parts = [
      tasksToday.filter(t => !t.done).length ? plural(tasksToday.filter(t => !t.done).length, 'tâche') : '',
      habitsToday.length ? plural(habitsToday.length, 'habitude') : '',
    ].filter(Boolean)
    const next = events.find(e => minutes(e.time) >= now)
    if (parts.length || next) out.push({
      dedupeKey: `morning:${day}`, tag: 'morning', url: '/',
      title: 'Ta journée',
      body: [parts.join(' · '), next ? `${next.title} à ${next.time}` : ''].filter(Boolean).join(' — '),
    })
  }
  // 4. Objectifs : rappel de mise à jour choisi par objectif (9h), et note de fin de mois des caps de vie (20h).
  const goals = (data.goals ?? []).filter(g => !g.completedOn)
  if (now >= 9 * 60 && now < 12 * 60) for (const g of goals) {
    const r = g.reminder
    const due = r && (r.every === 'week' ? r.weekday === weekday(day) : Number(day.slice(8)) === r.day)
    if (due) out.push({ dedupeKey: `goal:${g.id}:${day}`, tag: `goal-${g.id}`, url: '/', title: `Mise à jour : ${g.title}`, body: 'Note où tu en es dans Forma.' })
  }
  const [y, m, d] = day.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate() === d
  if (lastDay && now >= 20 * 60) for (const g of goals) {
    if (g.kind !== 'vision' || g.ratings?.[day.slice(0, 7)]) continue
    out.push({ dedupeKey: `vision:${g.id}:${day.slice(0, 7)}`, tag: `vision-${g.id}`, url: '/', title: `Ta note du mois : ${g.title}`, body: 'De 1 à 10, comment s’est passé ton mois ?' })
  }
  return out
}
