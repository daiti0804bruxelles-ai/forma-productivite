import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Minus, Pencil, Plus, Trash2, X } from 'lucide-react'

export type GoalHistory = { at:string; from:number; to:number }
export type Goal = { id:string; title:string; category:string; unit:string; target:number; current:number; deadline?:string; history?:GoalHistory[] }
type Props = { goals:Goal[]; onChange:(goals:Goal[])=>void }
const categories=['Personnel','Travail','Sport','Apprentissage']
const format=(n:number)=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(n)
const fieldStyle={width:'100%',boxSizing:'border-box' as const,padding:'11px 12px',borderRadius:10,border:'1px solid rgba(120,120,128,.3)',background:'transparent',color:'inherit',fontSize:15}
const buttonStyle={border:'1px solid rgba(120,120,128,.25)',background:'transparent',color:'inherit',borderRadius:10,padding:'9px 12px',cursor:'pointer'}
const safeNumber=(n:number)=>Math.round(n*100)/100

export default function GoalsPage({goals,onChange}:Props){
 const [editing,setEditing]=useState<string|null>(null)
 const [formOpen,setFormOpen]=useState(false)
 const [title,setTitle]=useState('')
 const [category,setCategory]=useState('Personnel')
 const [unit,setUnit]=useState('')
 const [target,setTarget]=useState('10')
 const [deadline,setDeadline]=useState('')
 const [manual,setManual]=useState<Record<string,string>>({})
 const [showHistory,setShowHistory]=useState<string|null>(null)
 const [deleteId,setDeleteId]=useState<string|null>(null)
 const [error,setError]=useState('')
 const openNew=()=>{setEditing(null);setTitle('');setCategory('Personnel');setUnit('');setTarget('10');setDeadline('');setError('');setFormOpen(true)}
 const openEdit=(goal:Goal)=>{setEditing(goal.id);setTitle(goal.title);setCategory(goal.category);setUnit(goal.unit);setTarget(String(goal.target));setDeadline(goal.deadline||'');setError('');setFormOpen(true)}
 const submit=(e:FormEvent)=>{e.preventDefault();const n=Number(target);if(!title.trim()||!unit.trim()||!Number.isFinite(n)||n<=0||n>100000000){setError('Indique un nom, une unité et une valeur cible supérieure à zéro.');return}
  const cleanTarget=safeNumber(n);if(cleanTarget<=0){setError('La valeur cible doit être au moins 0,01.');return}
  if(editing){onChange(goals.map(g=>g.id===editing?{...g,title:title.trim(),category,unit:unit.trim(),target:cleanTarget,current:Math.min(g.current,cleanTarget),deadline:deadline||undefined}:g))}
  else{onChange([...goals,{id:crypto.randomUUID(),title:title.trim(),category,unit:unit.trim(),target:cleanTarget,current:0,deadline:deadline||undefined,history:[]}])}
  setFormOpen(false)
 }
 const updateProgress=(goal:Goal,next:number)=>{if(!Number.isFinite(next))return;const value=safeNumber(Math.max(0,Math.min(goal.target,next)));if(value===goal.current)return;onChange(goals.map(g=>g.id===goal.id?{...g,current:value,history:[...(g.history||[]),{at:new Date().toISOString(),from:g.current,to:value}]}:g));setManual(prev=>({...prev,[goal.id]:String(value)}))}
 const saveManual=(goal:Goal)=>{const raw=manual[goal.id];if(raw===undefined||raw.trim()==='')return;updateProgress(goal,Number(raw))}
 return <><section className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line"/> AVANCEZ À VOTRE RYTHME</div><h1>Mes objectifs</h1><p>Fixez une cible mesurable et suivez vos progrès au quotidien.</p></div><button className="primary-btn" onClick={openNew}><Plus size={18}/> Nouvel objectif</button></section>
 <section className="panel" style={{padding:20,display:'grid',gap:16}}>
 {goals.length===0&&<div className="empty">Aucun objectif pour le moment. Créez votre premier objectif pour commencer.</div>}
 {goals.map(goal=>{const pct=Math.min(100,Math.round(goal.current/goal.target*100));return <article key={goal.id} style={{padding:18,border:'1px solid rgba(120,120,128,.2)',borderRadius:16,display:'grid',gap:12,minWidth:0}}>
 <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}><div style={{minWidth:0}}><h2 style={{margin:0,fontSize:18,overflowWrap:'anywhere'}}>{goal.title}</h2><div style={{fontSize:12,opacity:.65,marginTop:5}}>{goal.category}{goal.deadline?' · Échéance : '+new Date(goal.deadline+'T12:00:00').toLocaleDateString('fr-FR'):''}</div></div><div style={{display:'flex',gap:5}}><button style={buttonStyle} aria-label={'Modifier '+goal.title} onClick={()=>openEdit(goal)}><Pencil size={16}/></button><button style={buttonStyle} aria-label={'Supprimer '+goal.title} onClick={()=>setDeleteId(goal.id)}><Trash2 size={16}/></button></div></div>
 <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><strong style={{fontSize:22}}>{format(goal.current)} / {format(goal.target)} <span style={{fontSize:13,fontWeight:400}}>{goal.unit}</span></strong><strong style={{fontSize:14}}>{pct}%</strong></div>
 <div role="progressbar" aria-label={'Progression de '+goal.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} style={{height:10,background:'rgba(120,120,128,.18)',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:pct+'%',background:'#8b5cf6',borderRadius:99,transition:'width .2s'}}/></div>
 {pct===100&&<div style={{color:'#16a34a',fontSize:13,fontWeight:600}}><Check size={14} style={{verticalAlign:'middle'}}/> Objectif atteint !</div>}
 <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><button style={buttonStyle} aria-label={'Retirer une unité à '+goal.title} onClick={()=>updateProgress(goal,goal.current-1)} disabled={goal.current<=0}><Minus size={18}/></button><button style={buttonStyle} aria-label={'Ajouter une unité à '+goal.title} onClick={()=>updateProgress(goal,goal.current+1)} disabled={goal.current>=goal.target}><Plus size={18}/></button><label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,flex:'1 1 170px'}}>Valeur atteinte<input type="number" min="0" max={goal.target} step="any" value={manual[goal.id]??String(goal.current)} onChange={e=>setManual(prev=>({...prev,[goal.id]:e.target.value}))} style={{...fieldStyle,minWidth:0,flex:1}}/></label><button style={buttonStyle} onClick={()=>saveManual(goal)}>Enregistrer</button></div>
 <button type="button" style={{...buttonStyle,justifySelf:'start',fontSize:12}} onClick={()=>setShowHistory(showHistory===goal.id?null:goal.id)}>{showHistory===goal.id?'Masquer':'Voir'} l'historique ({(goal.history||[]).length})</button>
 {showHistory===goal.id&&<div style={{display:'grid',gap:6,fontSize:12,opacity:.8,maxHeight:160,overflowY:'auto'}}>{(goal.history||[]).length===0?'Aucune progression enregistrée.':[...(goal.history||[])].reverse().map((h,i)=><div key={i}>{new Date(h.at).toLocaleString('fr-FR')} : {format(h.from)} → {format(h.to)} {goal.unit}</div>)}</div>}
 </article>})}</section>
 {formOpen&&<div className="modal-backdrop" onMouseDown={()=>setFormOpen(false)}><div className="modal" role="dialog" aria-modal="true" aria-label={editing?'Modifier un objectif':'Nouvel objectif'} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>{editing?'Modifier l’objectif':'Nouvel objectif'}</h2><button className="icon-button" aria-label="Fermer" onClick={()=>setFormOpen(false)}><X size={19}/></button></div><form className="modal-form" onSubmit={submit}><label>Nom<input autoFocus required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex. : Lire 12 livres"/></label><label>Domaine<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Valeur à atteindre<input type="number" min="0.01" max="100000000" step="any" required value={target} onChange={e=>setTarget(e.target.value)}/></label><label>Unité de mesure<input required maxLength={40} value={unit} onChange={e=>setUnit(e.target.value)} placeholder="livres, km, séances…"/></label><label>Échéance (facultative)<input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label>{error&&<p role="alert" style={{color:'#dc2626'}}>{error}</p>}<div className="form-actions"><button type="button" className="secondary-btn" onClick={()=>setFormOpen(false)}>Annuler</button><button type="submit" className="primary-btn"><Check size={17}/> Enregistrer</button></div></form></div></div>}
 {deleteId&&<div className="modal-backdrop" onMouseDown={()=>setDeleteId(null)}><div className="modal" role="dialog" aria-modal="true" aria-label="Supprimer l'objectif" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>Supprimer l'objectif ?</h2><button className="icon-button" aria-label="Fermer" onClick={()=>setDeleteId(null)}><X size={19}/></button></div><div style={{padding:20,display:'flex',gap:10,justifyContent:'flex-end'}}><button className="secondary-btn" onClick={()=>setDeleteId(null)}>Annuler</button><button className="primary-btn" onClick={()=>{onChange(goals.filter(g=>g.id!==deleteId));setDeleteId(null)}}>Supprimer</button></div></div></div>}
 </>
}
