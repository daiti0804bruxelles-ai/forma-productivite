/**
 * Fusion à trois voies des données Forma, utilisée quand deux appareils ont modifié le compte en même temps.
 * base = version commune de départ, local = cet appareil, remote = version enregistrée par l'autre appareil.
 *
 * Règles :
 * - ce qu'un seul côté a changé est gardé ;
 * - les listes d'éléments (tâches, habitudes, journal XP…) sont fusionnées élément par élément (id ou key) :
 *   un ajout d'un côté et un ajout de l'autre sont tous les deux gardés ;
 * - une suppression est appliquée, sauf si l'autre côté a modifié l'élément entre-temps (on le garde alors) ;
 * - les listes simples (jours d'activité, habitudes cochées…) sont fusionnées comme des ensembles ;
 * - si les deux côtés ont changé exactement la même valeur, celle de cet appareil l'emporte.
 */
type Json = unknown

const isObject = (value: Json): value is Record<string, Json> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function deepEqual(a: Json, b: Json): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, b[i]))
  }
  if (isObject(a) && isObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)].filter(k => a[k] !== undefined || b[k] !== undefined))
    for (const key of keys) if (!deepEqual(a[key], b[key])) return false
    return true
  }
  return false
}

const identityOf = (item: Json): string | null => {
  if (!isObject(item)) return null
  if (typeof item.id === 'string' || typeof item.id === 'number') return `id:${item.id}`
  if (typeof item.key === 'string') return `key:${item.key}`
  return null
}

const primitiveKey = (item: Json) => JSON.stringify(item)

function mergeArrays(base: Json[] | undefined, local: Json[], remote: Json[]): Json[] {
  const all = [...(base ?? []), ...local, ...remote]
  const byIdentity = all.length > 0 && all.every(item => identityOf(item) !== null)
  const keyOf = byIdentity ? (item: Json) => identityOf(item)! : primitiveKey
  const index = (list: Json[] | undefined) => new Map((list ?? []).map(item => [keyOf(item), item] as const))
  const b = index(base), l = index(local), r = index(remote)
  const result: Json[] = []
  const seen = new Set<string>()
  const take = (key: string) => {
    if (seen.has(key)) return
    seen.add(key)
    const inBase = b.has(key), inLocal = l.has(key), inRemote = r.has(key)
    if (inLocal && inRemote) { result.push(byIdentity ? merge3(b.get(key), l.get(key), r.get(key)) : l.get(key)); return }
    if (inLocal) {
      // Absent à distance : soit ajouté ici (on garde), soit supprimé là-bas (on supprime, sauf si modifié ici).
      if (!inBase || (byIdentity && !deepEqual(b.get(key), l.get(key)))) result.push(l.get(key))
      return
    }
    if (inRemote) {
      if (!inBase || (byIdentity && !deepEqual(b.get(key), r.get(key)))) result.push(r.get(key))
    }
  }
  for (const item of local) take(keyOf(item))
  for (const item of remote) take(keyOf(item))
  return result
}

export function merge3<T>(base: T | undefined, local: T, remote: T): T
export function merge3(base: Json, local: Json, remote: Json): Json {
  if (deepEqual(local, remote)) return local
  if (deepEqual(local, base)) return remote
  if (deepEqual(remote, base)) return local
  if (Array.isArray(local) && Array.isArray(remote)) return mergeArrays(Array.isArray(base) ? base : undefined, local, remote)
  if (isObject(local) && isObject(remote)) {
    const b = isObject(base) ? base : {}
    const result: Record<string, Json> = {}
    for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const value = merge3(b[key], local[key], remote[key])
      if (value !== undefined) result[key] = value
    }
    return result
  }
  return local
}
