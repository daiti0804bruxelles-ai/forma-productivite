/**
 * Script Scriptable des widgets iPhone, prérempli avec la clé du compte. Style minimal (clair/sombre selon l'iPhone).
 * Choix du widget via « Paramètre » : journée (par défaut), rappels, objectif (ou « objectif: CA » pour en choisir un).
 * Tailles : moyen (écran d'accueil) et écran verrouillé (rectangle, rond, ligne). Petit et grand restent utilisables.
 */
export const newWidgetKey = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), b => b.toString(16).padStart(2, '0')).join('')

export function widgetScript(key: string, apiUrl: string, appUrl: string) {
  return `// Forma · widgets iPhone (Scriptable). Ne partage pas ce script : il contient ta clé.
// Paramètre du widget : journée · rappels · objectif (ou « objectif: CA »).
const KEY = ${JSON.stringify(key)}
const API = ${JSON.stringify(apiUrl)}
const APP = ${JSON.stringify(appUrl)}

const C = {
  bg: Color.dynamic(new Color('#FFFFFF'), new Color('#1C1C1E')),
  text: Color.dynamic(new Color('#1C1C1E'), new Color('#F5F5F7')),
  sub: Color.dynamic(new Color('#8A8A8E'), new Color('#8E8E93')),
  faint: Color.dynamic(new Color('#C7C7CC'), new Color('#48484A')),
  track: Color.dynamic(new Color('#EDEDF0'), new Color('#2C2C2E')),
  accent: Color.dynamic(new Color('#7C5CFA'), new Color('#A78BFA')),
  flame: new Color('#FF9F0A'),
  danger: Color.dynamic(new Color('#E0453B'), new Color('#FF6B61')),
}
const F = {
  title: Font.semiboldSystemFont(15), row: Font.systemFont(13.5), small: Font.systemFont(11.5), smallBold: Font.semiboldSystemFont(11.5),
  big: Font.boldRoundedSystemFont(34), mid: Font.semiboldRoundedSystemFont(15),
}
const fmt = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: Math.abs(n) < 100 ? 1 : 0 }).format(n)
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim()

function when(stamp) {
  if (!stamp) return ''
  if (!/^\\d{4}-\\d{2}-\\d{2}T/.test(stamp)) return stamp
  const d = new Date(stamp.slice(0, 10).replace(/-/g, '/') + ' ' + stamp.slice(11, 16))
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - today) / 86400000)
  const t = stamp.slice(11, 16)
  if (diff === 0) return t
  if (diff === 1) return 'Demain'
  if (diff === -1) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
function add(stack, value, font, color, lines = 1) { const t = stack.addText(String(value)); t.font = font; t.textColor = color; t.lineLimit = lines; return t }
function symbol(stack, name, size, color) { const i = stack.addImage(SFSymbol.named(name).image); i.imageSize = new Size(size, size); i.tintColor = color; return i }
function bar(stack, ratio, width, height, color, track) {
  const ctx = new DrawContext(); ctx.size = new Size(width, height); ctx.opaque = false; ctx.respectScreenScale = true
  const r = height / 2
  const p1 = new Path(); p1.addRoundedRect(new Rect(0, 0, width, height), r, r); ctx.addPath(p1); ctx.setFillColor(track); ctx.fillPath()
  const w = Math.max(0, Math.min(1, ratio)) * width
  if (w > 0) { const p2 = new Path(); p2.addRoundedRect(new Rect(0, 0, Math.max(height, w), height), r, r); ctx.addPath(p2); ctx.setFillColor(color); ctx.fillPath() }
  const img = stack.addImage(ctx.getImage()); img.imageSize = new Size(width, height); return img
}
function ring(ratio, size, line, color, track) {
  const ctx = new DrawContext(); ctx.size = new Size(size, size); ctx.opaque = false; ctx.respectScreenScale = true
  const c = size / 2, rad = c - line / 2
  const arc = (from, to, col) => {
    const p = new Path(); const steps = Math.max(2, Math.round((to - from) * 120))
    for (let i = 0; i <= steps; i++) { const a = -Math.PI / 2 + 2 * Math.PI * (from + (to - from) * i / steps); const pt = new Point(c + rad * Math.cos(a), c + rad * Math.sin(a)); i ? p.addLine(pt) : p.move(pt) }
    ctx.addPath(p); ctx.setStrokeColor(col); ctx.setLineWidth(line); ctx.strokePath()
  }
  arc(0, 1, track); if (ratio > 0) arc(0, Math.min(1, ratio), color)
  return ctx.getImage()
}

async function load() {
  const req = new Request(API); req.headers = { 'x-widget-key': KEY }; req.timeoutInterval = 15
  try { const res = await req.loadJSON(); if (res.error) throw new Error(res.error); Keychain.set('forma-widget', JSON.stringify(res)); return res }
  catch (e) { if (Keychain.contains('forma-widget')) return { ...JSON.parse(Keychain.get('forma-widget')), stale: true }; return { error: String(e.message || e) } }
}

// ---------- Choix ----------
const param = norm(args.widgetParameter)
const kind = param.startsWith('rappel') || param.startsWith('oubli') ? 'memos' : param.startsWith('objectif') || param.startsWith('goal') ? 'goal' : 'day'
const goalQuery = kind === 'goal' ? norm(param.split(':')[1]) : ''
const family = config.widgetFamily || 'medium'
const lock = family.startsWith('accessory')
const s = await load()
const pickGoal = () => { if (!s.goals) return s.goal; if (goalQuery) return s.goals.find(g => norm(g.title).includes(goalQuery)) || s.goal; return s.goal }
const goalLine = g => g.mode === 'value' ? fmt(g.current) + ' → ' + fmt(g.target) + (g.unit ? ' ' + g.unit : '') : fmt(g.current) + ' / ' + fmt(g.target) + (g.unit ? ' ' + g.unit : '')
const goalLeft = g => { const left = Math.abs(g.target - g.current); if (g.progress >= 1) return 'Atteint'; return (g.mode === 'value' ? 'encore ' : 'reste ') + fmt(left) + (g.unit ? ' ' + g.unit : '') }
const memoCount = () => (s.memos || []).filter(m => m.overdue).length + ((s.pending && s.pending.count) || 0)

const w = new ListWidget()
w.url = APP + (kind === 'memos' ? '/?page=memos' : '')
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)

if (s.error) {
  if (!lock) { w.backgroundColor = C.bg; w.setPadding(16, 16, 16, 16) }
  add(w, 'Forma', F.smallBold, C.sub); w.addSpacer(4); add(w, s.error, F.small, lock ? Color.white() : C.text, 3)
} else if (lock) {
  lockScreen()
} else {
  w.backgroundColor = C.bg
  w.setPadding(15, 16, 15, 16)
  if (kind === 'memos') memosView(); else if (kind === 'goal') goalView(); else dayView()
}

// ---------- Ma journée ----------
function header(title, right) {
  const h = w.addStack(); h.centerAlignContent()
  add(h, title, F.title, C.text); h.addSpacer()
  right(h)
  w.addSpacer(family === 'small' ? 8 : 10)
}
function dayView() {
  header('Aujourd’hui', h => {
    if (s.total) { add(h, s.done + '/' + s.total, F.smallBold, C.sub); h.addSpacer(8) }
    symbol(h, 'flame.fill', 12, s.activeToday ? C.flame : C.faint); h.addSpacer(2); add(h, s.streak, F.smallBold, s.activeToday ? C.text : C.sub)
  })
  const items = s.remaining || []
  const max = family === 'large' ? 8 : family === 'small' ? 3 : 4
  if (!items.length) {
    w.addSpacer()
    const r = w.addStack(); r.centerAlignContent(); symbol(r, 'checkmark.circle.fill', 15, C.accent); r.addSpacer(6); add(r, s.total ? 'Tout est fait' : 'Rien de prévu', F.row, C.sub)
    w.addSpacer(); return
  }
  items.slice(0, max).forEach((it, i) => {
    if (i) w.addSpacer(family === 'small' ? 5 : 6)
    const r = w.addStack(); r.centerAlignContent()
    symbol(r, 'circle', 12, C.faint); r.addSpacer(8)
    add(r, it.title, F.row, C.text); r.addSpacer()
    if (it.time && family !== 'small') add(r, it.time, F.small, C.sub)
  })
  w.addSpacer()
  if (items.length > max) add(w, '+' + (items.length - max) + ' autre' + (items.length - max > 1 ? 's' : ''), F.small, C.sub)
}

// ---------- À ne pas oublier ----------
function memosView() {
  const list = s.memos || []
  header('À ne pas oublier', h => { const n = memoCount(); if (n) add(h, String(n), F.smallBold, list.some(m => m.overdue) ? C.danger : C.sub) })
  if (!list.length) { w.addSpacer(); add(w, 'Rien à oublier pour l’instant', F.row, C.sub); w.addSpacer(); return }
  const max = family === 'large' ? 8 : family === 'small' ? 3 : 4
  list.slice(0, max).forEach((m, i) => {
    if (i) w.addSpacer(6)
    const r = w.addStack(); r.centerAlignContent()
    symbol(r, m.overdue ? 'exclamationmark.circle.fill' : 'circle', 12, m.overdue ? C.danger : C.faint); r.addSpacer(8)
    add(r, m.title, F.row, m.overdue ? C.danger : C.text); r.addSpacer()
    if (m.when && family !== 'small') { const t = add(r, when(m.when), F.small, C.sub); t.lineLimit = 1 }
  })
  w.addSpacer()
}

// ---------- Objectif ----------
function goalView() {
  const g = pickGoal()
  if (!g) { add(w, 'Objectifs', F.title, C.text); w.addSpacer(); add(w, 'Aucun objectif en cours', F.row, C.sub); w.addSpacer(); return }
  const h = w.addStack(); h.centerAlignContent()
  add(h, g.title, F.title, C.text); h.addSpacer()
  if (g.monthly) add(h, new Date().toLocaleDateString('fr-FR', { month: 'long' }), F.small, C.sub)
  w.addSpacer()
  const n = w.addStack(); n.bottomAlignContent()
  add(n, fmt(g.current), F.big, C.text); n.addSpacer(6)
  const t = add(n, (g.mode === 'value' ? '→ ' : '/ ') + fmt(g.target) + (g.unit ? ' ' + g.unit : ''), F.mid, C.sub); t.lineLimit = 1
  w.addSpacer(8)
  bar(w, g.progress, family === 'small' ? 126 : 300, 5, C.accent, C.track)
  w.addSpacer(6)
  const f = w.addStack()
  add(f, Math.round(g.progress * 100) + ' %', F.smallBold, C.sub); f.addSpacer(); add(f, goalLeft(g), F.small, C.sub)
}

// ---------- Écran verrouillé ----------
function lockScreen() {
  const white = Color.white()
  if (family === 'accessoryInline') {
    if (kind === 'memos') add(w, '⚠︎ ' + (memoCount() ? memoCount() + ' à ne pas oublier' : 'Rien à oublier'), F.row, white)
    else if (kind === 'goal') { const g = pickGoal(); add(w, g ? g.title + ' · ' + Math.round(g.progress * 100) + ' %' : 'Aucun objectif', F.row, white) }
    else add(w, '🔥 ' + s.streak + ' · ' + s.done + '/' + s.total, F.row, white)
    return
  }
  if (family === 'accessoryCircular') {
    w.addAccessoryWidgetBackground = true
    const g = kind === 'goal' ? pickGoal() : null
    const ratio = kind === 'goal' ? (g ? g.progress : 0) : kind === 'memos' ? 0 : (s.total ? s.done / s.total : 0)
    const st = w.addStack(); st.layoutVertically(); st.centerAlignContent()
    if (kind === 'memos') {
      const r = st.addStack(); r.addSpacer(); symbol(r, memoCount() ? 'exclamationmark.circle.fill' : 'checkmark.circle', 18, white); r.addSpacer()
      const r2 = st.addStack(); r2.addSpacer(); add(r2, String(memoCount()), Font.boldRoundedSystemFont(14), white); r2.addSpacer()
    } else {
      w.backgroundImage = ring(ratio, 60, 5, white, new Color('#FFFFFF', 0.25))
      const r = st.addStack(); r.addSpacer(); add(r, kind === 'goal' ? Math.round(ratio * 100) + '%' : s.done + '/' + s.total, Font.boldRoundedSystemFont(13), white); r.addSpacer()
    }
    return
  }
  // accessoryRectangular
  if (kind === 'memos') {
    const h = w.addStack(); h.centerAlignContent(); symbol(h, 'exclamationmark.circle.fill', 11, white); h.addSpacer(4); add(h, memoCount() ? memoCount() + ' à ne pas oublier' : 'Rien à oublier', Font.semiboldSystemFont(13), white)
    ;(s.memos || []).slice(0, 2).forEach(m => add(w, m.title, Font.systemFont(13), white))
  } else if (kind === 'goal') {
    const g = pickGoal()
    if (!g) { add(w, 'Aucun objectif', Font.systemFont(13), white); return }
    add(w, g.title, Font.semiboldSystemFont(13), white)
    add(w, goalLine(g), Font.systemFont(13), white)
    w.addSpacer(3); bar(w, g.progress, 150, 4, white, new Color('#FFFFFF', 0.25))
  } else {
    const h = w.addStack(); h.centerAlignContent()
    add(h, s.done + '/' + s.total, Font.semiboldSystemFont(13), white); h.addSpacer(6); symbol(h, 'flame.fill', 11, white); h.addSpacer(2); add(h, String(s.streak), Font.semiboldSystemFont(13), white)
    ;(s.remaining || []).slice(0, 2).forEach(it => add(w, (it.time ? it.time + ' ' : '') + it.title, Font.systemFont(13), white))
    if (!(s.remaining || []).length) add(w, 'Tout est fait', Font.systemFont(13), white)
  }
}

if (s.stale && !lock) { w.addSpacer(2); add(w, 'Hors ligne', F.small, C.sub) }

if (config.runsInWidget) Script.setWidget(w)
else await w.presentMedium()
Script.complete()
`
}
