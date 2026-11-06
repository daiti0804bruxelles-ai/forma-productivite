import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'

/** Listes réordonnables : chaque groupe (ex. une période d'habitudes) contient des identifiants ordonnés. */
export type SortGroups = Record<string, string[]>

type Active = { id: string; pointerId: number; grabX: number; grabY: number; width: number }
type Pending = { pointerId: number; x: number; y: number; el: HTMLElement; id: string; timer: number }

const LONG_PRESS_MS = 320
const MOVE_TOLERANCE = 8
const EDGE = 90

const reducedMotion = () =>
  document.documentElement.dataset.motion === 'reduce' ||
  (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

function sameGroups(a: SortGroups, b: SortGroups) {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(k => b[k] && a[k].length === b[k].length && a[k].every((id, i) => b[k][i] === id))
}

export function moveInGroups(groups: SortGroups, id: string, group: string, index: number): SortGroups {
  const next: SortGroups = {}
  for (const [key, ids] of Object.entries(groups)) next[key] = ids.filter(item => item !== id)
  const list = next[group] ?? []
  list.splice(Math.max(0, Math.min(index, list.length)), 0, id)
  next[group] = list
  return next
}

function locate(groups: SortGroups, id: string) {
  for (const [group, ids] of Object.entries(groups)) {
    const index = ids.indexOf(id)
    if (index >= 0) return { group, index }
  }
  return null
}

/**
 * Glisser-déposer fluide :
 * - poignée : le glissement démarre immédiatement (souris ou doigt) ;
 * - appui long sur la ligne : démarre après ~0,3 s si le doigt ne bouge pas (sinon c'est un défilement) ;
 * - les autres lignes s'écartent en direct (animation FLIP), défilement automatique près des bords ;
 * - flèches haut/bas sur la poignée pour déplacer au clavier, Échap pour annuler.
 */
export function useSortable(name: string, groups: SortGroups, onCommit: (next: SortGroups, movedId: string) => void) {
  const [active, setActive] = useState<Active | null>(null)
  const [preview, setPreview] = useState<SortGroups | null>(null)
  const groupsRef = useRef(groups)
  const commitRef = useRef(onCommit)
  const previewRef = useRef<SortGroups | null>(null)
  const activeRef = useRef<Active | null>(null)
  const pendingRef = useRef<Pending | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const ghostRef = useRef<HTMLDivElement | null>(null)
  const frame = useRef(0)
  const flip = useRef<Map<string, DOMRect> | null>(null)
  const detach = useRef<(() => void) | null>(null)

  useEffect(() => {
    groupsRef.current = groups
    commitRef.current = onCommit
  })

  const rowSelector = `[data-sort-group^="${name}:"] > [data-sort-id]`

  const snapshot = (override?: { id: string; rect: DOMRect }) => {
    const map = new Map<string, DOMRect>()
    document.querySelectorAll<HTMLElement>(rowSelector).forEach(el => map.set(el.dataset.sortId ?? '', el.getBoundingClientRect()))
    if (override) map.set(override.id, override.rect)
    flip.current = map
  }

  // FLIP : chaque ligne qui change de place glisse depuis son ancienne position.
  useLayoutEffect(() => {
    const first = flip.current
    if (!first) return
    flip.current = null
    if (reducedMotion()) return
    document.querySelectorAll<HTMLElement>(rowSelector).forEach(el => {
      const before = first.get(el.dataset.sortId ?? '')
      if (!before) return
      el.getAnimations().forEach(animation => animation.cancel())
      const after = el.getBoundingClientRect()
      const dx = before.left - after.left
      const dy = before.top - after.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { duration: 220, easing: 'cubic-bezier(.2, .8, .2, 1)' })
    })
  })

  const updateTarget = () => {
    const current = activeRef.current
    const groupsNow = previewRef.current
    if (!current || !groupsNow) return
    const here = locate(groupsNow, current.id)
    if (!here) return
    const { x, y } = pointer.current
    const zone = document.elementFromPoint(x, y)?.closest<HTMLElement>(`[data-sort-zone^="${name}:"]`)
    const group = zone?.dataset.sortZone ? zone.dataset.sortZone.slice(name.length + 1) : here.group
    if (!(group in groupsNow)) return
    const container = document.querySelector<HTMLElement>(`[data-sort-group="${name}:${group}"]`)
    if (!container) return
    // Positions de mise en page (offsetTop) : insensibles aux animations en cours, donc pas de tremblement.
    const top = container.getBoundingClientRect().top
    let index = 0
    container.querySelectorAll<HTMLElement>(':scope > [data-sort-id]').forEach(row => {
      if (row.dataset.sortId !== current.id && top + row.offsetTop + row.offsetHeight / 2 < y) index++
    })
    if (group === here.group && index === here.index) return
    snapshot()
    const next = moveInGroups(groupsNow, current.id, group, index)
    previewRef.current = next
    setPreview(next)
  }

  const loop = () => {
    const current = activeRef.current
    if (!current) return
    const { x, y } = pointer.current
    if (ghostRef.current) ghostRef.current.style.transform = `translate3d(${x - current.grabX}px, ${y - current.grabY}px, 0)`
    const bottomEdge = window.innerHeight - (window.innerWidth <= 760 ? 150 : EDGE)
    let speed = 0
    if (y < EDGE) speed = -Math.min(18, Math.ceil((EDGE - y) / 5))
    else if (y > bottomEdge) speed = Math.min(18, Math.ceil((y - bottomEdge) / 5))
    if (speed) window.scrollBy(0, speed)
    updateTarget()
    frame.current = requestAnimationFrame(loop)
  }

  const finish = (commit: boolean) => {
    const current = activeRef.current
    if (!current) return
    cancelAnimationFrame(frame.current)
    detach.current?.()
    detach.current = null
    activeRef.current = null
    delete document.documentElement.dataset.sorting
    const next = previewRef.current
    previewRef.current = null
    const ghostRect = ghostRef.current?.getBoundingClientRect()
    snapshot(ghostRect ? { id: current.id, rect: ghostRect } : undefined)
    // Le relâchement ne doit pas déclencher de clic (cocher la tâche par erreur, etc.).
    const swallow = (e: MouseEvent) => { e.stopPropagation(); e.preventDefault() }
    window.addEventListener('click', swallow, { capture: true, once: true })
    window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 350)
    if (commit && next && !sameGroups(next, groupsRef.current)) commitRef.current(next, current.id)
    setActive(null)
    setPreview(null)
  }

  const begin = (id: string, row: HTMLElement, pointerId: number, x: number, y: number) => {
    if (activeRef.current || !locate(groupsRef.current, id)) return
    const rect = row.getBoundingClientRect()
    const next: Active = { id, pointerId, grabX: x - rect.left, grabY: y - rect.top, width: rect.width }
    activeRef.current = next
    previewRef.current = groupsRef.current
    pointer.current = { x, y }
    document.documentElement.dataset.sorting = 'true'
    window.getSelection?.()?.removeAllRanges()
    navigator.vibrate?.(8)
    setActive(next)
    setPreview(groupsRef.current)
    const onMove = (e: PointerEvent) => { if (e.pointerId === pointerId) pointer.current = { x: e.clientX, y: e.clientY } }
    const onUp = (e: PointerEvent) => { if (e.pointerId === pointerId) finish(true) }
    const onCancel = (e: PointerEvent) => { if (e.pointerId === pointerId) finish(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(false) }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('keydown', onKey)
    detach.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('keydown', onKey)
    }
    frame.current = requestAnimationFrame(loop)
  }

  const clearPending = () => {
    if (pendingRef.current) window.clearTimeout(pendingRef.current.timer)
    pendingRef.current = null
  }

  // Pendant un glissement au doigt, la page ne doit pas défiler (le défilement automatique prend le relais).
  useEffect(() => {
    const block = (e: TouchEvent) => { if (activeRef.current) e.preventDefault() }
    document.addEventListener('touchmove', block, { passive: false })
    return () => {
      document.removeEventListener('touchmove', block)
      if (pendingRef.current) window.clearTimeout(pendingRef.current.timer)
      cancelAnimationFrame(frame.current)
      detach.current?.()
      if (activeRef.current) delete document.documentElement.dataset.sorting
    }
  }, [])

  const keyboardMove = (id: string, direction: -1 | 1) => {
    const current = groupsRef.current
    const here = locate(current, id)
    if (!here) return
    const keys = Object.keys(current)
    let group = here.group
    let index = here.index + direction
    if (index < 0 || index >= current[group].length) {
      const groupIndex = keys.indexOf(group) + direction
      if (groupIndex < 0 || groupIndex >= keys.length) return
      group = keys[groupIndex]
      index = direction < 0 ? current[group].length : 0
    }
    snapshot()
    commitRef.current(moveInGroups(current, id, group, index), id)
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-sort-group^="${name}:"] > [data-sort-id="${CSS.escape(id)}"] [data-sort-handle]`)?.focus())
  }

  const rowProps = (id: string) => ({
    'data-sort-id': id,
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (activeRef.current || (e.pointerType === 'mouse' && e.button !== 0)) return
      if ((e.target as Element).closest('[data-sort-handle], input, textarea, select, [data-no-sort]')) return
      clearPending()
      const row = e.currentTarget
      const { pointerId, clientX: x, clientY: y } = e
      pointer.current = { x, y }
      const timer = window.setTimeout(() => {
        pendingRef.current = null
        begin(id, row, pointerId, pointer.current.x, pointer.current.y)
      }, LONG_PRESS_MS)
      pendingRef.current = { pointerId, x, y, el: row, id, timer }
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const pending = pendingRef.current
      if (!pending || pending.pointerId !== e.pointerId) return
      pointer.current = { x: e.clientX, y: e.clientY }
      if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > MOVE_TOLERANCE) clearPending()
    },
    onPointerUp: clearPending,
    onPointerCancel: clearPending,
    onContextMenu: (e: ReactMouseEvent<HTMLElement>) => { if (pendingRef.current || activeRef.current) e.preventDefault() },
  })

  const handleProps = (id: string, label: string) => ({
    'data-sort-handle': '',
    'aria-label': label,
    title: 'Glisser pour déplacer (ou flèches ↑ ↓)',
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      e.preventDefault()
      const row = e.currentTarget.closest<HTMLElement>('[data-sort-id]')
      if (row) begin(id, row, e.pointerId, e.clientX, e.clientY)
    },
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      e.preventDefault()
      keyboardMove(id, e.key === 'ArrowUp' ? -1 : 1)
    },
  })

  const ghostStyle: CSSProperties | undefined = active
    ? { position: 'fixed', left: 0, top: 0, width: active.width, transform: `translate3d(${pointer.current.x - active.grabX}px, ${pointer.current.y - active.grabY}px, 0)` }
    : undefined

  return {
    items: (group: string) => (preview ?? groups)[group] ?? [],
    activeId: active?.id ?? null,
    ghostRef,
    ghostStyle,
    rowProps,
    handleProps,
    zoneProps: (group: string) => ({ 'data-sort-zone': `${name}:${group}` }),
    listProps: (group: string) => ({ 'data-sort-group': `${name}:${group}` }),
  }
}
