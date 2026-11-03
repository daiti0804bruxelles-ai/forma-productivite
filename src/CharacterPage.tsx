import { SKILL_GROUPS } from './skillsCatalog'
import { domainProgress, type XpLedger } from './xpEngine'

const COLORS: Record<string,string> = {
  appearance:'#f59e0b', health:'#22c55e', knowledge:'#38bdf8',
  ambition:'#a78bfa', discipline:'#f97316', relations:'#fb7185',
}
const TRAITS: Record<string,string> = {
  appearance:'Force',health:'Vitalité',knowledge:'Savoir',
  ambition:'Ambition',discipline:'Discipline',relations:'Harmonie',
}

function Avatar({ accent, stage }: { accent: string; stage: number }) {
  return <svg role="img" aria-label={stage >= 3 ? 'Personnage évolué avec aura et emblème' : stage >= 2 ? 'Personnage avec aura' : 'Personnage débutant'} viewBox="0 0 320 340" style={{ width:'100%', maxWidth:320, display:'block', margin:'auto', filter:'drop-shadow(0 16px 30px rgba(15,23,42,.12))' }}>
    <defs>
      <linearGradient id="forma-armor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={accent}/><stop offset="1" stopColor="#334155"/></linearGradient>
      <radialGradient id="forma-aura"><stop offset="0" stopColor={accent} stopOpacity=".32"/><stop offset="1" stopColor={accent} stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse cx="160" cy="175" rx="140" ry="156" fill="url(#forma-aura)" opacity={stage>=2?1:.4}/>
    {stage>=2 && <g fill="none" stroke={accent} strokeWidth="2" opacity=".55"><circle cx="160" cy="160" r="123" strokeDasharray="8 10"/><path d="M160 12v25M160 283v25M16 160h25M279 160h25"/></g>}
    <ellipse cx="160" cy="308" rx="80" ry="13" fill="#64748b" opacity=".16"/>
    <path d="M98 269l-12 38h55l10-38M170 269l10 38h55l-12-38" fill="#334155" stroke="#1e293b" strokeWidth="4" strokeLinejoin="round"/>
    <path d="M113 164c-28 5-44 31-49 76l-5 32 36 8 13-52M207 164c28 5 44 31 49 76l5 32-36 8-13-52" fill="#475569" stroke="#334155" strokeWidth="5" strokeLinejoin="round"/>
    <path d="M112 154c-25 14-30 43-29 73l12 66h130l12-66c1-30-4-59-29-73z" fill="url(#forma-armor)" stroke="#334155" strokeWidth="6" strokeLinejoin="round"/>
    <path d="M134 169l26 26 26-26M160 195v93" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="5"/>
    <path d="M126 150v-18h68v18c0 18-15 30-34 30s-34-12-34-30z" fill="#d6a77e"/>
    <ellipse cx="160" cy="94" rx="59" ry="68" fill="#eac09b" stroke="#b78562" strokeWidth="3"/>
    <path d="M103 96c-9-46 16-78 55-78 44 0 69 34 59 80l-12-31c-21 3-38-5-51-18-11 16-30 24-45 23z" fill="#334155"/>
    <path d="M130 101h13M178 101h13" stroke="#334155" strokeWidth="5" strokeLinecap="round"/>
    <path d="M150 126q10 8 20 0" stroke="#a76c56" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <path d="M116 157l44 28 44-28" fill="none" stroke="#f8fafc" strokeWidth="4" strokeOpacity=".8"/>
    {stage>=3 && <g><path d="M160 194l17 12-6 23h-22l-6-23z" fill="#fde68a" stroke="#f59e0b" strokeWidth="3"/><path d="M160 202l5 8-5 11-5-11z" fill={accent}/></g>}
    {stage>=4 && <g fill="#fde68a" stroke="#f59e0b" strokeWidth="2"><path d="M114 31l-8-23 28 12 26-17 26 17 28-12-8 23z"/><circle cx="160" cy="15" r="5" fill={accent}/></g>}
  </svg>
}

export default function CharacterPage({ledger}:{ledger?:XpLedger}) {
  const domains=SKILL_GROUPS.map(group=>({...group,progress:domainProgress(ledger,group.id)}))
  const strongest=[...domains].sort((a,b)=>b.progress.xp-a.progress.xp)[0]
  const highestLevel=Math.max(...domains.map(domain=>domain.progress.level))
  // Le personnage évolue visuellement avec le meilleur domaine, sans créer de niveau général.
  const stage=highestLevel>=10?4:highestLevel>=5?3:highestLevel>=2?2:1
  const accent=COLORS[strongest.id]
  return <section>
    <div className="page-intro"><div><div className="eyebrow">TON PARCOURS EN IMAGES</div><h1>Mon personnage</h1><p>Ton personnage reflète ta progression dans les 6 domaines. Aucun niveau général : chaque domaine évolue séparément.</p></div></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,330px),1fr))',gap:20,alignItems:'start'}}>
      <section className="panel" style={{padding:24,textAlign:'center',overflow:'hidden'}}>
        <div style={{borderRadius:20,background:'linear-gradient(160deg,rgba(148,163,184,.09),rgba(148,163,184,.02))',padding:'12px 4px'}}>
          <Avatar accent={accent} stage={stage}/>
        </div>
        <h2 style={{fontSize:21,margin:'16px 0 6px'}}>Ton aventurier</h2>
        <p style={{fontSize:13,opacity:.7,margin:'0 0 12px'}}>Apparence {stage===1?'initiale':stage===2?'éveillée':stage===3?'renforcée':'légendaire'} · Domaine dominant : {strongest.name}</p>
        <div style={{fontSize:12,opacity:.7}}>L'aura apparaît lorsqu'un domaine atteint le niveau 2. Un emblème au niveau 5, une couronne au niveau 10.</div>
      </section>
      <section className="panel" style={{padding:24}}>
        <h2 style={{fontSize:19,margin:'0 0 8px'}}>Les attributs de ton personnage</h2>
        <p style={{fontSize:13,opacity:.7,margin:'0 0 24px'}}>Chaque attribut suit le niveau de son domaine. Termine des actions liées à ses compétences pour le faire progresser.</p>
        <div style={{display:'grid',gap:20}}>
          {domains.map(domain=><div key={domain.id}>
            <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'baseline',marginBottom:7}}>
              <div><strong style={{fontSize:14}}>{TRAITS[domain.id]}</strong><div style={{fontSize:12,opacity:.65}}>{domain.name}</div></div>
              <strong style={{fontSize:13,whiteSpace:'nowrap'}}>Niv. {domain.progress.level}</strong>
            </div>
            <div role="progressbar" aria-label={`Progression ${domain.name}`} aria-valuenow={domain.progress.current} aria-valuemin={0} aria-valuemax={domain.progress.required} style={{height:9,background:'rgba(120,120,128,.16)',borderRadius:99,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${Math.min(100,domain.progress.current/domain.progress.required*100)}%`,background:COLORS[domain.id],borderRadius:99}}/>
            </div>
            <div style={{fontSize:11,opacity:.6,marginTop:5}}>{domain.progress.current.toLocaleString('fr-FR')} / {domain.progress.required} XP</div>
          </div>)}
        </div>
      </section>
    </div>
    <p style={{fontSize:12,opacity:.65,marginTop:16}}>Version 1 du personnage : évolution automatique liée aux XP. La personnalisation des vêtements et de l'apparence viendra dans une prochaine étape.</p>
  </section>
}
