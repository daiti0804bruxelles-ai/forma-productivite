import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'

export type QuickAddType = 'task' | 'habit' | 'event'
type Period = 'Matin' | 'Après-midi' | 'Soir'
export type QuickAddPayload =
  | { type: 'task'; title: string; category: string; date: string }
  | { type: 'habit'; title: string; category: string; period: Period }
  | { type: 'event'; title: string; category: string; date: string; time: string; endTime: string }

type Props = {
  initialType: QuickAddType
  today: string
  tomorrow: string
  categories: readonly string[]
  onClose: () => void
  onSubmit: (payload: QuickAddPayload) => void
  onMoreOptions: (type: QuickAddType, title: string) => void
}

const TYPES: { id: QuickAddType; label: string }[] = [{ id: 'task', label: 'Tâche' }, { id: 'habit', label: 'Habitude' }, { id: 'event', label: 'Activité' }]
const PERIODS: Period[] = ['Matin', 'Après-midi', 'Soir']
const PLACEHOLDERS: Record<QuickAddType, string> = { task: 'Que veux-tu faire ?', habit: 'Ex. : Méditer 10 minutes', event: 'Ex. : Séance de sport' }

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: string }) {
  return <button type="button" className="chip" aria-pressed={selected} onClick={onClick}>{children}</button>
}

export default function QuickAdd({ initialType, today, tomorrow, categories, onClose, onSubmit, onMoreOptions }: Props) {
  const [type, setType] = useState<QuickAddType>(initialType)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(categories.includes('Travail') ? 'Travail' : categories[0])
  const [date, setDate] = useState(today)
  const [pickDate, setPickDate] = useState(false)
  const [period, setPeriod] = useState<Period>('Matin')
  const [time, setTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const invalidTime = type === 'event' && endTime <= time
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = title.trim()
    if (!clean || invalidTime) return
    if (type === 'task') onSubmit({ type, title: clean, category, date })
    else if (type === 'habit') onSubmit({ type, title: clean, category, period })
    else onSubmit({ type, title: clean, category, date, time, endTime })
  }
  const chooseDay = (value: string) => { setDate(value); setPickDate(false) }

  return <div className="sheet-backdrop" onMouseDown={onClose}>
    <form className="sheet" role="dialog" aria-modal="true" aria-label="Ajout rapide" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
      <div className="sheet-grabber" aria-hidden="true" />
      <div className="sheet-head">
        <div className="segmented" role="tablist" aria-label="Type d'élément">
          {TYPES.map(t => <button key={t.id} type="button" role="tab" aria-selected={type === t.id} onClick={() => setType(t.id)}>{t.label}</button>)}
        </div>
        <button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><X size={20} /></button>
      </div>

      <label className="field">
        <span>Nom</span>
        <input autoFocus required maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder={PLACEHOLDERS[type]} enterKeyHint="done" />
      </label>

      {type === 'habit' ? <div className="field">
        <span>Moment de la journée</span>
        <div className="chips">{PERIODS.map(p => <Chip key={p} selected={period === p} onClick={() => setPeriod(p)}>{p}</Chip>)}</div>
      </div> : <div className="field">
        <span>Quand</span>
        <div className="chips">
          <Chip selected={!pickDate && date === today} onClick={() => chooseDay(today)}>Aujourd’hui</Chip>
          <Chip selected={!pickDate && date === tomorrow} onClick={() => chooseDay(tomorrow)}>Demain</Chip>
          <Chip selected={pickDate || (date !== today && date !== tomorrow)} onClick={() => setPickDate(true)}>Autre date</Chip>
        </div>
        {(pickDate || (date !== today && date !== tomorrow)) && <input type="date" required aria-label="Date" value={date} onChange={e => setDate(e.target.value)} />}
      </div>}

      {type === 'event' && <div className="field-row">
        <label className="field"><span>Début</span><input type="time" required value={time} onChange={e => setTime(e.target.value)} /></label>
        <label className="field"><span>Fin</span><input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} /></label>
      </div>}
      {invalidTime && <p role="alert" className="form-error">L’heure de fin doit être après l’heure de début.</p>}

      <div className="field">
        <span>Catégorie</span>
        <div className="chips">{categories.map(c => <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>{c}</Chip>)}</div>
      </div>

      <div className="sheet-actions">
        <button type="button" className="text-action" onClick={() => onMoreOptions(type, title.trim())}>Plus d’options</button>
        <button type="submit" className="primary-btn" disabled={!title.trim() || invalidTime}>Ajouter</button>
      </div>
    </form>
  </div>
}
