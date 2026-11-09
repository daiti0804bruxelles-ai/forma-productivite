/**
 * Création d'objectif en une phrase : « Perdre 12 kg d'ici février », « Lire 12 livres en 2027 »,
 * « 10 000 $ ce mois », « Passer de 92 à 80 kg », « Créer la société à Dubaï », « Être plus discipliné ».
 * Renvoie le type deviné, la cible et l'échéance ; le titre garde la phrase sans l'échéance.
 */
import type { GoalKind } from './goalModel'

export type GoalGuess = { title: string; kind: GoalKind; target?: number; unit?: string; start?: number; delta?: number; deadline?: string; deadlineLabel?: string }

const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").toLowerCase()
const toDate = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d) }
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const endOfMonth = (y: number, m: number) => keyOf(new Date(y, m + 1, 0))
const label = (key: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(toDate(key))
const num = (s: string) => {
  const k = /k$/i.test(s)
  const n = Number(s.replace(/k$/i, '').replace(/[\s  ]/g, '').replace(',', '.'))
  return k ? n * 1000 : n
}
const NUMBER = String.raw`(\d{1,3}(?:[\s  ]\d{3})+|\d+(?:[.,]\d+)?k?)`
const MEASURE_UNITS = ['kg', 'kilos', 'kilo', 'g', 'cm', '%', 'bpm']

export function parseGoal(text: string, today: string): GoalGuess {
  let rest = ` ${text.trim()} `
  const t = toDate(today)
  let deadline: string | undefined
  const take = (re: RegExp) => { const m = plain(rest).match(re); if (!m || m.index === undefined) return null; rest = rest.slice(0, m.index) + ' ' + rest.slice(m.index + m[0].length); return m }

  // Échéance.
  let m
  if ((m = take(/\s(?:d'?ici|avant|pour)\s+(?:le\s+)?(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?:\s+(\d{4}))?(?=\s)/))) {
    const month = MONTHS.indexOf(m[2]); let year = m[3] ? Number(m[3]) : t.getFullYear()
    let d = new Date(year, month, Number(m[1])); if (!m[3] && keyOf(d) < today) d = new Date(++year, month, Number(m[1]))
    deadline = keyOf(d)
  } else if ((m = take(/\s(?:d'?ici|avant|pour|en|fin)\s+(?:la\s+)?(?:fin\s+(?:de\s+|d')?)?(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?:\s+(\d{4}))?(?=\s)/))) {
    const month = MONTHS.indexOf(m[1]); let year = m[2] ? Number(m[2]) : t.getFullYear()
    if (!m[2] && endOfMonth(year, month) < today) year++
    deadline = endOfMonth(year, month)
  } else if ((m = take(/\s(?:en|pour|d'?ici|avant)\s+(?:fin\s+)?(20\d\d)(?=\s)/))) {
    deadline = `${m[1]}-12-31`
  } else if (take(/\s(?:ce mois(?:-ci)?|d'?ici la fin du mois|cette fin de mois)(?=\s)/)) {
    deadline = endOfMonth(t.getFullYear(), t.getMonth())
  } else if (take(/\s(?:ce trimestre)(?=\s)/)) {
    deadline = endOfMonth(t.getFullYear(), Math.floor(t.getMonth() / 3) * 3 + 2)
  } else if (take(/\s(?:cette annee|d'?ici la fin de l'?annee)(?=\s)/)) {
    deadline = `${t.getFullYear()}-12-31`
  } else if ((m = take(/\s(?:dans|en|d'?ici)\s+(\d+)\s+(jours?|semaines?|mois|ans?)(?=\s)/))) {
    const n = Number(m[1]); const d = new Date(t)
    if (m[2].startsWith('jour')) d.setDate(d.getDate() + n); else if (m[2].startsWith('semaine')) d.setDate(d.getDate() + 7 * n)
    else if (m[2] === 'mois') d.setMonth(d.getMonth() + n); else d.setFullYear(d.getFullYear() + n)
    deadline = keyOf(d)
  }
  const title = rest.replace(/\s+/g, ' ').trim().replace(/[,.;:]$/, '')
  const p = ` ${plain(title)} `
  const guess: GoalGuess = { title: title.charAt(0).toUpperCase() + title.slice(1), kind: 'project', deadline, deadlineLabel: deadline ? label(deadline) : undefined }

  // Mesure : « passer de 92 à 80 kg », « perdre 12 kg », « descendre à 80 kg ».
  if ((m = p.match(new RegExp(String.raw`\sde\s+${NUMBER}\s*([a-z%$€]+)?\s+a\s+${NUMBER}\s*([a-z%$€]+)?`)))) {
    return { ...guess, kind: 'measure', start: num(m[1]), target: num(m[3]), unit: m[4] || m[2] }
  }
  if ((m = p.match(new RegExp(String.raw`\s(perdre|maigrir de|prendre|gagner)\s+${NUMBER}\s*(kg|kilos?|g|cm|%)(?=\s)`)))) {
    const n = num(m[2]); return { ...guess, kind: 'measure', delta: /perdre|maigrir/.test(m[1]) ? -n : n, unit: m[3].startsWith('kilo') ? 'kg' : m[3] }
  }
  if ((m = p.match(new RegExp(String.raw`\s(?:descendre|atteindre|arriver|peser)\s+(?:a\s+)?${NUMBER}\s*(kg|kilos?|cm|%)(?=\s)`)))) {
    return { ...guess, kind: 'measure', target: num(m[1]), unit: m[2].startsWith('kilo') ? 'kg' : m[2] }
  }
  // Chiffre : « lire 12 livres », « 10 000 $ », « 100 séances ».
  if ((m = p.match(new RegExp(String.raw`\s${NUMBER}\s*([$€£]|[a-zà-ÿ]+)?`)))) {
    const raw = m[2] ?? ''
    // L'unité est reprise du texte d'origine (avec ses accents) à la même position.
    const at = (m.index ?? 0) + m[0].lastIndexOf(raw)
    const original = raw ? ` ${title} `.slice(at, at + raw.length) : ''
    const unit = MEASURE_UNITS.includes(raw) ? raw : (raw === 'de' || raw === 'a' ? undefined : (original || undefined))
    return { ...guess, kind: 'count', target: num(m[1]), unit }
  }
  // Sans chiffre : cap de vie ou projet.
  if (/^\s(etre|devenir|rester|me sentir|avoir plus|vivre plus|mieux)\s/.test(p)) return { ...guess, kind: 'vision' }
  return guess
}
