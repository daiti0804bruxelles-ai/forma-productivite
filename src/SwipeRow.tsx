import { useRef, useState } from 'react'
import type { MouseEvent, PointerEvent, ReactNode } from 'react'
import { ArrowRight, Check, RotateCcw, Trash2 } from 'lucide-react'

const ACTION_WIDTH = 84

type Props = {
  children: ReactNode
  onComplete?: () => void
  onDelete?: () => void
  onPostpone?: () => void
  completeLabel?: string
  done?: boolean
  className?: string
}

/**
 * Ligne glissable vers la gauche (doigt ou souris) qui révèle « Terminer » et « Supprimer ».
 * Le défilement vertical reste natif ; les éléments marqués data-no-swipe (poignée de déplacement, menu) sont ignorés.
 * Les mêmes actions restent toujours disponibles autrement (case à cocher, menu), le geste n'est qu'un raccourci.
 */
export default function SwipeRow({ children, onComplete, onDelete, onPostpone, completeLabel = 'Terminer', done = false, className = '' }: Props) {
  const max = ((onComplete ? 1 : 0) + (onPostpone ? 1 : 0) + (onDelete ? 1 : 0)) * ACTION_WIDTH
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const offsetRef = useRef(0)
  const suppressClick = useRef(false)
  const gesture = useRef<{ x: number; y: number; base: number; axis: 'h' | 'v' | null } | null>(null)
  const isOpen = offset !== 0 && !dragging

  const moveTo = (value: number) => { offsetRef.current = value; setOffset(value) }
  const close = () => moveTo(0)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!max || (e.pointerType === 'mouse' && e.button !== 0)) return
    if ((e.target as Element).closest?.('[data-no-swipe]')) return
    gesture.current = { x: e.clientX, y: e.clientY, base: offsetRef.current, axis: null }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g) return
    // Un réordonnancement (glisser-déposer) a démarré : pas de glissement latéral en même temps.
    if (document.documentElement.dataset.sorting) { gesture.current = null; if (dragging) { setDragging(false); moveTo(0) } return }
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (!g.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      g.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      if (g.axis === 'h') { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true) }
    }
    if (g.axis !== 'h') return
    moveTo(Math.max(-max - 24, Math.min(0, g.base + dx)))
  }
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    gesture.current = null
    if (!g || g.axis !== 'h') return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    suppressClick.current = true
    window.setTimeout(() => { suppressClick.current = false }, 0)
    setDragging(false)
    moveTo(offsetRef.current < -max / 2 ? -max : 0)
  }
  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); return }
    if (offsetRef.current !== 0) { e.preventDefault(); e.stopPropagation(); close() }
  }
  const run = (action?: () => void) => { close(); action?.() }

  return <div className={`swipe-row ${className}`}>
    {max > 0 && <div className="swipe-actions" aria-hidden={!isOpen} style={{ width: max, visibility: offset === 0 ? 'hidden' : undefined }}>
      {onComplete && <button type="button" className="swipe-complete" tabIndex={isOpen ? 0 : -1} onClick={() => run(onComplete)}>
        {done ? <RotateCcw size={18} /> : <Check size={19} strokeWidth={2.6} />}<span>{done ? 'Rouvrir' : completeLabel}</span>
      </button>}
      {onPostpone && <button type="button" className="swipe-postpone" tabIndex={isOpen ? 0 : -1} onClick={() => run(onPostpone)}>
        <ArrowRight size={18} /><span>Demain</span>
      </button>}
      {onDelete && <button type="button" className="swipe-delete" tabIndex={isOpen ? 0 : -1} onClick={() => run(onDelete)}>
        <Trash2 size={18} /><span>Supprimer</span>
      </button>}
    </div>}
    <div className={`swipe-front ${dragging ? 'is-dragging' : ''}`} style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}
      onClickCapture={onClickCapture}>
      {children}
    </div>
  </div>
}
