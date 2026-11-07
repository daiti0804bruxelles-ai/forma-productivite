/**
 * Fuseau horaire de référence de Forma. Par défaut (undefined), la journée suit l'heure du téléphone.
 * Avec un fuseau fixe, la journée commence et se termine à minuit dans ce fuseau, même en voyage :
 * les habitudes, la série et les pénalités ne sautent plus quand l'appareil change d'heure.
 */
let referenceZone: string | undefined

export const deviceTimeZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
}

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 64) return false
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return true } catch { return false }
}

export function setReferenceTimeZone(zone: string | undefined) {
  referenceZone = isValidTimeZone(zone) ? zone : undefined
}

export function dateKeyInZone(date: Date, zone: string | undefined) {
  if (!zone) return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Jour en cours (AAAA-MM-JJ) selon le fuseau de référence. */
export const currentDayKey = () => dateKeyInZone(new Date(), referenceZone)

export function timeInZone(zone: string | undefined, date = new Date()) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', ...(zone ? { timeZone: zone } : {}) }).format(date)
}

/** Fuseaux proposés : ceux de vos voyages habituels, plus celui du téléphone s'il n'y est pas. */
export const SUGGESTED_ZONES: readonly { zone: string; label: string }[] = [
  { zone: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur' },
  { zone: 'Asia/Bangkok', label: 'Bangkok' },
  { zone: 'Asia/Dubai', label: 'Dubaï' },
  { zone: 'Europe/Brussels', label: 'Bruxelles' },
]
