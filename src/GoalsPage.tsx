import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Minus, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { Goal, GoalMode, GoalPeriod, GoalEntry } from './goalModel'
import { goalPercent, goalValue, periodKey, periodicTotal, round } from './goalModel'
export type { Goal, GoalHistory } from './goalModel'
type Props={goals:Goal[];onChange:(goals:Goal[])=>void}
const categories=['Personnel','Travail','Sport','Apprentissage']
const fmt=(n:number)=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(n)
const inputStyle={width:'100%',boxSizing:'border-box' as const,padding:'10px',borderRadius:10,border:'1px solid rgba(120,120,128,.3)',background:'transparent',color:'inherit',fontSize:14}
const btn={border:'1px solid rgba(120,120,128,.25)',background:'transparent',color:'inherit',borderRadius:10,padding:'9px 12px',cursor:'pointer'}
const uid=()=>crypto.randomUUID()
const now=()=>new Date().toISOString()
const modeName=(m:GoalMode)=>m==='measured'?'Valeur mesurée':m==='periodic'?'Périodique':'Cumulatif'
export default function GoalsPage({goals,onChange}:Props){
 const [formOpen,setFormOpen]=useState(false)
 const [editing,setEditing]=useState<string|null>(null)
 const [title,setTitle]=useState('')
 const [category,setCategory]=useState('Personnel')
 const [unit,setUnit]=useState('')
 const [target,setTarget]=useState('10')
 const [start,setStart]=useState('80')
 const [mode,setMode]=useState<GoalMode>('cumulative')
 const [period,setPeriod]=useState<GoalPeriod>('month')
 const [deadline,setDeadline]=useState('')
 const [manual,setManual]=useState<Record<string,string>>({})
 const [entryAmount,setEntryAmount]=useState<Record<string,string>>({})
 const [entryNote,setEntryNote]=useState<Record<string,string>>({})
 const [periodViews,setPeriodViews]=useState<Record<string,string>>({})
 const [historyOpen,setHistoryOpen]=useState<string|null>(null)
 const [deleteId,setDeleteId]=useState<string|null>(null)
 const [error,setError]=useState('')
 const [feedback,setFeedback]=useState('')
 const [entryDelete,setEntryDelete]=useState<{goalId:string;entryId:string}|null>(null)
 const openNew=()=>{setEditing(null);setTitle('');setCategory('Personnel');setUnit('');setTarget('10');setStart('80');setMode('cumulative');setPeriod('month');setDeadline('');setError('');setFormOpen(true)}
 const openEdit=(g:Goal)=>{setEditing(g.id);setTitle(g.title);setCategory(g.category);setUnit(g.unit);setTarget(String(g.target));setStart(String(g.start??g.current));setMode(g.mode||'cumulative');setPeriod(g.period||'month');setDeadline(g.deadline||'');setError('');setFormOpen(true)}
 const change=(g:Goal)=>onChange(goals.map(x=>x.id===g.id?g:x))
 const submit=(e:FormEvent)=>{e.preventDefault();const n=Number(target),initial=Number(start)
  if(!title.trim()||!unit.trim()||!Number.isFinite(n)||n<=0||n>100000000||round(n)<=0){setError('Indique un nom, une unité et une cible positive.');return}
  if(mode==='measured'&&(!Number.isFinite(initial)||initial<0||initial>100000000||round(initial)===round(n))){setError('La valeur de départ doit être différente de la cible et positive.');return}
  const old=goals.find(g=>g.id===editing)
  if(old&&(old.mode||'cumulative')!==mode){setError('Pour conserver ton historique, le type d’un objectif existant ne peut pas être changé. Crée un nouvel objectif.');return}
  if(old&&mode==='periodic'&&(old.period||'month')!==period&&(old.entries||[]).length){setError('Impossible de changer la période tant que des entrées sont enregistrées.');return}
  const clean=round(n),initialValue=round(initial)
  if(old){change({...old,title:title.trim(),category,unit:unit.trim(),target:clean,deadline:deadline||undefined,...(mode==='measured'?{start:initialValue}:{}),...(mode==='periodic'?{period}:{})})}
  else{onChange([...goals,{id:uid(),title:title.trim(),category,unit:unit.trim(),target:clean,current:mode==='measured'?initialValue:0,mode,...(mode==='measured'?{start:initialValue}:{}),...(mode==='periodic'?{period,entries:[]}:{}),deadline:deadline||undefined,history:[]}])}
  setFormOpen(false)
 }
 const updateValue=(g:Goal,n:number)=>{if(!Number.isFinite(n)||n<0||n>1000000000){setFeedback('Saisis une valeur positive valide.');return}
  const value=round(n);if(g.current===value)return;change({...g,current:value,history:[...(g.history||[]),{at:now(),from:g.current,to:value}]});setManual(p=>({...p,[g.id]:String(value)}));setFeedback('')}
 const addEntry=(g:Goal,kind:'add'|'set')=>{
  const raw=kind==='add'?entryAmount[g.id]:manual[g.id]
  if(raw===undefined||raw.trim()===''){setFeedback('Saisis un montant.');return}
  const amount=Number(raw)
  if(!Number.isFinite(amount)||amount<0||amount>1000000000){setFeedback('Saisis un montant positif valide.');return}
  const key=periodKey(new Date(),g.period||'month'),current=periodicTotal(g,key)
  if(kind==='add'&&amount===0)return
  const entry:GoalEntry={id:uid(),at:now(),kind,amount:round(amount),note:kind==='add'?(entryNote[g.id]||'').trim().slice(0,200)||undefined:'Correction du total'}
  if(kind==='set'&&current===entry.amount)return
  change({...g,entries:[...(g.entries||[]),entry]});setEntryAmount(p=>({...p,[g.id]:''}));setEntryNote(p=>({...p,[g.id]:''}));setManual(p=>({...p,[g.id]:''}));setFeedback('')
 }
 const saveManual=(g:Goal)=>{const raw=manual[g.id];if(raw===undefined||raw.trim()==='')return;updateValue(g,Number(raw))}
 const periodKeys=(g:Goal)=>{const current=periodKey(new Date(),g.period||'month');return [...new Set([current,...(g.entries||[]).map(e=>periodKey(new Date(e.at),g.period||'month'))])].sort().reverse()}
 const entriesFor=(g:Goal,key:string)=>(g.entries||[]).filter(e=>periodKey(new Date(e.at),g.period||'month')===key).sort((a,b)=>b.at.localeCompare(a.at))
 return <><section className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line"/> AVANCEZ À VOTRE RYTHME</div><h1>Mes objectifs</h1><p>Suivez vos actions, vos mesures et vos résultats par période.</p></div><button className="primary-btn" onClick={openNew}><Plus size={18}/> Nouvel objectif</button></section>
 <section className="panel" style={{padding:20,display:'grid',gap:16}}>
 {goals.length===0&&<div className="empty">Aucun objectif pour le moment. Créez ton premier objectif.</div>}
 {goals.map(g=>{const m=g.mode||'cumulative',pct=goalPercent(g),value=goalValue(g),keys=m==='periodic'?periodKeys(g):[],view=periodViews[g.id]||keys[0],viewValue=m==='periodic'?periodicTotal(g,view):value;return <article key={g.id} style={{padding:18,border:'1px solid rgba(120,120,128,.2)',borderRadius:16,display:'grid',gap:12,minWidth:0}}>
 <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><div><h2 style={{fontSize:18,margin:0,overflowWrap:'anywhere'}}>{g.title}</h2><div style={{fontSize:12,opacity:.65,marginTop:5}}>{g.category} · {modeName(m)}{g.deadline?' · Échéance : '+new Date(g.deadline+'T12:00:00').toLocaleDateString('fr-FR'):''}</div></div><div style={{display:'flex',gap:5}}><button style={btn} aria-label={'Modifier '+g.title} onClick={()=>openEdit(g)}><Pencil size={16}/></button><button style={btn} aria-label={'Supprimer '+g.title} onClick={()=>setDeleteId(g.id)}><Trash2 size={16}/></button></div></div>
 <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:8,flexWrap:'wrap'}}><strong style={{fontSize:21}}>{fmt(value)} / {fmt(g.target)} <span style={{fontSize:13,fontWeight:400}}>{g.unit}</span></strong><strong>{pct}%</strong></div>
 {m==='measured'&&<div style={{fontSize:12,opacity:.7}}>Départ : {fmt(g.start??0)} {g.unit} · Valeur actuelle : {fmt(g.current)} {g.unit}</div>}
 {m==='periodic'&&<div style={{fontSize:12,opacity:.7}}>Période en cours : {periodKey(new Date(),g.period||'month')} · {g.period==='week'?'Hebdomadaire':'Mensuel'}</div>}
 <div role="progressbar" aria-label={'Progression '+g.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} style={{height:10,background:'rgba(120,120,128,.18)',borderRadius:99,overflow:'hidden'}}><div style={{width:pct+'%',height:'100%',background:'#8b5cf6',borderRadius:99}}/></div>
 {pct===100&&<div style={{color:'#16a34a',fontSize:13,fontWeight:600}}><Check size={15} style={{verticalAlign:'middle'}}/> Objectif atteint !</div>}
 {m!=='periodic'&&<div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
 {m==='cumulative'&&<><button style={btn} aria-label={'Retirer une unité '+g.title} onClick={()=>updateValue(g,Math.max(0,g.current-1))} disabled={g.current<=0}><Minus size={17}/></button><button style={btn} aria-label={'Ajouter une unité '+g.title} onClick={()=>updateValue(g,g.current+1)}><Plus size={17}/></button></>}
 <label style={{display:'flex',gap:6,alignItems:'center',flex:'1 1 180px',fontSize:13}}>{m==='measured'?'Nouvelle mesure':'Valeur atteinte'}<input type="number" min="0" step="any" value={manual[g.id]??String(g.current)} onChange={e=>setManual(p=>({...p,[g.id]:e.target.value}))} style={{...inputStyle,minWidth:0,flex:1}}/></label><button style={btn} onClick={()=>saveManual(g)}>Enregistrer</button></div>}
 {m==='periodic'&&<div style={{display:'grid',gap:10}}>
 <label style={{fontSize:13}}>Ajouter une entrée ({g.unit})<input type="number" min="0" step="any" placeholder="Montant reçu" value={entryAmount[g.id]??''} onChange={e=>setEntryAmount(p=>({...p,[g.id]:e.target.value}))} style={inputStyle}/></label>
 <label style={{fontSize:13}}>Note (facultative)<input maxLength={200} placeholder="Ex. : Client A" value={entryNote[g.id]??''} onChange={e=>setEntryNote(p=>({...p,[g.id]:e.target.value}))} style={inputStyle}/></label>
 <button style={{...btn,justifySelf:'start'}} onClick={()=>addEntry(g,'add')}><Plus size={15} style={{verticalAlign:'middle'}}/> Ajouter au total du mois / de la semaine</button>
 <label style={{fontSize:13}}>Corriger directement le total de la période actuelle ({g.unit})<input type="number" min="0" step="any" placeholder={String(value)} value={manual[g.id]??''} onChange={e=>setManual(p=>({...p,[g.id]:e.target.value}))} style={inputStyle}/></label>
 <button style={{...btn,justifySelf:'start'}} onClick={()=>addEntry(g,'set')}>Enregistrer le total corrigé</button>
 <label style={{fontSize:13}}>Consulter une période<select style={inputStyle} value={view} onChange={e=>setPeriodViews(p=>({...p,[g.id]:e.target.value}))}>{keys.map(key=><option key={key} value={key}>{key}</option>)}</select></label>
 <div style={{fontSize:13}}>Total de la période sélectionnée : <strong>{fmt(viewValue)} {g.unit}</strong></div>
 <div style={{display:'grid',gap:6,maxHeight:170,overflowY:'auto'}}>{entriesFor(g,view).length===0?<small>Aucune entrée sur cette période.</small>:entriesFor(g,view).map(e=><div key={e.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,fontSize:12,borderBottom:'1px solid rgba(120,120,128,.12)',paddingBottom:5}}><span>{new Date(e.at).toLocaleString('fr-FR')} · {e.kind==='set'?'Total fixé à':'Ajout de'} {fmt(e.amount)} {g.unit}{e.note?' · '+e.note:''}</span><button style={btn} aria-label="Annuler cette entrée" onClick={()=>setEntryDelete({goalId:g.id,entryId:e.id})}><Trash2 size={13}/></button></div>)}</div>
 </div>}
 {m!=='periodic'&&<><button style={{...btn,justifySelf:'start',fontSize:12}} onClick={()=>setHistoryOpen(historyOpen===g.id?null:g.id)}>{historyOpen===g.id?'Masquer':'Voir'} l'historique ({(g.history||[]).length})</button>{historyOpen===g.id&&<div style={{display:'grid',gap:5,maxHeight:160,overflowY:'auto',fontSize:12}}>{(g.history||[]).length===0?'Aucune progression enregistrée.':[...(g.history||[])].reverse().map((h,i)=><div key={i}>{new Date(h.at).toLocaleString('fr-FR')} : {fmt(h.from)} → {fmt(h.to)} {g.unit}</div>)}</div>}</>}
 </article>})}</section>
 {feedback&&<div role="alert" style={{color:'#dc2626',padding:12}}>{feedback}</div>}
 {formOpen&&<div className="modal-backdrop" onMouseDown={()=>setFormOpen(false)}><div className="modal" role="dialog" aria-modal="true" aria-label="Formulaire objectif" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>{editing?'Modifier':'Créer'} un objectif</h2><button className="icon-button" aria-label="Fermer" onClick={()=>setFormOpen(false)}><X size={19}/></button></div><form className="modal-form" onSubmit={submit}>
 <label>Nom<input autoFocus required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex. : Gagner 30 000 € par mois"/></label>
 <label>Domaine<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
 <label>Mode de suivi<select value={mode} disabled={Boolean(editing)} onChange={e=>setMode(e.target.value as GoalMode)}><option value="cumulative">Cumulatif (livres, séances...)</option><option value="measured">Valeur mesurée (poids, temps...)</option><option value="periodic">Périodique (revenus, heures...)</option></select></label>
 {editing&&<small>Pour protéger l'historique, crée un nouvel objectif pour changer de mode.</small>}
 {mode==='periodic'&&<label>Période<select value={period} onChange={e=>setPeriod(e.target.value as GoalPeriod)}><option value="month">Chaque mois</option><option value="week">Chaque semaine</option></select></label>}
 {mode==='measured'&&<label>Valeur de départ<input type="number" min="0" step="any" required value={start} onChange={e=>setStart(e.target.value)}/></label>}
 <label>Valeur cible<input type="number" min="0.01" max="100000000" step="any" required value={target} onChange={e=>setTarget(e.target.value)}/></label>
 <label>Unité<input required maxLength={40} value={unit} onChange={e=>setUnit(e.target.value)} placeholder="kg, €, séances..."/></label>
 <label>Échéance (facultative)<input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label>
 {error&&<p role="alert" style={{color:'#dc2626'}}>{error}</p>}
 <div className="form-actions"><button type="button" className="secondary-btn" onClick={()=>setFormOpen(false)}>Annuler</button><button className="primary-btn" type="submit"><Check size={17}/> Enregistrer</button></div>
 </form></div></div>}
 {(deleteId||entryDelete)&&<div className="modal-backdrop" onMouseDown={()=>{setDeleteId(null);setEntryDelete(null)}}><div className="modal" role="dialog" aria-modal="true" aria-label="Confirmer la suppression" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>Confirmer la suppression</h2><button className="icon-button" onClick={()=>{setDeleteId(null);setEntryDelete(null)}} aria-label="Fermer"><X size={19}/></button></div><div style={{padding:20,display:'grid',gap:14}}><p>Cette action est irréversible.</p><div style={{display:'flex',justifyContent:'flex-end',gap:10}}><button className="secondary-btn" onClick={()=>{setDeleteId(null);setEntryDelete(null)}}>Annuler</button><button className="primary-btn" onClick={()=>{if(deleteId)onChange(goals.filter(g=>g.id!==deleteId));if(entryDelete){const g=goals.find(x=>x.id===entryDelete.goalId);if(g)change({...g,entries:(g.entries||[]).filter(e=>e.id!==entryDelete.entryId)})}setDeleteId(null);setEntryDelete(null)}}>Supprimer</button></div></div></div></div>}
 </>
}
