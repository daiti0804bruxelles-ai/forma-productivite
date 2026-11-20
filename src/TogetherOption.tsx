import { Check, Users } from 'lucide-react'

/** Case « Faire ensemble » : une ligne, un petit rond qui se coche. */
export default function TogetherOption({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return <button type="button" role="checkbox" aria-checked={checked} className={`together-option ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}>
    <span className="together-box" aria-hidden="true">{checked && <Check size={12} strokeWidth={3.2} />}</span>
    <Users size={15} aria-hidden="true" />
    <span>Faire ensemble</span>
  </button>
}
