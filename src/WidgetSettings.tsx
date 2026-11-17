import { useState } from 'react'
import { newWidgetKey, widgetScript } from './widgetScript'

const API = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/widget`

/** Réglages → Widget iPhone : clé personnelle et script Scriptable à copier. */
export default function WidgetSettings({ widgetKey, onKey }: { widgetKey?: string; onKey: (key: string | undefined) => void }) {
  const [copied, setCopied] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const copy = async (key: string) => {
    try { await navigator.clipboard.writeText(widgetScript(key, API, window.location.origin)); setCopied(true); window.setTimeout(() => setCopied(false), 2500) } catch { setCopied(false) }
  }
  const create = () => { const key = newWidgetKey(); onKey(key); void copy(key) }
  return <div className="widget-settings">
    <ol className="widget-steps">
      <li>Installe <strong>Scriptable</strong> (App Store, gratuit).</li>
      <li>Copie le script ci-dessous.</li>
      <li>Dans Scriptable : <strong>+</strong>, colle, nomme-le « Forma ».</li>
      <li>Écran d’accueil : appui long → <strong>+</strong> → Scriptable (taille moyenne), puis « Modifier le widget » → Script : Forma.</li>
      <li>Dans « Paramètre », écris le widget voulu : <strong>journée</strong>, <strong>rappels</strong> ou <strong>objectif</strong> (ou « objectif: CA » pour en choisir un).</li>
    </ol>
    <p className="settings-hint">Écran verrouillé : appui long sur l’écran verrouillé → Personnaliser → touche la zone sous l’heure → Scriptable, puis même réglage.</p>
    {widgetKey
      ? <button type="button" className="primary-btn" onClick={() => { void copy(widgetKey) }}>{copied ? 'Script copié ✓' : 'Copier le script'}</button>
      : <button type="button" className="primary-btn" onClick={create}>{copied ? 'Script copié ✓' : 'Créer ma clé et copier le script'}</button>}
    <p className="settings-hint">Le script contient ta clé personnelle : il permet de lire ton résumé du jour. Ne le partage pas.</p>
    {widgetKey && <div className="widget-reset">
      {confirmReset
        ? <><span className="settings-hint">L’ancien widget ne marchera plus.</span><button type="button" className="text-action" onClick={() => setConfirmReset(false)}>Annuler</button><button type="button" className="danger-link" onClick={() => { const key = newWidgetKey(); onKey(key); setConfirmReset(false); void copy(key) }}>Changer</button></>
        : <><button type="button" className="text-action" onClick={() => setConfirmReset(true)}>Changer la clé</button><button type="button" className="text-action" onClick={() => onKey(undefined)}>Désactiver</button></>}
    </div>}
  </div>
}
