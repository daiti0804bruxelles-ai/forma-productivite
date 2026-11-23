import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

/** Case à cocher minimaliste (petit rond) : même style que « Faire ensemble ». */
export default function CheckOption({ checked, onChange, children, hint }: { checked: boolean; onChange: (next: boolean) => void; children: ReactNode; hint?: string }) {
  return <button type="button" role="checkbox" aria-checked={checked} className={`together-option check-option ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}>
    <span className="together-box" aria-hidden="true">{checked && <Check size={12} strokeWidth={3.2} />}</span>
    <span className="check-option-copy"><span>{children}</span>{hint && <small>{hint}</small>}</span>
  </button>
}
