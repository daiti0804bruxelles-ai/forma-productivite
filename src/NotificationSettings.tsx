import { useEffect, useState } from 'react'
import { currentSubscription, disablePush, enablePush, isIOS, isStandalone, pushSupported, sendTestNotification, type NotificationPrefs } from './push'

type Props = { userId: string; prefs: NotificationPrefs | undefined; onChange: (next: NotificationPrefs) => void }
type DeviceState = 'loading' | 'unsupported' | 'install' | 'denied' | 'off' | 'on'

const REMINDERS: { key: keyof NotificationPrefs; title: string; hint: string }[] = [
  { key: 'beforeEvent', title: 'Avant une activité', hint: '15 minutes avant chaque activité du calendrier' },
  { key: 'evening', title: 'Rappel du soir', hint: 'À 21h, seulement s’il te reste des choses à faire' },
  { key: 'morning', title: 'Résumé du matin', hint: 'À 8h : tâches, habitudes et prochaine activité' },
]

export default function NotificationSettings({ userId, prefs, onChange }: Props) {
  const [device, setDevice] = useState<DeviceState>('loading')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const value = { beforeEvent: true, evening: true, morning: true, ...(prefs ?? {}) }

  useEffect(() => {
    if (isIOS() && !isStandalone()) { setDevice('install'); return }
    if (!pushSupported()) { setDevice('unsupported'); return }
    if (Notification.permission === 'denied') { setDevice('denied'); return }
    currentSubscription().then(sub => setDevice(sub ? 'on' : 'off')).catch(() => setDevice('off'))
  }, [])

  const toggleDevice = async () => {
    setBusy(true); setMessage('')
    try {
      if (device === 'on') { await disablePush(); setDevice('off') }
      else { await enablePush(userId); setDevice('on'); setMessage('Notifications activées sur cet appareil.') }
    } catch (error) {
      if ((error as Error).message === 'permission') { setDevice(Notification.permission === 'denied' ? 'denied' : 'off'); setMessage('Autorisation refusée.') }
      else { console.error(error); setMessage('Activation impossible pour le moment. Vérifie ta connexion et réessaie.') }
    } finally { setBusy(false) }
  }
  const test = async () => {
    setBusy(true); setMessage('')
    try {
      const sub = await currentSubscription()
      const result = sub ? await sendTestNotification(sub.endpoint) : null
      setMessage(result?.sent ? 'Notification de test envoyée.' : 'Aucune notification envoyée : désactive puis réactive cet appareil.')
    } catch (error) { console.error(error); setMessage('Test impossible pour le moment.') } finally { setBusy(false) }
  }

  return <div className="notification-settings">
    <section className="settings-group">
      <h3>Cet appareil</h3>
      {device === 'install' && <div className="install-steps">
        <p>Sur iPhone, les notifications fonctionnent quand Forma est sur l’écran d’accueil :</p>
        <ol>
          <li>Ouvre Forma dans <strong>Safari</strong>.</li>
          <li>Touche le bouton <strong>Partager</strong> (carré avec une flèche).</li>
          <li>Choisis <strong>« Sur l’écran d’accueil »</strong>, puis <strong>Ajouter</strong>.</li>
          <li>Ouvre Forma depuis sa nouvelle icône et reviens ici.</li>
        </ol>
      </div>}
      {device === 'unsupported' && <p className="settings-hint">Ce navigateur ne gère pas les notifications. Essaie avec Chrome, Edge ou Safari à jour.</p>}
      {device === 'denied' && <p className="settings-hint">Les notifications sont bloquées pour Forma. Autorise-les dans les réglages du navigateur ou du téléphone, puis reviens ici.</p>}
      {(device === 'on' || device === 'off' || device === 'loading') && <div className="settings-list">
        <div className="settings-row">
          <span><strong>Notifications</strong><small>{device === 'on' ? 'Activées sur cet appareil' : 'Désactivées sur cet appareil'}</small></span>
          <button type="button" role="switch" className="switch" aria-checked={device === 'on'} aria-label="Notifications sur cet appareil" disabled={busy || device === 'loading'} onClick={() => { void toggleDevice() }}><span /></button>
        </div>
        {device === 'on' && <div className="settings-row"><span><strong>Tester</strong><small>Envoie une notification maintenant</small></span><button type="button" className="text-action" disabled={busy} onClick={() => { void test() }}>Envoyer</button></div>}
      </div>}
      {message && <p className="settings-hint" role="status">{message}</p>}
    </section>
    <section className="settings-group">
      <h3>Rappels</h3>
      <div className="settings-list">
        {REMINDERS.map(r => <div className="settings-row" key={r.key}>
          <span><strong>{r.title}</strong><small>{r.hint}</small></span>
          <button type="button" role="switch" className="switch" aria-checked={value[r.key]} aria-label={r.title} onClick={() => onChange({ ...value, [r.key]: !value[r.key] })}><span /></button>
        </div>)}
      </div>
      <p className="settings-hint">Valables sur tous tes appareils activés. Les heures suivent ton fuseau horaire Forma.</p>
    </section>
  </div>
}
