/**
 * Ajout rapide malin : lit la phrase tapée et en extrait le jour, l'heure et « tous les jours ».
 * Ex. « Appeler le comptable demain 14h » → titre « Appeler le comptable », date = demain, heure 14:00.
 * Les mots reconnus sont retirés du titre. Rien n'est deviné en dehors de ces expressions précises.
 */
export type QuickParse = {
  title: string
  date?: string // AAAA-MM-JJ
  time?: string // HH:MM
  everyDay?: boolean
  labels: string[] // ce que Forma a compris, pour l'afficher
}

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']

const toDate = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d) }
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (key: string, n: number) => { const d = toDate(key); d.setDate(d.getDate() + n); return keyOf(d) }
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const frDay = (key: string) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(toDate(key))

export function parseQuickText(text: string, today: string): QuickParse {
  let rest = ` ${text} `
  const labels: string[] = []
  const result: QuickParse = { title: text.trim(), labels }
  // Remplace un motif (sur la version sans accents) en gardant les positions du texte d'origine.
  const take = (pattern: RegExp): RegExpMatchArray | null => {
    const match = plain(rest).match(pattern)
    if (!match || match.index === undefined) return null
    rest = rest.slice(0, match.index) + ' ' + rest.slice(match.index + match[0].length)
    return match
  }

  if (take(/\s(tous les jours|chaque jour|quotidien(ne)?)(?=\s)/)) { result.everyDay = true; labels.push('Tous les jours') }

  const time = take(/\s(?:a\s+)?([01]?\d|2[0-3])\s?(?:h|:)\s?([0-5]\d)?(?=\s)/)
  if (time) {
    result.time = `${time[1].padStart(2, '0')}:${time[2] ?? '00'}`
    labels.push(result.time.replace(':', 'h'))
  }

  if (!result.everyDay) {
    let date: string | undefined
    if (take(/\s(apres[- ]demain)(?=\s)/)) date = addDays(today, 2)
    else if (take(/\s(demain)(?=\s)/)) date = addDays(today, 1)
    else if (take(/\s(aujourd'?hui|ce soir|ce matin)(?=\s)/)) date = today
    else {
      const weekday = take(/\s(?:ce\s+|le\s+|prochain\s+)?(dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi)(?:\s+prochain)?(?=\s)/)
      if (weekday) {
        const target = WEEKDAYS.indexOf(weekday[1])
        const diff = (target - toDate(today).getDay() + 7) % 7 || 7 // toujours le prochain, jamais aujourd'hui
        date = addDays(today, diff)
      } else {
        const dayMonth = take(/\s(?:le\s+)?([12]?\d|3[01])(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?=\s)/)
        const dayOnly = dayMonth ? null : take(/\s(?:le\s+)([12]?\d|3[01])(?:er)?(?=\s)/)
        const match = dayMonth ?? dayOnly
        if (match) {
          const t = toDate(today)
          const day = Number(match[1])
          let month = dayMonth ? MONTHS.indexOf(match[2]) : t.getMonth()
          let year = t.getFullYear()
          let candidate = new Date(year, month, day)
          if (keyOf(candidate) < today) { if (dayMonth) year++; else month++; candidate = new Date(year, month, day) }
          if (candidate.getDate() === day) date = keyOf(candidate) // ignore le 31 d'un mois de 30 jours
        }
      }
    }
    if (date) { result.date = date; labels.unshift(date === today ? 'Aujourd’hui' : date === addDays(today, 1) ? 'Demain' : frDay(date)) }
  }

  if (labels.length) result.title = rest.replace(/\s+/g, ' ').trim().replace(/\s+(a|à|le|pour)$/i, '')
  return result
}
