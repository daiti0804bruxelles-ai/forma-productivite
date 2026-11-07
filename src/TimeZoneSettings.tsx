import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { SUGGESTED_ZONES, deviceTimeZone, timeInZone } from './timeZone'

type Props = { value: string | undefined; onChange: (zone: string | undefined) => void }

/** Choix de l'heure qui décide quand la journée change (habitudes, série, pénalités). */
export default function TimeZoneSettings({ value, onChange }: Props) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(timer) }, [])
  const device = deviceTimeZone()
  const zones = SUGGESTED_ZONES.some(z => z.zone === device) ? SUGGESTED_ZONES : [...SUGGESTED_ZONES, { zone: device, label: device.split('/').pop()!.replace(/_/g, ' ') }]
  const extra = value && !zones.some(z => z.zone === value) ? [{ zone: value, label: value.split('/').pop()!.replace(/_/g, ' ') }] : []
  const options = [{ zone: undefined as string | undefined, label: 'Automatique', hint: `Heure du téléphone (${timeInZone(undefined, now)})` },
    ...[...zones, ...extra].map(z => ({ zone: z.zone as string | undefined, label: z.label, hint: `${timeInZone(z.zone, now)}${z.zone === device ? ' · fuseau actuel du téléphone' : ''}` }))]
  return <div className="timezone-settings">
    <p className="settings-hint">La journée de Forma (habitudes, série, pénalités) change à minuit dans ce fuseau. En voyage, garde un fuseau fixe pour qu’un décalage horaire ne fasse pas sauter ou répéter une journée.</p>
    <div className="settings-list" role="radiogroup" aria-label="Fuseau horaire">
      {options.map(option => {
        const selected = (value ?? undefined) === option.zone
        return <button key={option.zone ?? 'auto'} type="button" role="radio" aria-checked={selected} className="settings-row timezone-option" onClick={() => onChange(option.zone)}>
          <span><strong>{option.label}</strong><small>{option.hint}</small></span>
          {selected && <Check size={18} aria-hidden="true" />}
        </button>
      })}
    </div>
  </div>
}
