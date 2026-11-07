import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { SKILL_GROUPS } from './skillsCatalog'
import { domainProgress, skillProgress, rankFor, type XpLedger, type XpProgress } from './xpEngine'

const skillNameById: Record<string, string> = Object.fromEntries(SKILL_GROUPS.flatMap(group => group.skills.map(skill => [skill.id, skill.name])))
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
  const scale = Math.max(4, Math.ceil(Math.max(...values) * 1.25))
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
  return <div className="sheet-backdrop" onMouseDown={onClose}>
    <div ref={sheetRef} className="sheet skill-sheet" role="dialog" aria-modal="true" aria-label={group.name} onMouseDown={e => e.stopPropagation()}
      style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}>
      <div className="sheet-handle" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}><div className="sheet-grabber" aria-hidden="true" /></div>
      <div className="sheet-head skill-sheet-head">
        <div>
          <h2>{group.name}</h2>
          <p className="skill-sub">Niv. {domain.level}{rank ? ` · ${rank}` : ''} · {fmt(domain.current)} / {fmt(domain.required)} XP</p>
        </div>
        <button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><X size={20} /></button>
      </div>
      <Bar progress={domain} />
      <div className="skill-list">{group.skills.map(skill => {
        const progress = skillProgress(ledger, skill.id)
        const skillRank = rankFor(progress.level)
        return <div key={skill.id} className="skill-row">
          <div className="skill-row-top"><span>{skill.name}{skillRank && <small className="rank-mini">{skillRank}</small>}</span><span className="skill-level">Niv. {progress.level}</span></div>
          <Bar progress={progress} />
          <div className="skill-xp">{fmt(progress.current)} / {fmt(progress.required)} XP</div>
        </div>
      })}</div>
    </div>
  </div>
}

export default function SkillsPage({ ledger }: { ledger?: XpLedger }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const recentEvents = [...(ledger?.events ?? [])].reverse().slice(0, 12)
  const domains: Domain[] = SKILL_GROUPS.map(g => ({ id: g.id, name: g.name, progress: domainProgress(ledger, g.id) }))
  return <section>
    <div className="page-intro"><div><h1>Compétences</h1></div></div>
    <div className="panel skills-hero"><Radar domains={domains} onOpen={setOpenId} /></div>
    <div className="domain-list">{domains.map(d => {
      const rank = rankFor(d.progress.level)
      return <button key={d.id} type="button" className="domain-row" onClick={() => setOpenId(d.id)}>
        <span className="domain-name">{d.name}</span>
        <span className="domain-meta">Niv. {d.progress.level}{rank ? ` · ${rank}` : ''}</span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    })}</div>
    <button type="button" className="text-action history-toggle" aria-expanded={showHistory} onClick={() => setShowHistory(!showHistory)}>{showHistory ? 'Masquer l’historique XP' : 'Historique XP'}</button>
    {showHistory && <section className="panel" style={{ marginTop: 8, padding: 20 }}>
      <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>Historique XP</h2>
      <p style={{ fontSize: 13, opacity: .7, margin: '0 0 18px' }}>12 dernières opérations enregistrées. Les pénalités sont affichées même si ton niveau reste protégé.</p>
      {recentEvents.length === 0
        ? <p style={{ opacity: .65, fontSize: 13 }}>Aucune opération XP pour le moment.</p>
        : <div style={{ display: 'grid', gap: 12 }}>
          {recentEvents.map(event => {
            const labels: Record<string, string> = { habit: 'Habitude validée', task: 'Tâche validée', goal: 'Objectif atteint', penalty: 'Pénalité' }
            const eventDay = event.source === 'penalty' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(event.key.slice(-10)) ? event.key.slice(-10) : event.at
            const skillNames = event.skillIds.map(id => skillNameById[id] ?? id).join(' · ')
            return <div key={event.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, paddingBottom: 12, borderBottom: '1px solid rgba(120,120,128,.12)' }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 13 }}>{labels[event.source]}</strong>
                <div style={{ fontSize: 12, opacity: .7, marginTop: 4, overflowWrap: 'anywhere' }}>{skillNames}</div>
                <time dateTime={eventDay} style={{ display: 'block', fontSize: 11, opacity: .55, marginTop: 4 }}>{Number.isNaN(Date.parse(eventDay)) ? '' : new Date(eventDay.includes('T') ? eventDay : `${eventDay}T12:00:00`).toLocaleDateString('fr-FR')}</time>
              </div>
              <strong style={{ whiteSpace: 'nowrap', fontSize: 13, color: event.amountPerSkill < 0 ? 'var(--danger)' : 'var(--success)' }}>{event.amountPerSkill > 0 ? '+' : ''}{event.amountPerSkill.toLocaleString('fr-FR')} XP / compétence</strong>
            </div>
          })}
        </div>}
    </section>}
    {openId && <DomainSheet groupId={openId} ledger={ledger} onClose={() => setOpenId(null)} />}
  </section>
}
