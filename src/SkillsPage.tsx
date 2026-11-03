import { useRef, useState } from 'react'
import AvatarEditor from './AvatarEditor'
import { DEFAULT_AVATAR } from './avatarModel'
import type { AvatarConfig } from './avatarModel'
import { ChevronDown, ChevronRight, Crosshair, Shield, Sparkles, ArrowUpRight, LockKeyhole } from 'lucide-react'
import { SKILL_GROUPS, calculateXp, skillProgress, affectedSkills, xpForEvent } from './skillModel'
import type { SkillId, SkillGroupId, XpLedger } from './skillModel'
import './skills.css'

const actionNames = { habit: 'Habitude', task: 'Tâche', repetitive_task: 'Tâche répétitive', goal_moderate: 'Objectif modéré', goal_ambitious: 'Objectif ambitieux', goal_exceptional: 'Objectif exceptionnel' }
const format = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })

function Segments({ percent, label }: { percent: number; label: string }) {
  return <span className="skill-segments" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
    {Array.from({ length: 10 }, (_, i) => <i key={i}><span style={{ width: `${Math.max(0, Math.min(100, percent * 10 - i * 100))}%` }} /></i>)}
  </span>
}

export default function SkillsPage({ ledger, avatar = DEFAULT_AVATAR, onAvatarChange }: { ledger: XpLedger; avatar?: AvatarConfig; onAvatarChange: (avatar: AvatarConfig) => void }) {
  const inspector = useRef<HTMLElement>(null)
  const [selected, setSelected] = useState<SkillId>('consistency')
  const [collapsed, setCollapsed] = useState<SkillGroupId[]>([])
  const { skills, groups } = calculateXp(ledger)
  const selectedGroup = SKILL_GROUPS.find(group => group.skills.some(skill => skill.id === selected))!
  const selectedSkill = selectedGroup.skills.find(skill => skill.id === selected)!
  const progress = skillProgress(skills[selected], ledger.levelFloors?.[selected])
  const history = ledger.events.filter(event => affectedSkills(event).includes(selected)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 3)
  const developed = Object.entries(skills).filter(([id, xp]) => skillProgress(xp, ledger.levelFloors?.[id as SkillId]).level > 1).length
  return <section className="skills-dossier">
    <header className="dossier-heading"><div><span className="dossier-kicker"><Crosshair size={13}/> FICHE DE PERSONNAGE</span><h1>Chaque action vous façonne.</h1><p>Votre quotidien devient votre progression.</p></div><span className="dossier-status"><i/> Progression active</span></header>
    <div className="dossier-layout">
      <aside className="character-card" aria-label="Votre personnage">
        <div className="dossier-card-label"><span>PERSONNAGE</span><span>01</span></div>
        <AvatarEditor value={avatar} onSave={onAvatarChange}/>
        <div className="character-identity"><span className="character-emblem"><Shield size={22}/></span><div><h2>{avatar.name}</h2><p>Votre aventure, à votre image.</p></div></div>
        <div className="character-stats"><div><strong>{developed}<small> / 19</small></strong><span>Compétences développées</span></div><div><strong>6</strong><span>Domaines à explorer</span></div></div>
        <p className="character-note"><Sparkles size={15}/> Une action après l’autre, vos compétences prennent forme.</p>
      </aside>
      <div className="dossier-skills">
        <div className="skills-table-heading"><div><h2>Compétences</h2><p>Sélectionnez une ligne pour explorer votre progression.</p></div><span>19 COMPÉTENCES</span></div>
        <div className="skills-groups">{SKILL_GROUPS.map((group, index) => {
          const groupProgress = skillProgress(groups[group.id], ledger.levelFloors?.[group.id])
          const closed = collapsed.includes(group.id)
          return <section className="dossier-group" key={group.id}>
            <button className="dossier-group-toggle" aria-expanded={!closed} aria-controls={`group-${group.id}`} onClick={() => setCollapsed(prev => closed ? prev.filter(id => id !== group.id) : [...prev, group.id])}>
              <span className="group-number">0{index + 1}</span><strong>{group.name}</strong><span className="group-level">Niv. {groupProgress.level}</span><ChevronDown size={15} className={closed ? 'is-collapsed' : ''}/>
            </button>
            {!closed && <div id={`group-${group.id}`} className="dossier-group-rows">{group.skills.map(skill => {
              const xp = skillProgress(skills[skill.id], ledger.levelFloors?.[skill.id])
              return <button key={skill.id} className={`dossier-skill-row ${selected === skill.id ? 'is-selected' : ''}`} aria-pressed={selected === skill.id} onClick={() => { setSelected(skill.id); inspector.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' }) }}>
                <span className="skill-row-name"><ChevronRight size={12}/>{skill.name}{skill.id === 'consistency' && <span className="skill-auto" title="Progression automatique">AUTO</span>}</span>
                <span className="skill-row-level">{String(xp.level).padStart(2, '0')}</span><Segments percent={xp.percent} label={`${skill.name} : progression vers le niveau suivant`}/><ArrowUpRight size={13} className="skill-row-arrow"/>
              </button>
            })}</div>}
          </section>
        })}</div>
        <p className="skills-legend"><span><i/> Cases = XP vers le prochain niveau</span><span>01–100 = niveau acquis</span></p>
      </div>
    </div>
    <section ref={inspector} className="skill-inspector" aria-label="Détail de la compétence" aria-live="polite">
      <div className="inspector-intro"><span className="dossier-kicker">{selectedGroup.name}</span><h2>{selectedSkill.name}</h2><p>{selected === 'consistency' ? 'La régularité progresse automatiquement avec vos tâches et habitudes.' : `Associez « ${selectedSkill.name} » à vos tâches, habitudes ou objectifs pour progresser au fil de vos actions.`}</p><span className="level-protection"><LockKeyhole size={12}/> Les niveaux acquis sont conservés.</span></div>
      <div className="inspector-progress"><span>NIVEAU <strong>{progress.level}</strong><small>/ 100</small></span><Segments percent={progress.percent} label={`Progression détaillée de ${selectedSkill.name}`}/><p>{progress.level === 100 ? 'Niveau maximum atteint' : `${format(progress.towardNext)} / ${format(progress.neededForNext)} XP vers le niveau ${progress.level + 1}`}</p></div>
      <div className="inspector-history"><h3>Dernières actions</h3>{history.length ? history.map(event => <div key={event.id}><span>{actionNames[event.action]}<small>{new Date(event.occurredAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}{event.status === 'reversed' ? ' · Annulée' : event.status === 'missed' ? ' · Non réalisée' : ''}</small></span><strong className={xpForEvent(event) < 0 ? 'xp-negative' : ''}>{xpForEvent(event) > 0 ? '+' : ''}{format(xpForEvent(event))} XP</strong></div>) : <p>Votre histoire commence ici. Réalisez une action associée pour gagner vos premiers XP.</p>}</div>
    </section>
  </section>
}
