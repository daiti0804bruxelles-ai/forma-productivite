import AvatarCreationPrototype from './AvatarCreationPrototype'
import { AvatarImage } from './avatarStorage'
import type { XpLedger } from './xpEngine'

export type CharacterAppearance = { skin: 'light' | 'medium' | 'deep'; outfit: 'slate' | 'violet' | 'emerald'; hair: 'short' | 'long' | 'shaved' }
export const DEFAULT_APPEARANCE: CharacterAppearance = {skin:'medium',outfit:'slate',hair:'short'}
export function isCharacterAppearance(value: unknown): value is CharacterAppearance {
 if (!value || typeof value !== 'object' || Array.isArray(value)) return false
 const v=value as Partial<CharacterAppearance>
 return ['light','medium','deep'].includes(v.skin ?? '') && ['slate','violet','emerald'].includes(v.outfit ?? '') && ['short','long','shaved'].includes(v.hair ?? '')
}

export default function CharacterPage({userId,avatarPath,avatarUpdatedAt,onAvatarSaved}:{ledger?:XpLedger;appearance:CharacterAppearance;onAppearanceChange:(appearance:CharacterAppearance)=>void;userId:string;avatarPath?:string;avatarUpdatedAt?:string;onAvatarSaved:(path:string)=>void}) {
 return <section>
  <div className="page-intro"><div><div className="eyebrow">TON AVENTURIER FORMA</div><h1>Mon personnage</h1><p>Un personnage cartoon en 2D, fidèle à ta direction artistique. Pour un rendu immersif, utilise une image avec une seule pose de face.</p></div></div>
  <section className="panel" style={{padding:0,overflow:'hidden'}}>
   <div style={{position:'relative',height:'min(72vh,680px)',minHeight:340,display:'flex',alignItems:'stretch',justifyContent:'center',background:'radial-gradient(ellipse at 50% 75%,rgba(251,146,60,.2),transparent 48%),linear-gradient(165deg,#25334a 0%,#141b2c 60%,#0c111d 100%)'}}>
    {avatarPath?<AvatarImage path={avatarPath} revision={avatarUpdatedAt} alt="Mon personnage Forma" style={{width:'100%',height:'100%',objectFit:'contain',objectPosition:'center bottom',filter:'drop-shadow(0 12px 25px rgba(0,0,0,.28))'}}/>:<div style={{display:'grid',placeItems:'center',textAlign:'center',padding:24,color:'#e2e8f0'}}><div><div style={{fontSize:64}}>✦</div><h2 style={{fontSize:21}}>Ton aventurier apparaîtra ici</h2><p style={{fontSize:13,opacity:.8}}>Importe une illustration en pied, de face, sans planche de poses.</p></div></div>}
   </div>
   <div style={{padding:'15px 22px',display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap',alignItems:'center'}}>
    <strong>Mon aventurier</strong><span style={{fontSize:12,opacity:.7}}>Pose principale · Face · 2D</span>
   </div>
  </section>
  <AvatarCreationPrototype userId={userId} onSaved={onAvatarSaved}/>
 </section>
}
