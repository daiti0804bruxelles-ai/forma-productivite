import { useState } from 'react'
import { SKILL_GROUPS, type SkillId } from './skillsCatalog'
import { activeRests, REST_REASONS, SPORT_SKILLS, type RestPeriod } from './rest'

const toDate = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d) }
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const plus = (day: string, n: number) => { const d = toDate(day); d.setDate(d.getDate() + n); return keyOf(d) }
const short = (day: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(toDate(day))
const NAMES: Record<string, string> = Object.fromEntries(SKILL_GROUPS.flatMap(g => g.skills.map(s => [s.id, s.name])))
export const restSkillsLabel = (ids: readonly string[]) => ids.map(i => NAMES[i] ?? i).join(', ')

const DURATIONS = [{ label: 'Aujourd’hui', days: 0 }, { label: '3 jours', days: 2 }, { label: '1 semaine', days: 6 }, { label: 'Jusqu’à ce que j’arrête', days: null }] as const

/** Mode repos : choisir les compétences en pause et la durée. Aucune pénalité pour ce qui y est lié ; le reste compte normalement. */
export default function RestMode({ periods, today, onChange, newId }: { periods: RestPeriod[]; today: string; onChange: (next: RestPeriod[]) => void; newId: () => string }) {
  const active = activeRests(periods, today)
  const [reason, setReason] = useState<string>('Malade')
  const [skills, setSkills] = useState<SkillId[]>(SPORT_SKILLS)
  const [duration, setDuration] = useState<number | null>(6)
  const [more, setMore] = useState(false)
  const sport = SPORT_SKILLS.every(s => skills.includes(s))
  const toggle = (s: SkillId) => setSkills(list => list.includes(s) ? list.filter(x => x !== s) : [...list, s])
  const toggleSport = () => setSkills(list => sport ? list.filter(s => !SPORT_SKILLS.includes(s)) : [...new Set([...list, ...SPORT_SKILLS])])
  // Terminer : tout compte de nouveau à partir d'aujourd'hui (une période commencée aujourd'hui est simplement retirée).
  const stop = (p: RestPeriod) => onChange(p.from >= today ? periods.filter(x => x.id !== p.id) : periods.map(x => x.id === p.id ? { ...x, to: plus(today, -1) } : x))
  const start = () => onChange([...periods, { id: newId(), from: today, to: duration === null ? undefined : plus(today, duration), skillIds: skills, reason }])

  return <div className="rest-mode">
    {active.map(p => <div className="rest-active" key={p.id}>
      <div><strong>{p.reason ?? 'Repos'}</strong><span>{restSkillsLabel(p.skillIds)}</span><small>{p.to ? `Jusqu’au ${short(p.to)} inclus` : `Depuis le ${short(p.from)}`}</small></div>
      <button type="button" className="secondary-btn" onClick={() => stop(p)}>Terminer</button>
    </div>)}
    {!active.length && <>
      <div className="field"><span>Raison</span><div className="chips">{REST_REASONS.map(r => <button key={r} type="button" className="chip" aria-pressed={reason === r} onClick={() => setReason(r)}>{r}</button>)}</div></div>
      <div className="field"><span>En pause</span>
        <div className="chips"><button type="button" className="chip" aria-pressed={sport} onClick={toggleSport}>Sport</button>
          {!more && skills.filter(x => !SPORT_SKILLS.includes(x)).map(x => <button key={x} type="button" className="chip" aria-pressed onClick={() => toggle(x)}>{NAMES[x]}</button>)}
          {!more && <button type="button" className="chip" onClick={() => setMore(true)}>Autre…</button>}</div>
        {more && SKILL_GROUPS.map(g => <div className="chips rest-skills" key={g.id}>{g.skills.map(s => <button key={s.id} type="button" className="chip" aria-pressed={skills.includes(s.id)} onClick={() => toggle(s.id)}>{s.name}</button>)}</div>)}
      </div>
      <div className="field"><span>Durée</span><div className="chips">{DURATIONS.map(d => <button key={d.label} type="button" className="chip" aria-pressed={duration === d.days} onClick={() => setDuration(d.days)}>{d.label}</button>)}</div></div>
      <button type="button" className="primary-btn" disabled={!skills.length} onClick={start}>Activer le mode repos</button>
    </>}
  </div>
}
