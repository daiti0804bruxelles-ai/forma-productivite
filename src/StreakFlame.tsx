import { useEffect, useId, useRef, useState } from 'react'

const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365]
const RADIUS = 23
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

type Props = { streak: number; activeToday: boolean }

/**
 * Série de jours actifs, façon jeu : la flamme vit quand la série est prolongée aujourd'hui,
 * vacille quand elle est en danger (rien de validé aujourd'hui) et s'éteint à zéro.
 * L'anneau montre la progression vers le prochain palier (3, 7, 14, 30… jours).
 */
export default function StreakFlame({ streak, activeToday }: Props) {
  const gradientId = useId()
  const [igniting, setIgniting] = useState(false)
  const wasActive = useRef(activeToday)

  // Première validation de la journée : la flamme s'embrase.
  useEffect(() => {
    const before = wasActive.current
    wasActive.current = activeToday
    if (!activeToday || before) return
    setIgniting(true)
    const timer = window.setTimeout(() => setIgniting(false), 1400)
    return () => window.clearTimeout(timer)
  }, [activeToday])

  const next = MILESTONES.find(m => m > streak) ?? (Math.floor(streak / 100) + 1) * 100
  const previous = [...MILESTONES].reverse().find(m => m <= streak) ?? 0
  // Le jour où un palier est atteint, l'anneau reste plein pour fêter ça.
  const ratio = streak === 0 ? 0 : MILESTONES.includes(streak) && activeToday ? 1 : Math.max(0.04, (streak - previous) / (next - previous))
  const state = streak === 0 ? 'off' : activeToday ? 'lit' : 'risk'
  const daysLeft = next - streak
  const caption =
    state === 'off' ? 'Valide un élément pour lancer ta série'
      : state === 'risk' ? `Valide 1 élément pour garder tes ${streak} jour${streak > 1 ? 's' : ''}`
        : MILESTONES.includes(streak) ? `Palier de ${streak} jours atteint !`
          : `Encore ${daysLeft} jour${daysLeft > 1 ? 's' : ''} pour le palier ${next}`

  return <div className={`streak streak-${state} ${igniting ? 'is-igniting' : ''}`} role="status"
    aria-label={`Série de ${streak} jour${streak !== 1 ? 's' : ''}. ${caption}`}>
    <span className="streak-flame" aria-hidden="true">
      <svg className="streak-ring" viewBox="0 0 52 52">
        <circle className="streak-track" cx="26" cy="26" r={RADIUS} />
        <circle className="streak-progress" cx="26" cy="26" r={RADIUS}
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - ratio)} />
      </svg>
      <svg className="flame" viewBox="0 0 24 24">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#FF5A1F" />
            <stop offset="55%" stopColor="#FF8A1F" />
            <stop offset="100%" stopColor="#FFC23D" />
          </linearGradient>
        </defs>
        <path fill={`url(#${gradientId})`} d="M12 2c.6 3.2 2.6 4.9 4.3 6.8 1.7 1.9 2.7 3.9 2.7 6.2A7 7 0 0 1 12 22a7 7 0 0 1-7-7c0-2.4 1.1-4.3 2.4-5.8.2 1.6 1 2.8 2.2 3.4C9.2 8.6 10.2 4.9 12 2Z" />
        <path className="flame-core" fill="#FFE07A" d="M12 12.5c.3 1.5 1.3 2.3 2 3.2.6.8.9 1.5.9 2.3A2.9 2.9 0 0 1 12 21a2.9 2.9 0 0 1-2.9-3c0-1.3.7-2.3 1.4-3 .2.7.6 1.2 1.1 1.4-.1-1.4.1-2.8.4-3.9Z" />
      </svg>
      <span className="spark s1" /><span className="spark s2" /><span className="spark s3" /><span className="spark s4" />
    </span>
    <span className="streak-copy">
      <strong><span className="streak-count">{streak}</span> <small>jour{streak !== 1 ? 's' : ''} de série</small></strong>
      <span className="streak-caption">{caption}</span>
    </span>
  </div>
}
