import type { Appearance, TextSize, ThemeChoice } from './theme'

const THEME_OPTIONS: { id: ThemeChoice; label: string; swatch: [string, string] }[] = [
  { id: 'auto', label: 'Automatique', swatch: ['#F4F3EF', '#1B1B1F'] },
  { id: 'clair', label: 'Clair', swatch: ['#F4F3EF', '#FFFFFF'] },
  { id: 'sombre', label: 'Sombre', swatch: ['#0F0F11', '#2A2A30'] },
  { id: 'rose', label: 'Rose doux', swatch: ['#E8CBD4', '#F8E6EB'] },
]
const SIZE_OPTIONS: { id: TextSize; label: string; sample: string }[] = [
  { id: 'standard', label: 'Standard', sample: '0.95rem' },
  { id: 'grande', label: 'Grande', sample: '1.2rem' },
  { id: 'tres', label: 'Très grande', sample: '1.45rem' },
]

export default function AppearanceSettings({ value, onChange }: { value: Appearance; onChange: (next: Appearance) => void }) {
  const set = (patch: Partial<Appearance>) => onChange({ ...value, ...patch })
  return <div className="appearance">
    <section className="settings-group">
      <h3>Thème</h3>
      <div className="theme-grid" role="radiogroup" aria-label="Thème">
        {THEME_OPTIONS.map(option => <button key={option.id} type="button" role="radio" aria-checked={value.theme === option.id}
          className="theme-card" onClick={() => set({ theme: option.id })}>
          <span className="theme-swatch" aria-hidden="true"><span style={{ background: option.swatch[0] }} /><span style={{ background: option.swatch[1] }} /></span>
          <span>{option.label}</span>
        </button>)}
      </div>
      {value.theme === 'auto' && <p className="settings-hint">Suit le mode clair ou sombre de ton appareil.</p>}
    </section>
    <section className="settings-group">
      <h3>Taille du texte</h3>
      <div className="size-picker" role="radiogroup" aria-label="Taille du texte">
        {SIZE_OPTIONS.map(option => <button key={option.id} type="button" role="radio" aria-checked={value.textSize === option.id}
          onClick={() => set({ textSize: option.id })}>
          <span aria-hidden="true" style={{ fontSize: option.sample }}>Aa</span>
          <small>{option.label}</small>
        </button>)}
      </div>
    </section>
    <section className="settings-list">
      <div className="settings-row">
        <span><strong>Réduire les animations</strong><small>Transitions plus calmes</small></span>
        <button type="button" role="switch" className="switch" aria-checked={value.reduceMotion} aria-label="Réduire les animations"
          onClick={() => set({ reduceMotion: !value.reduceMotion })}><span /></button>
      </div>
      <div className="settings-row">
        <span><strong>Contraste renforcé</strong><small>Textes et bordures plus marqués</small></span>
        <button type="button" role="switch" className="switch" aria-checked={value.highContrast} aria-label="Contraste renforcé"
          onClick={() => set({ highContrast: !value.highContrast })}><span /></button>
      </div>
    </section>
    <p className="settings-hint">Ces réglages sont enregistrés sur ton compte et s’appliquent sur tous tes appareils.</p>
  </div>
}
