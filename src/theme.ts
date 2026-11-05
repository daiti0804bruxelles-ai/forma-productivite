import { useEffect } from 'react'

export type ThemeChoice = 'auto' | 'clair' | 'sombre' | 'rose'
export type ResolvedTheme = 'clair' | 'sombre' | 'rose'
export type TextSize = 'standard' | 'grande' | 'tres'
export type Appearance = { theme: ThemeChoice; textSize: TextSize; reduceMotion: boolean; highContrast: boolean }

export const DEFAULT_APPEARANCE: Appearance = { theme: 'auto', textSize: 'standard', reduceMotion: false, highContrast: false }

const THEMES: readonly ThemeChoice[] = ['auto', 'clair', 'sombre', 'rose']
const SIZES: readonly TextSize[] = ['standard', 'grande', 'tres']
const STORAGE_KEY = 'forma-appearance'
const THEME_COLORS: Record<ResolvedTheme, string> = { clair: '#F4F3EF', sombre: '#0F0F11', rose: '#E8CBD4' }

export function isAppearance(value: unknown): value is Appearance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const a = value as Partial<Appearance>
  return THEMES.includes(a.theme as ThemeChoice) && SIZES.includes(a.textSize as TextSize) &&
    typeof a.reduceMotion === 'boolean' && typeof a.highContrast === 'boolean'
}

/** Copie locale du réglage du compte : évite un flash de thème avant le chargement des données. */
export function readCachedAppearance(): Appearance {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_APPEARANCE
    const parsed: unknown = JSON.parse(raw)
    return isAppearance(parsed) ? parsed : DEFAULT_APPEARANCE
  } catch {
    return DEFAULT_APPEARANCE
  }
}

function cacheAppearance(appearance: Appearance) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance)) } catch { /* stockage indisponible */ }
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  if (choice !== 'auto') return choice
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'sombre' : 'clair'
}

export function applyAppearance(appearance: Appearance) {
  const root = document.documentElement
  const theme = resolveTheme(appearance.theme)
  root.dataset.theme = theme
  root.dataset.text = appearance.textSize
  root.dataset.motion = appearance.reduceMotion ? 'reduce' : 'full'
  root.dataset.contrast = appearance.highContrast ? 'high' : 'normal'
  root.style.colorScheme = theme === 'sombre' ? 'dark' : 'light'
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', THEME_COLORS[theme]))
}

export function useAppearance(appearance: Appearance) {
  const { theme, textSize, reduceMotion, highContrast } = appearance
  useEffect(() => {
    const current: Appearance = { theme, textSize, reduceMotion, highContrast }
    applyAppearance(current)
    cacheAppearance(current)
    if (theme !== 'auto' || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyAppearance(current)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [theme, textSize, reduceMotion, highContrast])
}
