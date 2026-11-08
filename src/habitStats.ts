/**
 * Statistiques d'une habitude à partir des jours cochés.
 * Seuls les jours prévus comptent (les jours de repos ne cassent pas une série) ;
 * aujourd'hui ne compte que s'il est déjà fait (la journée n'est pas finie).
 */
export type HabitLike = { id: string; createdOn?: string; days?: number[] }
export type DayState = 'done' | 'missed' | 'rest' | 'future' | 'before'
export type HabitStats = {
  currentStreak: number
  bestStreak: number
  rate30: number | null
  doneCount: number
  calendar: { date: string; state: DayState }[] // 5 dernières semaines, du lundi au dimanche
}

const toDate = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d) }
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (key: string, n: number) => { const d = toDate(key); d.setDate(d.getDate() + n); return keyOf(d) }

export function habitStats(habit: HabitLike, completed: Record<string, string[]>, today: string): HabitStats {
  const doneDays = new Set(Object.entries(completed).filter(([, ids]) => ids.includes(habit.id)).map(([day]) => day))
  const firstDone = [...doneDays].sort()[0]
  const start = [habit.createdOn, firstDone].filter((d): d is string => Boolean(d)).sort()[0] ?? today
  const scheduled = (day: string) => !habit.days?.length || habit.days.includes(toDate(day).getDay())

  // Série actuelle : en remontant depuis aujourd'hui (s'il est fait) ou depuis hier.
  let currentStreak = 0
  for (let day = doneDays.has(today) ? today : addDays(today, -1), guard = 0; day >= start && guard < 3000; day = addDays(day, -1), guard++) {
    if (!scheduled(day)) continue
    if (!doneDays.has(day)) break
    currentStreak++
  }
  // Meilleure série sur tout l'historique.
  let bestStreak = 0, run = 0
  for (let day = start, guard = 0; day <= today && guard < 3000; day = addDays(day, 1), guard++) {
    if (!scheduled(day)) continue
    if (doneDays.has(day)) { run++; bestStreak = Math.max(bestStreak, run) } else if (day !== today) run = 0
  }
  // Régularité sur 30 jours.
  let planned = 0, done = 0
  for (let i = 0; i < 30; i++) {
    const day = addDays(today, -i)
    if (day < start || !scheduled(day)) continue
    if (day === today && !doneDays.has(day)) continue
    planned++
    if (doneDays.has(day)) done++
  }
  // Mini-calendrier : 5 semaines complètes se terminant par la semaine en cours.
  const offset = (toDate(today).getDay() + 6) % 7
  const first = addDays(today, -offset - 28)
  const calendar = Array.from({ length: 35 }, (_, i) => {
    const date = addDays(first, i)
    const state: DayState = date > today ? 'future' : date < start ? 'before' : !scheduled(date) ? 'rest'
      : doneDays.has(date) ? 'done' : date === today ? 'future' : 'missed'
    return { date, state }
  })
  return { currentStreak, bestStreak, rate30: planned ? Math.round(done / planned * 100) : null, doneCount: doneDays.size, calendar }
}
