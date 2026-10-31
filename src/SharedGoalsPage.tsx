import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { Check, Copy, Plus, RefreshCw, Trash2, Users } from 'lucide-react'
import { supabase } from './lib/supabase'

type Space={id:string;name:string;owner_id:string}
type Invitation={id:string;space_id:string;invited_email:string;status:string;expires_at:string}
type SharedGoal={id:string;space_id:string;title:string;unit:string;target:number;tracking:'shared'|'individual';created_by:string}
type Entry={id:string;goal_id:string;actor_id:string;amount:number;note:string|null;created_at:string}
type Member={space_id:string;user_id:string}
const fmt=(n:number)=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(n)
const field:CSSProperties={width:'100%',boxSizing:'border-box',padding:'11px 12px',borderRadius:10,border:'1px solid rgba(120,120,128,.3)',background:'transparent',color:'inherit',fontSize:14}
const button:CSSProperties={padding:'10px 13px',border:'1px solid rgba(120,120,128,.25)',borderRadius:10,background:'transparent',color:'inherit',cursor:'pointer'}
const panel:CSSProperties={border:'1px solid rgba(120,120,128,.22)',borderRadius:16,padding:18,display:'grid',gap:12}
const message=(e:unknown)=>e instanceof Error?e.message:String(e)
export default function SharedGoalsPage({userId}:{userId:string}){
 const [spaces,setSpaces]=useState<Space[]>([])
 const [spaceId,setSpaceId]=useState('')
 const [members,setMembers]=useState<Member[]>([])
 const [goals,setGoals]=useState<SharedGoal[]>([])
 const [entries,setEntries]=useState<Entry[]>([])
 const [invitations,setInvitations]=useState<Invitation[]>([])
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [spaceName,setSpaceName]=useState('Notre espace')
 const [email,setEmail]=useState('')
 const [title,setTitle]=useState('')
 const [unit,setUnit]=useState('')
 const [target,setTarget]=useState('10')
 const [tracking,setTracking]=useState<'shared'|'individual'>('shared')
 const [amounts,setAmounts]=useState<Record<string,string>>({})
 const [inviteId,setInviteId]=useState(()=>new URLSearchParams(window.location.search).get('invite')||'')
 const active=spaces.find(s=>s.id===spaceId)
 const refresh=useCallback(async()=>{
  const {data:membership,error:membershipError}=await supabase.from('shared_space_members').select('space_id').eq('user_id',userId)
  if(membershipError)throw membershipError
  const {data:owned,error:ownedError}=await supabase.from('shared_spaces').select('id,name,owner_id').eq('owner_id',userId)
  if(ownedError)throw ownedError
  const ids=[...new Set([...(membership||[]).map(m=>m.space_id),...(owned||[]).map(s=>s.id)])]
  const {data:joined,error:joinedError}=ids.length?await supabase.from('shared_spaces').select('id,name,owner_id').in('id',ids):{data:[],error:null}
  if(joinedError)throw joinedError
  const all=(joined||[]) as Space[]
  setSpaces(all)
  setSpaceId(old=>all.some(s=>s.id===old)?old:all[0]?.id||'')
 },[userId])
 const loadSpace=useCallback(async()=>{
  if(!spaceId){setGoals([]);setEntries([]);setMembers([]);setInvitations([]);return}
  const [g,m,i]=await Promise.all([
   supabase.from('shared_goals').select('id,space_id,title,unit,target,tracking,created_by').eq('space_id',spaceId).order('created_at'),
   supabase.from('shared_space_members').select('space_id,user_id').eq('space_id',spaceId),
   supabase.from('shared_invitations').select('id,space_id,invited_email,status,expires_at').eq('space_id',spaceId)
  ])
  if(g.error)throw g.error
  if(m.error)throw m.error
  if(i.error)throw i.error
  const list=(g.data||[]) as SharedGoal[]
  setGoals(list);setMembers((m.data||[]) as Member[]);setInvitations((i.data||[]) as Invitation[])
  if(!list.length){setEntries([]);return}
  const result=await supabase.from('shared_goal_entries').select('id,goal_id,actor_id,amount,note,created_at').in('goal_id',list.map(x=>x.id)).order('created_at',{ascending:false})
  if(result.error)throw result.error
  setEntries((result.data||[]) as Entry[])
 },[spaceId])
 useEffect(()=>{let active=true;setLoading(true);refresh().catch(e=>{if(active)setError(message(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[refresh])
 useEffect(()=>{loadSpace().catch(e=>setError(message(e)));const timer=window.setInterval(()=>{loadSpace().catch(()=>{})},20000);return()=>window.clearInterval(timer)},[loadSpace])
 const run=async(action:()=>Promise<void>)=>{setBusy(true);setError('');setNotice('');try{await action()}catch(e){setError(message(e))}finally{setBusy(false)}}
 const createSpace=(e:FormEvent)=>{e.preventDefault();void run(async()=>{const {error}=await supabase.from('shared_spaces').insert({name:spaceName.trim(),owner_id:userId});if(error)throw error;await refresh();setNotice('Espace créé. Tu peux maintenant inviter une personne.')})}
 const invite=(e:FormEvent)=>{e.preventDefault();void run(async()=>{if(!active)throw Error('Crée un espace avant d’inviter.');const clean=email.trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(clean))throw Error('Adresse e-mail invalide.')
  const {error}=await supabase.from('shared_invitations').insert({space_id:spaceId,invited_email:clean,invited_by:userId})
  if(error)throw error
  setEmail('');await loadSpace();setNotice('Invitation créée. Copie son lien et transmets-le à la personne invitée. L’envoi automatique d’e-mail sera ajouté ensuite.')
 })}
 const inviteUrl=(id:string)=>window.location.origin+window.location.pathname+'?invite='+encodeURIComponent(id)
 const copy=(id:string)=>{void run(async()=>{await navigator.clipboard.writeText(inviteUrl(id));setNotice('Lien copié. Envoie-le à la personne invitée.')})}
 const accept=()=>{void run(async()=>{const {error}=await supabase.rpc('forma_accept_shared_invitation',{p_invitation:inviteId});if(error)throw error;setInviteId('');window.history.replaceState(null,'',window.location.pathname);await refresh();setNotice('Invitation acceptée ! Ton espace partagé est prêt.')})}
 const createGoal=(e:FormEvent)=>{e.preventDefault();void run(async()=>{const n=Number(target);if(!Number.isFinite(n)||n<=0||n>1000000000)throw Error('Cible invalide.')
  const {error}=await supabase.from('shared_goals').insert({space_id:spaceId,title:title.trim(),unit:unit.trim(),target:n,tracking,created_by:userId})
  if(error)throw error
  setTitle('');setUnit('');setTarget('10');await loadSpace()
 })}
 const add=(goal:SharedGoal)=>{void run(async()=>{const raw=amounts[goal.id];if(!raw||!raw.trim())throw Error('Saisis une contribution.')
  const amount=Number(raw);if(!Number.isFinite(amount)||amount===0||Math.abs(amount)>1000000000)throw Error('Montant invalide.')
  const {error}=await supabase.from('shared_goal_entries').insert({goal_id:goal.id,actor_id:userId,amount})
  if(error)throw error
  setAmounts(prev=>({...prev,[goal.id]:''}));await loadSpace()
 })}
 const deleteEntry=(entry:Entry)=>{if(!window.confirm('Annuler cette contribution ?'))return;void run(async()=>{const {error}=await supabase.from('shared_goal_entries').delete().eq('id',entry.id).eq('actor_id',userId);if(error)throw error;await loadSpace()})}
 const deleteGoal=(goal:SharedGoal)=>{if(!window.confirm('Supprimer cet objectif partagé et toutes ses contributions ?'))return;void run(async()=>{const {error}=await supabase.from('shared_goals').delete().eq('id',goal.id);if(error)throw error;await loadSpace()})}
 return <><section className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line"/> AVANCER ENSEMBLE</div><h1>Objectifs partagés</h1><p>Un espace commun, sans partager vos données personnelles.</p></div><button className="secondary-btn" onClick={()=>void run(async()=>{await refresh();await loadSpace()})} disabled={busy}><RefreshCw size={16}/> Actualiser</button></section>
 {error&&<p role="alert" style={{padding:14,color:'#ef4444'}}>{error}</p>}{notice&&<p role="status" style={{padding:14,color:'#16a34a'}}>{notice}</p>}
 {inviteId&&<section className="panel" style={{...panel,marginBottom:18}}><strong>Tu as reçu une invitation</strong><p>Connecte-toi avec l'adresse e-mail invitée et confirmée, puis accepte l'invitation.</p><button className="primary-btn" disabled={busy} onClick={accept}><Check size={17}/> Accepter l'invitation</button></section>}
 {loading?<section className="panel" style={panel}>Chargement de tes espaces…</section>:spaces.length===0?<section className="panel" style={panel}><h2>Créer votre espace commun</h2><p>Tu pourras ensuite inviter Gaëlle. Vos objectifs personnels resteront privés.</p><form onSubmit={createSpace} style={{display:'flex',gap:8,flexWrap:'wrap'}}><input aria-label="Nom de l'espace" required maxLength={100} value={spaceName} onChange={e=>setSpaceName(e.target.value)} style={{...field,flex:'1 1 200px'}}/><button className="primary-btn" disabled={busy} type="submit"><Plus size={16}/> Créer l'espace</button></form></section>:<div style={{display:'grid',gap:18}}>
 <section className="panel" style={panel}><div style={{display:'flex',alignItems:'center',gap:10}}><Users size={22}/><h2 style={{margin:0}}>Votre espace commun</h2></div><label style={{display:'grid',gap:5,fontSize:13}}>Espace<select value={spaceId} onChange={e=>setSpaceId(e.target.value)} style={field}>{spaces.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><small>{members.length} membre{members.length>1?'s':''} · Seuls les membres ont accès aux objectifs.</small>
 {active?.owner_id===userId&&<><h3 style={{margin:'6px 0 0'}}>Inviter par e-mail</h3><form onSubmit={invite} style={{display:'flex',gap:8,flexWrap:'wrap'}}><input type="email" aria-label="Adresse e-mail à inviter" placeholder="Adresse e-mail de Gaëlle" required value={email} onChange={e=>setEmail(e.target.value)} style={{...field,flex:'1 1 200px'}}/><button type="submit" className="primary-btn" disabled={busy}>Créer l'invitation</button></form><small>L'invitation est créée pour cette adresse. Pour l'instant, il faut copier et envoyer le lien manuellement ; l'envoi automatique par e-mail arrive dans une prochaine étape.</small>
 {invitations.filter(i=>i.status==='pending').map(i=><div key={i.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',fontSize:13}}><span>{i.invited_email} · expire le {new Date(i.expires_at).toLocaleDateString('fr-FR')}</span><button style={button} onClick={()=>copy(i.id)}><Copy size={14} style={{verticalAlign:'middle'}}/> Copier le lien</button></div>)}</>}
 </section>
 <section className="panel" style={panel}><h2 style={{margin:0}}>Nouvel objectif commun</h2><form onSubmit={createGoal} style={{display:'grid',gap:10}}><input aria-label="Nom de l'objectif" placeholder="Ex. : Économiser 20 000 €" maxLength={120} required value={title} onChange={e=>setTitle(e.target.value)} style={field}/><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><input aria-label="Valeur cible" type="number" min="0.01" step="any" required value={target} onChange={e=>setTarget(e.target.value)} style={{...field,flex:'1 1 120px'}}/><input aria-label="Unité" placeholder="€, séances..." maxLength={40} required value={unit} onChange={e=>setUnit(e.target.value)} style={{...field,flex:'1 1 120px'}}/></div><label style={{display:'grid',gap:5,fontSize:13}}>Suivi<select value={tracking} onChange={e=>setTracking(e.target.value as 'shared'|'individual')} style={field}><option value="shared">Compteur commun</option><option value="individual">Contributions individuelles</option></select></label><button className="primary-btn" type="submit" disabled={busy} style={{justifySelf:'start'}}><Plus size={16}/> Ajouter l'objectif</button></form></section>
 {goals.map(g=>{const es=entries.filter(e=>e.goal_id===g.id);const total=es.reduce((n,e)=>n+Number(e.amount),0);const pct=Math.max(0,Math.min(100,Math.round(total/Number(g.target)*100)));const contributions=Object.entries(es.reduce<Record<string,number>>((acc,e)=>({...acc,[e.actor_id]:(acc[e.actor_id]||0)+Number(e.amount)}),{}));return <section key={g.id} className="panel" style={panel}><div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'start'}}><div><h2 style={{margin:0,fontSize:18}}>{g.title}</h2><small>{g.tracking==='individual'?'Contributions individuelles':'Compteur commun'}</small></div><button style={button} aria-label={'Supprimer '+g.title} onClick={()=>deleteGoal(g)}><Trash2 size={16}/></button></div><strong style={{fontSize:21}}>{fmt(total)} / {fmt(Number(g.target))} {g.unit} · {pct}%</strong><div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={'Progression '+g.title} style={{height:9,borderRadius:99,overflow:'hidden',background:'rgba(120,120,128,.18)'}}><div style={{height:'100%',width:pct+'%',background:'#8b5cf6'}}/></div>
 {g.tracking==='individual'&&<div style={{display:'grid',gap:5,fontSize:13}}>{contributions.length?contributions.map(([id,value])=><div key={id}>{id===userId?'Moi':'Autre membre'} : <strong>{fmt(value)} {g.unit}</strong></div>):<small>Aucune contribution enregistrée.</small>}</div>}
 <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><input aria-label={'Ajouter une contribution à '+g.title} type="number" step="any" placeholder={'Ajouter ('+g.unit+')'} value={amounts[g.id]??''} onChange={e=>setAmounts(prev=>({...prev,[g.id]:e.target.value}))} style={{...field,flex:'1 1 150px'}}/><button className="primary-btn" disabled={busy} onClick={()=>add(g)}><Plus size={16}/> Ajouter</button></div>
 <details><summary style={{fontSize:13,cursor:'pointer'}}>Historique ({es.length})</summary><div style={{display:'grid',gap:6,marginTop:8}}>{es.map(e=><div key={e.id} style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center',fontSize:12}}><span>{new Date(e.created_at).toLocaleString('fr-FR')} · {e.actor_id===userId?'Moi':'Autre membre'} · {fmt(Number(e.amount))} {g.unit}</span>{e.actor_id===userId&&<button style={button} onClick={()=>deleteEntry(e)} aria-label="Annuler ma contribution"><Trash2 size={14}/></button>}</div>)}</div></details>
 </section>})}
 {goals.length===0&&<section className="panel" style={panel}>Aucun objectif commun pour le moment.</section>}
 </div>}
 </>
}
