import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
const H = 150, T = 12, B = 22

/** Une seule courbe, couleur d'accent, fond très léger ; toucher = valeur du point. */
export default function EvolutionChart({ values, labels, tipLabels }: { values: number[]; labels: string[]; tipLabels: string[] }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(320)
  const [hover, setHover] = useState<number | null>(null)
  useEffect(() => {
    const el = box.current; if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(240, el.clientWidth)))
    ro.observe(el); return () => ro.disconnect()
  }, [])
  useEffect(() => { if (hover === null) return; const t = window.setTimeout(() => setHover(null), 3000); return () => window.clearTimeout(t) }, [hover])
  const n = values.length
  const max = Math.max(10, ...values) * 1.1, min = Math.min(0, ...values) * 1.1
  const x = (i: number) => n <= 1 ? 0 : i * w / (n - 1)
  const y = (v: number) => T + (max - v) * (H - T - B) / (max - min || 1)
  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const area = `0,${y(Math.max(0, min))} ${line} ${w},${y(Math.max(0, min))}`
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setHover(Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left) / r.width * (n - 1)))))
  }
  const i = hover ?? n - 1
  return <div className="evo-chart" ref={box}>
    <div className="evo-point"><strong>{values[i] > 0 ? '+' : ''}{fmt(values[i] ?? 0)} XP</strong><span>{tipLabels[i]}</span></div>
    <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label="Évolution de l'XP" onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)}>
      <defs><linearGradient id="evo-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".18" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
      {min < 0 && <line x1={0} x2={w} y1={y(0)} y2={y(0)} className="evo-zero" />}
      <polygon points={area} fill="url(#evo-fill)" />
      <polyline points={line} className="evo-line" />
      <line x1={x(i)} x2={x(i)} y1={T} y2={H - B} className="evo-cross" />
      <circle cx={x(i)} cy={y(values[i] ?? 0)} r={4.5} className="evo-dot" />
      <text x={0} y={H - 5} className="evo-axis">{labels[0]}</text>
      <text x={w} y={H - 5} textAnchor="end" className="evo-axis">{labels[n - 1]}</text>
    </svg>
  </div>
}
