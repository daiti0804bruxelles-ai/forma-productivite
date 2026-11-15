import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, X } from 'lucide-react'
import SwipeRow from './SwipeRow'
import { complete, isDue, REPEAT_LABEL, SNOOZES, triggerOf, whenLabel, type Memo, type MemoRepeat } from './memos'

const uid = () => Math.random().toString(36).slice(2, 10)
const plusDays = (day: string, n: number) => { const [y, m, d] = day.split('-').map(Number); const x = new Date(y, m - 1, d + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }

/** Grandes cartes en haut d'Aujourd'hui pour les rappels arrivés à échéance. */
export function DueMemos({ memos, now, onChange }: { memos: Memo[]; now: string; onChange: (m: Memo) => void }) {
  const [later, setLater] = useState<string | null>(null)
  const due = memos.filter(m => isDue(m, now)).sort((a, b) => triggerOf(a).localeCompare(triggerOf(b)))
  if (!due.length) return null
  return <section className="memo-due" aria-label="À ne pas oublier">
    {due.map(m => <div key={m.id} className="memo-alert" role="alert">
      <span className="memo-alert-kicker">N’oublie pas</span>
      <strong>{m.title}</strong>
      <small>{whenLabel(m.due, now)}{m.repeat ? ` · ${REPEAT_LABEL[m.repeat].toLowerCase()}` : ''}</small>
      {later === m.id ? <div className="memo-alert-actions">{SNOOZES.map(s => { const at = s.at(now); return at ? <button key={s.label} type="button" className="memo-later" onClick={() => { onChange({ ...m, snoozedUntil: at }); setLater(null) }}>{s.label}</button> : null })}
        <button type="button" className="memo-later" aria-label="Annuler" onClick={() => setLater(null)}><X size={16} /></button></div>
        : <div className="memo-alert-actions"><button type="button" className="memo-done" onClick={() => onChange(complete(m, now))}>Fait</button><button type="button" className="memo-later" onClick={() => setLater(m.id)}>Plus tard</button></div>}
    </div>)}
  </section>
}

function Composer({ memo, now, onSave, onClose }: { memo?: Memo; now: string; onSave: (m: Memo) => void; onClose: () => void }) {
  const today = now.slice(0, 10)
  const [title, setTitle] = useState(memo?.title ?? '')
  const [day, setDay] = useState(memo?.due.slice(0, 10) ?? today)
  const [time, setTime] = useState(memo?.due.slice(11, 16) ?? (Number(now.slice(11, 13)) < 18 ? `${String(Number(now.slice(11, 13)) + 1).padStart(2, '0')}:00` : '09:00'))
  const [repeat, setRepeat] = useState<MemoRepeat | undefined>(memo?.repeat)
  useEffect(() => { if (!memo && Number(now.slice(11, 13)) >= 18) setDay(plusDays(today, 1)) }, [memo, now, today])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [onClose])
  const due = `${day}T${time}`
  const valid = title.trim() && /^\d{4}-\d{2}-\d{2}$/.test(day) && /^\d{2}:\d{2}$/.test(time)
  const submit = (e: FormEvent) => {
    e.preventDefault(); if (!valid) return
    onSave(memo ? { ...memo, title: title.trim(), due, repeat, snoozedUntil: undefined, doneAt: undefined } : { id: uid(), title: title.trim().slice(0, 200), due, repeat, createdOn: today })
  }
  const chip = (label: string, on: boolean, act: () => void) => <button key={label} type="button" className="chip" aria-pressed={on} onClick={act}>{label}</button>
  return <div className="sheet-backdrop" onMouseDown={onClose}>
    <form className="sheet memo-composer" role="dialog" aria-modal="true" aria-label={memo ? 'Modifier le rappel' : 'Nouveau rappel'} onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
      <div className="sheet-grabber" aria-hidden="true" />
      <div className="sheet-head skill-sheet-head"><h2>{memo ? 'Modifier' : 'À ne pas oublier'}</h2><button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><X size={20} /></button></div>
      <input className="goal-phrase" autoFocus={!memo} maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="Payer le loyer" aria-label="Quoi" />
      <div className="chips">{chip('Aujourd’hui', day === today, () => setDay(today))}{chip('Demain', day === plusDays(today, 1), () => setDay(plusDays(today, 1)))}
        <input type="date" className="memo-date" value={day} onChange={e => setDay(e.target.value)} aria-label="Date" />
        <input type="time" className="memo-date" value={time} onChange={e => setTime(e.target.value)} aria-label="Heure" /></div>
      <div className="chips">{chip('Une fois', !repeat, () => setRepeat(undefined))}{(['week', 'month', 'year'] as const).map(r => chip({ week: 'Semaine', month: 'Mois', year: 'Année' }[r], repeat === r, () => setRepeat(r)))}</div>
      <div className="sheet-actions"><span /><button type="submit" className="primary-btn" disabled={!valid}>{memo ? 'Enregistrer' : 'Ajouter'}</button></div>
    </form>
  </div>
}

/** Page « À ne pas oublier » : à venir, en retard, faits. */
export default function MemosPage({ memos, now, onChange }: { memos: Memo[]; now: string; onChange: (memos: Memo[]) => void }) {
  const [editing, setEditing] = useState<Memo | 'new' | null>(null)
  const [showDone, setShowDone] = useState(false)
  const open = memos.filter(m => !m.doneAt).sort((a, b) => triggerOf(a).localeCompare(triggerOf(b)))
  const done = memos.filter(m => m.doneAt).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
  const save = (m: Memo) => { onChange(memos.some(x => x.id === m.id) ? memos.map(x => x.id === m.id ? m : x) : [...memos, m]); setEditing(null) }
  const row = (m: Memo) => <SwipeRow key={m.id} done={Boolean(m.doneAt)} completeLabel="Fait" onComplete={m.doneAt ? () => save({ ...m, doneAt: undefined }) : () => save(complete(m, now))}
    onEdit={() => setEditing(m)} onDelete={() => onChange(memos.filter(x => x.id !== m.id))}>
    <button type="button" className={`memo-row ${isDue(m, now) ? 'is-due' : ''}`} onClick={() => setEditing(m)}>
      <span className={m.doneAt ? 'is-done' : ''}>{m.title}</span>
      <small>{m.doneAt ? `Fait · ${whenLabel(m.doneAt, now)}` : `${whenLabel(triggerOf(m), now)}${m.repeat ? ` · ${REPEAT_LABEL[m.repeat].toLowerCase()}` : ''}`}</small>
    </button>
  </SwipeRow>
  return <section>
    <div className="page-intro"><div><h1>À ne pas oublier</h1></div><button type="button" className="primary-btn" onClick={() => setEditing('new')}><Plus size={18} /> Nouveau</button></div>
    {open.length ? <div className="list-card">{open.map(row)}</div>
      : <button type="button" className="goal-empty" onClick={() => setEditing('new')}><strong>Rien à oublier pour l’instant</strong><small>« Payer le loyer », « Renouveler le visa »… avec une date et une heure.</small></button>}
    {done.length > 0 && <button type="button" className="text-action show-done" aria-expanded={showDone} onClick={() => setShowDone(v => !v)}>{showDone ? 'Masquer' : 'Voir'} les rappels faits ({done.length})</button>}
    {showDone && <div className="list-card">{done.slice(0, 30).map(row)}</div>}
    {editing && <Composer memo={editing === 'new' ? undefined : editing} now={now} onSave={save} onClose={() => setEditing(null)} />}
  </section>
}
