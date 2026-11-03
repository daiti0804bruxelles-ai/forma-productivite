import { SKILL_GROUPS } from './skillsCatalog'
import { xpByDomain, xpBySkill, type XpLedger } from './xpEngine'

/** Courbe provisoire, centralisée pour permettre son ajustement sans modifier le journal XP. */
const XP_PER_LEVEL = 100
function levelProgress(xp: number) {
  const safe = Math.max(0, xp)
  return {
    level: Math.floor(safe / XP_PER_LEVEL) + 1,
    current: safe % XP_PER_LEVEL,
    required: XP_PER_LEVEL,
  }
}
const barStyle = { height: 7, background: 'rgba(120,120,128,.18)', borderRadius: 999, overflow: 'hidden' as const }
function ProgressBar({ current, required }: { current: number; required: number }) {
  return <div role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={required}
    style={barStyle}><div style={{ width: `${Math.min(100, current / required * 100)}%`, height: '100%', background: '#8b5cf6', borderRadius: 999 }}/></div>
}

export default function SkillsPage({ ledger }: { ledger?: XpLedger }) {
  const bySkill = xpBySkill(ledger)
  const byDomain = xpByDomain(ledger)
  return <section>
    <div className="page-intro"><div><div className="eyebrow">PROGRESSION PERSONNELLE</div>
      <h1>Mes compétences</h1><p>19 compétences réparties dans 6 domaines. Les XP sont gagnés en accomplissant tes actions.</p></div></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 18 }}>
      {SKILL_GROUPS.map(group => {
        const domainXp = byDomain.find(d => d.id === group.id)?.xp ?? 0
        const domain = levelProgress(domainXp)
        return <section className="panel" key={group.id} style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 9 }}>
            <h2 style={{ fontSize: 17, margin: 0 }}>{group.name}</h2><strong style={{ whiteSpace: 'nowrap', fontSize: 13 }}>Niv. {domain.level}</strong>
          </div>
          <div style={{ fontSize: 12, opacity: .7, marginBottom: 8 }}>{domainXp.toLocaleString('fr-FR')} XP · {domain.current.toLocaleString('fr-FR')} / {domain.required} XP</div>
          <ProgressBar current={domain.current} required={domain.required}/>
          <div style={{ display: 'grid', gap: 18, marginTop: 22 }}>
            {group.skills.map(skill => {
              const xp = bySkill[skill.id]
              const progress = levelProgress(xp)
              return <div key={skill.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6, fontSize: 13 }}>
                  <span>{skill.name}</span><strong style={{ whiteSpace: 'nowrap' }}>Niv. {progress.level}</strong>
                </div>
                <div style={{ fontSize: 11, opacity: .7, marginBottom: 7 }}>{xp.toLocaleString('fr-FR')} XP · {progress.current} / {progress.required} XP</div>
                <ProgressBar current={progress.current} required={progress.required}/>
              </div>
            })}
          </div>
        </section>
      })}
    </div>
  </section>
}
