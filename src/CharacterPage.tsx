import { SKILL_GROUPS } from './skillsCatalog'
import AvatarCreationPrototype from './AvatarCreationPrototype'
import { AvatarImage } from './avatarStorage'
import { domainProgress, type XpLedger } from './xpEngine'

export type CharacterAppearance = { skin: 'light' | 'medium' | 'deep'; outfit: 'slate' | 'violet' | 'emerald'; hair: 'short' | 'long' | 'shaved' }
export const DEFAULT_APPEARANCE: CharacterAppearance = {skin:'medium',outfit:'slate',hair:'short'}
export function isCharacterAppearance(value: unknown): value is CharacterAppearance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const v=value as Partial<CharacterAppearance>
  return ['light','medium','deep'].includes(v.skin ?? '') && ['slate','violet','emerald'].includes(v.outfit ?? '') && ['short','long','shaved'].includes(v.hair ?? '')
}
const SKIN_COLORS = {light:'#f4d6b8',medium:'#eac09b',deep:'#9d684c'}
const SKIN_SHADOWS = {light:'#c79b7c',medium:'#b78562',deep:'#6e4436'}
const OUTFIT_COLORS = {slate:'#334155',violet:'#7c3aed',emerald:'#047857'}

const COLORS: Record<string,string> = {
  appearance:'#f59e0b', health:'#22c55e', knowledge:'#38bdf8',
  ambition:'#a78bfa', discipline:'#f97316', relations:'#fb7185',
}
const TRAITS: Record<string,string> = {
  appearance:'Force',health:'Vitalité',knowledge:'Savoir',
  ambition:'Ambition',discipline:'Discipline',relations:'Harmonie',
}

function Avatar({ accent, stage, appearance }: { accent: string; stage: number; appearance: CharacterAppearance }) {
  return <svg role="img" aria-label={stage >= 3 ? 'Personnage évolué avec aura et emblème' : stage >= 2 ? 'Personnage avec aura' : 'Personnage débutant'} viewBox="0 0 320 340" style={{ width:'100%', maxWidth:320, display:'block', margin:'auto', filter:'drop-shadow(0 16px 30px rgba(15,23,42,.12))' }}>
    <defs>
      <linearGradient id="forma-armor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={accent}/><stop offset="1" stopColor="#334155"/></linearGradient>
      <radialGradient id="forma-aura"><stop offset="0" stopColor={accent} stopOpacity=".32"/><stop offset="1" stopColor={accent} stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse cx="160" cy="175" rx="140" ry="156" fill="url(#forma-aura)" opacity={stage>=2?1:.4}/>
    {stage>=2 && <g fill="none" stroke={accent} strokeWidth="2" opacity=".55"><circle cx="160" cy="160" r="123" strokeDasharray="8 10"/><path d="M160 12v25M160 283v25M16 160h25M279 160h25"/></g>}
    <ellipse cx="160" cy="308" rx="80" ry="13" fill="#64748b" opacity=".16"/>
    <path d="M98 269l-12 38h55l10-38M170 269l10 38h55l-12-38" fill={OUTFIT_COLORS[appearance.outfit]} stroke="#1e293b" strokeWidth="4" strokeLinejoin="round"/>
    <path d="M113 164c-28 5-44 31-49 76l-5 32 36 8 13-52M207 164c28 5 44 31 49 76l5 32-36 8-13-52" fill={OUTFIT_COLORS[appearance.outfit]} stroke="#334155" strokeWidth="5" strokeLinejoin="round"/>
    <path d="M112 154c-25 14-30 43-29 73l12 66h130l12-66c1-30-4-59-29-73z" fill={OUTFIT_COLORS[appearance.outfit]} stroke="#334155" strokeWidth="6" strokeLinejoin="round"/>
    <path d="M134 169l26 26 26-26M160 195v93" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="5"/>
    <path d="M126 150v-18h68v18c0 18-15 30-34 30s-34-12-34-30z" fill={SKIN_SHADOWS[appearance.skin]}/>
    <ellipse cx="160" cy="94" rx="59" ry="68" fill={SKIN_COLORS[appearance.skin]} stroke={SKIN_SHADOWS[appearance.skin]} strokeWidth="3"/>
    {appearance.hair === 'short' && <path d="M103 96c-9-46 16-78 55-78 44 0 69 34 59 80l-12-31c-21 3-38-5-51-18-11 16-30 24-45 23z" fill="#334155"/>}
    {appearance.hair === 'long' && <><path d="M103 70c-20 40-16 85-8 125l28-11-3-97M217 70c20 40 16 85 8 125l-28-11 3-97" fill="#334155"/><path d="M103 96c-9-46 16-78 55-78 44 0 69 34 59 80l-12-31c-21 3-38-5-51-18-11 16-30 24-45 23z" fill="#334155"/></>}
    {appearance.hair === 'shaved' && <path d="M110 76c-2-36 21-55 50-55 29 0 52 19 50 55" fill="none" stroke="#334155" strokeWidth="9" strokeLinecap="round"/>}
    <path d="M130 101h13M178 101h13" stroke="#334155" strokeWidth="5" strokeLinecap="round"/>
    <path d="M150 126q10 8 20 0" stroke="#a76c56" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <path d="M116 157l44 28 44-28" fill="none" stroke="#f8fafc" strokeWidth="4" strokeOpacity=".8"/>
    {stage>=3 && <g><path d="M160 194l17 12-6 23h-22l-6-23z" fill="#fde68a" stroke="#f59e0b" strokeWidth="3"/><path d="M160 202l5 8-5 11-5-11z" fill={accent}/></g>}
    {stage>=4 && <g fill="#fde68a" stroke="#f59e0b" strokeWidth="2"><path d="M114 31l-8-23 28 12 26-17 26 17 28-12-8 23z"/><circle cx="160" cy="15" r="5" fill={accent}/></g>}
  </svg>
}

export default function CharacterPage({ledger,appearance,onAppearanceChange,userId,avatarPath,avatarUpdatedAt,onAvatarSaved}:{ledger?:XpLedger;appearance:CharacterAppearance;onAppearanceChange:(appearance:CharacterAppearance)=>void;userId:string;avatarPath?:string;avatarUpdatedAt?:string;onAvatarSaved:(path:string)=>void}) {
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
          {avatarPath?<AvatarImage path={avatarPath} revision={avatarUpdatedAt} style={{maxHeight:420}}/>:<Avatar accent={accent} stage={stage} appearance={appearance}/>}
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
    <AvatarCreationPrototype userId={userId} onSaved={onAvatarSaved}/>
    <section className="panel" style={{marginTop:20,padding:24}}>
      <h2 style={{fontSize:19,margin:'0 0 8px'}}>Personnaliser mon personnage</h2>
      <p style={{fontSize:13,opacity:.7,margin:'0 0 20px'}}>Tes choix sont sauvegardés avec ton compte et n'affectent pas tes XP.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:22}}>
        {([
          {field:'skin',label:'Teint',options:[['light','Clair'],['medium','Moyen'],['deep','Foncé']]},
          {field:'hair',label:'Coiffure',options:[['short','Court'],['long','Long'],['shaved','Rasé']]},
          {field:'outfit',label:'Tenue',options:[['slate','Ardoise'],['violet','Violet'],['emerald','Émeraude']]},
        ] as const).map(group=><fieldset key={group.field} style={{border:0,padding:0,margin:0,minWidth:0}}>
          <legend style={{fontWeight:800,fontSize:14,marginBottom:10}}>{group.label}</legend>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{group.options.map(([value,label])=><button type="button" key={value} onClick={()=>onAppearanceChange({...appearance,[group.field]:value})} aria-pressed={appearance[group.field]===value} style={{border:appearance[group.field]===value?'2px solid #a78bfa':'1px solid #64748b',background:appearance[group.field]===value?'#302745':'transparent',color:'inherit',borderRadius:10,padding:'10px 12px',fontSize:12,fontWeight:700}}>{label}</button>)}</div>
        </fieldset>)}
      </div>
    </section>
    <p style={{fontSize:12,opacity:.65,marginTop:16}}>Les équipements spéciaux seront ajoutés progressivement. L'aura et les récompenses visuelles dépendent de tes niveaux acquis.</p>
  </section>
}
