import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronRight, Copy, Delete, Plus, Trash2, X } from 'lucide-react'
import SwipeRow from './SwipeRow'
import { inviteLink, useSharedGoals, type SharedGoal } from './useSharedGoals'
import SkillSelector from './SkillSelector'
import { suggestSkills } from './skillSuggest'
import type { SkillId } from './skillsCatalog'
import { parseGoal } from './goalParse'
import {
  GOAL_GOLD, formatNumber, goalCurrent, goalPace, goalProgress, isComplete, monthlyResults, round,
  type Goal, type GoalDifficulty, type GoalReminder,
} from './goalModel'
export type { Goal } from './goalModel'

type Props = { goals: Goal[]; today: string; focusGoalId?: string; userId?: string; invitationId?: string; onInviteDone?: () => void; onChange: (goals: Goal[]) => void; onFocus: (goalId: string | undefined) => void }
type Shared = ReturnType<typeof useSharedGoals>

const uid = () => Math.random().toString(36).slice(2, 10)
const DIFFICULTIES: { id: GoalDifficulty; label: string }[] = [{ id: 'moderate', label: 'Modéré' }, { id: 'ambitious', label: 'Ambitieux' }, { id: 'exceptional', label: 'Exceptionnel' }]
const WEEKDAYS = [{ d: 1, l: 'L' }, { d: 2, l: 'M' }, { d: 3, l: 'M' }, { d: 4, l: 'J' }, { d: 5, l: 'V' }, { d: 6, l: 'S' }, { d: 0, l: 'D' }]
const monthName = (key: string) => new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(`${key.slice(0, 7)}-15T12:00:00`))
const shortDate = (key: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(key.length === 10 ? `${key}T12:00:00` : key))
const u = (goal: Goal) => goal.unit ? ` ${goal.unit}` : ''
const sep = (goal: Goal) => goal.mode === 'value' ? ' → ' : ' / '
/** « 12500,5 » → « 12 500,5 » pendant la saisie. */
const pretty = (entry: string) => { const [i, d] = entry.split(','); return i.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') + (d !== undefined ? ',' + d : '') }
const defaultSkills = (title: string, unit?: string): SkillId[] => unit === 'kg' ? ['nutrition', 'cardio'] : suggestSkills(title, 'Personnel', 'task')

/** Barre fine + statut, pour les cartes et la ligne focus. */
function GoalBar({ goal, today }: { goal: Goal; today: string }) {
  const done = goal.monthly ? goalProgress(goal, today) >= 1 : isComplete(goal, today)
  return <div className={`goal-bar ${done ? 'is-done' : ''}`}><div style={{ width: `${goalProgress(goal, today) * 100}%` }} /></div>
}
function Status({ goal, today }: { goal: Goal; today: string }) {
  const pace = goalPace(goal, today)
  return pace.word ? <span className={`goal-status is-${pace.status}`}>{pace.word}</span> : null
}
export function FocusGoal({ goal, today, onOpen }: { goal: Goal; today: string; onOpen: () => void }) {
  return <button type="button" className="focus-goal" onClick={onOpen}>
    <span className="focus-goal-top"><strong>{goal.title}</strong><span>{formatNumber(goalCurrent(goal, today))}<small>{sep(goal)}{formatNumber(goal.target)}{u(goal)}</small></span></span>
    <GoalBar goal={goal} today={today} />
  </button>
}

/* ---------- Pavé numérique : la mise à jour en un geste ---------- */
function NumberPad({ goal, today, onSubmit, onDetails, onEdit, onClose }: { goal: Goal; today: string; onSubmit: (value: number) => void; onDetails: () => void; onEdit: () => void; onClose: () => void }) {
  const [entry, setEntry] = useState('')
  const value = Number(entry.replace(',', '.'))
  const valid = entry !== '' && Number.isFinite(value) && (goal.mode === 'value' || value !== 0)
  const current = goalCurrent(goal, today)
  const after = goal.mode === 'add' ? round(current + (valid ? value : 0)) : (valid ? value : current)
  const press = useCallback((key: string) => setEntry(e => {
    if (key === '⌫') return e.slice(0, -1)
    if (key === ',') return e.includes(',') ? e : (e || '0') + ','
    if (e.replace(',', '').length >= 9) return e
    return e === '0' ? key : e + key
  }), [])
  const submit = useCallback(() => { if (valid) onSubmit(round(value)) }, [valid, value, onSubmit])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === ',' || e.key === '.') press(',')
      else if (e.key === 'Backspace') press('⌫'); else if (e.key === 'Enter') submit(); else if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k)
  }, [press, submit, onClose])
  return <div className="sheet-backdrop" onMouseDown={onClose}>
    <div className="sheet goal-pad" role="dialog" aria-modal="true" aria-label={`Mettre à jour ${goal.title}`} onMouseDown={e => e.stopPropagation()}>
      <div className="sheet-grabber" aria-hidden="true" />
      <div className="goal-pad-head">
        <strong>{goal.title}</strong>
        <span className="goal-pad-links"><button type="button" className="text-action" onClick={onDetails}>Détails</button><button type="button" className="text-action" onClick={onEdit}>Modifier</button></span>
      </div>
      <div className="goal-pad-display" aria-live="polite">
        <span className={entry ? '' : 'is-empty'}>{goal.mode === 'add' ? '+ ' : ''}{entry ? pretty(entry) : '0'}{u(goal)}</span>
        <small>{goal.mode === 'add' ? `${formatNumber(after)} / ${formatNumber(goal.target)}${u(goal)}` : `${formatNumber(current)} → ${formatNumber(goal.target)}${u(goal)}`}</small>
      </div>
      <div className="goal-pad-keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'].map(k => <button key={k} type="button" aria-label={k === '⌫' ? 'Effacer' : k} onClick={() => press(k)}>{k === '⌫' ? <Delete size={22} /> : k}</button>)}
      </div>
      <button type="button" className="primary-btn goal-pad-ok" disabled={!valid} onClick={submit}>OK</button>
    </div>
  </div>
}

/* ---------- Détails (tout le reste) ---------- */
function GoalDetails({ goal, today, focused, startEditing, onChange, onDelete, onFocus, onClose }: {
  goal: Goal; today: string; focused: boolean; startEditing?: boolean; onChange: (g: Goal) => void; onDelete: () => void; onFocus: (on: boolean) => void; onClose: () => void
}) {
  const [editing, setEditing] = useState(Boolean(startEditing))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [title, setTitle] = useState(goal.title)
  const [target, setTarget] = useState(String(goal.target))
  const [deadline, setDeadline] = useState(goal.deadline ?? '')
  const [monthly, setMonthly] = useState(Boolean(goal.monthly))
  const [difficulty, setDifficulty] = useState<GoalDifficulty>(goal.difficulty ?? 'moderate')
  const [skills, setSkills] = useState<SkillId[]>(goal.skillIds ?? [])
  const pace = goalPace(goal, today)
  const recent = [...goal.history].map((h, i) => ({ ...h, i })).reverse().slice(0, 5)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [onClose])
  const setReminder = (r: GoalReminder | undefined) => onChange({ ...goal, reminder: r })
  const saveEdit = () => {
    const n = Number(target.replace(',', '.'))
    const okTarget = goal.mode === 'add' ? n > 0 : Number.isFinite(n) && n !== goal.start
    onChange({ ...goal, title: title.trim() || goal.title, target: okTarget ? round(n) : goal.target, deadline: monthly ? undefined : (deadline || undefined),
      monthly: goal.mode === 'add' ? monthly || undefined : undefined, difficulty, skillIds: skills.length ? skills : undefined })
    setEditing(false)
  }
  return <div className="sheet-backdrop" onMouseDown={onClose}>
    <div className="sheet goal-sheet" role="dialog" aria-modal="true" aria-label={goal.title} onMouseDown={e => e.stopPropagation()}>
      <div className="sheet-grabber" aria-hidden="true" />
      <div className="sheet-head skill-sheet-head">
        <div><h2>{goal.title}</h2><p className="skill-sub">{goal.monthly ? 'Chaque mois' : goal.deadline ? `Avant le ${shortDate(goal.deadline)}` : 'Sans échéance'}</p></div>
        <button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><X size={20} /></button>
      </div>
      <div className="goal-detail-value">
        <strong>{formatNumber(goalCurrent(goal, today))}<small>{sep(goal)}{formatNumber(goal.target)}{u(goal)}</small></strong>
        <GoalBar goal={goal} today={today} />
        {(pace.word || pace.detail) && <p><Status goal={goal} today={today} />{pace.detail && <span>{pace.detail}</span>}</p>}
      </div>
      {goal.monthly && <div className="goal-months">{monthlyResults(goal, today).map(r => <div key={r.month} className={`goal-month ${r.reached ? 'is-reached' : ''}`}>
        <div className="goal-month-bar"><div style={{ height: `${Math.min(100, r.value / goal.target * 100)}%` }} /></div>
        <small>{monthName(r.month).slice(0, 3)}</small>
      </div>)}</div>}
      {goal.mode === 'value' && goal.history.length > 1 && <Sparkline values={goal.history.map(h => h.value)} target={goal.target} />}
      {recent.length > 0 && <div className="goal-history">
        <h3>Dernières saisies</h3>
        {recent.map(h => <div key={`${h.at}-${h.i}`} className="goal-history-row">
          <span>{shortDate(h.at)}</span><strong>{goal.mode === 'add' && h.value > 0 ? '+' : ''}{formatNumber(h.value)}{u(goal)}</strong>
          <button type="button" className="small-icon" aria-label="Supprimer cette saisie" onClick={() => onChange({ ...goal, history: goal.history.filter((_, i) => i !== h.i) })}><Trash2 size={15} /></button>
        </div>)}
      </div>}
      <div className="settings-list goal-settings">
        <div className="settings-row"><span><strong>Sur Aujourd’hui</strong></span><button type="button" role="switch" className="switch" aria-checked={focused} aria-label="Afficher sur Aujourd’hui" onClick={() => onFocus(!focused)}><span /></button></div>
        <div className="settings-row goal-reminder">
          <span><strong>Rappel</strong><small>{!goal.reminder ? 'Aucun' : goal.reminder.every === 'week' ? 'Chaque semaine à 9h' : `Le ${goal.reminder.day} du mois à 9h`}</small></span>
          <select aria-label="Fréquence du rappel" value={goal.reminder?.every ?? 'none'} onChange={e => setReminder(e.target.value === 'week' ? { every: 'week', weekday: 1 } : e.target.value === 'month' ? { every: 'month', day: 1 } : undefined)}>
            <option value="none">Aucun</option><option value="week">Hebdo</option><option value="month">Mensuel</option>
          </select>
        </div>
        {goal.reminder?.every === 'week' && <div className="day-picker goal-days">{WEEKDAYS.map(w => <button key={w.d} type="button" className="day-chip" aria-pressed={(goal.reminder as { weekday: number }).weekday === w.d} onClick={() => setReminder({ every: 'week', weekday: w.d })}>{w.l}</button>)}</div>}
        {goal.reminder?.every === 'month' && <label className="field goal-month-day"><span>Jour du mois</span><input type="number" min={1} max={28} value={goal.reminder.day} onChange={e => setReminder({ every: 'month', day: Math.max(1, Math.min(28, Number(e.target.value) || 1)) })} /></label>}
      </div>
      {editing ? <div className="goal-edit">
        <label className="field"><span>Nom</span><input value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></label>
        <label className="field"><span>Cible{u(goal)}</span><input inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} /></label>
        {goal.mode === 'add' && <div className="chips"><button type="button" className="chip" aria-pressed={monthly} onClick={() => setMonthly(true)}>Chaque mois</button><button type="button" className="chip" aria-pressed={!monthly} onClick={() => setMonthly(false)}>Une échéance</button></div>}
        {!monthly && <label className="field"><span>Échéance</span><input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></label>}
        <div className="field"><span>Difficulté</span><div className="chips">{DIFFICULTIES.map(d => <button key={d.id} type="button" className="chip" aria-pressed={difficulty === d.id} onClick={() => setDifficulty(d.id)}>{d.label} <small>{GOAL_GOLD[d.id]} or</small></button>)}</div></div>
        <SkillSelector value={skills} onChange={setSkills} />
        <div className="sheet-actions"><button type="button" className="text-action" onClick={() => setEditing(false)}>Annuler</button><button type="button" className="primary-btn" onClick={saveEdit}>Enregistrer</button></div>
      </div> : <div className="goal-footer">
        <button type="button" className="text-action" onClick={() => setEditing(true)}>Modifier</button>
        <button type="button" className="danger-link" onClick={() => confirmDelete ? onDelete() : setConfirmDelete(true)}><Trash2 size={16} /> {confirmDelete ? 'Confirmer' : 'Supprimer'}</button>
      </div>}
    </div>
  </div>
}

function Sparkline({ values, target }: { values: number[]; target: number }) {
  const all = [...values, target], min = Math.min(...all), max = Math.max(...all), span = max - min || 1
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${36 - ((v - min) / span) * 32 - 2}`).join(' ')
  const ty = 36 - ((target - min) / span) * 32 - 2
  return <svg className="goal-spark" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
    <line x1="0" x2="100" y1={ty} y2={ty} className="goal-spark-target" /><polyline points={pts} className="goal-spark-line" />
  </svg>
}

/* ---------- Création en une phrase ---------- */
function Composer({ today, canShare, onCreate, onCreateShared, onClose }: { today: string; canShare: boolean; onCreate: (goal: Goal) => void; onCreateShared: (g: { title: string; unit?: string; target: number; monthly?: boolean }) => void; onClose: () => void }) {
  const [text, setText] = useState('')
  const [shared, setShared] = useState(false)
  const parsed = useMemo(() => parseGoal(text, today), [text, today])
  // À deux : seulement un total (avec « par mois » possible), sans échéance.
  const guess = useMemo(() => shared && parsed.mode ? { ...parsed, mode: 'add' as const, target: parsed.target ?? (parsed.delta !== undefined ? Math.abs(parsed.delta) : undefined), deadline: undefined, deadlineLabel: undefined, delta: undefined, start: undefined } : parsed, [parsed, shared])
  const [current, setCurrent] = useState('')
  const [target, setTarget] = useState('')
  const [targetTouched, setTargetTouched] = useState(false)
  useEffect(() => { if (!targetTouched) setTarget(guess.target !== undefined ? String(guess.target) : '') }, [guess, targetTouched])
  useEffect(() => { if (guess.start !== undefined) setCurrent(String(guess.start)) }, [guess.start])
  const mode = guess.mode
  const nCurrent = Number(current.replace(',', '.'))
  const computedTarget = mode === 'value' && guess.delta !== undefined && current !== '' && !targetTouched ? String(round(nCurrent + guess.delta)) : target
  const nTarget = Number(computedTarget.replace(',', '.'))
  const valid = Boolean(guess.title.trim()) && (mode === 'add' ? nTarget > 0 : mode === 'value' ? current !== '' && computedTarget !== '' && Number.isFinite(nCurrent) && Number.isFinite(nTarget) && nCurrent !== nTarget : false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid || !mode) return
    if (shared) { onCreateShared({ title: guess.title.trim().slice(0, 120), unit: guess.unit, target: round(nTarget), monthly: guess.monthly || undefined }); return }
    const at = new Date().toISOString()
    onCreate({
      id: uid(), title: guess.title.trim().slice(0, 120), mode, createdOn: today, unit: guess.unit, difficulty: 'moderate',
      skillIds: defaultSkills(guess.title, guess.unit).slice(0, 3), monthly: mode === 'add' && guess.monthly ? true : undefined,
      deadline: guess.monthly ? undefined : guess.deadline, start: mode === 'value' ? round(nCurrent) : 0, target: round(nTarget),
      history: mode === 'value' ? [{ at, value: round(nCurrent) }] : [],
    })
  }
  const understood = !text.trim() ? '' : !mode ? '' : [
    mode === 'value' ? 'Mesure' : 'Total',
    mode === 'value' && guess.delta !== undefined ? `${guess.delta > 0 ? '+' : '−'}${formatNumber(Math.abs(guess.delta))} ${guess.unit ?? ''}`.trim() : '',
    mode === 'add' && guess.target ? `${formatNumber(guess.target)} ${guess.unit ?? ''}`.trim() : '',
    guess.monthly ? 'chaque mois' : guess.deadlineLabel ? `avant le ${guess.deadlineLabel}` : '',
  ].filter(Boolean).join(' · ')

  return <div className="sheet-backdrop" onMouseDown={onClose}>
    <form className="sheet goal-composer" role="dialog" aria-modal="true" aria-label="Nouvel objectif" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
      <div className="sheet-grabber" aria-hidden="true" />
      <div className="sheet-head skill-sheet-head"><h2>Nouvel objectif</h2>{canShare && <div className="segmented goal-who" role="tablist" aria-label="Pour qui"><button type="button" role="tab" aria-selected={!shared} onClick={() => setShared(false)}>Moi</button><button type="button" role="tab" aria-selected={shared} onClick={() => setShared(true)}>À deux</button></div>}<button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><X size={20} /></button></div>
      <input className="goal-phrase" autoFocus maxLength={140} value={text} onChange={e => setText(e.target.value)} placeholder="10 000 $ de CA par mois" aria-label="Ton objectif en une phrase" />
      {understood && <p className="goal-understood" role="status">{understood}</p>}
      {mode === 'value' && <div className="field-row">
        <label className="field"><span>Aujourd’hui{guess.unit ? ` (${guess.unit})` : ''}</span><input inputMode="decimal" autoFocus value={current} onChange={e => setCurrent(e.target.value)} placeholder="92" /></label>
        <label className="field"><span>Cible{guess.unit ? ` (${guess.unit})` : ''}</span><input inputMode="decimal" value={computedTarget} onChange={e => { setTargetTouched(true); setTarget(e.target.value) }} placeholder="80" /></label>
      </div>}
      <div className="sheet-actions"><span /><button type="submit" className="primary-btn" disabled={!valid}>Créer</button></div>
    </form>
  </div>
}

/* ---------- Confirmation de suppression ---------- */
function ConfirmDelete({ title, shared, onConfirm, onClose }: { title: string; shared?: boolean; onConfirm: () => void; onClose: () => void }) {
  return <div className="sheet-backdrop" onMouseDown={onClose}>
    <div className="sheet goal-confirm" role="alertdialog" aria-modal="true" aria-label={`Supprimer ${title}`} onMouseDown={e => e.stopPropagation()}>
      <div className="sheet-grabber" aria-hidden="true" />
      <h2>Supprimer « {title} » ?</h2>
      <p>{shared ? 'Il sera aussi supprimé pour l’autre membre, avec toutes les saisies.' : 'Son historique sera effacé.'}</p>
      <div className="sheet-actions"><button type="button" className="text-action" onClick={onClose}>Annuler</button><button type="button" className="danger-btn" onClick={onConfirm}><Trash2 size={16} /> Supprimer</button></div>
    </div>
  </div>
}

/* ---------- À deux ---------- */
function SharedCard({ goal, today, onOpen }: { goal: SharedGoal; today: string; onOpen: () => void }) {
  return <button type="button" className="goal-card" onClick={onOpen} aria-label={`${goal.title} : ajouter`}>
    <span className="goal-card-top">
      <span className="goal-card-title"><strong>{goal.title}</strong><small>{goal.monthly ? monthName(today) : 'Total'}</small></span>
      <span className="goal-card-value">{formatNumber(goalCurrent(goal, today))}<small> / {formatNumber(goal.target)}{u(goal)}</small></span>
    </span>
    <GoalBar goal={goal} today={today} />
  </button>
}

function SharedDetails({ goal, today, shared, startEditing, onClose }: { goal: SharedGoal; today: string; shared: Shared; startEditing?: boolean; onClose: () => void }) {
  const [editing, setEditing] = useState(Boolean(startEditing))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [title, setTitle] = useState(goal.title)
  const [target, setTarget] = useState(String(goal.target))
  const [monthly, setMonthly] = useState(Boolean(goal.monthly))
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [onClose])
  const recent = shared.entriesOf(goal.id).slice(-8).reverse()
  const save = () => {
    const n = Number(target.replace(',', '.'))
    void shared.update(goal.id, { title: title.trim() || goal.title, ...(n > 0 ? { target: round(n) } : {}), ...(monthly !== Boolean(goal.monthly) ? { monthly } : {}) })
    setEditing(false)
  }
  return <div className="sheet-backdrop" onMouseDown={onClose}>
    <div className="sheet goal-sheet" role="dialog" aria-modal="true" aria-label={goal.title} onMouseDown={e => e.stopPropagation()}>
      <div className="sheet-grabber" aria-hidden="true" />
      <div className="sheet-head skill-sheet-head">
        <div><h2>{goal.title}</h2><p className="skill-sub">À deux · {goal.monthly ? 'chaque mois' : 'total'}</p></div>
        <button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><X size={20} /></button>
      </div>
      <div className="goal-detail-value">
        <strong>{formatNumber(goalCurrent(goal, today))}<small> / {formatNumber(goal.target)}{u(goal)}</small></strong>
        <GoalBar goal={goal} today={today} />
      </div>
      {goal.monthly && <div className="goal-months">{monthlyResults(goal, today).map(r => <div key={r.month} className={`goal-month ${r.reached ? 'is-reached' : ''}`}>
        <div className="goal-month-bar"><div style={{ height: `${Math.min(100, r.value / goal.target * 100)}%` }} /></div>
        <small>{monthName(r.month).slice(0, 3)}</small>
      </div>)}</div>}
      {recent.length > 0 && <div className="goal-history">
        <h3>Dernières saisies</h3>
        {recent.map(e => <div key={e.id} className="goal-history-row">
          <span>{shortDate(e.created_at)}</span><strong>{e.amount > 0 ? '+' : ''}{formatNumber(e.amount)}{u(goal)}</strong>
          {shared.isMine(e) ? <button type="button" className="small-icon" aria-label="Supprimer cette saisie" onClick={() => { void shared.removeEntry(e.id) }}><Trash2 size={15} /></button> : <span className="small-icon" aria-hidden="true" />}
        </div>)}
      </div>}
      {editing ? <div className="goal-edit">
        <label className="field"><span>Nom</span><input value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></label>
        <label className="field"><span>Cible{u(goal)}</span><input inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} /></label>
        <div className="chips"><button type="button" className="chip" aria-pressed={monthly} onClick={() => setMonthly(true)}>Chaque mois</button><button type="button" className="chip" aria-pressed={!monthly} onClick={() => setMonthly(false)}>Total</button></div>
        <div className="sheet-actions"><button type="button" className="text-action" onClick={() => setEditing(false)}>Annuler</button><button type="button" className="primary-btn" onClick={save}>Enregistrer</button></div>
      </div> : <div className="goal-footer">
        <button type="button" className="text-action" onClick={() => setEditing(true)}>Modifier</button>
        <button type="button" className="danger-link" onClick={() => { if (confirmDelete) { void shared.remove(goal.id); onClose() } else setConfirmDelete(true) }}><Trash2 size={16} /> {confirmDelete ? 'Confirmer' : 'Supprimer'}</button>
      </div>}
    </div>
  </div>
}

function SpaceSheet({ shared, onClose }: { shared: Shared; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState('')
  const copy = async (id: string) => { try { await navigator.clipboard.writeText(inviteLink(id)); setCopied(id) } catch { setCopied('') } }
  return <div className="sheet-backdrop" onMouseDown={onClose}>
    <div className="sheet goal-sheet" role="dialog" aria-modal="true" aria-label="À deux" onMouseDown={e => e.stopPropagation()}>
      <div className="sheet-grabber" aria-hidden="true" />
      <div className="sheet-head skill-sheet-head"><div><h2>À deux</h2><p className="skill-sub">{shared.members} membre{shared.members > 1 ? 's' : ''} · vos objectifs perso restent privés</p></div>
        <button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><X size={20} /></button></div>
      {shared.isOwner && <form className="goal-invite" onSubmit={e => { e.preventDefault(); void shared.invite(email).then(id => { if (id) { setEmail(''); void copy(id) } }) }}>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Adresse e-mail" aria-label="Adresse e-mail à inviter" />
        <button type="submit" className="primary-btn">Inviter</button>
      </form>}
      {shared.invitations.map(i => <div key={i.id} className="goal-history-row"><span>{i.invited_email}</span>
        <button type="button" className="text-action" onClick={() => { void copy(i.id) }}><Copy size={14} /> {copied === i.id ? 'Lien copié' : 'Copier le lien'}</button></div>)}
    </div>
  </div>
}

/* ---------- Page ---------- */
export default function GoalsPage({ goals, today, focusGoalId, userId, invitationId, onInviteDone, onChange, onFocus }: Props) {
  const shared = useSharedGoals(userId)
  const [sharedPadId, setSharedPadId] = useState<string | null>(null)
  const [sharedDetailsId, setSharedDetailsId] = useState<string | null>(null)
  const [spaceOpen, setSpaceOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [toDelete, setToDelete] = useState<{ id: string; title: string; shared: boolean } | null>(null)
  const openDetails = (id: string, isShared: boolean, edit: boolean) => { setEditMode(edit); if (isShared) { setSharedDetailsId(id); setSharedPadId(null) } else { setDetailsId(id); setPadId(null) } }
  const sharedPad = shared.goals.find(g => g.id === sharedPadId)
  const sharedDetails = shared.goals.find(g => g.id === sharedDetailsId)
  const [composer, setComposer] = useState(false)
  const [padId, setPadId] = useState<string | null>(null)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const active = goals.filter(g => !g.completedOn)
  const done = goals.filter(g => g.completedOn)
  const pad = goals.find(g => g.id === padId)
  const details = goals.find(g => g.id === detailsId)
  const update = (g: Goal) => onChange(goals.map(x => x.id === g.id ? g : x))
  const monthly = active.filter(g => g.monthly)
  const dated = active.filter(g => !g.monthly).sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))

  const card = (goal: Goal) => <SwipeRow key={goal.id} className="goal-swipe" onEdit={() => openDetails(goal.id, false, true)} onDelete={() => setToDelete({ id: goal.id, title: goal.title, shared: false })}><button type="button" className="goal-card" onClick={() => setPadId(goal.id)} aria-label={`${goal.title} : mettre à jour`}>
    <span className="goal-card-top">
      <span className="goal-card-title"><strong>{goal.title}</strong><small>{goal.monthly ? monthName(today) : goal.deadline ? `avant le ${shortDate(goal.deadline)}` : ''}</small></span>
      <span className="goal-card-value">{formatNumber(goalCurrent(goal, today))}<small>{sep(goal)}{formatNumber(goal.target)}{u(goal)}</small></span>
    </span>
    <GoalBar goal={goal} today={today} />
    {(goalPace(goal, today).word || focusGoalId === goal.id) && <span className="goal-card-foot"><Status goal={goal} today={today} />{focusGoalId === goal.id && <span className="goal-focus-tag">Sur Aujourd’hui</span>}</span>}
  </button></SwipeRow>

  return <section>
    <div className="page-intro"><div><h1>Objectifs</h1></div><button type="button" className="primary-btn" onClick={() => setComposer(true)}><Plus size={18} /> Nouveau</button></div>
    {invitationId && <div className="goal-invite-banner"><strong>Invitation à des objectifs à deux</strong>
      <button type="button" className="primary-btn" onClick={() => { void shared.accept(invitationId).then(ok => { if (ok) onInviteDone?.() }) }}>Accepter</button></div>}
    {active.length === 0 && <button type="button" className="goal-empty" onClick={() => setComposer(true)}>
      <strong>Écris ton premier objectif</strong><small>« 10 000 $ de CA par mois », « Perdre 12 kg d’ici février »…</small>
    </button>}
    {monthly.length > 0 && <section className="goal-section"><h2 className="goal-section-title">Chaque mois</h2><div className="goal-cards">{monthly.map(card)}</div></section>}
    {dated.length > 0 && <section className="goal-section"><h2 className="goal-section-title">À atteindre</h2><div className="goal-cards">{dated.map(card)}</div></section>}
    {shared.space && <section className="goal-section">
      <div className="goal-section-head"><h2 className="goal-section-title">À deux</h2><button type="button" className="text-action" onClick={() => setSpaceOpen(true)}>{shared.members > 1 ? `${shared.members} membres` : 'Inviter'}</button></div>
      {shared.goals.length ? <div className="goal-cards">{shared.goals.map(g => <SwipeRow key={g.id} className="goal-swipe" onEdit={() => openDetails(g.id, true, true)} onDelete={() => setToDelete({ id: g.id, title: g.title, shared: true })}><SharedCard goal={g} today={today} onOpen={() => setSharedPadId(g.id)} /></SwipeRow>)}</div>
        : <button type="button" className="goal-empty" onClick={() => setComposer(true)}><strong>Un objectif à deux</strong><small>Choisis « À deux » en le créant.</small></button>}
    </section>}
    {shared.error && <p className="goal-error" role="alert">{shared.error} <button type="button" className="text-action" onClick={shared.clearError}>OK</button></p>}
    {done.length > 0 && <section className="goal-section">
      <button type="button" className="text-action" aria-expanded={showDone} onClick={() => setShowDone(v => !v)}>{showDone ? 'Masquer' : 'Voir'} les objectifs atteints ({done.length}) <ChevronRight size={14} /></button>
      {showDone && <div className="goal-cards">{done.map(card)}</div>}
    </section>}
    {shared.loaded && !shared.space && userId && <button type="button" className="text-action goal-share-start" onClick={() => { void shared.createSpace().then(ok => { if (ok) setSpaceOpen(true) }) }}>Partager des objectifs avec quelqu’un</button>}
    {composer && <Composer today={today} canShare={Boolean(shared.space)} onClose={() => setComposer(false)} onCreate={goal => { onChange([...goals, goal]); setComposer(false) }}
      onCreateShared={g => { void shared.create(g).then(ok => { if (ok) setComposer(false) }) }} />}
    {sharedPad && <NumberPad key={sharedPad.id} goal={sharedPad} today={today} onClose={() => setSharedPadId(null)} onDetails={() => openDetails(sharedPad.id, true, false)} onEdit={() => openDetails(sharedPad.id, true, true)}
      onSubmit={value => { void shared.add(sharedPad.id, value); setSharedPadId(null) }} />}
    {sharedDetails && <SharedDetails key={sharedDetails.id} goal={sharedDetails} today={today} shared={shared} startEditing={editMode} onClose={() => setSharedDetailsId(null)} />}
    {toDelete && <ConfirmDelete title={toDelete.title} shared={toDelete.shared} onClose={() => setToDelete(null)} onConfirm={() => {
      if (toDelete.shared) void shared.remove(toDelete.id)
      else { onChange(goals.filter(g => g.id !== toDelete.id)); if (focusGoalId === toDelete.id) onFocus(undefined) }
      setToDelete(null)
    }} />}
    {spaceOpen && shared.space && <SpaceSheet shared={shared} onClose={() => setSpaceOpen(false)} />}
    {pad && <NumberPad key={pad.id} goal={pad} today={today} onClose={() => setPadId(null)} onDetails={() => openDetails(pad.id, false, false)} onEdit={() => openDetails(pad.id, false, true)}
      onSubmit={value => { update({ ...pad, history: [...pad.history, { at: new Date().toISOString(), value }] }); setPadId(null) }} />}
    {details && <GoalDetails key={details.id} goal={details} today={today} startEditing={editMode} focused={focusGoalId === details.id} onClose={() => setDetailsId(null)} onChange={update}
      onDelete={() => { onChange(goals.filter(g => g.id !== details.id)); if (focusGoalId === details.id) onFocus(undefined); setDetailsId(null) }}
      onFocus={on => onFocus(on ? details.id : undefined)} />}
  </section>
}
