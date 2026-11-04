import { useState } from 'react'
import { ChevronDown, UserRound } from 'lucide-react'
import { AvatarImage } from './avatarStorage'
import type { CharacterAppearance } from './CharacterPage'
import { SKILL_GROUPS } from './skillsCatalog'
import { domainProgress, skillProgress, type XpLedger } from './xpEngine'

const skillNameById: Record<string, string> = Object.fromEntries(SKILL_GROUPS.flatMap(group => group.skills.map(skill => [skill.id, skill.name])))

const barStyle = { height: 7, background: 'rgba(120,120,128,.18)', borderRadius: 999, overflow: 'hidden' as const }
function ProgressBar({ current, required }: { current: number; required: number }) {
  return <div role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={required}
    style={barStyle}><div style={{ width: `${Math.min(100, current / required * 100)}%`, height: '100%', background: '#8b5cf6', borderRadius: 999 }}/></div>
}

export default function SkillsPage({ ledger, appearance, avatarPath, avatarUpdatedAt, onOpenCharacter }: { ledger?: XpLedger; appearance?: CharacterAppearance; avatarPath?:string; avatarUpdatedAt?:string; onOpenCharacter?: () => void }) {
  const [expanded, setExpanded] = useState<string[]>([])
  const recentEvents = [...(ledger?.events ?? [])].reverse().slice(0, 12)
  return <section>
    <div className="page-intro"><div><div className="eyebrow">PROGRESSION PERSONNELLE</div>
      <h1>Mes compétences</h1><p>19 compétences réparties dans 6 domaines. Les actions accomplies font progresser tes compétences. Les pénalités réduisent ta progression, sans retirer les niveaux acquis.</p></div></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,340px),1fr))',gap:16,alignItems:'start'}}>
      <section className="panel" style={{padding:20,display:'flex',flexDirection:'column',minHeight:480}}>
        <div style={{textAlign:'center',fontSize:12,letterSpacing:1,opacity:.65,marginBottom:10}}>MON PERSONNAGE</div>
        <div style={{flex:1,display:'grid',placeItems:'center',borderRadius:18,background:'rgba(120,120,128,.06)',padding:20}}>
          <div style={{textAlign:'center',width:'100%',height:'100%',display:'grid',placeItems:'center'}}>
            {avatarPath?<AvatarImage path={avatarPath} revision={avatarUpdatedAt} alt="Mon aventurier Forma, de face" style={{maxHeight:430}}/>:<><UserRound size={76} strokeWidth={1.1} style={{margin:"0 auto",opacity:.55}}/>
            <p style={{fontSize:13,opacity:.7,marginTop:14}}>Avatar stylisé en préparation</p>
            <p style={{fontSize:11,opacity:.55,marginTop:5}}>Importe une image de ton personnage dans Perso</p></>}
          </div>
        </div>
        {onOpenCharacter&&<button type="button" className="secondary-btn" style={{marginTop:12,width:'100%'}} onClick={onOpenCharacter}>Voir mon personnage{appearance?' et mes personnalisations':''}</button>}
      </section>
      <div style={{display:'grid',gap:10}}>
      {SKILL_GROUPS.map(group => {
        const domain = domainProgress(ledger, group.id)
        const open=expanded.includes(group.id)
        return <section className="panel" key={group.id} style={{padding:0,overflow:'hidden'}}>
          <button type="button" aria-expanded={open} aria-controls={`skills-${group.id}`} onClick={()=>setExpanded(previous=>previous.includes(group.id)?previous.filter(id=>id!==group.id):[...previous,group.id])} style={{display:'block',width:'100%',border:0,background:'transparent',color:'inherit',textAlign:'left',padding:'18px 18px 16px',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:12}}>
              <strong style={{fontSize:14}}>{group.name}</strong>
              <span style={{display:'flex',alignItems:'center',gap:10,fontSize:12,opacity:.8}}>Niv. {domain.level}<ChevronDown size={17} style={{transform:open?'rotate(180deg)':'none',transition:'transform .15s'}}/></span>
            </div>
            <ProgressBar current={domain.current} required={domain.required}/>
          </button>
          {open&&<div id={`skills-${group.id}`} style={{padding:'0 18px 20px',borderTop:'1px solid rgba(120,120,128,.12)'}}>
            <p style={{fontSize:12,opacity:.7,margin:'14px 0 18px'}}>{domain.xp.toLocaleString('fr-FR')} XP dans ce domaine · {domain.current.toLocaleString('fr-FR')} / {domain.required} vers le prochain niveau</p>
            <div style={{display:'grid',gap:18}}>{group.skills.map(skill=>{
              const progress=skillProgress(ledger,skill.id)
              return <div key={skill.id}>
                <div style={{display:'flex',justifyContent:'space-between',gap:8,fontSize:13,marginBottom:6}}><span>{skill.name}</span><strong>Niv. {progress.level}</strong></div>
                <div style={{fontSize:11,opacity:.7,marginBottom:7}}>{progress.xp.toLocaleString('fr-FR')} XP · {progress.current} / {progress.required} XP</div>
                <ProgressBar current={progress.current} required={progress.required}/>
              </div>
            })}</div>
          </div>}
        </section>
      })}
      </div>
    </div>
    <section className="panel" style={{ marginTop: 20, padding: 20 }}>
      <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>Historique XP</h2>
      <p style={{ fontSize: 13, opacity: .7, margin: '0 0 18px' }}>12 dernières opérations enregistrées. Les pénalités sont affichées même si ton niveau reste protégé.</p>
      {recentEvents.length === 0
        ? <p style={{ opacity: .65, fontSize: 13 }}>Aucune opération XP pour le moment.</p>
        : <div style={{ display: 'grid', gap: 12 }}>
          {recentEvents.map(event => {
            const labels: Record<string, string> = { habit: 'Habitude validée', task: 'Tâche validée', goal: 'Objectif atteint', penalty: 'Pénalité' }
            const eventDay = event.source === 'penalty' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(event.key.slice(-10)) ? event.key.slice(-10) : event.at
            const skillNames = event.skillIds.map(id => skillNameById[id] ?? id).join(' · ')
            return <div key={event.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, paddingBottom: 12, borderBottom: '1px solid rgba(120,120,128,.12)' }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 13 }}>{labels[event.source]}</strong>
                <div style={{ fontSize: 12, opacity: .7, marginTop: 4, overflowWrap: 'anywhere' }}>{skillNames}</div>
                <time dateTime={eventDay} style={{ display: 'block', fontSize: 11, opacity: .55, marginTop: 4 }}>{Number.isNaN(Date.parse(eventDay)) ? '' : new Date(eventDay.includes('T') ? eventDay : `${eventDay}T12:00:00`).toLocaleDateString('fr-FR')}</time>
              </div>
              <strong style={{ whiteSpace: 'nowrap', fontSize: 13, color: event.amountPerSkill < 0 ? '#dc2626' : '#16a34a' }}>{event.amountPerSkill > 0 ? '+' : ''}{event.amountPerSkill.toLocaleString('fr-FR')} XP / compétence</strong>
            </div>
          })}
        </div>}
    </section>
  </section>
}
