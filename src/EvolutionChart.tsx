import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

export type Series = { id: string; name: string; color: string; values: number[] }
const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
const H = 160, T = 12, B = 22

/** Courbes minimalistes : une couleur par série, pas de quadrillage ; toucher = valeurs du point (sous le titre). */
export default function EvolutionChart({ series, labels, tipLabels }: { series: Series[]; labels: string[]; tipLabels: string[] }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(320)
  const [hover, setHover] = useState<number | null>(null)
  useEffect(() => {
    const el = box.current; if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(240, el.clientWidth)))
    ro.observe(el); return () => ro.disconnect()
  }, [])
  useEffect(() => { if (hover === null) return; const t = window.setTimeout(() => setHover(null), 4000); return () => window.clearTimeout(t) }, [hover])
  const n = labels.length
  const all = series.flatMap(s => s.values)
  const max = Math.max(10, ...all) * 1.1, min = Math.min(0, ...all) * 1.1
  const x = (i: number) => n <= 1 ? 0 : i * w / (n - 1)
  const y = (v: number) => T + (max - v) * (H - T - B) / (max - min || 1)
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setHover(Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left) / r.width * (n - 1)))))
  }
  const i = hover ?? n - 1
  const single = series.length === 1
  return <div className="evo-chart" ref={box}>
    <div className="evo-point"><span className="evo-point-day">{tipLabels[i]}</span>
      {[...series].sort((a, b) => b.values[i] - a.values[i]).map(s => <span key={s.id} className="evo-point-item"><i style={{ background: s.color }} />{s.name} <b>{s.values[i] > 0 ? '+' : ''}{fmt(s.values[i])}</b></span>)}
    </div>
    <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label="Évolution de l'XP" onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)}>
      {single && <defs><linearGradient id="evo-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={series[0].color} stopOpacity=".18" /><stop offset="1" stopColor={series[0].color} stopOpacity="0" /></linearGradient></defs>}
      <line x1={0} x2={w} y1={y(0)} y2={y(0)} className="evo-zero" />
      {single && <polygon points={`0,${y(0)} ${series[0].values.map((v, k) => `${x(k)},${y(v)}`).join(' ')} ${w},${y(0)}`} fill="url(#evo-fill)" />}
      {series.map(s => <polyline key={s.id} points={s.values.map((v, k) => `${x(k)},${y(v)}`).join(' ')} className="evo-line" style={{ stroke: s.color }} />)}
      {hover !== null && <line x1={x(i)} x2={x(i)} y1={T} y2={H - B} className="evo-cross" />}
      {series.map(s => <circle key={s.id} cx={x(i)} cy={y(s.values[i])} r={4} className="evo-dot" style={{ fill: s.color }} />)}
      <text x={0} y={H - 5} className="evo-axis">{labels[0]}</text>
      <text x={w} y={H - 5} textAnchor="end" className="evo-axis">{labels[n - 1]}</text>
    </svg>
  </div>
}
