import { supabase } from './lib/supabase'

/**
 * Sauvegardes automatiques dans Supabase (table user_data_backups, voir supabase/migrations).
 * Une copie complète du compte est faite au plus une fois par semaine, à l'ouverture de l'app,
 * et juste avant chaque restauration. Les 8 plus récentes sont gardées (environ 2 mois).
 * Si la table n'existe pas encore, tout est ignoré sans gêner l'app.
 */
export const BACKUP_INTERVAL_DAYS = 7
export const BACKUPS_KEPT = 8

export type BackupInfo = { id: string; created_at: string; reason: string }

export async function listBackups(userId: string): Promise<BackupInfo[]> {
  const { data, error } = await supabase.from('user_data_backups').select('id, created_at, reason')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(BACKUPS_KEPT + 4)
  if (error) throw error
  return (data ?? []) as BackupInfo[]
}

export async function readBackupData(userId: string, id: string): Promise<unknown> {
  const { data, error } = await supabase.from('user_data_backups').select('data').eq('user_id', userId).eq('id', id).single()
  if (error) throw error
  return data.data
}

export async function createBackup(userId: string, data: unknown, reason: 'hebdomadaire' | 'avant restauration') {
  const { error } = await supabase.from('user_data_backups').insert({ user_id: userId, data, reason })
  if (error) throw error
  await pruneBackups(userId)
}

async function pruneBackups(userId: string) {
  const all = await listBackups(userId)
  const extra = all.slice(BACKUPS_KEPT).map(backup => backup.id)
  if (extra.length) await supabase.from('user_data_backups').delete().eq('user_id', userId).in('id', extra)
}

/** À l'ouverture : crée la sauvegarde hebdomadaire si la dernière date de plus de 7 jours. */
export async function ensureWeeklyBackup(userId: string, data: unknown) {
  try {
    const [last] = await listBackups(userId)
    const age = last ? Date.now() - Date.parse(last.created_at) : Infinity
    if (age >= BACKUP_INTERVAL_DAYS * 86400000) await createBackup(userId, data, 'hebdomadaire')
  } catch (error) {
    console.warn('Sauvegarde automatique indisponible :', error)
  }
}
