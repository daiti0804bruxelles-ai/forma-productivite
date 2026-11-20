import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Plus, X } from 'lucide-react'
import SwipeRow from './SwipeRow'
import { suggestSkills } from './skillSuggest'
import { DIFFICULTIES, xpForDifficulty, type Difficulty } from './xpEngine'
import type { SharedTask, useSharedGoals } from './useSharedGoals'

type Shared = ReturnType<typeof useSharedGoals>
const pad = (n: number) => String(n).padStart(2, '0')
const plusDays = (day: string, n: number) => { const [y, m, d] = day.split('-').map(Number); const x = new Date(y, m - 1, d + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}` }
const short = (day: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(`${day}T12:00:00`))
const localDay = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

/** Liste des tâches à deux. « today » : en retard + du jour (+ faites aujourd'hui) ; « all » : toutes celles à faire. */
export function SharedTaskList({ shared, today, mode, onNew }: { shared: Shared; today: string; mode: 'today' | 'all'; onNew: () => void }) {
  const list = shared.tasks.filter(t => mode === 'all' ? !t.done_at : (t.due_date <= today && (!t.done_at || localDay(t.done_at) === today)))
  if (!shared.space) return null
  if (mode === 'today' && !list.length) return null
  const meta = (t: SharedTask) => {
    if (t.done_at) return `Faite par ${t.done_by === shared.userId ? 'toi' : 'l’autre membre'}`
    const when = t.due_date === today ? 'Aujourd’hui' : t.due_date < today ? `En retard · ${short(t.due_date)}` : t.due_date === plusDays(today, 1) ? 'Demain' : short(t.due_date)
    return `${when} · +${xpForDifficulty(t.difficulty) * Math.max(1, t.skill_ids.length)} XP`
  }
  return <section className="list-section shared-tasks">
    <div className="section-head"><h2>À deux</h2><button type="button" className="text-action" onClick={onNew}><Plus size={15} /> Tâche à deux</button></div>
    <div className="list-card">{list.length ? list.map(t => <SwipeRow key={t.id} done={Boolean(t.done_at)} onComplete={() => { void shared.toggleTask(t) }}
      onPostpone={!t.done_at && t.due_date <= today ? () => { void shared.moveTask(t, plusDays(today, 1)) } : undefined} onDelete={() => { void shared.removeTask(t) }}>
      <div className="check-row">
        <button type="button" className="round-check" aria-pressed={Boolean(t.done_at)} aria-label={`${t.done_at ? 'Rouvrir' : 'Terminer'} ${t.title}`} onClick={() => { void shared.toggleTask(t) }}>{t.done_at && <Check size={15} strokeWidth={3} />}</button>
        <div className="row-copy"><span className={t.done_at ? 'is-done' : ''}>{t.title}</span><small className={!t.done_at && t.due_date < today ? 'is-late' : ''}>{meta(t)}</small></div>
      </div>
    </SwipeRow>) : <div className="empty">Aucune tâche à deux.</div>}</div>
  </section>
}

/** Création : titre, échéance, difficulté. Compétences proposées automatiquement. */
export function SharedTaskComposer({ shared, today, onClose }: { shared: Shared; today: string; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(today)
  const [difficulty, setDifficulty] = useState<Difficulty>('moyen')
  const [busy, setBusy] = useState(false)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [onClose])
  const submit = (e: FormEvent) => {
    e.preventDefault(); if (!title.trim() || busy) return
    setBusy(true)
    void shared.addTask({ title: title.trim().slice(0, 120), due_date: day, difficulty, skill_ids: suggestSkills(title, 'Personnel', 'task').slice(0, 3) }).then(ok => { setBusy(false); if (ok) onClose() })
  }
  const chip = (label: string, on: boolean, act: () => void) => <button key={label} type="button" className="chip" aria-pressed={on} onClick={act}>{label}</button>
  return <div className="sheet-backdrop" onMouseDown={onClose}>
    <form className="sheet memo-composer" role="dialog" aria-modal="true" aria-label="Nouvelle tâche à deux" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
      <div className="sheet-grabber" aria-hidden="true" />
      <div className="sheet-head skill-sheet-head"><h2>Tâche à deux</h2><button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><X size={20} /></button></div>
      <input className="goal-phrase" autoFocus maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="Payer le loyer" aria-label="Quoi" />
      <div className="chips">{chip('Aujourd’hui', day === today, () => setDay(today))}{chip('Demain', day === plusDays(today, 1), () => setDay(plusDays(today, 1)))}
        <input type="date" className="memo-date" value={day} min={today} onChange={e => setDay(e.target.value || today)} aria-label="Échéance" /></div>
      <div className="chips">{DIFFICULTIES.map(d => chip(`${d.label} · ${d.xp} XP`, difficulty === d.id, () => setDifficulty(d.id)))}</div>
      <p className="settings-hint">Visible par les membres de ton espace « À deux ». Faite dès que l’un de vous la coche ; chacun gagne l’XP et l’or.</p>
      {shared.error && <p className="goal-error" role="alert">{shared.error}</p>}
      <div className="sheet-actions"><span /><button type="submit" className="primary-btn" disabled={!title.trim() || busy}>Ajouter</button></div>
    </form>
  </div>
}
