/** Jours de la semaine (0 = dimanche, comme Date.getDay), affichés du lundi au dimanche. */
export const WEEKDAYS: readonly { day: number; short: string; letter: string; name: string }[] = [
  { day: 1, short: 'Lun', letter: 'L', name: 'lundi' },
  { day: 2, short: 'Mar', letter: 'M', name: 'mardi' },
  { day: 3, short: 'Mer', letter: 'M', name: 'mercredi' },
  { day: 4, short: 'Jeu', letter: 'J', name: 'jeudi' },
  { day: 5, short: 'Ven', letter: 'V', name: 'vendredi' },
  { day: 6, short: 'Sam', letter: 'S', name: 'samedi' },
  { day: 0, short: 'Dim', letter: 'D', name: 'dimanche' },
]

/** Liste vide = tous les jours. On garde toujours au moins un jour. */
export function toggleWeekday(days: readonly number[], day: number): number[] {
  const current = days.length ? [...days] : WEEKDAYS.map(w => w.day)
  const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day]
  if (!next.length) return [...days]
  return next.length === 7 ? [] : next.sort((a, b) => a - b)
}

export const isScheduledOn = (days: readonly number[] | undefined, weekday: number) => !days || !days.length || days.includes(weekday)

export function daysLabel(days: readonly number[] | undefined) {
  if (!days || !days.length || days.length === 7) return 'Tous les jours'
  const set = new Set(days)
  if (set.size === 5 && [1, 2, 3, 4, 5].every(d => set.has(d))) return 'En semaine'
  if (set.size === 2 && set.has(0) && set.has(6)) return 'Le week-end'
  if (set.size === 6) return `Sauf le ${WEEKDAYS.find(w => !set.has(w.day))?.name}`
  return WEEKDAYS.filter(w => set.has(w.day)).map(w => w.short).join(', ')
}
