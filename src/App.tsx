import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, CircleCheck, Clock3, Home, LayoutGrid, Menu, MoreHorizontal, Plus, Repeat2, Sparkles, Trash2, X, Pencil, Download, Upload, ShieldCheck, Sunrise, Sun, Moon, BriefcaseBusiness, Dumbbell, BookOpen, ListTodo } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
type Page = 'dashboard' | 'habits' | 'tasks' | 'calendar'
type Period = 'Matin' | 'Après-midi' | 'Soir'
type Habit = { id:string; title:string; period:Period; category:string }
type Task = { id:string; title:string; category:string; priority:'Facile'|'Moyen'|'Difficile'; date:string; done:boolean }
type Event = { id:string; title:string; date:string; time:string; category:string }
type AppData = { habits:Habit[]; tasks:Task[]; events:Event[]; completedHabits:Record<string,string[]> }
const todayKey = () => dateKey(new Date())
function dateKey(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function makeDate(s:string){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function addDays(d:Date,n:number){const x=new Date(d);x.setDate(x.getDate()+n);return x}
const frDate=(d:Date,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('fr-FR',options).format(d)
const id=()=>Math.random().toString(36).slice(2,10)
const categories=['Personnel','Travail','Sport','Apprentissage']
const demoData=():AppData=>({
 habits:[{id:'h1',title:'Boire un grand verre d’eau',period:'Matin',category:'Personnel'},{id:'h2',title:'Lire pendant 20 minutes',period:'Matin',category:'Apprentissage'},{id:'h3',title:'Session de travail profond',period:'Après-midi',category:'Travail'},{id:'h4',title:'Faire 30 minutes de sport',period:'Après-midi',category:'Sport'},{id:'h5',title:'Préparer la journée de demain',period:'Soir',category:'Personnel'}],
 tasks:[{id:'t1',title:'Définir les 3 priorités de la semaine',category:'Travail',priority:'Moyen',date:todayKey(),done:false},{id:'t2',title:'Répondre aux messages importants',category:'Travail',priority:'Facile',date:todayKey(),done:true},{id:'t3',title:'Faire une séance de mobilité',category:'Sport',priority:'Facile',date:todayKey(),done:false},{id:'t4',title:'Organiser mon espace de travail',category:'Personnel',priority:'Moyen',date:dateKey(addDays(new Date(),1)),done:false}],
 events:[{id:'e1',title:'Focus : projet personnel',date:todayKey(),time:'09:00',category:'Travail'},{id:'e2',title:'Séance de sport',date:todayKey(),time:'18:00',category:'Sport'},{id:'e3',title:'Bilan de la semaine',date:dateKey(addDays(new Date(),3)),time:'17:00',category:'Personnel'}],completedHabits:{}
})
function isAppData(value:unknown):value is AppData{
 if(!value||typeof value!=='object')return false
 const d=value as Partial<AppData>
 const validText=(s:unknown)=>typeof s==='string'&&s.length<=200
 const validDate=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)
 if(!Array.isArray(d.habits)||!Array.isArray(d.tasks)||!Array.isArray(d.events)||!d.completedHabits||typeof d.completedHabits!=='object'||Array.isArray(d.completedHabits))return false
 if(d.habits.length>10000||d.tasks.length>10000||d.events.length>10000)return false
 if(!d.habits.every(h=>h&&validText(h.id)&&validText(h.title)&&validText(h.category)&&['Matin','Après-midi','Soir'].includes(h.period)))return false
 if(!d.tasks.every(t=>t&&validText(t.id)&&validText(t.title)&&validText(t.category)&&validDate(t.date)&&['Facile','Moyen','Difficile'].includes(t.priority)&&typeof t.done==='boolean'))return false
 if(!d.events.every(e=>e&&validText(e.id)&&validText(e.title)&&validText(e.category)&&validDate(e.date)&&typeof e.time==='string'&&/^\d{2}:\d{2}$/.test(e.time)))return false
 return Object.entries(d.completedHabits).every(([day,ids])=>validDate(day)&&Array.isArray(ids)&&ids.every(validText))
}
const nav:{id:Page;label:string;icon:LucideIcon}[]=[{id:'dashboard',label:'Tableau de bord',icon:Home},{id:'habits',label:'Mes habitudes',icon:Repeat2},{id:'tasks',label:'Mes tâches',icon:ListTodo},{id:'calendar',label:'Calendrier',icon:CalendarDays}]
const categoryIcon:Record<string,LucideIcon>={Personnel:Sparkles,Travail:BriefcaseBusiness,Sport:Dumbbell,Apprentissage:BookOpen}
const categoryClass:Record<string,string>={Personnel:'lavender',Travail:'blue',Sport:'peach',Apprentissage:'mint'}
const periods:{name:Period;icon:LucideIcon;time:string}[]=[{name:'Matin',icon:Sunrise,time:'06:00 — 12:00'},{name:'Après-midi',icon:Sun,time:'12:00 — 18:00'},{name:'Soir',icon:Moon,time:'18:00 — 00:00'}]
function IconBadge({category}:{category:string}){const Icon=categoryIcon[category]||Sparkles;return <span className={`category-icon ${categoryClass[category]||'lavender'}`}><Icon size={17}/></span>}
function Empty({message}:{message:string}){return <div className="empty">{message}</div>}
function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setMessage('')

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        })

        if (error) throw error

        setMessage(
          data.session
            ? 'Compte créé avec succès !'
            : 'Compte créé ! Vérifie ton email pour confirmer ton inscription.'
        )
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })

        if (error) throw error
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: '380px',
          display: 'grid',
          gap: '16px'
        }}
      >
        <h1>Forma</h1>
        <h2>{isSignup ? 'Créer un compte' : 'Connexion'}</h2>

        <input
          type="email"
          placeholder="Adresse email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          minLength={6}
          required
        />

        <button type="submit" disabled={loading}>
          {loading
            ? 'Chargement...'
            : isSignup ? "S'inscrire" : 'Se connecter'}
        </button>

        {message && <p role="status">{message}</p>}

        <button
          type="button"
          onClick={() => {
            setIsSignup(!isSignup)
            setMessage('')
          }}
        >
          {isSignup
            ? 'Déjà un compte ? Se connecter'
            : "Pas de compte ? S'inscrire"}
        </button>
      </form>
    </div>
  )
}

function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button className="icon-button" aria-label="Fermer" onClick={onClose}><X size={19}/></button></div>{children}</div></div>}
function App(){
 const [session, setSession] = useState<Session | null>(null)
const [authLoading, setAuthLoading] = useState(true)

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session)
    setAuthLoading(false)
  })

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, newSession) => {
      setSession(newSession)
      setAuthLoading(false)
    }
  )

  return () => listener.subscription.unsubscribe()
}, [])
const [data, setData] = useState<AppData>(demoData)
const [dataLoading, setDataLoading] = useState(true)
 const [page,setPage]=useState<Page>('dashboard')
 const [mobileOpen,setMobileOpen]=useState(false)
 const [modal,setModal]=useState<'task'|'habit'|'event'|null>(null)
 const [editing,setEditing]=useState<string|null>(null)
 const [pendingDelete,setPendingDelete]=useState<{type:'task'|'habit'|'event';id:string}|null>(null)
 const [backupOpen,setBackupOpen]=useState(false)
 const [restorePreview,setRestorePreview]=useState<AppData|null>(null)
 const [backupError,setBackupError]=useState('')
 const [selectedDate,setSelectedDate]=useState(todayKey())
 const [visibleMonth,setVisibleMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1))
 const [taskFilter,setTaskFilter]=useState<'Toutes'|'À faire'|'Terminées'>('Toutes')
 const [formTitle,setFormTitle]=useState('')
 const [formCategory,setFormCategory]=useState('Travail')
 const [formPeriod,setFormPeriod]=useState<Period>('Matin')
 const [formPriority,setFormPriority]=useState<Task['priority']>('Moyen')
 const [formDate,setFormDate]=useState(todayKey())
 const [formTime,setFormTime]=useState('09:00')
 
const loadedUserId = useRef<string | null>(null)

useEffect(() => {
  const userId = session?.user?.id

  if (!userId) {
    loadedUserId.current = null
    setDataLoading(true)
    return
  }

  let cancelled = false
  loadedUserId.current = null
  setDataLoading(true)

  async function loadUserData() {
    const { data: saved, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle()

    if (cancelled) return

    if (error) {
      console.error('Erreur de chargement Supabase :', error)
      return
    }

    setData(saved?.data ? (saved.data as AppData) : demoData)
    loadedUserId.current = userId ?? null
    setDataLoading(false)
  }

  void loadUserData()

  return () => {
    cancelled = true
  }
}, [session?.user?.id])

useEffect(() => {
  const userId = session?.user?.id
  if (dataLoading || !userId || loadedUserId.current !== userId) return

  const timer = window.setTimeout(async () => {
    const { error } = await supabase
      .from('user_data')
      .upsert({
        user_id: userId,
        data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('Erreur de sauvegarde Supabase :', error)
    }
  }, 1000)

  return () => window.clearTimeout(timer)
}, [data, dataLoading, session?.user?.id])

 const completed=data.completedHabits[todayKey()]||[]
 const habitsDone=data.habits.filter(h=>completed.includes(h.id)).length
 const todaysTasks=data.tasks.filter(t=>t.date===todayKey())
 const doneTasks=todaysTasks.filter(t=>t.done).length
 const taskProgress=todaysTasks.length?Math.round(doneTasks/todaysTasks.length*100):0
 const habitProgress=data.habits.length?Math.round(habitsDone/data.habits.length*100):0
 const todayEvents=data.events.filter(e=>e.date===todayKey()).sort((a,b)=>a.time.localeCompare(b.time))
 const go=(p:Page)=>{setPage(p);setMobileOpen(false)}
 const toggleHabit=(habitId:string)=>setData(prev=>{const key=todayKey();const now=prev.completedHabits[key]||[];return {...prev,completedHabits:{...prev.completedHabits,[key]:now.includes(habitId)?now.filter(i=>i!==habitId):[...now,habitId]}}})
 const [draggedHabitId,setDraggedHabitId]=useState<string|null>(null)
 const moveHabit=(habitId:string,targetPeriod:Period,targetId?:string)=>{
  setData(prev=>{
   const habit=prev.habits.find(h=>h.id===habitId)
   if(!habit)return prev
   const remaining=prev.habits.filter(h=>h.id!==habitId)
   const moved={...habit,period:targetPeriod}
   const index=targetId?remaining.findIndex(h=>h.id===targetId):-1
   if(index>=0)remaining.splice(index,0,moved)
   else{
    const last=remaining.reduce((n,h,i)=>h.period===targetPeriod?i:n,-1)
    remaining.splice(last+1,0,moved)
   }
   return {...prev,habits:remaining}
  })
 }
 const shiftHabit=(habitId:string,direction:-1|1)=>{
  setData(prev=>{
   const current=prev.habits.find(h=>h.id===habitId)
   if(!current)return prev
   const siblings=prev.habits.filter(h=>h.period===current.period)
   const pos=siblings.findIndex(h=>h.id===habitId)
   const other=siblings[pos+direction]
   if(!other)return prev
   const next=[...prev.habits],a=next.findIndex(h=>h.id===habitId),b=next.findIndex(h=>h.id===other.id)
   ;[next[a],next[b]]=[next[b],next[a]]
   return {...prev,habits:next}
  })
 }
 const toggleTask=(taskId:string)=>setData(prev=>({...prev,tasks:prev.tasks.map(t=>t.id===taskId?{...t,done:!t.done}:t)}))
 const openAdd=(type:'task'|'habit'|'event',date=todayKey())=>{setEditing(null);setFormTitle('');setFormCategory('Travail');setFormPeriod('Matin');setFormPriority('Moyen');setFormDate(date);setFormTime('09:00');setModal(type)}
 const openEdit=(type:'task'|'habit'|'event',record:Task|Habit|Event)=>{setEditing(record.id);setFormTitle(record.title);setFormCategory(record.category);if('period'in record)setFormPeriod(record.period);if('priority'in record)setFormPriority(record.priority);if('date'in record)setFormDate(record.date);if('time'in record)setFormTime(record.time);setModal(type)}
 const submit=(e:FormEvent)=>{e.preventDefault();if(!formTitle.trim()||!modal)return;const title=formTitle.trim();if(modal==='habit'){setData(prev=>({...prev,habits:editing?prev.habits.map(h=>h.id===editing?{...h,title,period:formPeriod,category:formCategory}:h):[...prev.habits,{id:id(),title,period:formPeriod,category:formCategory}]}))}if(modal==='task'){setData(prev=>({...prev,tasks:editing?prev.tasks.map(t=>t.id===editing?{...t,title,date:formDate,priority:formPriority,category:formCategory}:t):[...prev.tasks,{id:id(),title,date:formDate,priority:formPriority,category:formCategory,done:false}]}))}if(modal==='event'){setData(prev=>({...prev,events:editing?prev.events.map(ev=>ev.id===editing?{...ev,title,date:formDate,time:formTime,category:formCategory}:ev):[...prev.events,{id:id(),title,date:formDate,time:formTime,category:formCategory}]}))}setModal(null)}
 const deleteItem=(type:'task'|'habit'|'event',itemId:string)=>setPendingDelete({type,id:itemId})
 const confirmDelete=()=>{if(!pendingDelete)return;const {type,id:itemId}=pendingDelete;setData(prev=>type==='task'?{...prev,tasks:prev.tasks.filter(t=>t.id!==itemId)}:type==='event'?{...prev,events:prev.events.filter(e=>e.id!==itemId)}:{...prev,habits:prev.habits.filter(h=>h.id!==itemId)});setPendingDelete(null);setModal(null)}
 const openBackup=()=>{setBackupError('');setRestorePreview(null);setBackupOpen(true);setMobileOpen(false)}
 const closeBackup=()=>{setBackupOpen(false);setRestorePreview(null);setBackupError('')}
 const exportBackup=()=>{
  try{
   const file={format:'forma-backup',version:1,exportedAt:new Date().toISOString(),data}
   const url=URL.createObjectURL(new Blob([JSON.stringify(file,null,2)],{type:'application/json'}))
   const a=document.createElement('a');a.href=url;a.download=`forma-sauvegarde-${todayKey()}.json`;document.body.appendChild(a);a.click();a.remove()
   window.setTimeout(()=>URL.revokeObjectURL(url),1000);setBackupError('')
  }catch{setBackupError('Impossible de créer le fichier de sauvegarde. Réessayez.')}
 }
 const readBackup=async(file:File|undefined)=>{
  setRestorePreview(null);setBackupError('')
  if(!file)return
  if(file.size>5*1024*1024){setBackupError('Fichier trop volumineux (maximum 5 Mo).');return}
  try{
   const parsed:unknown=JSON.parse(await file.text())
   if(!parsed||typeof parsed!=='object'||!('format'in parsed)||parsed.format!=='forma-backup'||!('version'in parsed)||parsed.version!==1||!('data'in parsed)||!isAppData(parsed.data))throw Error('invalid backup')
   setRestorePreview(parsed.data)
  }catch{setBackupError('Fichier non reconnu. Choisissez une sauvegarde Forma au format JSON.')}
 }
 const restoreBackup=()=>{
  if(!restorePreview)return
  try{
   const previous=localStorage.getItem('forma-v1-data')
   if(previous)localStorage.setItem('forma-v1-pre-restore',previous)
   localStorage.setItem('forma-v1-data',JSON.stringify(restorePreview))
   setData(restorePreview);closeBackup()
  }catch{setBackupError('Restauration impossible : stockage indisponible ou plein. Aucune donnée modifiée.')}
 }
 const displayedTasks=useMemo(()=>data.tasks.filter(t=>taskFilter==='Toutes'||(taskFilter==='Terminées'?t.done:!t.done)).sort((a,b)=>a.date.localeCompare(b.date)),[data.tasks,taskFilter])
 const monthDays=useMemo(()=>{const first=new Date(visibleMonth.getFullYear(),visibleMonth.getMonth(),1);const offset=(first.getDay()+6)%7;return Array.from({length:42},(_,i)=>new Date(first.getFullYear(),first.getMonth(),1-offset+i))},[visibleMonth])
 const selectedEvents=data.events.filter(e=>e.date===selectedDate).sort((a,b)=>a.time.localeCompare(b.time))
 const selectedTasks=data.tasks.filter(t=>t.date===selectedDate)
 if (authLoading) {
  return <div>Chargement de Forma...</div>
}
 if (!session) {
  return <AuthScreen />
}
 return <div className="app-shell">
  {mobileOpen&&<button className="mobile-overlay" onClick={()=>setMobileOpen(false)} aria-label="Fermer la navigation"/>}
  <aside className={`sidebar ${mobileOpen?'sidebar-open':''}`}><div className="brand"><div className="brand-mark"><LayoutGrid size={20} strokeWidth={2.5}/></div><span>forma<span className="brand-dot">.</span></span></div><p className="sidebar-label">ESPACE PERSONNEL</p><nav className="nav">{nav.map(item=><button key={item.id} className={`nav-item ${page===item.id?'active':''}`} onClick={()=>go(item.id)}><item.icon size={19} strokeWidth={page===item.id?2.3:1.9}/><span>{item.label}</span>{page===item.id&&<span className="active-pin"/>}</button>)}</nav><div className="sidebar-bottom"><button className="backup-sidebar-btn" onClick={openBackup}><ShieldCheck size={18}/> Sauvegarder mes données</button><div className="tip-card"><div className="tip-icon"><Sparkles size={17}/></div><strong>Un peu chaque jour.</strong><p>La régularité transforme les petits efforts en grandes avancées.</p></div><div className="profile"><div className="avatar">M</div><div><strong>Mon espace</strong><small>Version personnelle</small></div><MoreHorizontal size={19}/></div></div></aside>
  <nav className="bottom-nav" aria-label="Navigation principale">{nav.map(item=><button key={item.id} className={page===item.id?"selected":""} onClick={()=>go(item.id)} aria-current={page===item.id?"page":undefined}><item.icon size={21}/><span>{item.id==="dashboard"?"Accueil":item.id==="habits"?"Habitudes":item.id==="tasks"?"Tâches":"Agenda"}</span></button>)}</nav>
  <div className="main-wrap"><header className="topbar"><button className="mobile-menu icon-button" aria-label="Ouvrir la navigation" onClick={()=>setMobileOpen(true)}><Menu size={22}/></button><div className="breadcrumbs">Mon espace <ChevronRight size={15}/><strong>{nav.find(n=>n.id===page)?.label}</strong></div><div className="topbar-right"><span className="today-pill"><span className="green-dot"/>{frDate(new Date(),{day:'numeric',month:'long',year:'numeric'})}</span><button type="button" className="top-avatar backup-avatar" onClick={openBackup} aria-label="Sauvegarder ou restaurer mes données" title="Sauvegarde">M</button></div></header>
  <main className="content">
  {page==='dashboard'&&<><section className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line"/> VOTRE QUOTIDIEN, EN MIEUX</div><h1>Bonjour, belle journée <span className="wave">✳</span></h1><p>Chaque petite action vous rapproche de vos objectifs.</p></div><button className="primary-btn" onClick={()=>openAdd('task')}><Plus size={18}/> Nouvelle tâche</button></section>
  <div className="stat-grid"><div className="stat-card"><div className="stat-top"><span>Habitudes du jour</span><span className="stat-symbol violet"><Repeat2 size={20}/></span></div><div className="stat-number">{habitsDone}<span> / {data.habits.length}</span></div><div className="meter"><div style={{width:`${habitProgress}%`}}/></div><small>{habitProgress}% de vos habitudes réalisées</small></div><div className="stat-card"><div className="stat-top"><span>Tâches terminées</span><span className="stat-symbol green"><CircleCheck size={20}/></span></div><div className="stat-number">{doneTasks}<span> / {todaysTasks.length}</span></div><div className="meter green-meter"><div style={{width:`${taskProgress}%`}}/></div><small>{taskProgress}% des tâches du jour</small></div><div className="stat-card"><div className="stat-top"><span>Au programme</span><span className="stat-symbol orange"><CalendarDays size={20}/></span></div><div className="stat-number">{todayEvents.length}<span> activité{todayEvents.length!==1?'s':''}</span></div><div className="stat-hint"><Clock3 size={14}/> Planifiées aujourd'hui</div></div></div>
  <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><h2>Mes habitudes</h2><p>Gardez le rythme, un jour à la fois.</p></div><button className="text-action" onClick={()=>go('habits')}>Tout voir <ArrowRight size={16}/></button></div><div className="habit-list">{data.habits.slice(0,5).map(h=><div className="habit-row" key={h.id}><IconBadge category={h.category}/><div className="item-copy"><strong className={completed.includes(h.id)?'completed':''}>{h.title}</strong><small>{h.period} · {h.category}</small></div><button className={`check-btn ${completed.includes(h.id)?'checked':''}`} onClick={()=>toggleHabit(h.id)} aria-label={`${completed.includes(h.id)?'Décocher':'Cocher'} ${h.title}`}>{completed.includes(h.id)&&<Check size={16}/>}</button></div>)}{data.habits.length===0&&<Empty message="Aucune habitude pour le moment."/>}</div><button className="bottom-link" onClick={()=>openAdd('habit')}><Plus size={16}/> Ajouter une habitude</button></section>
  <section className="panel"><div className="panel-heading"><div><h2>Priorités du jour</h2><p>Concentrez-vous sur l'essentiel.</p></div><button className="text-action" onClick={()=>go('tasks')}>Tout voir <ArrowRight size={16}/></button></div><div className="task-list">{todaysTasks.map(t=><div className="task-row" key={t.id}><button className={`check-btn ${t.done?'checked':''}`} onClick={()=>toggleTask(t.id)} aria-label={`${t.done?'Rouvrir':'Terminer'} ${t.title}`}>{t.done&&<Check size={16}/>}</button><div className="item-copy"><strong className={t.done?'completed':''}>{t.title}</strong><small>{t.category}</small></div><span className={`priority priority-${t.priority.toLowerCase()}`}>{t.priority}</span></div>)}{todaysTasks.length===0&&<Empty message="Aucune tâche prévue aujourd'hui."/>}</div><button className="bottom-link" onClick={()=>openAdd('task')}><Plus size={16}/> Ajouter une tâche</button></section></div>
  <section className="panel agenda-panel"><div className="panel-heading"><div><h2>Votre programme</h2><p>Les prochaines activités de la journée.</p></div><button className="text-action" onClick={()=>go('calendar')}>Calendrier <ArrowRight size={16}/></button></div><div className="agenda-row">{todayEvents.length?todayEvents.map(ev=><div className="agenda-item" key={ev.id}><span className="agenda-time">{ev.time}</span><span className={`agenda-stripe ${categoryClass[ev.category]||'lavender'}`}/><div><strong>{ev.title}</strong><small>{ev.category}</small></div></div>):<Empty message="Pas encore d'activité aujourd'hui."/>}</div></section></>}
  {page==='habits'&&<><section className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line"/> CRÉEZ VOTRE ROUTINE</div><h1>Mes habitudes</h1><p>Vos rituels, à votre rythme. Cochez ou décochez à tout moment.</p></div><button className="primary-btn" onClick={()=>openAdd('habit')}><Plus size={18}/> Nouvelle habitude</button></section><div className="wide-progress"><div><strong>Progression du jour</strong><p>{habitsDone} habitude{habitsDone!==1?'s':''} sur {data.habits.length} réalisée{habitsDone!==1?'s':''}</p></div><div className="progress-right"><strong>{habitProgress}%</strong><div className="meter"><div style={{width:`${habitProgress}%`}}/></div></div></div><div className="period-grid">{periods.map(period=><section className="panel period-panel" key={period.name} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(draggedHabitId)moveHabit(draggedHabitId,period.name);setDraggedHabitId(null)}}><div className="period-heading"><span className="period-icon"><period.icon size={19}/></span><div><h2>{period.name}</h2><small>{period.time}</small></div></div>{data.habits.filter(h=>h.period===period.name).map(h=><div className="habit-row" key={h.id} draggable onDragStart={e=>{e.dataTransfer.effectAllowed='move';setDraggedHabitId(h.id)}} onDragEnd={()=>setDraggedHabitId(null)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();e.stopPropagation();if(draggedHabitId&&draggedHabitId!==h.id)moveHabit(draggedHabitId,period.name,h.id);setDraggedHabitId(null)}}><button className={`check-btn ${completed.includes(h.id)?'checked':''}`} onClick={()=>toggleHabit(h.id)} aria-label={`${completed.includes(h.id)?'Décocher':'Cocher'} ${h.title}`}>{completed.includes(h.id)&&<Check size={15}/>}</button><div className="item-copy"><strong className={completed.includes(h.id)?'completed':''}>{h.title}</strong><small>{h.category}</small></div><button type="button" className="small-icon" title="Monter" aria-label={`Monter ${h.title}`} onClick={()=>shiftHabit(h.id,-1)}>↑</button><button type="button" className="small-icon" title="Descendre" aria-label={`Descendre ${h.title}`} onClick={()=>shiftHabit(h.id,1)}>↓</button><button className="small-icon" title="Modifier" aria-label={`Modifier ${h.title}`} onClick={()=>openEdit('habit',h)}><Pencil size={15}/></button><button className="small-icon" title="Supprimer" aria-label={`Supprimer ${h.title}`} onClick={()=>deleteItem('habit',h.id)}><Trash2 size={15}/></button></div>)}{!data.habits.some(h=>h.period===period.name)&&<Empty message="Aucune habitude ici."/>}<button className="bottom-link" onClick={()=>{openAdd('habit');setFormPeriod(period.name)}}><Plus size={16}/> Ajouter</button></section>)}</div></>}
  {page==='tasks'&&<><section className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line"/> FAITES PLACE À L'ESSENTIEL</div><h1>Mes tâches</h1><p>Capturez vos idées, planifiez vos actions, avancez sereinement.</p></div><button className="primary-btn" onClick={()=>openAdd('task')}><Plus size={18}/> Nouvelle tâche</button></section><section className="panel tasks-panel"><div className="list-toolbar"><div className="filter-tabs">{(['Toutes','À faire','Terminées'] as const).map(f=><button key={f} className={taskFilter===f?'selected':''} onClick={()=>setTaskFilter(f)}>{f}</button>)}</div><span className="count-label">{displayedTasks.length} tâche{displayedTasks.length!==1?'s':''}</span></div><div className="full-task-list">{displayedTasks.map(t=><div className="full-task" key={t.id}><button className={`check-btn ${t.done?'checked':''}`} onClick={()=>toggleTask(t.id)} aria-label={`${t.done?'Rouvrir':'Terminer'} ${t.title}`}>{t.done&&<Check size={16}/>}</button><IconBadge category={t.category}/><div className="item-copy"><strong className={t.done?'completed':''}>{t.title}</strong><small>{t.category} · {frDate(makeDate(t.date),{day:'numeric',month:'short',year:'numeric'})}</small></div><span className={`priority priority-${t.priority.toLowerCase()}`}>{t.priority}</span><button className="small-icon" aria-label={`Modifier ${t.title}`} onClick={()=>openEdit('task',t)}><Pencil size={17}/></button><button className="small-icon" aria-label={`Supprimer ${t.title}`} onClick={()=>deleteItem('task',t.id)}><Trash2 size={17}/></button></div>)}{displayedTasks.length===0&&<Empty message="Aucune tâche dans cette catégorie."/>}</div></section></>}
  {page==='calendar'&&<><section className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line"/> UNE VUE SUR VOTRE TEMPS</div><h1>Calendrier</h1><p>Planifiez vos activités et retrouvez tout votre programme.</p></div><button className="primary-btn" onClick={()=>openAdd('event',selectedDate)}><Plus size={18}/> Nouvelle activité</button></section><div className="calendar-layout"><section className="panel calendar-panel"><div className="calendar-header"><h2>{frDate(visibleMonth,{month:'long',year:'numeric'})}</h2><div className="calendar-controls"><button onClick={()=>{const d=new Date();setVisibleMonth(new Date(d.getFullYear(),d.getMonth(),1));setSelectedDate(todayKey())}}>Aujourd'hui</button><button aria-label="Mois précédent" onClick={()=>setVisibleMonth(new Date(visibleMonth.getFullYear(),visibleMonth.getMonth()-1,1))}><ChevronLeft size={20}/></button><button aria-label="Mois suivant" onClick={()=>setVisibleMonth(new Date(visibleMonth.getFullYear(),visibleMonth.getMonth()+1,1))}><ChevronRight size={20}/></button></div></div><div className="calendar-weekdays">{['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=><span key={d}>{d}</span>)}</div><div className="calendar-days">{monthDays.map(d=>{const key=dateKey(d);const isCurrent=d.getMonth()===visibleMonth.getMonth();const events=data.events.filter(e=>e.date===key).length;const tasks=data.tasks.filter(t=>t.date===key).length;return <button key={key} className={`calendar-day ${isCurrent?'':'outside'} ${key===todayKey()?'is-today':''} ${key===selectedDate?'is-selected':''}`} onClick={()=>{setSelectedDate(key);if(!isCurrent)setVisibleMonth(new Date(d.getFullYear(),d.getMonth(),1))}}><span>{d.getDate()}</span>{events+tasks>0&&<div className="date-dots">{events>0&&<i className="dot-purple"/>}{tasks>0&&<i className="dot-green"/>}</div>}</button>})}</div><div className="calendar-legend"><span><i className="dot-purple"/> Activités</span><span><i className="dot-green"/> Tâches</span></div></section><section className="panel selected-panel"><div className="panel-heading"><div><h2>{frDate(makeDate(selectedDate),{weekday:'long',day:'numeric',month:'long'})}</h2><p>Votre planning du jour</p></div></div><div className="schedule-block"><div className="schedule-subtitle">ACTIVITÉS</div>{selectedEvents.map(ev=><div className="schedule-item" key={ev.id}><span className="schedule-time">{ev.time}</span><span className={`agenda-stripe ${categoryClass[ev.category]||'lavender'}`}/><div><strong>{ev.title}</strong><small>{ev.category}</small></div><button className="small-icon" aria-label={`Modifier ${ev.title}`} onClick={()=>openEdit('event',ev)}><Pencil size={15}/></button><button className="small-icon" aria-label={`Supprimer ${ev.title}`} onClick={()=>deleteItem('event',ev.id)}><Trash2 size={15}/></button></div>)}{selectedEvents.length===0&&<Empty message="Aucune activité prévue."/>}<button className="bottom-link" onClick={()=>openAdd('event',selectedDate)}><Plus size={16}/> Ajouter une activité</button></div><div className="schedule-block"><div className="schedule-subtitle">TÂCHES</div>{selectedTasks.map(t=><div className="schedule-item" key={t.id}><button className={`check-btn ${t.done?'checked':''}`} onClick={()=>toggleTask(t.id)} aria-label={`${t.done?'Rouvrir':'Terminer'} ${t.title}`}>{t.done&&<Check size={14}/>}</button><div className="item-copy"><strong className={t.done?'completed':''}>{t.title}</strong><small>{t.category}</small></div></div>)}{selectedTasks.length===0&&<Empty message="Aucune tâche ce jour-là."/>}<button className="bottom-link" onClick={()=>openAdd('task',selectedDate)}><Plus size={16}/> Ajouter une tâche</button></div></section></div></>}
  </main></div>
  {backupOpen&&<Modal title="Mes sauvegardes" onClose={closeBackup}><div className="backup-panel"><p className="backup-lead">Vos données sont actuellement enregistrées sur cet appareil. Gardez une copie pour éviter de les perdre.</p><div className="backup-stat"><ShieldCheck size={20}/><span><strong>{data.habits.length} habitudes · {data.tasks.length} tâches · {data.events.length} activités</strong><small>Votre progression quotidienne est également incluse.</small></span></div><button type="button" className="backup-action backup-export" onClick={exportBackup}><Download size={19}/><span><strong>Exporter ma sauvegarde</strong><small>Télécharger un fichier Forma (.json)</small></span></button><label className="backup-action backup-import"><Upload size={19}/><span><strong>Importer une sauvegarde</strong><small>Choisir un fichier Forma (.json)</small></span><input type="file" accept=".json,application/json" onChange={e=>{void readBackup(e.target.files?.[0]);e.target.value=''}}/></label>{backupError&&<p role="alert" className="backup-error">{backupError}</p>}{restorePreview&&<div className="backup-preview"><strong>Sauvegarde prête à restaurer</strong><p>{restorePreview.habits.length} habitudes · {restorePreview.tasks.length} tâches · {restorePreview.events.length} activités</p><p>Attention : la restauration remplacera les données actuelles de cet appareil.</p><div className="backup-actions"><button type="button" className="delete-cancel" onClick={()=>setRestorePreview(null)}>Annuler</button><button type="button" className="backup-confirm" onClick={restoreBackup}>Restaurer mes données</button></div></div>}<p className="backup-footnote">Ce fichier reste sous votre contrôle. La synchronisation entre appareils n'est pas encore disponible.</p></div></Modal>}
  {pendingDelete&&<Modal title="Confirmer la suppression" onClose={()=>setPendingDelete(null)}><div className="delete-confirm"><div className="delete-confirm-icon"><Trash2 size={22}/></div><p>Supprimer cet élément ?</p><span>Cette action est irréversible.</span><div className="delete-confirm-actions"><button type="button" className="delete-cancel" onClick={()=>setPendingDelete(null)}>Annuler</button><button type="button" className="delete-danger" onClick={confirmDelete}>Supprimer</button></div></div></Modal>}
  {modal&&<Modal title={`${editing?'Modifier':'Ajouter'} ${modal==='habit'?'une habitude':modal==='task'?'une tâche':'une activité'}`} onClose={()=>setModal(null)}><form onSubmit={submit} className="modal-form"><label>Nom<input autoFocus maxLength={100} required placeholder={modal==='habit'?'Ex. : Méditer 10 minutes':modal==='task'?'Ex. : Préparer la présentation':'Ex. : Séance de sport'} value={formTitle} onChange={e=>setFormTitle(e.target.value)}/></label><label>Catégorie<select value={formCategory} onChange={e=>setFormCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>{modal==='habit'&&<label>Moment de la journée<select value={formPeriod} onChange={e=>setFormPeriod(e.target.value as Period)}>{periods.map(p=><option key={p.name}>{p.name}</option>)}</select></label>}{modal==='task'&&<label>Difficulté<select value={formPriority} onChange={e=>setFormPriority(e.target.value as Task['priority'])}><option>Facile</option><option>Moyen</option><option>Difficile</option></select></label>}{modal!=='habit'&&<label>Date<input type="date" required value={formDate} onChange={e=>setFormDate(e.target.value)}/></label>}{modal==='event'&&<label>Heure<input type="time" required value={formTime} onChange={e=>setFormTime(e.target.value)}/></label>}<div className="form-actions"><button type="button" className="secondary-btn" onClick={()=>setModal(null)}>Annuler</button><button type="submit" className="primary-btn"><Check size={17}/>{editing?'Enregistrer':'Ajouter'}</button></div></form></Modal>}
 </div>
}
export default App
