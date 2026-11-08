import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import SkillSelector from './SkillSelector'
import { suggestSkills } from './skillSuggest'
import type { SkillId } from './skillsCatalog'
import { DIFFICULTIES, type Difficulty } from './xpEngine'
import { WEEKDAYS, toggleWeekday, isScheduledOn } from './weekdays'
import { parseQuickText } from './quickParse'

export type QuickAddType = 'task' | 'habit' | 'event'
type Period = 'Matin' | 'Après-midi' | 'Soir'
export type QuickAddPayload =
  | { type: 'task'; title: string; category: string; date: string; recurring: boolean; difficulty: Difficulty; skillIds: SkillId[] }
  | { type: 'habit'; title: string; category: string; period: Period; difficulty: Difficulty; skillIds: SkillId[]; days?: number[] }
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
const PLACEHOLDERS: Record<QuickAddType, string> = { task: 'Ex. : Appeler le comptable demain 14h', habit: 'Ex. : Méditer 10 minutes', event: 'Ex. : Séance de sport' }

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: string }) {
  return <button type="button" className="chip" aria-pressed={selected} onClick={onClick}>{children}</button>
}

export default function QuickAdd({ initialType, today, tomorrow, categories, onClose, onSubmit, onMoreOptions }: Props) {
  const [type, setType] = useState<QuickAddType>(initialType)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(categories.includes('Travail') ? 'Travail' : categories[0])
  const [date, setDate] = useState(today)
  const [pickDate, setPickDate] = useState(false)
  const [everyDay, setEveryDay] = useState(false)
  const [period, setPeriod] = useState<Period>('Matin')
  const [time, setTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [difficulty, setDifficulty] = useState<Difficulty>('moyen')
  const [skills, setSkills] = useState<SkillId[]>([])
  const [skillsTouched, setSkillsTouched] = useState(false)
  const [days, setDays] = useState<number[]>([])
  const [ignoreParse, setIgnoreParse] = useState(false)
  const [autoEvent, setAutoEvent] = useState(false)
  // Ajout malin : « demain », « lundi », « le 15 », « tous les jours », « 14h »… règlent les champs tout seuls.
  const parsed = useMemo(() => type === 'habit' || ignoreParse ? null : parseQuickText(title, today), [title, today, type, ignoreParse])
  const parsedKey = parsed ? `${parsed.date ?? ''}|${parsed.time ?? ''}|${parsed.everyDay ? 1 : 0}` : ''
  useEffect(() => {
    if (!parsed || !parsed.labels.length) return
    if (parsed.time) {
      setType('event'); setAutoEvent(true); setTime(parsed.time)
      const [h, m] = parsed.time.split(':').map(Number)
      setEndTime(h >= 23 ? '23:59' : `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
    if (parsed.everyDay && !parsed.time) { setEveryDay(true); setPickDate(false); setDate(today) }
    if (parsed.date) { setDate(parsed.date); setPickDate(false); setEveryDay(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedKey])
  const cleanTitle = parsed?.labels.length ? parsed.title : title.trim()
  const ignore = () => {
    setIgnoreParse(true); setDate(today); setEveryDay(false); setPickDate(false)
    if (autoEvent) { setType(initialType); setAutoEvent(false) }
  }

  // Tant que tu n'as pas modifié les compétences, Forma les propose d'après le nom.
  useEffect(() => {
    if (skillsTouched || type === 'event') return
    setSkills(cleanTitle ? suggestSkills(cleanTitle, category, type === 'habit' || everyDay ? 'habit' : 'task') : [])
  }, [cleanTitle, category, type, skillsTouched, everyDay])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const invalidTime = type === 'event' && endTime <= time
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = cleanTitle
    if (!clean || invalidTime) return
    if (type === 'task') onSubmit({ type, title: clean, category, date: everyDay ? today : date, recurring: everyDay, difficulty, skillIds: skills })
    else if (type === 'habit') onSubmit({ type, title: clean, category, period, difficulty, skillIds: skills, days: days.length ? days : undefined })
    else onSubmit({ type, title: clean, category, date, time, endTime })
  }
  const chooseDay = (value: string) => { setDate(value); setPickDate(false); setEveryDay(false) }

  return <div className="sheet-backdrop" onMouseDown={onClose}>
    <form className="sheet" role="dialog" aria-modal="true" aria-label="Ajout rapide" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
      <div className="sheet-grabber" aria-hidden="true" />
      <div className="sheet-head">
        <div className="segmented" role="tablist" aria-label="Type d'élément">
          {TYPES.map(t => <button key={t.id} type="button" role="tab" aria-selected={type === t.id} onClick={() => { setType(t.id); setAutoEvent(false); if (t.id !== 'task') setEveryDay(false) }}>{t.label}</button>)}
        </div>
        <button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><X size={20} /></button>
      </div>

      <label className="field">
        <span>Nom</span>
        <input autoFocus required maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder={PLACEHOLDERS[type]} enterKeyHint="done" />
      </label>
      {parsed && parsed.labels.length > 0 && <p className="quick-understood" role="status">
        <span>Compris : <strong>{parsed.labels.join(' · ')}</strong>{autoEvent && type === 'event' ? ' → activité' : ''}{parsed.title !== title.trim() ? <> · « {parsed.title} »</> : null}</span>
        <button type="button" className="text-action" onClick={ignore}>Ignorer</button>
      </p>}

      {type === 'habit' ? <>
        <div className="field">
          <span>Moment de la journée</span>
          <div className="chips">{PERIODS.map(p => <Chip key={p} selected={period === p} onClick={() => setPeriod(p)}>{p}</Chip>)}</div>
        </div>
        <div className="field">
          <span>Jours {days.length ? '' : '· tous les jours'}</span>
          <div className="day-picker">{WEEKDAYS.map(w => <button key={w.day} type="button" className="day-chip" aria-label={w.name} aria-pressed={isScheduledOn(days, w.day)} onClick={() => setDays(toggleWeekday(days, w.day))}>{w.letter}</button>)}</div>
        </div>
      </> : <div className="field">
        <span>Quand</span>
        <div className="chips">
          <Chip selected={!everyDay && !pickDate && date === today} onClick={() => chooseDay(today)}>Aujourd’hui</Chip>
          <Chip selected={!everyDay && !pickDate && date === tomorrow} onClick={() => chooseDay(tomorrow)}>Demain</Chip>
          {type === 'task' && <Chip selected={everyDay} onClick={() => { setEveryDay(true); setPickDate(false); setDate(today) }}>Tous les jours</Chip>}
          <Chip selected={!everyDay && (pickDate || (date !== today && date !== tomorrow))} onClick={() => { setPickDate(true); setEveryDay(false) }}>Autre date</Chip>
        </div>
        {type === 'task' && everyDay && <p className="settings-hint">Revient chaque jour · −1,5 XP les jours où elle n’est pas faite.</p>}
        {!everyDay && (pickDate || (date !== today && date !== tomorrow)) && <input type="date" required aria-label="Date" value={date} onChange={e => setDate(e.target.value)} />}
      </div>}

      {type === 'event' && <div className="field-row">
        <label className="field"><span>Début</span><input type="time" required value={time} onChange={e => setTime(e.target.value)} /></label>
        <label className="field"><span>Fin</span><input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} /></label>
      </div>}
      {invalidTime && <p role="alert" className="form-error">L’heure de fin doit être après l’heure de début.</p>}

      {type !== 'event' && <>
        <div className="field">
          <span>Difficulté</span>
          <div className="chips">{DIFFICULTIES.map(d => <button key={d.id} type="button" className="chip" aria-pressed={difficulty === d.id} onClick={() => setDifficulty(d.id)}>{d.label} <small>{d.xp} XP</small></button>)}</div>
        </div>
        <SkillSelector value={skills} onChange={next => { setSkillsTouched(true); setSkills(next) }} hint={skillsTouched ? undefined : 'Suggestion automatique d’après le nom.'} />
      </>}

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
