import { Check, Users } from 'lucide-react'
import SwipeRow from './SwipeRow'
import type { SharedTask, useSharedGoals } from './useSharedGoals'

type Shared = ReturnType<typeof useSharedGoals>
const pad = (n: number) => String(n).padStart(2, '0')
const plusDays = (day: string, n: number) => { const [y, m, d] = day.split('-').map(Number); const x = new Date(y, m - 1, d + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}` }
const short = (day: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(`${day}T12:00:00`))
const localDay = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

/** Lignes des tâches faites ensemble, mêlées aux tâches perso : seule une petite mention « Ensemble » les distingue. */
export function SharedTaskRows({ shared, today, mode, onEdit }: { shared: Shared; today: string; mode: 'today' | 'todo' | 'done'; onEdit: (t: SharedTask) => void }) {
  const list = shared.tasks.filter(t => mode === 'todo' ? !t.done_at : mode === 'done' ? Boolean(t.done_at) : (t.due_date <= today && (!t.done_at || localDay(t.done_at) === today)))
  const meta = (t: SharedTask) => {
    if (t.done_at) return `Ensemble · faite par ${t.done_by === shared.userId ? 'toi' : 'l’autre'}`
    const when = t.due_date === today ? '' : t.due_date < today ? ` · en retard (${short(t.due_date)})` : t.due_date === plusDays(today, 1) ? ' · demain' : ` · ${short(t.due_date)}`
    return `Ensemble${when}`
  }
  return <>{list.map(t => <SwipeRow key={`shared-${t.id}`} done={Boolean(t.done_at)} onComplete={() => { void shared.toggleTask(t) }}
    onPostpone={!t.done_at && t.due_date <= today ? () => { void shared.moveTask(t, plusDays(today, 1)) } : undefined} onEdit={() => onEdit(t)} onDelete={() => { void shared.removeTask(t) }}>
    <div className="check-row">
      <button type="button" className="round-check" aria-pressed={Boolean(t.done_at)} aria-label={`${t.done_at ? 'Rouvrir' : 'Terminer'} ${t.title}`} onClick={() => { void shared.toggleTask(t) }}>{t.done_at && <Check size={15} strokeWidth={3} />}</button>
      <div className="row-copy row-open" role="button" tabIndex={0} onClick={() => onEdit(t)} onKeyDown={e => { if (e.key === 'Enter') onEdit(t) }}><span className={t.done_at ? 'is-done' : ''}>{t.title}</span><small className={`together-meta ${!t.done_at && t.due_date < today ? 'is-late' : ''}`}><Users size={12} className="together-icon" aria-hidden="true" />{meta(t)}</small></div>
    </div>
  </SwipeRow>)}</>
}
