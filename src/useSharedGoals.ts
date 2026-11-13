/**
 * Objectifs à deux (tables Supabase partagées) : un total qu'on remplit ensemble, éventuellement remis à zéro chaque mois.
 * Ils sont convertis au format des objectifs perso (mode 'add') pour réutiliser les cartes et le pavé numérique.
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Goal } from './goalModel'

type Space = { id: string; name: string; owner_id: string }
type Row = { id: string; space_id: string; title: string; unit: string | null; target: number | string; created_by: string; created_at: string; monthly?: boolean }
export type SharedEntry = { id: string; goal_id: string; actor_id: string; amount: number; created_at: string }
export type SharedGoal = Goal & { shared: true; createdBy: string }
type Invitation = { id: string; invited_email: string; status: string; expires_at: string }

const message = (e: unknown) => {
  if (e instanceof Error) return e.message
  const d = e as { message?: string } | null
  return d?.message || 'Une erreur est survenue.'
}

export function useSharedGoals(userId: string | undefined) {
  const [space, setSpace] = useState<Space | null>(null)
  const [members, setMembers] = useState(0)
  const [rows, setRows] = useState<Row[]>([])
  const [entries, setEntries] = useState<SharedEntry[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!userId) return
    const { data: membership, error: e1 } = await supabase.from('shared_space_members').select('space_id').eq('user_id', userId)
    if (e1) throw e1
    const { data: owned, error: e2 } = await supabase.from('shared_spaces').select('id,name,owner_id').eq('owner_id', userId)
    if (e2) throw e2
    const ids = [...new Set([...(membership ?? []).map(m => m.space_id as string), ...(owned ?? []).map(s => s.id as string)])]
    if (!ids.length) { setSpace(null); setRows([]); setEntries([]); setMembers(0); return }
    const { data: spaces, error: e3 } = await supabase.from('shared_spaces').select('id,name,owner_id').in('id', ids).order('created_at')
    if (e3) throw e3
    const s = (spaces ?? [])[0] as Space | undefined
    setSpace(s ?? null)
    if (!s) return
    const [g, m, i] = await Promise.all([
      supabase.from('shared_goals').select('*').eq('space_id', s.id).order('created_at'),
      supabase.from('shared_space_members').select('user_id').eq('space_id', s.id),
      supabase.from('shared_invitations').select('id,invited_email,status,expires_at').eq('space_id', s.id),
    ])
    if (g.error) throw g.error
    setRows((g.data ?? []) as Row[]); setMembers(m.data?.length ?? 0); setInvitations((i.data ?? []) as Invitation[])
    const goalIds = (g.data ?? []).map(x => x.id as string)
    if (!goalIds.length) { setEntries([]); return }
    const r = await supabase.from('shared_goal_entries').select('id,goal_id,actor_id,amount,created_at').in('goal_id', goalIds).order('created_at')
    if (r.error) throw r.error
    setEntries(((r.data ?? []) as SharedEntry[]).map(e => ({ ...e, amount: Number(e.amount) })))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let alive = true
    const tick = () => load().then(() => { if (alive) { setLoaded(true); setError('') } }).catch(e => { if (alive) { setLoaded(true); setError(message(e)) } })
    void tick()
    const timer = window.setInterval(tick, 20000)
    const onFocus = () => { if (document.visibilityState === 'visible') void tick() }
    document.addEventListener('visibilitychange', onFocus)
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', onFocus) }
  }, [userId, load])

  const run = async (action: () => PromiseLike<{ error: unknown }>) => {
    const { error: e } = await action()
    if (e) { setError(message(e)); return false }
    await load().catch(err => setError(message(err)))
    return true
  }

  const goals: SharedGoal[] = rows.map(r => ({
    id: r.id, title: r.title, mode: 'add', createdOn: r.created_at.slice(0, 10), unit: r.unit?.trim() || undefined,
    start: 0, target: Number(r.target), monthly: r.monthly || undefined, shared: true, createdBy: r.created_by,
    history: entries.filter(e => e.goal_id === r.id).map(e => ({ at: e.created_at, value: e.amount })),
  }))

  return {
    loaded, error, clearError: () => setError(''), space, members, goals, invitations: invitations.filter(i => i.status === 'pending'),
    entriesOf: (goalId: string) => entries.filter(e => e.goal_id === goalId),
    isMine: (e: SharedEntry) => e.actor_id === userId,
    add: (goalId: string, amount: number) => run(() => supabase.from('shared_goal_entries').insert({ goal_id: goalId, actor_id: userId, amount })),
    removeEntry: (entryId: string) => run(() => supabase.from('shared_goal_entries').delete().eq('id', entryId).eq('actor_id', userId!)),
    create: (g: { title: string; unit?: string; target: number; monthly?: boolean }) => space ? run(() => supabase.from('shared_goals').insert({
      space_id: space.id, title: g.title, unit: g.unit ?? null, target: g.target, tracking: 'shared', created_by: userId, ...(g.monthly ? { monthly: true } : {}),
    })) : Promise.resolve(false),
    update: (goalId: string, patch: { title?: string; target?: number; monthly?: boolean }) => run(() => supabase.from('shared_goals').update(patch).eq('id', goalId)),
    remove: (goalId: string) => run(() => supabase.from('shared_goals').delete().eq('id', goalId)),
    createSpace: () => run(() => supabase.from('shared_spaces').insert({ name: 'Notre espace', owner_id: userId })),
    invite: async (email: string) => {
      const clean = email.trim().toLowerCase()
      if (!space || !/^\S+@\S+\.\S+$/.test(clean)) { setError('Adresse e-mail invalide.'); return null }
      const { data, error: e } = await supabase.from('shared_invitations').insert({ space_id: space.id, invited_email: clean, invited_by: userId }).select('id').single()
      if (e) { setError(message(e)); return null }
      await load().catch(() => {})
      return data.id as string
    },
    accept: (invitationId: string) => run(() => supabase.rpc('forma_accept_shared_invitation', { p_invitation: invitationId })),
    isOwner: space?.owner_id === userId,
  }
}
export const inviteLink = (id: string) => `${window.location.origin}/?invite=${encodeURIComponent(id)}`
