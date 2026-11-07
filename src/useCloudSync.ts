import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { deepEqual, merge3 } from './syncMerge'

export type SyncStatus = 'saved' | 'saving' | 'offline' | 'error'

type Options<T> = {
  userId: string | undefined
  data: T
  setData: (value: T) => void
  /** Appliqué à chaque donnée reçue du serveur (migrations, passage au jour suivant). */
  prepare: (value: T) => T
  fallback: () => T
}

type Snapshot<T> = { data: T | null; updatedAt: string | null; exists: boolean }

const isNetworkError = (error: unknown) =>
  (typeof navigator !== 'undefined' && navigator.onLine === false) ||
  /fetch|network|timeout|load failed/i.test(String((error as { message?: string })?.message ?? error))

/**
 * Synchronisation sûre entre appareils.
 * - Chaque enregistrement est conditionnel : il ne passe que si personne n'a écrit depuis notre dernière lecture
 *   (comparaison sur updated_at). Sinon on relit, on fusionne (voir syncMerge) et on réessaie : rien n'est écrasé.
 * - Au retour sur l'app (focus, onglet visible, retour du réseau), on récupère les changements des autres appareils.
 * - Quand l'app passe en arrière-plan, l'enregistrement en attente part tout de suite.
 */
export function useCloudSync<T>({ userId, data, setData, prepare, fallback }: Options<T>) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [status, setStatus] = useState<SyncStatus>('saved')
  const [mergedAt, setMergedAt] = useState<number | null>(null)
  const base = useRef<Snapshot<T>>({ data: null, updatedAt: null, exists: false })
  const latest = useRef(data)
  const loadedFor = useRef<string | null>(null)
  const busy = useRef(false)
  const again = useRef(false)
  const retryTimer = useRef<number | null>(null)
  const opts = useRef({ prepare, fallback, setData })
  opts.current = { prepare, fallback, setData }
  latest.current = data

  const apply = useCallback((value: T) => { latest.current = value; opts.current.setData(value) }, [])

  const fetchRemote = useCallback(async (id: string): Promise<Snapshot<T>> => {
    const { data: row, error } = await supabase.from('user_data').select('data, updated_at').eq('user_id', id).maybeSingle()
    if (error) throw error
    return row ? { data: row.data as T, updatedAt: (row.updated_at as string | null) ?? null, exists: true } : { data: null, updatedAt: null, exists: false }
  }, [])

  /** Intègre la version du serveur si elle a changé depuis notre dernière lecture. */
  const pull = useCallback(async (id: string) => {
    const remote = await fetchRemote(id)
    if (!remote.exists || remote.updatedAt === base.current.updatedAt) return false
    const merged = merge3(base.current.data ?? undefined, latest.current, remote.data as T)
    base.current = remote
    apply(opts.current.prepare(merged))
    setMergedAt(Date.now())
    return true
  }, [apply, fetchRemote])

  const save = useCallback(async () => {
    const id = userId
    if (!id || loadedFor.current !== id) return
    if (busy.current) { again.current = true; return }
    busy.current = true
    if (retryTimer.current) { window.clearTimeout(retryTimer.current); retryTimer.current = null }
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const sent = latest.current
        if (base.current.exists && deepEqual(sent, base.current.data)) { setStatus('saved'); break }
        setStatus('saving')
        const updatedAt = new Date().toISOString()
        let rows: { updated_at: string | null }[] | null
        if (!base.current.exists) {
          const { data: inserted, error } = await supabase.from('user_data').insert({ user_id: id, data: sent, updated_at: updatedAt }).select('updated_at')
          if (error && error.code !== '23505') throw error // 23505 : un autre appareil a créé la ligne entre-temps
          rows = error ? [] : inserted
        } else {
          let query = supabase.from('user_data').update({ data: sent, updated_at: updatedAt }).eq('user_id', id)
          query = base.current.updatedAt ? query.eq('updated_at', base.current.updatedAt) : query.is('updated_at', null)
          const { data: updated, error } = await query.select('updated_at')
          if (error) throw error
          rows = updated
        }
        if (rows && rows.length === 1) {
          base.current = { data: sent, updatedAt: rows[0].updated_at ?? updatedAt, exists: true }
          if (deepEqual(latest.current, sent)) { setStatus('saved'); break }
          continue // modifié pendant l'envoi : on renvoie la dernière version
        }
        // Un autre appareil a enregistré entre-temps : on fusionne au lieu d'écraser, puis on réessaie.
        const remote = await fetchRemote(id)
        const merged = merge3(base.current.data ?? undefined, latest.current, (remote.data ?? latest.current) as T)
        base.current = remote
        apply(opts.current.prepare(merged))
        setMergedAt(Date.now())
      }
    } catch (error) {
      console.error('Erreur de synchronisation Supabase :', error)
      setStatus(isNetworkError(error) ? 'offline' : 'error')
      retryTimer.current = window.setTimeout(() => { void save() }, 15000)
    } finally {
      busy.current = false
      if (again.current) { again.current = false; void save() }
    }
  }, [userId, apply, fetchRemote])

  // Chargement initial.
  useEffect(() => {
    loadedFor.current = null
    if (!userId) { setLoading(true); return }
    let cancelled = false
    setLoadError(false)
    setLoading(true)
    fetchRemote(userId).then(remote => {
      if (cancelled) return
      base.current = remote
      apply(opts.current.prepare(remote.data ?? opts.current.fallback()))
      loadedFor.current = userId
      setStatus('saved')
      setLoading(false)
    }).catch(error => {
      if (cancelled) return
      console.error('Erreur de chargement Supabase :', error)
      setLoadError(true)
    })
    return () => { cancelled = true }
  }, [userId, apply, fetchRemote])

  // Enregistrement une seconde après la dernière modification.
  useEffect(() => {
    if (loading || !userId || loadedFor.current !== userId) return
    if (base.current.exists && deepEqual(data, base.current.data)) return
    setStatus(current => current === 'offline' || current === 'error' ? current : 'saving')
    const timer = window.setTimeout(() => { void save() }, 1000)
    return () => window.clearTimeout(timer)
  }, [data, loading, userId, save])

  // Retour sur l'app : récupérer les changements des autres appareils. Départ : envoyer tout de suite.
  useEffect(() => {
    if (loading || !userId) return
    const refresh = () => {
      if (busy.current) return
      pull(userId).then(() => save()).catch(error => {
        setStatus(isNetworkError(error) ? 'offline' : 'error')
      })
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); else void save() }
    const onHide = () => { void save() }
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [loading, userId, pull, save])

  useEffect(() => () => { if (retryTimer.current) window.clearTimeout(retryTimer.current) }, [])

  /** Remplace tout le compte (restauration d'une sauvegarde), sur la base de la version la plus récente du serveur. */
  const replaceAll = useCallback(async (value: T) => {
    if (!userId) throw new Error('Non connecté')
    for (let waited = 0; busy.current && waited < 100; waited++) await new Promise(resolve => window.setTimeout(resolve, 100))
    const remote = await fetchRemote(userId)
    base.current = remote
    apply(value)
    await save()
    if (!base.current.exists || !deepEqual(base.current.data, value)) throw new Error('Restauration non enregistrée')
  }, [userId, apply, fetchRemote, save])

  return { loading, loadError, status, mergedAt, retry: save, replaceAll }
}
