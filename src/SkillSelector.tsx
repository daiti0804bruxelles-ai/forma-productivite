import { useState } from 'react'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { SKILL_GROUPS, type SkillId } from './skillsCatalog'
import { MAX_SKILLS_PER_ITEM } from './xpEngine'
import { skillName } from './skillSuggest'

type Props = {
  value: readonly SkillId[]
  onChange: (next: SkillId[]) => void
  hint?: string
}

/** Compétences qui gagnent l'XP (3 au maximum). Les choix apparaissent en pastilles, la liste complète se déplie. */
export default function SkillSelector({ value, onChange, hint }: Props) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string[]>([])
  const full = value.length >= MAX_SKILLS_PER_ITEM
  const toggleGroup = (id: string) =>
    setExpanded(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  const toggleSkill = (id: SkillId) => {
    if (value.includes(id)) onChange(value.filter(item => item !== id))
    else if (!full) onChange([...value, id])
  }

  return (
    <div className="skill-picker">
      <div className="skill-picker-head">
        <span>Compétences <small>{value.length}/{MAX_SKILLS_PER_ITEM}</small></span>
        <button type="button" className="text-action" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Fermer' : 'Choisir'} {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      {value.length > 0 ? <div className="chips">
        {value.map(id => <button key={id} type="button" className="chip skill-chip" aria-pressed="true" aria-label={`Retirer ${skillName(id)}`} onClick={() => toggleSkill(id)}>
          {skillName(id)} <X size={14} />
        </button>)}
      </div> : <p className="settings-hint">Aucune compétence : cette action ne rapportera pas d’XP.</p>}
      {hint && value.length > 0 && <p className="settings-hint">{hint}</p>}
      {open && <div className="skill-groups">
        {SKILL_GROUPS.map(group => {
          const isExpanded = expanded.includes(group.id)
          const count = group.skills.filter(skill => value.includes(skill.id)).length
          return <div key={group.id} className="skill-group">
            <button type="button" aria-expanded={isExpanded} onClick={() => toggleGroup(group.id)} className="skill-group-head">
              <span>{group.name}{count ? ` (${count})` : ''}</span>
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {isExpanded && <div className="chips">
              {group.skills.map(skill => {
                const selected = value.includes(skill.id)
                return <button key={skill.id} type="button" className="chip" aria-pressed={selected} disabled={!selected && full} onClick={() => toggleSkill(skill.id)}>{skill.name}</button>
              })}
            </div>}
          </div>
        })}
        {full && <p className="settings-hint">3 compétences maximum : retire-en une pour en choisir une autre.</p>}
      </div>}
    </div>
  )
}
