import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw, Check, TriangleAlert } from 'lucide-react'
import type { SyncStatus } from './useCloudSync'

type Props = { status: SyncStatus; mergedAt: number | null; onRetry: () => void }

/**
 * Indicateur discret : invisible quand tout est enregistré, sauf un bref « Enregistré » après un envoi
 * ou « Synchronisé avec ton autre appareil » après une fusion.
 */
export default function SyncIndicator({ status, mergedAt, onRetry }: Props) {
  const [flash, setFlash] = useState<'saved' | 'merged' | null>(null)
  const [previous, setPrevious] = useState(status)
  if (previous !== status) { setPrevious(status); if (status === 'saved' && previous === 'saving') setFlash(current => current === 'merged' ? current : 'saved') }
  useEffect(() => { if (mergedAt) setFlash('merged') }, [mergedAt])
  useEffect(() => { if (!flash) return; const timer = window.setTimeout(() => setFlash(null), flash === 'merged' ? 3500 : 1800); return () => window.clearTimeout(timer) }, [flash])

  if (status === 'offline') return <button type="button" className="sync-pill is-warn" onClick={onRetry} title="Pas de connexion : tes changements restent sur cet appareil et seront enregistrés au retour du réseau." aria-label="Hors ligne. Tes changements seront enregistrés au retour du réseau. Réessayer maintenant"><CloudOff size={15} /> <span>Hors ligne</span></button>
  if (status === 'error') return <button type="button" className="sync-pill is-error" onClick={onRetry} aria-label="Enregistrement impossible. Réessayer" title="Enregistrement impossible. Touche pour réessayer."><TriangleAlert size={15} /> <span>Réessayer</span></button>
  if (status === 'saving') return <span className="sync-pill" role="status"><RefreshCw size={14} className="spin" /> <span>Enregistrement…</span></span>
  if (flash === 'merged') return <span className="sync-pill is-ok" role="status" title="Les changements de ton autre appareil ont été ajoutés."><Check size={15} /> <span>Synchronisé</span></span>
  if (flash === 'saved') return <span className="sync-pill is-ok is-fading" role="status"><Check size={15} /> <span>Enregistré</span></span>
  return null
}
