import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { SKILL_GROUPS } from './skillsCatalog'
import { domainProgress, skillProgress, rankFor, type XpLedger, type XpProgress } from './xpEngine'
import EvolutionChart from './EvolutionChart'
import { bucketLabel, domainSeries, rolling, shortLabel, type Step } from './xpHistory'
import { currentDayKey } from './timeZone'

const SHORT_NAMES: Record<string, string> = { appearance: 'Physique', health: 'Santé', knowledge: 'Savoir', ambition: 'Ambition', discipline: 'Discipline', relations: 'Relations' }

const CX = 160, CY = 138, R = 88
const angleOf = (i: number) => (-90 + i * 60) * Math.PI / 180
const point = (i: number, ratio: number) => [CX + Math.cos(angleOf(i)) * R * ratio, CY + Math.sin(angleOf(i)) * R * ratio] as const
const fmt = (n: number) => n.toLocaleString('fr-FR')
const position = (p: XpProgress) => (p.level - 1) + p.current / p.required
function Bar({ progress }: { progress: XpProgress }) {
  return <div className="bar bar-thin" role="progressbar" aria-valuenow={progress.current} aria-valuemin={0} aria-valuemax={progress.required}>
    <div style={{ width: `${Math.min(100, progress.current / progress.required * 100)}%` }} />
  </div>
}

type Domain = { id: string; name: string; progress: XpProgress }

/** Hexagone : une branche par domaine. L'échelle s'adapte pour que la forme reste lisible, même au début. */
function Radar({ domains, onOpen }: { domains: Domain[]; onOpen: (id: string) => void }) {
  const values = domains.map(d => position(d.progress))
  const scale = Math.max(2, Math.ceil(Math.max(...values) * 1.25))
  const ratios = values.map(v => Math.max(0.1, v / scale))
  const polygon = ratios.map((r, i) => point(i, r).join(',')).join(' ')
  const ring = (r: number) => domains.map((_, i) => point(i, r).join(',')).join(' ')
  return <svg className="radar" viewBox="0 0 320 276" role="group" aria-label="Niveaux par domaine">
    {[1 / 3, 2 / 3, 1].map(r => <polygon key={r} className="radar-ring" points={ring(r)} />)}
    {domains.map((_, i) => { const [x, y] = point(i, 1); return <line key={i} className="radar-axis" x1={CX} y1={CY} x2={x} y2={y} /> })}
    <g className="radar-shape">
      <polygon className="radar-area" points={polygon} />
      {ratios.map((r, i) => { const [x, y] = point(i, r); return <circle key={i} className="radar-dot" cx={x} cy={y} r={3.5} /> })}
    </g>
    {domains.map((d, i) => {
      const [x, y] = point(i, 1.2)
      const anchor = Math.abs(x - CX) < 4 ? 'middle' : x > CX ? 'start' : 'end'
      const dy = y < CY - 4 ? -2 : y > CY + 4 ? 12 : 4
      return <g key={d.id} className="radar-label" role="button" tabIndex={0} aria-label={`${d.name}, niveau ${d.progress.level}`}
        onClick={() => onOpen(d.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(d.id) } }}>
        <circle cx={x} cy={y + dy - 4} r={30} fill="transparent" />
        <text x={x} y={y + dy} textAnchor={anchor}>{SHORT_NAMES[d.id] ?? d.name}</text>
      </g>
    })}
  </svg>
}

const PERIODS: { id: string; label: string; step: Step; count: number }[] = [{ id: '30d', label: '30 j', step: 'day', count: 30 }, { id: '12w', label: '12 sem.', step: 'week', count: 12 }]
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(Math.round(n)))}`
const sum = (v: number[]) => v.reduce((a, b) => a + b, 0)

/** Couleur fixe par domaine (même ordre partout ; palette vérifiée daltonisme, clair et sombre). */
const COLORS: Record<string, string> = { appearance: 'var(--series-1)', health: 'var(--series-2)', knowledge: 'var(--series-3)', ambition: 'var(--series-4)', discipline: 'var(--series-5)', relations: 'var(--series-6)' }

/** Mini-courbe sans axes. */
function Spark({ values, color = 'var(--accent)' }: { values: number[]; color?: string }) {
  if (values.every(v => v === 0)) return <span className="sparkline" style={{ width: 56 }} aria-hidden="true" />
  const max = Math.max(1, ...values), min = Math.min(0, ...values), w = 56, h = 18
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - 1 - ((v - min) / (max - min || 1)) * (h - 2)}`).join(' ')
  return <svg className="sparkline" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={pts} style={{ stroke: color }} /></svg>
}

/** Évolution : les domaines cochés s'affichent ensemble, chacun avec sa couleur ; liste triée du plus fort au plus faible. */
function Evolution({ ledger, onOpen }: { ledger?: XpLedger; onOpen: (id: string) => void }) {
  const [period, setPeriod] = useState(PERIODS[0])
  const [shown, setShown] = useState<string[]>(() => SKILL_GROUPS.map(g => g.id))
  const today = currentDayKey()
  const daily = period.step === 'day'
  // Jour par jour : XP des 7 derniers jours (courbe lisible). Par semaine : XP de chaque semaine.
  const wide = domainSeries(ledger, today, period.step, period.count * 2 + (daily ? 6 : 0))
  const curveOf = (v: number[]) => daily ? rolling(v, 7, period.count) : v.slice(-period.count)
  const keys = wide.keys.slice(-period.count)
  const rows = SKILL_GROUPS.map(g => {
    const v = wide.domains[g.id]
    return { id: g.id, name: SHORT_NAMES[g.id] ?? g.name, color: COLORS[g.id], total: sum(v.slice(-period.count)), previous: sum(v.slice(-period.count * 2, -period.count)), curve: curveOf(v) }
  }).sort((a, b) => b.total - a.total)
  const visible = rows.filter(r => shown.includes(r.id))
  const current = sum(visible.map(r => r.total)), previous = sum(visible.map(r => r.previous))
  const diff = previous ? Math.round((current - previous) / Math.abs(previous) * 100) : null
  const allOn = shown.length === SKILL_GROUPS.length
  const toggle = (id: string) => setShown(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const best = rows[0], worst = rows[rows.length - 1]
  return <div className="evo">
    <div className="evo-main">
    <div className="evo-head">
      <div><p className="evo-label">{allOn ? 'Toutes les compétences' : visible.length === 1 ? SKILL_GROUPS.find(g => g.id === visible[0].id)!.name : `${visible.length} domaines`}</p>
        <p className="evo-big">{signed(current)} <small>XP</small></p>
        <p className="evo-diff">{diff === null ? `sur ${daily ? '30 jours' : '12 semaines'}` : `${diff >= 0 ? '+' : '−'}${Math.abs(diff)} % vs période précédente`}</p></div>
      <div className="segmented evo-periods" role="tablist" aria-label="Période">{PERIODS.map(p => <button key={p.id} type="button" role="tab" aria-selected={p.id === period.id} onClick={() => setPeriod(p)}>{p.label}</button>)}</div>
    </div>
    <EvolutionChart series={visible.map(r => ({ id: r.id, name: r.name, color: r.color, values: r.curve }))} labels={keys.map(shortLabel)}
      tipLabels={keys.map(k => daily ? `7 jours au ${bucketLabel(k, 'day')}` : bucketLabel(k, 'week'))} />
    {best.total !== worst.total && <p className="evo-insight"><span>Point fort <strong>{best.name}</strong></span><span>À travailler <strong>{worst.name}</strong></span></p>}
    </div>
    <div className="evo-side">
    <div className="evo-list">
      <div className="evo-list-head"><span>Domaines</span><button type="button" className="text-action" onClick={() => setShown(allOn ? [] : SKILL_GROUPS.map(g => g.id))}>{allOn ? 'Tout décocher' : 'Tout cocher'}</button></div>
      {rows.map(r => <div key={r.id} className="evo-row">
        <button type="button" className="evo-toggle" aria-pressed={shown.includes(r.id)} onClick={() => toggle(r.id)}>
          <span className="evo-check" style={{ borderColor: r.color, background: shown.includes(r.id) ? r.color : 'transparent' }} />
          <span className="evo-name">{r.name}</span>
          <Spark values={r.curve} color={r.color} />
          <span className="evo-total">{signed(r.total)}</span>
        </button>
        <button type="button" className="evo-open" aria-label={`Voir les compétences ${r.name}`} onClick={() => onOpen(r.id)}><ChevronRight size={16} /></button>
      </div>)}
    </div>
    <p className="evo-caption">{daily ? 'Chaque point = XP gagné sur les 7 jours précédents' : 'Chaque point = XP de la semaine'}, pénalités déduites. Coche les domaines à comparer ; la flèche ouvre leurs compétences.</p>
    </div>
  </div>
}

function DomainSheet({ groupId, ledger, onClose }: { groupId: string; ledger?: XpLedger; onClose: () => void }) {
  const group = SKILL_GROUPS.find(g => g.id === groupId)!
  const domain = domainProgress(ledger, group.id)
  const [drag, setDrag] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef(0)
  const mouseStart = useRef<number | null>(null)
  const setOffset = (value: number) => { dragRef.current = value; setDrag(value) }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  // Tactile : glisser n'importe où sur la fiche vers le bas la ferme (quand son contenu est tout en haut).
  useEffect(() => {
    const el = sheetRef.current
    if (!el) return
    let startY: number | null = null
    let dragging = false
    const onStart = (e: TouchEvent) => { startY = e.touches.length === 1 ? e.touches[0].clientY : null; dragging = false }
    const onMove = (e: TouchEvent) => {
      if (startY === null) return
      const dy = e.touches[0].clientY - startY
      if (!dragging) {
        if (dy > 8 && el.scrollTop <= 0) dragging = true
        else if (dy < -8) { startY = null; return }
        else return
      }
      e.preventDefault()
      setOffset(Math.max(0, dy))
    }
    const onEnd = () => {
      if (dragging) { if (dragRef.current > 90) onClose(); else setOffset(0) }
      startY = null; dragging = false
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [onClose])
  // Souris (ordinateur) : on glisse la petite barre.
  const down = (e: ReactPointerEvent<HTMLDivElement>) => { if (e.pointerType !== 'mouse') return; mouseStart.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId) }
  const move = (e: ReactPointerEvent<HTMLDivElement>) => { if (mouseStart.current !== null) setOffset(Math.max(0, e.clientY - mouseStart.current)) }
  const up = () => { if (mouseStart.current === null) return; mouseStart.current = null; if (dragRef.current > 90) onClose(); else setOffset(0) }
  const rank = rankFor(domain.level)
  const history = domainSeries(ledger, currentDayKey(), 'day', 36).skills
  return <div className="sheet-backdrop" onMouseDown={onClose}>
    <div ref={sheetRef} className="sheet skill-sheet" role="dialog" aria-modal="true" aria-label={group.name} onMouseDown={e => e.stopPropagation()}
      style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}>
      <div className="sheet-handle" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}><div className="sheet-grabber" aria-hidden="true" /></div>
      <div className="sheet-head skill-sheet-head">
        <div>
          <h2>{group.name}</h2>
          <p className="skill-sub">Niv. {domain.level}{rank ? ` · ${rank}` : ''} · moyenne de ses compétences</p>
        </div>
        <button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><X size={20} /></button>
      </div>
      <Bar progress={domain} />
      <div className="skill-list">{group.skills.map(skill => {
        const progress = skillProgress(ledger, skill.id)
        const skillRank = rankFor(progress.level)
        return <div key={skill.id} className="skill-row">
          <div className="skill-row-top"><span>{skill.name}{skillRank && <small className="rank-mini">{skillRank}</small>}</span><span className="skill-level"><Spark values={rolling(history[skill.id], 7, 30)} color={COLORS[group.id]} />Niv. {progress.level}</span></div>
          <Bar progress={progress} />
          <div className="skill-xp">{fmt(progress.current)} / {fmt(progress.required)} XP</div>
        </div>
      })}</div>
    </div>
  </div>
}

type Props = { ledger?: XpLedger }

export default function SkillsPage({ ledger }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'evolution'>('overview')
  const domains: Domain[] = SKILL_GROUPS.map(g => ({ id: g.id, name: g.name, progress: domainProgress(ledger, g.id) }))
  // Lecture rapide : où tu es le plus fort, où il reste le plus à faire (affichée seulement si l'écart est net).
  const scores = domains.map(d => ({ d, score: position(d.progress) }))
  const best = Math.max(...scores.map(x => x.score)), worst = Math.min(...scores.map(x => x.score))
  const showInsight = best - worst >= 0.5
  const label = (pick: number) => scores.filter(x => x.score === pick).slice(0, 2).map(x => SHORT_NAMES[x.d.id] ?? x.d.name).join(' · ')
  return <section>
    <div className="page-intro"><div><h1>Compétences</h1></div></div>
    <div className="segmented skills-tabs" role="tablist" aria-label="Affichage"><button type="button" role="tab" aria-selected={tab === 'overview'} onClick={() => setTab('overview')}>Niveaux</button><button type="button" role="tab" aria-selected={tab === 'evolution'} onClick={() => setTab('evolution')}>Évolution</button></div>
    {tab === 'evolution' ? <Evolution ledger={ledger} onOpen={setOpenId} /> : <div className="skills-overview">
    <div className="panel skills-hero">
      <Radar domains={domains} onOpen={setOpenId} />
      {showInsight && <p className="skills-insight"><span>Point fort <strong>{label(best)}</strong></span><span>À travailler <strong>{label(worst)}</strong></span></p>}
    </div>
    <div className="domain-list">{domains.map(d => {
      const rank = rankFor(d.progress.level)
      return <button key={d.id} type="button" className="domain-row" onClick={() => setOpenId(d.id)}>
        <span className="domain-name">{d.name}</span>
        <span className="domain-meta">Niv. {d.progress.level}{rank ? ` · ${rank}` : ''}</span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    })}</div>
    </div>}
    {openId && <DomainSheet groupId={openId} ledger={ledger} onClose={() => setOpenId(null)} />}
  </section>
}
