import { SKILL_GROUPS, calculateXp, skillProgress } from './skillModel'
import type { XpLedger } from './skillModel'

export default function SkillsPage({ ledger }: { ledger: XpLedger }) {
  const { skills, groups } = calculateXp(ledger)
  return <section style={{display:'grid',gap:20}}>
    <div className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line"/> VOTRE PROGRESSION</div>
      <h1>Mes compétences</h1><p>Développez vos compétences au fil de vos actions.</p></div></div>
    {SKILL_GROUPS.map(group => {
      const parent = skillProgress(groups[group.id], ledger.levelFloors?.[group.id])
      return <section key={group.id} className="panel" style={{padding:20,display:'grid',gap:15}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}>
          <h2 style={{fontSize:19,margin:0}}>{group.name}</h2><strong>Niveau {parent.level}</strong>
        </div>
        <div role="progressbar" aria-label={'Progression '+group.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={parent.percent} style={{height:8,background:'rgba(120,120,128,.15)',borderRadius:99,overflow:'hidden'}}>
          <div style={{width:parent.percent+'%',height:'100%',background:'#8b5cf6'}}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
          {group.skills.map(skill => {
            const xp = skillProgress(skills[skill.id], ledger.levelFloors?.[skill.id])
            return <div key={skill.id} style={{padding:14,border:'1px solid rgba(120,120,128,.2)',borderRadius:12,display:'grid',gap:8}}>
              <strong style={{fontSize:14}}>{skill.name}</strong>
              <span style={{fontSize:13}}>Niveau {xp.level} · {Math.max(0,xp.xp).toLocaleString('fr-FR')} XP</span>
              <div role="progressbar" aria-label={'Progression '+skill.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={xp.percent} style={{height:7,background:'rgba(120,120,128,.15)',borderRadius:99,overflow:'hidden'}}>
                <div style={{width:xp.percent+'%',height:'100%',background:'#34c759'}}/>
              </div>
              <small>{xp.level===100?'Niveau maximum':xp.towardNext.toLocaleString('fr-FR')+' / '+xp.neededForNext.toLocaleString('fr-FR')+' XP'}</small>
            </div>
          })}
        </div>
      </section>
    })}
  </section>
}
