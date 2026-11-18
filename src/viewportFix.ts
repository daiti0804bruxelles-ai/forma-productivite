/**
 * iPhone, app installée sur l'écran d'accueil : après l'ouverture du clavier, iOS garde parfois une hauteur d'écran réduite.
 * Résultat : la barre du bas « flotte » au milieu, une bande noire apparaît dessous et la barre du haut disparaît.
 * Contournement : quand le clavier se ferme (ou au retour dans l'app), si la hauteur est restée réduite,
 * on force iOS à remesurer l'écran (masquer/réafficher la page, invisible à l'œil) en gardant la position de défilement.
 */
export function installViewportFix() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches
  if (!ios || !standalone) return () => {}
  let max = window.innerHeight
  let timer = 0
  const typing = () => { const el = document.activeElement as HTMLElement | null; return !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable) }
  const remeasure = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      if (typing() || window.innerHeight >= max - 4) return
      const root = document.getElementById('root')
      if (!root) return
      const y = window.scrollY
      root.style.display = 'none'
      void root.offsetHeight // force le recalcul
      root.style.display = ''
      window.scrollTo(0, y)
    }, 160)
  }
  const onResize = () => { if (!typing() && window.innerHeight > max) max = window.innerHeight }
  const onRotate = () => window.setTimeout(() => { max = window.innerHeight }, 400)
  const onVisible = () => { if (document.visibilityState === 'visible') remeasure() }
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onRotate)
  document.addEventListener('focusout', remeasure)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('pageshow', remeasure)
  return () => {
    window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onRotate)
    document.removeEventListener('focusout', remeasure); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('pageshow', remeasure)
  }
}
