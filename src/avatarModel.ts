export const SKIN_COLORS = ['#edc4a1', '#c9956c', '#936343', '#53392e'] as const
export const HAIR_COLORS = ['#302722', '#72503b', '#c79b54', '#b6bac5'] as const
export const OUTFIT_COLORS = ['#9682cf', '#438f98', '#bf7651', '#587461'] as const
export type AvatarConfig = { name: string; silhouette: 'athletic' | 'slender'; hair: 'short' | 'bob' | 'tied'; skin: number; hairColor: number; outfit: number; clothing: 'jacket' | 'explorer' }
export const DEFAULT_AVATAR: AvatarConfig = { name: 'Mon personnage', silhouette: 'athletic', hair: 'short', skin: 1, hairColor: 0, outfit: 0, clothing: 'jacket' }
export function isAvatarConfig(value: unknown): value is AvatarConfig {
  if (!value || typeof value !== 'object') return false
  const a = value as AvatarConfig
  return typeof a.name === 'string' && a.name.trim().length > 0 && a.name.length <= 30 && ['athletic', 'slender'].includes(a.silhouette) && ['short', 'bob', 'tied'].includes(a.hair) && ['jacket', 'explorer'].includes(a.clothing) && [a.skin, a.hairColor, a.outfit].every(n => Number.isInteger(n) && n >= 0 && n < 4)
}
