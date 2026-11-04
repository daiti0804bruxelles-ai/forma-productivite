import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { SKILL_GROUPS, type SkillId } from './skillsCatalog'

type Props = {
  value: readonly SkillId[]
  onChange: (next: SkillId[]) => void
}

export default function SkillSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string[]>([])
  const toggleGroup = (id: string) =>
    setExpanded(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  const toggleSkill = (id: SkillId) =>
    onChange(value.includes(id) ? value.filter(item => item !== id) : [...value, id])

  return (
    <div style={{ border: '1px solid rgba(120,120,128,.25)', borderRadius: 12, padding: 12 }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', padding: 4, textAlign: 'left' }}>
        <strong>Compétences développées ({value.length})</strong>
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {!open && value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {SKILL_GROUPS.flatMap(group => group.skills.map(skill => ({ id: skill.id, name: skill.name }))).filter(skill => value.includes(skill.id)).map(skill =>
            <span key={skill.id} style={{ borderRadius: 20, background: 'rgba(120,120,128,.14)', padding: '4px 9px', fontSize: 12 }}>{skill.name}</span>)}
        </div>
      )}
      {open && <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
        {SKILL_GROUPS.map(group => {
          const isExpanded = expanded.includes(group.id)
          const count = group.skills.filter(skill => value.includes(skill.id)).length
          return <div key={group.id} style={{ borderTop: '1px solid rgba(120,120,128,.15)', paddingTop: 7 }}>
            <button type="button" aria-expanded={isExpanded} onClick={() => toggleGroup(group.id)}
              style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', padding: '6px 3px', textAlign: 'left' }}>
              <span>{group.name}{count ? ` (${count})` : ''}</span>
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {isExpanded && <div style={{ display: 'grid', gap: 9, padding: '8px 4px 12px 12px' }}>
              {group.skills.map(skill =>
                <label key={skill.id} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={value.includes(skill.id)} onChange={() => toggleSkill(skill.id)} />
                  {skill.name}
                </label>)}
            </div>}
          </div>
        })}
      </div>}
    </div>
  )
}
