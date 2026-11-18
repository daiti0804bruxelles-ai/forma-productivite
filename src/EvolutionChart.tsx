import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

export type Series = { id: string; name: string; color: string; values: number[] }
const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
const H = 170, PAD = { l: 34, r: 8, t: 10, b: 22 }

/** Courbes d'XP (une par série), ligne zéro visible, survol/toucher = repère vertical + bulle. */
export default function EvolutionChart({ series, labels, tipLabels }: { series: Series[]; labels: string[]; tipLabels: string[] }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(320)
  const [hover, setHover] = useState<number | null>(null)
  // Sur téléphone (pas de « survol »), la bulle se ferme seule après 3 s.
  useEffect(() => { if (hover === null) return; const t = window.setTimeout(() => setHover(null), 3000); return () => window.clearTimeout(t) }, [hover])
  useEffect(() => {
    const el = box.current; if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(240, el.clientWidth)))
    ro.observe(el); return () => ro.disconnect()
  }, [])
  const n = labels.length
  const all = series.flatMap(s => s.values)
  const rawMax = Math.max(10, ...all), rawMin = Math.min(0, ...all)
  const nice = (v: number) => { const p = Math.pow(10, Math.floor(Math.log10(Math.max(1, Math.abs(v))))); return Math.ceil(v / p) * p }
  const max = nice(rawMax), min = rawMin < 0 ? -nice(-rawMin) : 0
  const x = (i: number) => PAD.l + (n <= 1 ? 0 : i * (w - PAD.l - PAD.r) / (n - 1))
  const y = (v: number) => PAD.t + (max - v) * (H - PAD.t - PAD.b) / (max - min || 1)
  const ticks = min < 0 ? [min, 0, max] : [0, max / 2, max]
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) * (w / r.width)
    setHover(Math.max(0, Math.min(n - 1, Math.round((px - PAD.l) / ((w - PAD.l - PAD.r) / Math.max(1, n - 1))))))
  }
  const xLabels = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0]
  return <div className="evo-chart" ref={box}>
    <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label="Évolution de l'XP"
      onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)}>
      {ticks.map(t => <g key={t}>
        <line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} className={t === 0 ? 'evo-zero' : 'evo-grid'} />
        <text x={PAD.l - 6} y={y(t) + 3.5} textAnchor="end" className="evo-axis">{fmt(t)}</text>
      </g>)}
      {xLabels.map(i => <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="evo-axis">{labels[i]}</text>)}
      {series.map(s => <polyline key={s.id} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
        points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />)}
      {hover !== null && <g>
        <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} className="evo-cross" />
        {series.map(s => <circle key={s.id} cx={x(hover)} cy={y(s.values[hover])} r={4} fill={s.color} className="evo-dot" />)}
      </g>}
    </svg>
    {hover !== null && series.length > 0 && <div className="evo-tip" style={{ left: `${Math.min(70, Math.max(0, (x(hover) / w) * 100 - 15))}%` }}>
      <strong>{tipLabels[hover]}</strong>
      {[...series].sort((a, b) => b.values[hover] - a.values[hover]).map(s => <span key={s.id}><i style={{ background: s.color }} />{s.name}<b>{s.values[hover] > 0 ? '+' : ''}{fmt(s.values[hover])}</b></span>)}
    </div>}
  </div>
}
