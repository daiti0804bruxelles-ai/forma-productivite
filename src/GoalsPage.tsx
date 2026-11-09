import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarPlus, Check, ChevronRight, Minus, Plus, Star, Trash2, X } from 'lucide-react'
import SkillSelector from './SkillSelector'
import { suggestSkills } from './skillSuggest'
import type { SkillId } from './skillsCatalog'
import { parseGoal } from './goalParse'
import {
  GOAL_GOLD, HORIZONS, KIND_LABEL, goalPace, goalProgress, goalValueLabel, horizonOf, isComplete, round, withCompletion,
  type Goal, type GoalDifficulty, type GoalKind, type GoalReminder, type GoalStep,
} from './goalModel'
export type { Goal } from './goalModel'

type Props = {
  goals: Goal[]
  today: string
  focusGoalId?: string
  onChange: (goals: Goal[]) => void
  onFocus: (goalId: string | undefined) => void
  onPlanStep: (goal: Goal, step: GoalStep) => void
}

const uid = () => Math.random().toString(36).slice(2, 10)
const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n)
const monthKey = (day: string) => day.slice(0, 7)
const DIFFICULTIES: { id: GoalDifficulty; label: string }[] = [{ id: 'moderate', label: 'Modéré' }, { id: 'ambitious', label: 'Ambitieux' }, { id: 'exceptional', label: 'Exceptionnel' }]
const WEEKDAYS = [{ d: 1, l: 'L' }, { d: 2, l: 'M' }, { d: 3, l: 'M' }, { d: 4, l: 'J' }, { d: 5, l: 'V' }, { d: 6, l: 'S' }, { d: 0, l: 'D' }]
const shortDate = (key: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${key}T12:00:00`))

export function Ring({ value, size = 40, done = false }: { value: number; size?: number; done?: boolean }) {
  const r = 15, c = 2 * Math.PI * r
  return <svg className={`goal-ring ${done ? 'is-done' : ''}`} width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
    <circle cx="18" cy="18" r={r} className="goal-ring-track" />
    <circle cx="18" cy="18" r={r} className="goal-ring-value" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))} transform="rotate(-90 18 18)" />
    {done && <path d="M12 18.5l4 4 8-9" className="goal-ring-check" />}
  </svg>
}

function GoalIcon({ goal, size = 40 }: { goal: Goal; size?: number }) {
  if (goal.kind === 'vision') {
    const last = Object.keys(goal.ratings ?? {}).sort().pop()
    return <span className="goal-vision-icon" style={{ width: size, height: size }}>{last ? goal.ratings![last] : <Star size={size * 0.45} />}</span>
  }
  return <Ring value={goalProgress(goal) ?? 0} size={size} done={isComplete(goal)} />
}

/* ---------- Création en une phrase ---------- */
function Composer({ today, onCreate, onClose }: { today: string; onCreate: (goal: Goal) => void; onClose: () => void }) {
  const [text, setText] = useState('')
  const guess = useMemo(() => parseGoal(text, today), [text, today])
  const [kind, setKind] = useState<GoalKind | null>(null)
  const [target, setTarget] = useState('')
  const [current, setCurrent] = useState('')
  const [unit, setUnit] = useState('')
  const [deadline, setDeadline] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [more, setMore] = useState(false)
  const [difficulty, setDifficulty] = useState<GoalDifficulty>('moderate')
  const [skills, setSkills] = useState<SkillId[]>([])
  const [skillsTouched, setSkillsTouched] = useState(false)
  const effectiveKind = kind ?? guess.kind

  // Les champs suivent la phrase tant que tu ne les as pas modifiés toi-même.
  useEffect(() => {
    if (!touched.target) setTarget(guess.target !== undefined ? String(guess.target) : '')
    if (!touched.current) setCurrent(guess.start !== undefined ? String(guess.start) : '')
    if (!touched.unit) setUnit(guess.unit ?? '')
    if (!touched.deadline) setDeadline(guess.deadline ?? '')
    if (!skillsTouched) setSkills(guess.title ? suggestSkills(guess.title, 'Personnel', 'task') : [])
  }, [guess, touched, skillsTouched])
  // « Perdre 12 kg » : la cible se calcule avec ton poids actuel.
  const computedTarget = effectiveKind === 'measure' && guess.delta !== undefined && current !== '' && !touched.target ? String(round(Number(current) + guess.delta)) : target
  const set = (field: string, setter: (v: string) => void) => (v: string) => { setTouched(t => ({ ...t, [field]: true })); setter(v) }

  const nTarget = Number(computedTarget), nCurrent = Number(current)
  const valid = guess.title.trim().length > 0 && (
    effectiveKind === 'project' || effectiveKind === 'vision' ||
    (effectiveKind === 'count' && nTarget > 0) ||
    (effectiveKind === 'measure' && current !== '' && computedTarget !== '' && Number.isFinite(nCurrent) && Number.isFinite(nTarget) && nCurrent !== nTarget))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const base = { id: uid(), title: guess.title.trim().slice(0, 120), kind: effectiveKind, createdOn: today, deadline: deadline || undefined, difficulty, skillIds: skills.length ? skills : undefined }
    const goal: Goal = effectiveKind === 'count' ? { ...base, target: round(nTarget), current: 0, start: 0, unit: unit.trim() || undefined, history: [] }
      : effectiveKind === 'measure' ? { ...base, start: round(nCurrent), current: round(nCurrent), target: round(nTarget), unit: unit.trim() || undefined, history: [{ at: new Date().toISOString(), value: round(nCurrent) }] }
        : effectiveKind === 'project' ? { ...base, steps: [] } : { ...base, ratings: {} }
    onCreate(goal)
  }
  const understood = [KIND_LABEL[effectiveKind],
    effectiveKind === 'measure' && guess.delta !== undefined ? `${guess.delta > 0 ? '+' : '−'}${fmt(Math.abs(guess.delta))} ${guess.unit ?? ''}`.trim() : '',
    effectiveKind === 'count' && guess.target ? `${fmt(guess.target)} ${guess.unit ?? ''}`.trim() : '',
    guess.deadlineLabel ? `avant le ${guess.deadlineLabel}` : ''].filter(Boolean)

  return <div className="sheet-backdrop" onMouseDown={onClose}>
    <form className="sheet goal-composer" role="dialog" aria-modal="true" aria-label="Nouvel objectif" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
      <div className="sheet-grabber" aria-hidden="true" />
      <div className="sheet-head skill-sheet-head"><h2>Nouvel objectif</h2><button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><X size={20} /></button></div>
      <input className="goal-phrase" autoFocus maxLength={140} value={text} onChange={e => setText(e.target.value)} placeholder="Ex. : Perdre 12 kg d’ici février" aria-label="Ton objectif en une phrase" />
      {text.trim() && <p className="quick-understood" role="status"><span>Compris : <strong>{understood.join(' · ')}</strong></span></p>}
      {text.trim() && <>
        <div className="segmented goal-kinds" role="radiogroup" aria-label="Type d’objectif">
          {(['count', 'measure', 'project', 'vision'] as GoalKind[]).map(k => <button key={k} type="button" role="radio" aria-checked={effectiveKind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>)}
        </div>
        {effectiveKind === 'measure' && <div className="field-row">
          <label className="field"><span>Valeur actuelle</span><input inputMode="decimal" value={current} onChange={e => set('current', setCurrent)(e.target.value.replace(',', '.'))} placeholder="92" /></label>
          <label className="field"><span>Cible</span><input inputMode="decimal" value={computedTarget} onChange={e => set('target', setTarget)(e.target.value.replace(',', '.'))} placeholder="80" /></label>
          <label className="field goal-unit"><span>Unité</span><input value={unit} maxLength={20} onChange={e => set('unit', setUnit)(e.target.value)} placeholder="kg" /></label>
        </div>}
        {effectiveKind === 'count' && <div className="field-row">
          <label className="field"><span>À atteindre</span><input inputMode="decimal" value={computedTarget} onChange={e => set('target', setTarget)(e.target.value.replace(',', '.'))} placeholder="12" /></label>
          <label className="field"><span>Unité</span><input value={unit} maxLength={20} onChange={e => set('unit', setUnit)(e.target.value)} placeholder="livres" /></label>
        </div>}
        {effectiveKind === 'project' && <p className="settings-hint">Tu ajouteras les étapes dans la fiche de l’objectif.</p>}
        {effectiveKind === 'vision' && <p className="settings-hint">Chaque fin de mois, tu te donnes une note de 1 à 10.</p>}
        {effectiveKind !== 'vision' && <label className="field"><span>Échéance {deadline ? '' : '(facultative)'}</span><input type="date" value={deadline} onChange={e => set('deadline', setDeadline)(e.target.value)} /></label>}
        <button type="button" className="text-action" aria-expanded={more} onClick={() => setMore(v => !v)}>{more ? 'Moins d’options' : 'Difficulté et compétences'}</button>
        {more && <>
          <div className="field"><span>Difficulté</span><div className="chips">{DIFFICULTIES.map(d => <button key={d.id} type="button" className="chip" aria-pressed={difficulty === d.id} onClick={() => setDifficulty(d.id)}>{d.label} <small>{GOAL_GOLD[d.id]} or</small></button>)}</div></div>
          <SkillSelector value={skills} onChange={next => { setSkillsTouched(true); setSkills(next) }} hint={skillsTouched ? undefined : 'Suggestion automatique d’après le nom.'} />
        </>}
      </>}
      <div className="sheet-actions"><span /><button type="submit" className="primary-btn" disabled={!valid}>Créer</button></div>
    </form>
  </div>
}

/* ---------- Fiche d'un objectif ---------- */
function GoalSheet({ goal, today, focused, onChange, onDelete, onFocus, onPlanStep, onClose }: {
  goal: Goal; today: string; focused: boolean; onChange: (g: Goal) => void; onDelete: () => void; onFocus: (on: boolean) => void; onPlanStep: (s: GoalStep) => void; onClose: () => void
}) {
  const [value, setValue] = useState('')
  const [stepDraft, setStepDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [title, setTitle] = useState(goal.title)
  const [target, setTarget] = useState(String(goal.target ?? ''))
  const [deadline, setDeadline] = useState(goal.deadline ?? '')
  const [difficulty, setDifficulty] = useState<GoalDifficulty>(goal.difficulty ?? 'moderate')
  const [skills, setSkills] = useState<SkillId[]>(goal.skillIds ?? [])
  const pace = goalPace(goal, today)
  const progress = goalProgress(goal)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [onClose])

  const record = (next: number) => {
    if (!Number.isFinite(next)) return
    const v = round(goal.kind === 'count' ? Math.max(0, next) : next)
    if (v === goal.current) return
    onChange({ ...goal, current: v, history: [...(goal.history ?? []), { at: new Date().toISOString(), value: v }] })
    setValue('')
  }
  const steps = goal.steps ?? []
  const setSteps = (next: GoalStep[]) => onChange({ ...goal, steps: next })
  const addStep = (e: FormEvent) => { e.preventDefault(); const t = stepDraft.trim(); if (!t) return; setSteps([...steps, { id: uid(), title: t.slice(0, 120), done: false }]); setStepDraft('') }
  const month = monthKey(today)
  const ratings = Object.entries(goal.ratings ?? {}).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
  const setReminder = (r: GoalReminder | undefined) => onChange({ ...goal, reminder: r })
  const saveEdit = () => {
    const n = Number(target)
    onChange({ ...goal, title: title.trim() || goal.title, deadline: deadline || undefined, difficulty, skillIds: skills.length ? skills : undefined,
      ...((goal.kind === 'count' && n > 0) || (goal.kind === 'measure' && Number.isFinite(n) && n !== goal.start) ? { target: round(n) } : {}) })
    setEditing(false)
  }

  return <div className="sheet-backdrop" onMouseDown={onClose}>
    <div className="sheet goal-sheet" role="dialog" aria-modal="true" aria-label={goal.title} onMouseDown={e => e.stopPropagation()}>
      <div className="sheet-grabber" aria-hidden="true" />
      <div className="sheet-head skill-sheet-head">
        <div><h2>{goal.title}</h2><p className="skill-sub">{KIND_LABEL[goal.kind]}{goal.deadline ? ` · avant le ${shortDate(goal.deadline)}` : ''}</p></div>
        <button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><X size={20} /></button>
      </div>

      {goal.kind !== 'vision' && <div className="goal-hero">
        <GoalIcon goal={goal} size={72} />
        <div><strong>{goalValueLabel(goal)}</strong>{progress !== null && <small>{Math.round(progress * 100)} %{pace.label ? ` · ${pace.label}` : ''}</small>}</div>
      </div>}

      {goal.kind === 'count' && <div className="goal-actions">
        <button type="button" className="icon-button goal-step-btn" aria-label="Retirer 1" onClick={() => record((goal.current ?? 0) - 1)} disabled={(goal.current ?? 0) <= 0}><Minus size={18} /></button>
        <button type="button" className="primary-btn goal-plus" onClick={() => record((goal.current ?? 0) + 1)}><Plus size={18} /> 1</button>
        <form className="goal-value-form" onSubmit={e => { e.preventDefault(); if (value !== '') record((goal.current ?? 0) + Number(value)) }}>
          <input inputMode="decimal" placeholder="+ autre" aria-label="Ajouter une quantité" value={value} onChange={e => setValue(e.target.value.replace(',', '.'))} />
        </form>
      </div>}
      {goal.kind === 'measure' && <form className="goal-value-form wide" onSubmit={e => { e.preventDefault(); if (value !== '') record(Number(value)) }}>
        <input inputMode="decimal" placeholder={`Nouvelle valeur${goal.unit ? ` (${goal.unit})` : ''}`} aria-label="Nouvelle valeur" value={value} onChange={e => setValue(e.target.value.replace(',', '.'))} />
        <button type="submit" className="primary-btn" disabled={value === ''}>Enregistrer</button>
      </form>}
      {goal.kind === 'measure' && (goal.history?.length ?? 0) > 1 && <Sparkline values={(goal.history ?? []).map(h => h.value)} target={goal.target ?? 0} />}

      {goal.kind === 'project' && <div className="goal-steps">
        {steps.map(step => <div key={step.id} className="goal-step">
          <button type="button" className="round-check" aria-pressed={step.done} aria-label={`${step.done ? 'Rouvrir' : 'Valider'} ${step.title}`} onClick={() => setSteps(steps.map(s => s.id === step.id ? { ...s, done: !s.done } : s))}>{step.done && <Check size={15} strokeWidth={3} />}</button>
          <span className={step.done ? 'is-done' : ''}>{step.title}</span>
          {!step.done && (step.taskId ? <small className="goal-planned">Planifiée</small>
            : <button type="button" className="small-icon" title="Planifier aujourd’hui" aria-label={`Planifier ${step.title} aujourd’hui`} onClick={() => onPlanStep(step)}><CalendarPlus size={16} /></button>)}
          <button type="button" className="small-icon" aria-label={`Supprimer ${step.title}`} onClick={() => setSteps(steps.filter(s => s.id !== step.id))}><Trash2 size={15} /></button>
        </div>)}
        <form className="goal-value-form wide" onSubmit={addStep}><input placeholder="Nouvelle étape" aria-label="Nouvelle étape" maxLength={120} value={stepDraft} onChange={e => setStepDraft(e.target.value)} /><button type="submit" className="secondary-btn" disabled={!stepDraft.trim()}>Ajouter</button></form>
      </div>}

      {goal.kind === 'vision' && <div className="goal-vision">
        <p className="settings-hint">Ta note pour {new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(`${today}T12:00:00`))} :</p>
        <div className="vision-scale">{Array.from({ length: 10 }, (_, i) => i + 1).map(n => <button key={n} type="button" aria-pressed={goal.ratings?.[month] === n} onClick={() => onChange({ ...goal, ratings: { ...(goal.ratings ?? {}), [month]: n } })}>{n}</button>)}</div>
        {ratings.length > 0 && <div className="vision-bars" aria-label="Notes des derniers mois">{ratings.map(([m, v]) => <div key={m} className="vision-bar"><div style={{ height: `${v * 10}%` }} /><small>{new Intl.DateTimeFormat('fr-FR', { month: 'narrow' }).format(new Date(`${m}-15T12:00:00`))}</small></div>)}</div>}
      </div>}

      <div className="settings-list goal-settings">
        <div className="settings-row"><span><strong>Sur Aujourd’hui</strong><small>Une ligne discrète en haut de l’accueil</small></span><button type="button" role="switch" className="switch" aria-checked={focused} aria-label="Afficher sur Aujourd’hui" onClick={() => onFocus(!focused)}><span /></button></div>
        {goal.kind !== 'vision' && goal.kind !== 'project' && <div className="settings-row goal-reminder">
          <span><strong>Rappel de mise à jour</strong><small>{!goal.reminder ? 'Aucun' : goal.reminder.every === 'week' ? 'Chaque semaine à 9h' : `Le ${goal.reminder.day} de chaque mois à 9h`}</small></span>
          <select aria-label="Fréquence du rappel" value={goal.reminder?.every ?? 'none'} onChange={e => setReminder(e.target.value === 'week' ? { every: 'week', weekday: 1 } : e.target.value === 'month' ? { every: 'month', day: 1 } : undefined)}>
            <option value="none">Aucun</option><option value="week">Hebdo</option><option value="month">Mensuel</option>
          </select>
        </div>}
        {goal.reminder?.every === 'week' && <div className="day-picker goal-days">{WEEKDAYS.map(w => <button key={w.d} type="button" className="day-chip" aria-pressed={(goal.reminder as { weekday: number }).weekday === w.d} onClick={() => setReminder({ every: 'week', weekday: w.d })}>{w.l}</button>)}</div>}
        {goal.reminder?.every === 'month' && <label className="field goal-month-day"><span>Jour du mois</span><input type="number" min={1} max={28} value={goal.reminder.day} onChange={e => setReminder({ every: 'month', day: Math.max(1, Math.min(28, Number(e.target.value) || 1)) })} /></label>}
      </div>

      {editing ? <div className="goal-edit">
        <label className="field"><span>Nom</span><input value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></label>
        {(goal.kind === 'count' || goal.kind === 'measure') && <label className="field"><span>Cible{goal.unit ? ` (${goal.unit})` : ''}</span><input inputMode="decimal" value={target} onChange={e => setTarget(e.target.value.replace(',', '.'))} /></label>}
        {goal.kind !== 'vision' && <label className="field"><span>Échéance</span><input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></label>}
        <div className="field"><span>Difficulté</span><div className="chips">{DIFFICULTIES.map(d => <button key={d.id} type="button" className="chip" aria-pressed={difficulty === d.id} onClick={() => setDifficulty(d.id)}>{d.label} <small>{GOAL_GOLD[d.id]} or</small></button>)}</div></div>
        <SkillSelector value={skills} onChange={setSkills} />
        <div className="sheet-actions"><button type="button" className="text-action" onClick={() => setEditing(false)}>Annuler</button><button type="button" className="primary-btn" onClick={saveEdit}>Enregistrer</button></div>
      </div> : <div className="goal-footer">
        <button type="button" className="text-action" onClick={() => setEditing(true)}>Modifier</button>
        <button type="button" className="danger-link" onClick={() => confirmDelete ? onDelete() : setConfirmDelete(true)}><Trash2 size={16} /> {confirmDelete ? 'Confirmer la suppression' : 'Supprimer'}</button>
      </div>}
    </div>
  </div>
}

function Sparkline({ values, target }: { values: number[]; target: number }) {
  const all = [...values, target], min = Math.min(...all), max = Math.max(...all), span = max - min || 1
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${36 - ((v - min) / span) * 32 - 2}`).join(' ')
  const ty = 36 - ((target - min) / span) * 32 - 2
  return <svg className="goal-spark" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
    <line x1="0" x2="100" y1={ty} y2={ty} className="goal-spark-target" />
    <polyline points={pts} className="goal-spark-line" />
  </svg>
}

/* ---------- Page ---------- */
export default function GoalsPage({ goals, today, focusGoalId, onChange, onFocus, onPlanStep }: Props) {
  const [composer, setComposer] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const active = goals.filter(g => !g.completedOn)
  const done = goals.filter(g => g.completedOn)
  const open = goals.find(g => g.id === openId)
  const update = (g: Goal) => onChange(goals.map(x => x.id === g.id ? withCompletion(g, today) : x))

  const row = (goal: Goal) => {
    const pace = goalPace(goal, today)
    return <button key={goal.id} type="button" className="goal-row" onClick={() => setOpenId(goal.id)}>
      <GoalIcon goal={goal} />
      <span className="goal-row-copy">
        <strong>{goal.title}{focusGoalId === goal.id && <small className="goal-focus-tag">Aujourd’hui</small>}</strong>
        <small>{[goalValueLabel(goal), pace.label].filter(Boolean).join(' · ')}{pace.status === 'late' ? '' : ''}</small>
      </span>
      {pace.status === 'late' && <span className="goal-late-dot" aria-label="En retard" />}
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  }

  return <section>
    <div className="page-intro"><div><h1>Objectifs</h1></div><button type="button" className="primary-btn" onClick={() => setComposer(true)}><Plus size={18} /> Nouveau</button></div>
    {active.length === 0 && <button type="button" className="goal-empty" onClick={() => setComposer(true)}>
      <strong>Écris ton premier objectif</strong><small>Une phrase suffit : « Perdre 12 kg d’ici février », « Lire 12 livres en 2027 »…</small>
    </button>}
    {HORIZONS.map(h => {
      const list = active.filter(g => horizonOf(g, today) === h.id).sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))
      if (!list.length) return null
      return <section key={h.id} className="goal-section"><h2 className="goal-section-title">{h.label}</h2><div className="goal-list">{list.map(row)}</div></section>
    })}
    {done.length > 0 && <section className="goal-section">
      <button type="button" className="text-action" aria-expanded={showDone} onClick={() => setShowDone(v => !v)}>{showDone ? 'Masquer' : 'Voir'} les objectifs atteints ({done.length})</button>
      {showDone && <div className="goal-list">{done.map(row)}</div>}
    </section>}
    {composer && <Composer today={today} onClose={() => setComposer(false)} onCreate={goal => { onChange([...goals, goal]); setComposer(false); setOpenId(goal.kind === 'project' ? goal.id : null) }} />}
    {open && <GoalSheet key={open.id} goal={open} today={today} focused={focusGoalId === open.id} onClose={() => setOpenId(null)}
      onChange={update} onDelete={() => { onChange(goals.filter(g => g.id !== open.id)); if (focusGoalId === open.id) onFocus(undefined); setOpenId(null) }}
      onFocus={on => onFocus(on ? open.id : undefined)} onPlanStep={step => onPlanStep(open, step)} />}
  </section>
}
