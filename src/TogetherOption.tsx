import { Check } from 'lucide-react'

/** Case « Faire ensemble », au style des cases de l'app (rond qui se coche). */
export default function TogetherOption({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return <button type="button" role="checkbox" aria-checked={checked} className="together-option" onClick={() => onChange(!checked)}>
    <span className="round-check" aria-hidden="true" data-checked={checked}>{checked && <Check size={15} strokeWidth={3} />}</span>
    <span className="together-copy"><strong>Faire ensemble</strong><small>Visible par l’autre membre · faite dès que l’un de vous la coche</small></span>
  </button>
}
