import type { SupabaseClient } from '@supabase/supabase-js'
import { isAppData } from './appData.ts'
import type { AppData } from './appData.ts'
import { SaveConflictError } from './snapshotWriter.ts'
import type { DataRevision } from './snapshotWriter.ts'

export async function loadUserSnapshot(client: SupabaseClient, userId: string) {
  const { data: row, error } = await client.from('user_data').select('data,updated_at').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (row && !isAppData(row.data)) throw new Error('Les données reçues sont invalides. Aucun remplacement automatique ne sera effectué.')
  if (row && row.updated_at !== null && (typeof row.updated_at !== 'string' || !Number.isFinite(Date.parse(row.updated_at)))) throw new Error('Version de sauvegarde invalide.')
  return { data: row?.data as AppData | undefined, revision: { exists: Boolean(row), updatedAt: row?.updated_at ?? null } }
}

/** Compare-and-swap atomique sur updated_at, avec filtrage explicite du compte.
 * Aucune migration ni modification de politique de production n'est nécessaire.
 * Les anciens clients qui font un upsert aveugle doivent aussi être mis à jour. */
export async function saveUserSnapshot(client: SupabaseClient, userId: string, data: AppData, revision: DataRevision): Promise<DataRevision> {
  if (!userId || !isAppData(data)) throw new Error('Sauvegarde refusée : compte ou données invalides.')
  const updatedAt = new Date(Math.max(Date.now(), (Date.parse(revision.updatedAt ?? '') || 0) + 1)).toISOString()
  let request
  if (!revision.exists) request = client.from('user_data').insert({ user_id: userId, data, updated_at: updatedAt }).select('updated_at').maybeSingle()
  else {
    const update = client.from('user_data').update({ data, updated_at: updatedAt }).eq('user_id', userId)
    request = (revision.updatedAt === null ? update.is('updated_at', null) : update.eq('updated_at', revision.updatedAt)).select('updated_at').maybeSingle()
  }
  const { data: row, error } = await request
  if (error?.code === '23505' || (!error && !row)) throw new SaveConflictError()
  if (error) throw error
  if (!row || typeof row.updated_at !== 'string') throw new Error('Confirmation de sauvegarde manquante.')
  return { exists: true, updatedAt: row.updated_at }
}
