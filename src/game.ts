/**
 * Boucle de jeu Forma : or, coffres de série et bonus achetables.
 * - L'or se gagne à chaque validation qui rapporte de l'XP, selon la difficulté (jamais perdu par une pénalité).
 * - Un coffre d'or est offert à chaque palier de série (3, 7, 14, 30… jours).
 * - La boutique vend des bonus de jeu et les récompenses réelles que tu définis.
 * Tout est enregistré dans un journal (goldLedger) à clés uniques : rien n'est compté deux fois, même entre appareils.
 */
import type { Difficulty } from './xpEngine'

export type GoldEvent = { key: string; amount: number; at: string; label: string }
export type GoldLedger = { events: GoldEvent[] }
export type Reward = { id: string; title: string; price: number }
export type Inventory = { joker?: number; shield?: number }
export type GameState = {
  goldLedger?: GoldLedger
  rewards?: Reward[]
  inventory?: Inventory
  protectedDays?: string[] // journées couvertes par un joker : aucune pénalité
  frozenDays?: string[] // journées sauvées par une protection de série
  boostUntil?: string // fin du boost XP ×2 (ISO)
}

export const GOLD_BY_DIFFICULTY: Record<Difficulty, number> = { facile: 1, moyen: 2, difficile: 4, epique: 8 }
export const STREAK_CHESTS: Record<number, number> = { 3: 10, 7: 25, 14: 50, 30: 100, 50: 150, 100: 300, 200: 600, 365: 1000 }

export type PerkId = 'joker' | 'shield' | 'boost'
export const PERKS: readonly { id: PerkId; name: string; price: number; description: string }[] = [
  { id: 'joker', name: 'Joker', price: 100, description: 'Protège une journée : aucune pénalité ce jour-là (malade, voyage…).' },
  { id: 'shield', name: 'Protection de série', price: 60, description: 'Sauve ta flamme automatiquement un jour où tu n’as rien validé.' },
  { id: 'boost', name: 'Boost XP ×2', price: 120, description: 'Double l’XP gagnée pendant 24 heures, dès l’achat.' },
]

export const goldBalance = (ledger?: GoldLedger) => (ledger?.events ?? []).reduce((sum, e) => sum + e.amount, 0)
export const goldEarned = (ledger?: GoldLedger) => (ledger?.events ?? []).reduce((sum, e) => sum + Math.max(0, e.amount), 0)
export const hasGoldKey = (ledger: GoldLedger | undefined, key: string) => Boolean(ledger?.events.some(e => e.key === key))

export function addGold(ledger: GoldLedger | undefined, key: string, amount: number, label: string, at = new Date().toISOString()): GoldLedger {
  const events = ledger?.events ?? []
  if (!Number.isFinite(amount) || amount === 0 || events.some(e => e.key === key)) return ledger ?? { events }
  return { events: [...events, { key, amount: Math.round(amount), at, label }] }
}

export const boostActive = (state: GameState, now = new Date()) => Boolean(state.boostUntil && Date.parse(state.boostUntil) > now.getTime())
export const xpMultiplier = (state: GameState, now = new Date()) => boostActive(state, now) ? 2 : 1

/** Achète un bonus ou une récompense. Renvoie null si l'or est insuffisant. */
export function buy<T extends GameState>(state: T, item: { kind: 'perk'; id: PerkId } | { kind: 'reward'; reward: Reward }, now = new Date()): T | null {
  const price = item.kind === 'perk' ? PERKS.find(p => p.id === item.id)!.price : item.reward.price
  if (!(price > 0) || goldBalance(state.goldLedger) < price) return null
  const at = now.toISOString()
  const label = item.kind === 'perk' ? PERKS.find(p => p.id === item.id)!.name : item.reward.title
  const goldLedger = addGold(state.goldLedger, `buy:${item.kind === 'perk' ? item.id : item.reward.id}:${at}`, -price, label, at)
  if (item.kind === 'reward') return { ...state, goldLedger }
  if (item.id === 'boost') {
    const from = boostActive(state, now) ? Date.parse(state.boostUntil!) : now.getTime()
    return { ...state, goldLedger, boostUntil: new Date(from + 86400000).toISOString() }
  }
  const inventory = { ...(state.inventory ?? {}), [item.id]: (state.inventory?.[item.id] ?? 0) + 1 }
  return { ...state, goldLedger, inventory }
}

/** Utilise un joker sur une journée (aujourd'hui ou à venir). */
export function applyJoker<T extends GameState>(state: T, day: string): T | null {
  if (!(state.inventory?.joker ?? 0) || state.protectedDays?.includes(day)) return null
  return { ...state, inventory: { ...state.inventory, joker: state.inventory!.joker! - 1 }, protectedDays: [...(state.protectedDays ?? []), day].sort() }
}

/** Série de jours actifs (les jours sauvés par une protection comptent). */
export function streakLength(activeDays: Iterable<string>, frozenDays: Iterable<string>, today: string) {
  const days = new Set([...activeDays, ...frozenDays])
  const prev = (key: string) => { const [y, m, d] = key.split('-').map(Number); const x = new Date(y, m - 1, d - 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
  let day = days.has(today) ? today : prev(today), n = 0
  while (days.has(day) && n < 20000) { n++; day = prev(day) }
  return n
}

/** Coffre à donner aujourd'hui si la série vient d'atteindre un palier. */
export function chestFor(streak: number, activeToday: boolean, ledger: GoldLedger | undefined, today: string) {
  const amount = STREAK_CHESTS[streak]
  if (!activeToday || !amount) return null
  const key = `chest:${streak}:${today}`
  return hasGoldKey(ledger, key) ? null : { key, amount, label: `Coffre de série · ${streak} jours` }
}

export const isReward = (v: unknown): v is Reward => !!v && typeof v === 'object' && typeof (v as Reward).id === 'string' && typeof (v as Reward).title === 'string'
  && (v as Reward).title.length > 0 && (v as Reward).title.length <= 80 && Number.isInteger((v as Reward).price) && (v as Reward).price > 0 && (v as Reward).price <= 100000
export const isGoldLedger = (v: unknown): v is GoldLedger => !!v && typeof v === 'object' && Array.isArray((v as GoldLedger).events) && (v as GoldLedger).events.length <= 100000
  && (v as GoldLedger).events.every(e => e && typeof e.key === 'string' && e.key.length <= 200 && Number.isInteger(e.amount) && Math.abs(e.amount) <= 100000 && typeof e.at === 'string' && typeof e.label === 'string')
export const isInventory = (v: unknown): v is Inventory => !!v && typeof v === 'object' && !Array.isArray(v)
  && Object.entries(v).every(([k, n]) => ['joker', 'shield'].includes(k) && Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 1000)
