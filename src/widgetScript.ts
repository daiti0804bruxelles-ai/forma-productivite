/**
 * Script Scriptable du widget iPhone, prérempli avec la clé du compte.
 * Tailles : petit (série + jour) et moyen (+ rappel « À ne pas oublier » + objectif). Couleurs claires/sombres automatiques.
 */
export const newWidgetKey = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), b => b.toString(16).padStart(2, '0')).join('')

export function widgetScript(key: string, apiUrl: string, appUrl: string) {
  return `// Forma · widget iPhone (Scriptable). Ne partage pas ce script : il contient ta clé.
const KEY = ${JSON.stringify(key)}
const API = ${JSON.stringify(apiUrl)}
const APP = ${JSON.stringify(appUrl)}

const C = {
  bg: Color.dynamic(new Color('#FFFFFF'), new Color('#1C1C1E')),
  text: Color.dynamic(new Color('#1C1C1E'), new Color('#F2F2F7')),
  sub: Color.dynamic(new Color('#8E8E93'), new Color('#98989F')),
  track: Color.dynamic(new Color('#E5E5EA'), new Color('#3A3A3C')),
  accent: new Color('#A78BFA'),
  flame: new Color('#FF9F0A'),
  danger: new Color('#E5675F'),
}
const fmt = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n)
function when(stamp) {
  const d = new Date(stamp.replace('T', ' ').replace(/-/g, '/'))
  const t = stamp.slice(11, 16), today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - today) / 86400000)
  if (diff === 0) return 'Aujourd’hui ' + t
  if (diff === 1) return 'Demain ' + t
  if (diff === -1) return 'Hier ' + t
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + t
}
function bar(stack, ratio, width, color) {
  const ctx = new DrawContext(); ctx.size = new Size(width, 6); ctx.opaque = false; ctx.respectScreenScale = true
  const track = new Path(); track.addRoundedRect(new Rect(0, 0, width, 6), 3, 3); ctx.addPath(track); ctx.setFillColor(C.track); ctx.fillPath()
  const w = Math.max(0, Math.min(1, ratio)) * width
  if (w > 0) { const fill = new Path(); fill.addRoundedRect(new Rect(0, 0, Math.max(6, w), 6), 3, 3); ctx.addPath(fill); ctx.setFillColor(color); ctx.fillPath() }
  const img = stack.addImage(ctx.getImage()); img.imageSize = new Size(width, 6)
}
function text(stack, value, size, color, weight) {
  const t = stack.addText(String(value)); t.textColor = color
  t.font = weight === 'bold' ? Font.boldRoundedSystemFont(size) : weight === 'semi' ? Font.semiboldSystemFont(size) : Font.systemFont(size)
  t.lineLimit = 1; return t
}

async function load() {
  const req = new Request(API); req.headers = { 'x-widget-key': KEY }; req.timeoutInterval = 15
  try { const res = await req.loadJSON(); if (res.error) throw new Error(res.error); Keychain.set('forma-widget', JSON.stringify(res)); return res }
  catch (e) { if (Keychain.contains('forma-widget')) return { ...JSON.parse(Keychain.get('forma-widget')), stale: true }; return { error: String(e.message || e) } }
}

const s = await load()
const family = config.widgetFamily || 'medium'
const w = new ListWidget()
w.backgroundColor = C.bg; w.url = APP; w.setPadding(14, 16, 14, 16)
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)

if (s.error) {
  text(w, 'Forma', 13, C.sub, 'semi'); w.addSpacer(6); text(w, s.error, 12, C.text).lineLimit = 3
} else {
  const narrow = family === 'small'
  const width = narrow ? 120 : 130
  const row = w.addStack(); row.layoutHorizontally(); row.topAlignContent()
  // Gauche : série + journée
  const left = row.addStack(); left.layoutVertically()
  const head = left.addStack(); head.centerAlignContent()
  const flame = head.addImage(SFSymbol.named('flame.fill').image); flame.imageSize = new Size(16, 16); flame.tintColor = s.activeToday ? C.flame : C.sub
  head.addSpacer(4); text(head, s.streak, 22, C.text, 'bold'); head.addSpacer(3); text(head, s.streak > 1 ? 'jours' : 'jour', 12, C.sub)
  left.addSpacer(narrow ? 14 : 10)
  text(left, s.total ? s.done + ' sur ' + s.total : 'Rien aujourd’hui', narrow ? 15 : 13, C.text, 'semi')
  left.addSpacer(5); bar(left, s.total ? s.done / s.total : 0, width, C.accent)
  if (narrow && s.memo && s.memo.overdue) { left.addSpacer(10); text(left, '⚠︎ ' + s.memo.title, 11, C.danger, 'semi') }
  if (!narrow) {
    row.addSpacer()
    const right = row.addStack(); right.layoutVertically(); right.size = new Size(140, 0)
    if (s.memo) {
      text(right, s.memo.overdue ? 'N’OUBLIE PAS' : 'À NE PAS OUBLIER', 9, s.memo.overdue ? C.danger : C.sub, 'semi')
      right.addSpacer(2); text(right, s.memo.title, 13, s.memo.overdue ? C.danger : C.text, 'semi')
      text(right, when(s.memo.when) + (s.memo.more ? ' · +' + s.memo.more : ''), 10, C.sub)
      right.addSpacer(8)
    }
    if (s.goal) {
      text(right, s.goal.title, 11, C.sub)
      right.addSpacer(2)
      text(right, fmt(s.goal.current) + ' / ' + fmt(s.goal.target) + (s.goal.unit ? ' ' + s.goal.unit : ''), 12, C.text, 'semi')
      right.addSpacer(4); bar(right, s.goal.progress, 140, C.accent)
    }
  }
  if (s.stale) { w.addSpacer(); text(w, 'Hors ligne', 9, C.sub) }
}

if (config.runsInWidget) Script.setWidget(w)
else if (family === 'small') await w.presentSmall()
else await w.presentMedium()
Script.complete()
`
}
