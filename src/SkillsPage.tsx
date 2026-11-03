import { SKILL_GROUPS } from './skillsCatalog'
import { domainProgress, skillProgress, type XpLedger } from './xpEngine'

const barStyle = { height: 7, background: 'rgba(120,120,128,.18)', borderRadius: 999, overflow: 'hidden' as const }
function ProgressBar({ current, required }: { current: number; required: number }) {
  return <div role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={required}
    style={barStyle}><div style={{ width: `${Math.min(100, current / required * 100)}%`, height: '100%', background: '#8b5cf6', borderRadius: 999 }}/></div>
}

export default function SkillsPage({ ledger }: { ledger?: XpLedger }) {
  const recentEvents = [...(ledger?.events ?? [])].reverse().slice(0, 12)
  return <section>
    <div className="page-intro"><div><div className="eyebrow">PROGRESSION PERSONNELLE</div>
      <h1>Mes compétences</h1><p>19 compétences réparties dans 6 domaines. Les actions accomplies font progresser tes compétences. Les pénalités réduisent ta progression, sans retirer les niveaux acquis.</p></div></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 18 }}>
      {SKILL_GROUPS.map(group => {
        const domain = domainProgress(ledger, group.id)
        const domainXp = domain.xp
        return <section className="panel" key={group.id} style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 9 }}>
            <h2 style={{ fontSize: 17, margin: 0 }}>{group.name}</h2><strong style={{ whiteSpace: 'nowrap', fontSize: 13 }}>Niv. {domain.level}</strong>
          </div>
          <div style={{ fontSize: 12, opacity: .7, marginBottom: 8 }}>{domainXp.toLocaleString('fr-FR')} XP · {domain.current.toLocaleString('fr-FR')} / {domain.required} XP</div>
          <ProgressBar current={domain.current} required={domain.required}/>
          <div style={{ display: 'grid', gap: 18, marginTop: 22 }}>
            {group.skills.map(skill => {
              const progress = skillProgress(ledger, skill.id)
              const xp = progress.xp
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
    <section className="panel" style={{ marginTop: 20, padding: 20 }}>
      <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>Historique XP</h2>
      <p style={{ fontSize: 13, opacity: .7, margin: '0 0 18px' }}>12 dernières opérations enregistrées. Les pénalités sont affichées même si ton niveau reste protégé.</p>
      {recentEvents.length === 0
        ? <p style={{ opacity: .65, fontSize: 13 }}>Aucune opération XP pour le moment.</p>
        : <div style={{ display: 'grid', gap: 12 }}>
          {recentEvents.map(event => {
            const labels: Record<string, string> = { habit: 'Habitude validée', task: 'Tâche validée', goal: 'Objectif atteint', penalty: 'Pénalité' }
            const eventDay = event.source === 'penalty' && /^\\d{4}-\\d{2}-\\d{2}$/.test(event.key.slice(-10)) ? event.key.slice(-10) : event.at
            const skillNames = event.skillIds.map(id => SKILL_GROUPS.flatMap(group => group.skills).find(skill => skill.id === id)?.name ?? id).join(' · ')
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
