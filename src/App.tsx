import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, CircleCheck, Users, Flame, Home, LayoutGrid, Menu, MoreHorizontal, GripVertical, ChevronDown, Plus, Repeat2, Settings, Sparkles, Trash2, X, Pencil, Download, Upload, ShieldCheck, Sunrise, Sun, Moon, ListTodo } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { supabase } from './lib/supabase'
import GoalsPage from './GoalsPage'
import SkillSelector from './SkillSelector'
import SkillsPage from './SkillsPage'
import { isAvatarPath } from './avatarStorage'
import { isCharacterAppearance, type CharacterAppearance } from './CharacterPage'
import { isSkillId, type SkillId } from './skillsCatalog'
import SharedGoalsPage from './SharedGoalsPage'
import type { Goal } from './GoalsPage'
import { isValidGoal, progressPercent } from './goalModel'
import { awardXp, awardCompletedGoals, isValidXpLedger, type XpLedger } from './xpEngine'
import { rollOverTasks as advanceDay } from './xpSchedule'
import type { Session } from '@supabase/supabase-js'
type Page = 'dashboard' | 'habits' | 'tasks' | 'calendar' | 'goals' | 'skills'
type Period = 'Matin' | 'Après-midi' | 'Soir'
type Habit = { id:string; title:string; period:Period; category:string; skillIds?:SkillId[]; createdOn?:string }
type Subtask = { id:string; title:string; done:boolean }
type Task = { id:string; subtasks?:Subtask[]; title:string; category:string; date:string; done:boolean; recurring?:boolean; skillIds?:SkillId[]; dueDate?:string; createdOn?:string }
type Event = { id:string; title:string; date:string; time:string; endTime?:string; category:string; repeatDays?:number[] }
type AppData = { habits:Habit[]; tasks:Task[]; taskOrder?:string[]; events:Event[]; goals?:Goal[]; completedHabits:Record<string,string[]>; activityDays?:string[]; xpLedger?:XpLedger; characterAppearance?:CharacterAppearance; avatarPath?:string; avatarUpdatedAt?:string; lastPenaltyCheckDate?:string }
const todayKey = () => dateKey(new Date())
const weekdayOptions=[{day:1,label:'Lun'},{day:2,label:'Mar'},{day:3,label:'Mer'},{day:4,label:'Jeu'},{day:5,label:'Ven'},{day:6,label:'Sam'},{day:0,label:'Dim'}]
function eventOccursOn(event:Event,day:string){return event.date===day||(day>event.date&&Array.isArray(event.repeatDays)&&event.repeatDays.includes(makeDate(day).getDay()))}
function rollOverTasks(value:AppData,today=todayKey()):AppData {return advanceDay(value,today) as AppData}

function dateKey(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function makeDate(s:string){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function addDays(d:Date,n:number){const x=new Date(d);x.setDate(x.getDate()+n);return x}
const frDate=(d:Date,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('fr-FR',options).format(d)
const id=()=>Math.random().toString(36).slice(2,10)
const categories=['Personnel','Travail','Sport','Apprentissage']
const demoData=():AppData=>({
 habits:[{id:'h1',title:'Boire un grand verre d’eau',period:'Matin',category:'Personnel'},{id:'h2',title:'Lire pendant 20 minutes',period:'Matin',category:'Apprentissage'},{id:'h3',title:'Session de travail profond',period:'Après-midi',category:'Travail'},{id:'h4',title:'Faire 30 minutes de sport',period:'Après-midi',category:'Sport'},{id:'h5',title:'Préparer la journée de demain',period:'Soir',category:'Personnel'}],
 tasks:[{id:'t1',title:'Définir les 3 priorités de la semaine',category:'Travail',date:todayKey(),done:false},{id:'t2',title:'Répondre aux messages importants',category:'Travail',date:todayKey(),done:true},{id:'t3',title:'Faire une séance de mobilité',category:'Sport',date:todayKey(),done:false},{id:'t4',title:'Organiser mon espace de travail',category:'Personnel',date:dateKey(addDays(new Date(),1)),done:false}],
 events:[{id:'e1',title:'Focus : projet personnel',date:todayKey(),time:'09:00',category:'Travail'},{id:'e2',title:'Séance de sport',date:todayKey(),time:'18:00',category:'Sport'},{id:'e3',title:'Bilan de la semaine',date:dateKey(addDays(new Date(),3)),time:'17:00',category:'Personnel'}],goals:[],completedHabits:{}
})
function isAppData(value:unknown):value is AppData{
 if(!value||typeof value!=='object')return false
 const d=value as Partial<AppData>
 const validText=(s:unknown)=>typeof s==='string'&&s.length<=200
 const validSkills=(ids:unknown)=>ids===undefined||(Array.isArray(ids)&&ids.length<=19&&ids.every(isSkillId)&&new Set(ids).size===ids.length)
 const validDate=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)
 if(!Array.isArray(d.habits)||!Array.isArray(d.tasks)||!Array.isArray(d.events)||!d.completedHabits||typeof d.completedHabits!=='object'||Array.isArray(d.completedHabits))return false
 if(d.habits.length>10000||d.tasks.length>10000||d.events.length>10000||(d.goals!==undefined&&(!Array.isArray(d.goals)||d.goals.length>10000)))return false
 if(d.goals!==undefined&&!d.goals.every(isValidGoal))return false
 if(d.xpLedger!==undefined&&!isValidXpLedger(d.xpLedger))return false
  if(d.characterAppearance!==undefined&&!isCharacterAppearance(d.characterAppearance))return false
  if(d.avatarPath!==undefined&&!isAvatarPath(d.avatarPath))return false
  if(d.avatarUpdatedAt!==undefined&&typeof d.avatarUpdatedAt!=='string')return false
 if(d.lastPenaltyCheckDate!==undefined&&!validDate(d.lastPenaltyCheckDate))return false
  if(d.activityDays!==undefined&&(!Array.isArray(d.activityDays)||d.activityDays.length>20000||!d.activityDays.every(validDate)))return false
 if(!d.habits.every(h=>h&&validText(h.id)&&validText(h.title)&&validText(h.category)&&['Matin','Après-midi','Soir'].includes(h.period)&&validSkills(h.skillIds)&&(h.createdOn===undefined||validDate(h.createdOn))))return false
 if(d.taskOrder!==undefined&&(!Array.isArray(d.taskOrder)||d.taskOrder.length>10000||!d.taskOrder.every(validText)||new Set(d.taskOrder).size!==d.taskOrder.length))return false
  if(!d.tasks.every(t=>t&&validText(t.id)&&validText(t.title)&&validText(t.category)&&validDate(t.date)&&typeof t.done==='boolean'&&(t.recurring===undefined||typeof t.recurring==='boolean')&&validSkills(t.skillIds)&&(t.subtasks===undefined||(Array.isArray(t.subtasks)&&t.subtasks.length<=100&&t.subtasks.every(st=>st&&validText(st.id)&&validText(st.title)&&typeof st.done==='boolean')))&&(t.dueDate===undefined||validDate(t.dueDate))&&(t.createdOn===undefined||validDate(t.createdOn))))return false
 if(!d.events.every(e=>e&&validText(e.id)&&validText(e.title)&&validText(e.category)&&validDate(e.date)&&typeof e.time==='string'&&/^\d{2}:\d{2}$/.test(e.time)&&(e.endTime===undefined||(typeof e.endTime==='string'&&/^\d{2}:\d{2}$/.test(e.endTime)&&e.endTime>e.time))&&(e.repeatDays===undefined||(Array.isArray(e.repeatDays)&&e.repeatDays.length>0&&e.repeatDays.length<=7&&e.repeatDays.every(day=>Number.isInteger(day)&&day>=0&&day<=6)&&new Set(e.repeatDays).size===e.repeatDays.length))))return false
 return Object.entries(d.completedHabits).every(([day,ids])=>validDate(day)&&Array.isArray(ids)&&ids.every(validText))
}
const nav:{id:Page;label:string;icon:LucideIcon}[]=[{id:'dashboard',label:'Tableau de bord',icon:Home},{id:'habits',label:'Mes habitudes',icon:Repeat2},{id:'tasks',label:'Mes tâches',icon:ListTodo},{id:'goals',label:'Mes objectifs',icon:CircleCheck},{id:'skills',label:'Compétences',icon:Sparkles},{id:'calendar',label:'Calendrier',icon:CalendarDays}]
const categoryClass:Record<string,string>={Personnel:'lavender',Travail:'blue',Sport:'peach',Apprentissage:'mint'}
const periods:{name:Period;icon:LucideIcon;time:string}[]=[{name:'Matin',icon:Sunrise,time:'06:00 — 12:00'},{name:'Après-midi',icon:Sun,time:'12:00 — 18:00'},{name:'Soir',icon:Moon,time:'18:00 — 00:00'}]
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
useEffect(()=>{
 if(dataLoading)return
 const refresh=()=>setData(prev=>rollOverTasks(prev))
 refresh()
 const interval=window.setInterval(refresh,60000)
 window.addEventListener('focus',refresh)
 return ()=>{window.clearInterval(interval);window.removeEventListener('focus',refresh)}
},[dataLoading])

 const [page,setPage]=useState<Page>('dashboard')
 const [goalsTab,setGoalsTab]=useState<'personal'|'shared'>('personal')
 const [mobileOpen,setMobileOpen]=useState(false)
  const [mobileMoreOpen,setMobileMoreOpen]=useState(false)
 const [modal,setModal]=useState<'task'|'habit'|'event'|null>(null)
 const [editing,setEditing]=useState<string|null>(null)
 const [pendingDelete,setPendingDelete]=useState<{type:'task'|'habit'|'event';id:string}|null>(null)
 const [backupOpen,setBackupOpen]=useState(false)
 const [settingsOpen,setSettingsOpen]=useState(false)
 useEffect(()=>{if(!settingsOpen)return;const outside=(e:PointerEvent)=>{if(!(e.target as Element)?.closest?.('[data-forma-settings]'))setSettingsOpen(false)};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setSettingsOpen(false)};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}},[settingsOpen])
 const [restorePreview,setRestorePreview]=useState<AppData|null>(null)
 const [backupError,setBackupError]=useState('')
  const [restoringBackup,setRestoringBackup]=useState(false)
 const [showCalendarTasks,setShowCalendarTasks]=useState(false)
 const [selectedDate,setSelectedDate]=useState(todayKey())
 const [visibleMonth,setVisibleMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1))
 const [taskFilter,setTaskFilter]=useState<'À faire'|'Terminées'>('À faire')
 const [expandedTaskId,setExpandedTaskId]=useState<string|null>(null)
 const [subtaskDraft,setSubtaskDraft]=useState('')
 const [draggedTaskId,setDraggedTaskId]=useState<string|null>(null)
 const [dragTargetId,setDragTargetId]=useState<string|null>(null)
 const [dragPosition,setDragPosition]=useState<{x:number;y:number}|null>(null)
 const [taskMenuId,setTaskMenuId]=useState<string|null>(null)
 const taskDragRef=useRef<{id:string;target:string|null}|null>(null)
 useEffect(()=>{if(!taskMenuId)return;const close=(e:PointerEvent)=>{if(!(e.target as Element)?.closest?.('[data-task-menu]'))setTaskMenuId(null)};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setTaskMenuId(null)};document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape)}},[taskMenuId])
 const [formTitle,setFormTitle]=useState('')
 const [formSkillIds,setFormSkillIds]=useState<SkillId[]>([])
 const [formCategory,setFormCategory]=useState('Travail')
 const [formPeriod,setFormPeriod]=useState<Period>('Matin')
 const [formRecurring,setFormRecurring]=useState(false)
 const [formDate,setFormDate]=useState(todayKey())
 const [formTime,setFormTime]=useState('09:00')
 const [formEndTime,setFormEndTime]=useState('10:00')
 const [formRepeatDays,setFormRepeatDays]=useState<number[]>([])
 
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

    setData(rollOverTasks(saved?.data ? (saved.data as AppData) : demoData()))
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
  const activityDays=new Set([...(data.activityDays||[]),...Object.entries(data.completedHabits).filter(([,ids])=>ids.length>0).map(([day])=>day)])
  const streakEnd=activityDays.has(todayKey())?new Date():addDays(new Date(),-1)
  let activityStreak=0
  for(let day=streakEnd;activityStreak<20000&&activityDays.has(dateKey(day));day=addDays(day,-1))activityStreak++
 const todayEvents=data.events.filter(e=>eventOccursOn(e,todayKey())).sort((a,b)=>a.time.localeCompare(b.time))
 const go=(p:Page)=>{setPage(p);setMobileOpen(false);setMobileMoreOpen(false)}
 const toggleHabit=(habitId:string)=>setData(prev=>{
  const key=todayKey(), now=prev.completedHabits[key]||[]
  const alreadyDone=now.includes(habitId)
  const habit=prev.habits.find(h=>h.id===habitId)
  return {
    ...prev,
    completedHabits:{...prev.completedHabits,[key]:alreadyDone?now.filter(i=>i!==habitId):[...now,habitId]},
     activityDays:alreadyDone?prev.activityDays:Array.from(new Set([...(prev.activityDays||[]),key])),
    xpLedger: !alreadyDone && habit ? awardXp(prev.xpLedger,`habit:${habitId}:${key}`,'habit',habit.skillIds,10) : prev.xpLedger
  }
 })
 const [draggedHabitId,setDraggedHabitId]=useState<string|null>(null)
 const [habitDragPosition,setHabitDragPosition]=useState<{x:number;y:number}|null>(null)
 const [habitDropTarget,setHabitDropTarget]=useState<string|null>(null)
 const habitDragRef=useRef<{id:string;period:Period;targetId?:string}|null>(null)
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
 const startHabitDrag=(e:React.PointerEvent<HTMLButtonElement>,habitId:string)=>{
  if(e.button!==0)return
  e.currentTarget.setPointerCapture(e.pointerId)
  habitDragRef.current={id:habitId,period:data.habits.find(h=>h.id===habitId)?.period||'Matin'}
  setDraggedHabitId(habitId);setHabitDragPosition({x:e.clientX,y:e.clientY})
 }
 const trackHabitDrag=(e:React.PointerEvent<HTMLButtonElement>)=>{
  if(!habitDragRef.current)return
  setHabitDragPosition({x:e.clientX,y:e.clientY})
  const element=document.elementFromPoint(e.clientX,e.clientY)
  const row=element?.closest('[data-habit-row]')
  const section=element?.closest('[data-habit-period]')
  const period=section?.getAttribute('data-habit-period') as Period|null
  if(period){
   habitDragRef.current.period=period
   habitDragRef.current.targetId=row?.getAttribute('data-habit-row')||undefined
   setHabitDropTarget(habitDragRef.current.targetId||period)
  }else{habitDragRef.current.targetId=undefined;setHabitDropTarget(null)}
 }
 const finishHabitDrag=(e:React.PointerEvent<HTMLButtonElement>)=>{
  const drag=habitDragRef.current
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)
  habitDragRef.current=null;setDraggedHabitId(null);setHabitDragPosition(null);setHabitDropTarget(null)
  if(drag&&habitDropTarget&&drag.targetId!==drag.id)moveHabit(drag.id,drag.period,drag.targetId)
 }
  const toggleTask=(taskId:string)=>setData(prev=>{
  const task=prev.tasks.find(t=>t.id===taskId)
  if(!task)return prev
  const key=task.recurring?`task:${task.id}:${task.date}`:`task:${task.id}`
  return {
    ...prev,
    tasks:prev.tasks.map(t=>t.id===taskId?{...t,done:!t.done}:t),
    activityDays:task.done?prev.activityDays:Array.from(new Set([...(prev.activityDays||[]),todayKey()])),
    xpLedger: !task.done ? awardXp(prev.xpLedger,key,'task',task.skillIds,task.recurring?3:10) : prev.xpLedger
  }
 })
 const openAdd=(type:'task'|'habit'|'event',date=todayKey())=>{setEditing(null);setFormTitle('');setFormSkillIds([]);setFormCategory('Travail');setFormPeriod('Matin');setFormRecurring(false);setFormDate(date);setFormTime('09:00');setFormEndTime('10:00');setFormRepeatDays([]);setModal(type)}
 const openEdit=(type:'task'|'habit'|'event',record:Task|Habit|Event)=>{setEditing(record.id);setFormTitle(record.title);setFormSkillIds('skillIds' in record ? (record.skillIds || []) : []);setFormCategory(record.category);if('period'in record)setFormPeriod(record.period);if('recurring'in record)setFormRecurring(Boolean(record.recurring));if('date'in record)setFormDate(record.date);if('time'in record){setFormRepeatDays(record.repeatDays||[]);setFormTime(record.time);const [hours,minutes]=record.time.split(':').map(Number);setFormEndTime(record.endTime||`${String(Math.min(hours+1,23)).padStart(2,'0')}:${String(hours===23?Math.min(minutes+1,59):minutes).padStart(2,'0')}`)}setModal(type)}
 const submit=(e:FormEvent)=>{e.preventDefault();if(!formTitle.trim()||!modal)return;if(modal==='event'&&formEndTime<=formTime)return;const title=formTitle.trim();if(modal==='habit'){setData(prev=>({...prev,habits:editing?prev.habits.map(h=>h.id===editing?{...h,title,period:formPeriod,category:formCategory,skillIds:formSkillIds}:h):[...prev.habits,{id:id(),title,period:formPeriod,category:formCategory,skillIds:formSkillIds,createdOn:todayKey()}]}))}if(modal==='task'){setData(prev=>({...prev,tasks:editing?prev.tasks.map(t=>t.id===editing?{...t,title,date:formDate,dueDate:formDate===t.date?t.dueDate:undefined,recurring:formRecurring,category:formCategory,skillIds:formSkillIds}:t):[...prev.tasks,{id:id(),title,date:formDate,recurring:formRecurring,category:formCategory,done:false,skillIds:formSkillIds,createdOn:todayKey()}]}))}if(modal==='event'){setData(prev=>({...prev,events:editing?prev.events.map(ev=>ev.id===editing?{...ev,title,date:formDate,time:formTime,endTime:formEndTime,repeatDays:formRepeatDays.length?formRepeatDays:undefined,category:formCategory}:ev):[...prev.events,{id:id(),title,date:formDate,time:formTime,endTime:formEndTime,category:formCategory,repeatDays:formRepeatDays.length?formRepeatDays:undefined}]}))}setModal(null)}
 const deleteItem=(type:'task'|'habit'|'event',itemId:string)=>setPendingDelete({type,id:itemId})
 const confirmDelete=()=>{if(!pendingDelete)return;const {type,id:itemId}=pendingDelete;setData(prev=>type==='task'?{...prev,tasks:prev.tasks.filter(t=>t.id!==itemId)}:type==='event'?{...prev,events:prev.events.filter(e=>e.id!==itemId)}:{...prev,habits:prev.habits.filter(h=>h.id!==itemId)});setPendingDelete(null);setModal(null)}
 const openBackup=()=>{setBackupError('');setRestorePreview(null);setBackupOpen(true);setSettingsOpen(false);setMobileOpen(false)}
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
 const restoreBackup=async()=>{
  if(!restorePreview||restoringBackup||!session?.user?.id)return
  setRestoringBackup(true)
  setBackupError('')
  try{
   const restored=restorePreview
   const {error}=await supabase.from('user_data').upsert({
    user_id:session.user.id,
    data:restored,
    updated_at:new Date().toISOString()
   },{onConflict:'user_id'})
   if(error)throw error
   setData(restored)
   closeBackup()
  }catch(error){
   console.error('Erreur de restauration Supabase :',error)
   setBackupError('Restauration impossible : la sauvegarde n’a pas été enregistrée. Vérifiez votre connexion et réessayez.')
  }finally{setRestoringBackup(false)}
 }
 const displayedTasks=useMemo(()=>data.tasks.filter(t=>taskFilter==='Terminées'?t.done:!t.done).sort((a,b)=>{const order=data.taskOrder||data.tasks.map(t=>t.id);return order.indexOf(a.id)-order.indexOf(b.id)}),[data.tasks,data.taskOrder,taskFilter])
 const reorderTask=(sourceId:string,targetId:string)=>setData(prev=>{
  const order=[...(prev.taskOrder||prev.tasks.map(t=>t.id)).filter(id=>prev.tasks.some(t=>t.id===id))]
  const from=order.indexOf(sourceId),to=order.indexOf(targetId)
  if(from<0||to<0||from===to)return prev
  order.splice(from,1);order.splice(to,0,sourceId)
  return {...prev,taskOrder:order}
 })
 const beginTaskDrag=(event:React.PointerEvent<HTMLButtonElement>,taskId:string)=>{
  if(event.button!==0)return
  event.currentTarget.setPointerCapture(event.pointerId)
  taskDragRef.current={id:taskId,target:null}
  setDraggedTaskId(taskId)
  setDragPosition({x:event.clientX,y:event.clientY})
  setTaskMenuId(null)
 }
 const updateTaskDrag=(event:React.PointerEvent<HTMLButtonElement>)=>{
  if(!taskDragRef.current)return
  setDragPosition({x:event.clientX,y:event.clientY})
  const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-task-row]')?.getAttribute('data-task-row')||null
  taskDragRef.current.target=target
  setDragTargetId(target===taskDragRef.current.id?null:target)
 }
 const finishTaskDrag=(event:React.PointerEvent<HTMLButtonElement>)=>{
  const drag=taskDragRef.current
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
  taskDragRef.current=null;setDraggedTaskId(null);setDragTargetId(null);setDragPosition(null)
  if(drag?.target&&drag.target!==drag.id)reorderTask(drag.id,drag.target)
 }
  const addSubtask=(taskId:string)=>{const title=subtaskDraft.trim();if(!title)return;setData(prev=>({...prev,tasks:prev.tasks.map(t=>t.id===taskId?{...t,subtasks:[...(t.subtasks||[]),{id:id(),title,done:false}]}:t)}));setSubtaskDraft('')}
 const toggleSubtask=(taskId:string,subtaskId:string)=>setData(prev=>{
  const task=prev.tasks.find(t=>t.id===taskId)
  if(!task)return prev
  const subtasks=(task.subtasks||[]).map(st=>st.id===subtaskId?{...st,done:!st.done}:st)
  const complete=subtasks.length>0&&subtasks.every(st=>st.done)
  const newlyCompleted=complete&&!task.done
  const key=task.recurring?`task:${task.id}:${task.date}`:`task:${task.id}`
  return {...prev,tasks:prev.tasks.map(t=>t.id===taskId?{...t,subtasks,done:complete}:t),
   activityDays:newlyCompleted?Array.from(new Set([...(prev.activityDays||[]),todayKey()])):prev.activityDays,
   xpLedger:newlyCompleted?awardXp(prev.xpLedger,key,'task',task.skillIds,task.recurring?3:10):prev.xpLedger}
 })
 const removeSubtask=(taskId:string,subtaskId:string)=>setData(prev=>({...prev,tasks:prev.tasks.map(t=>t.id===taskId?{...t,subtasks:(t.subtasks||[]).filter(st=>st.id!==subtaskId)}:t)}))
 const monthDays=useMemo(()=>{const first=new Date(visibleMonth.getFullYear(),visibleMonth.getMonth(),1);const offset=(first.getDay()+6)%7;return Array.from({length:42},(_,i)=>new Date(first.getFullYear(),first.getMonth(),1-offset+i))},[visibleMonth])
 const selectedEvents=data.events.filter(e=>eventOccursOn(e,selectedDate)).sort((a,b)=>a.time.localeCompare(b.time))
 const selectedCalendarTasks=showCalendarTasks?data.tasks.filter(t=>t.date===selectedDate):[]
 if (authLoading) {
  return <div>Chargement de Forma...</div>
}
 if (!session) {
  return <AuthScreen />
}
 return <div className="app-shell">
  {mobileOpen&&<button className="mobile-overlay" onClick={()=>setMobileOpen(false)} aria-label="Fermer la navigation"/>}
  <aside className={`sidebar ${mobileOpen?'sidebar-open':''}`}><button type="button" className="brand" onClick={()=>go('dashboard')} aria-label="Forma — revenir à l’accueil" title="Accueil" style={{width:'100%',background:'transparent',border:0,color:'inherit',textAlign:'left',cursor:'pointer',font:'inherit'}}><div className="brand-mark"><LayoutGrid size={20} strokeWidth={2.5}/></div><span>forma<span className="brand-dot">.</span></span></button><p className="sidebar-label">ESPACE PERSONNEL</p><nav className="nav">{nav.map(item=><button key={item.id} className={`nav-item ${page===item.id?'active':''}`} onClick={()=>go(item.id)}><item.icon size={19} strokeWidth={page===item.id?2.3:1.9}/><span>{item.label}</span>{page===item.id&&<span className="active-pin"/>}</button>)}</nav></aside>
  {mobileMoreOpen&&<><button type="button" aria-label="Fermer le menu" onClick={()=>setMobileMoreOpen(false)} style={{position:'fixed',inset:0,zIndex:29,border:0,background:'rgba(0,0,0,.35)'}}/><div role="menu" aria-label="Autres pages" style={{position:'fixed',zIndex:31,bottom:'calc(83px + env(safe-area-inset-bottom))',left:16,right:16,maxWidth:420,margin:'0 auto',padding:12,borderRadius:18,background:'#1b2030',border:'1px solid #394054',boxShadow:'0 16px 50px #0007',display:'grid',gap:5}}>
     {nav.filter(item=>!['dashboard','habits','tasks'].includes(item.id)).map(item=><button role="menuitem" key={item.id} onClick={()=>go(item.id)} style={{display:'flex',alignItems:'center',gap:12,color:'#edf0fa',background:page===item.id?'#302745':'transparent',border:0,padding:'14px 16px',borderRadius:12,textAlign:'left',fontSize:14,fontWeight:700}}><item.icon size={19}/>{item.label}</button>)}
   </div></>}
   <nav className="bottom-nav" aria-label="Navigation principale">{nav.filter(item=>['dashboard','habits','tasks'].includes(item.id)).map(item=><button key={item.id} className={page===item.id?"selected":""} onClick={()=>go(item.id)} aria-current={page===item.id?"page":undefined}><item.icon size={21}/><span>{item.id==="dashboard"?"Accueil":item.id==="habits"?"Habitudes":item.id==="tasks"?"Tâches":item.label}</span></button>)}<button type="button" className={mobileMoreOpen||['goals','skills','calendar'].includes(page)?"selected":""} onClick={()=>setMobileMoreOpen(value=>!value)} aria-expanded={mobileMoreOpen} aria-label="Plus de pages"><Menu size={21}/><span>Plus</span></button></nav>
  <div className="main-wrap"><header className="topbar"><button className="mobile-menu icon-button" aria-label="Ouvrir la navigation" onClick={()=>setMobileOpen(true)}><Menu size={22}/></button><div className="breadcrumbs"><strong>{nav.find(n=>n.id===page)?.label}</strong></div><div className="topbar-right"><span className="today-pill"><span className="green-dot"/>{frDate(new Date(),{day:'numeric',month:'long',year:'numeric'})}</span><div data-forma-settings style={{position:'relative'}}><button type="button" className="top-avatar backup-avatar" onClick={()=>setSettingsOpen(v=>!v)} aria-label="Paramètres de Forma" aria-expanded={settingsOpen} title="Paramètres"><Settings size={20}/></button>{settingsOpen&&<div role="menu" aria-label="Paramètres" style={{position:'absolute',right:0,top:'calc(100% + 10px)',zIndex:50,minWidth:225,padding:7,borderRadius:14,background:'#202335',border:'1px solid #42445a',boxShadow:'0 16px 40px #0008'}}><button type="button" role="menuitem" onClick={openBackup} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'12px',background:'transparent',border:0,color:'inherit',fontWeight:600,textAlign:'left',cursor:'pointer',borderRadius:10}}><Download size={17}/> Sauvegarde et restauration</button></div>}</div></div></header>
  <main className="content">
  {page==='skills'&&<SkillsPage ledger={data.xpLedger}/>}
   {page==='dashboard'&&<div style={{display:'grid',gap:16,maxWidth:1120,margin:'0 auto'}}>
<section className="page-intro" style={{marginBottom:0,paddingBottom:0}}><div><h1>Aujourd’hui</h1><p>{frDate(new Date(),{weekday:'long',day:'numeric',month:'long'})}</p></div></section>
<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>
<section className="panel" aria-label="Série de jours actifs" style={{padding:'16px 18px',minWidth:0}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}><span style={{fontSize:13,opacity:.75}}>Ma régularité</span><Flame size={22} color="#fb923c"/></div>
<div style={{fontSize:'clamp(27px,4vw,40px)',fontWeight:800,margin:'8px 0 2px',fontVariantNumeric:'tabular-nums'}}>{activityStreak} <span style={{fontSize:13,fontWeight:500,opacity:.7}}>jour{activityStreak!==1?'s':''}</span></div>
<small style={{opacity:.7}}>Au moins une action par jour</small></section>
<section className="panel" aria-label="Progression des tâches du jour" style={{padding:'16px 18px',minWidth:0}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}><span style={{fontSize:13,opacity:.75}}>Ma journée</span><CircleCheck size={21} color="#a78bfa"/></div>
<div style={{fontSize:'clamp(27px,4vw,40px)',fontWeight:800,margin:'8px 0 8px',fontVariantNumeric:'tabular-nums'}}>{taskProgress}%</div>
<div className="meter" style={{marginBottom:6}}><div style={{width:`${taskProgress}%`}}/></div>
<small style={{opacity:.7}}>{todaysTasks.length?`${doneTasks} tâche${doneTasks!==1?'s':''} sur ${todaysTasks.length}`:'Aucune tâche prévue'}</small></section></div>
<section className="panel agenda-panel" style={{margin:0,minHeight:0}}>
<div className="panel-heading"><div><h2>Programme du jour</h2><p>Les activités de ton calendrier</p></div><button className="text-action" onClick={()=>go('calendar')}>Calendrier <ArrowRight size={16}/></button></div>
<div className="agenda-row" style={{maxHeight:'min(48vh,440px)',overflowY:'auto'}}>{todayEvents.length?todayEvents.map(ev=><div className="agenda-item" key={ev.id}><span className="agenda-time">{ev.time}</span><span className={`agenda-stripe ${categoryClass[ev.category]||'lavender'}`}/><div><strong>{ev.title}</strong><small>{ev.category}{ev.endTime?` · jusqu’à ${ev.endTime}`:''}</small></div></div>):<Empty message="Aucune activité prévue aujourd’hui. Planifie ta journée dans le calendrier."/>}</div>
</section></div>}
   {page==='habits'&&<><section className="page-intro"><div><h1>Mes habitudes</h1></div><button className="primary-btn" onClick={()=>openAdd('habit')}><Plus size={18}/> Nouvelle habitude</button></section><div className="wide-progress"><div><strong>Progression du jour</strong><p>{habitsDone} habitude{habitsDone!==1?'s':''} sur {data.habits.length} réalisée{habitsDone!==1?'s':''}</p></div><div className="progress-right"><strong>{habitProgress}%</strong><div className="meter"><div style={{width:`${habitProgress}%`}}/></div></div></div><div className="period-grid">{periods.map(period=><section className="panel period-panel" key={period.name} data-habit-period={period.name} style={{outline:habitDropTarget===period.name?'2px dashed #a78bfa':undefined}}><div className="period-heading"><span className="period-icon"><period.icon size={19}/></span><div><h2>{period.name}</h2><small>{period.time}</small></div></div>{data.habits.filter(h=>h.period===period.name).map(h=><div className="habit-row" key={h.id} data-habit-row={h.id} style={{opacity:draggedHabitId===h.id?.28:1,outline:habitDropTarget===h.id?'2px dashed #a78bfa':undefined,borderRadius:10,transition:'opacity .15s ease'}}><button type="button" aria-label={`Maintenir et déplacer ${h.title}`} onPointerDown={e=>startHabitDrag(e,h.id)} onPointerMove={trackHabitDrag} onPointerUp={finishHabitDrag} onPointerCancel={()=>{habitDragRef.current=null;setDraggedHabitId(null);setHabitDragPosition(null);setHabitDropTarget(null)}} style={{touchAction:'none',cursor:'grab',padding:'10px 4px',display:'flex',background:'transparent',border:0,color:'#a6a1ba',flexShrink:0}}><GripVertical size={21}/></button><button className={`check-btn ${completed.includes(h.id)?'checked':''}`} onClick={()=>toggleHabit(h.id)} aria-label={`${completed.includes(h.id)?'Décocher':'Cocher'} ${h.title}`}>{completed.includes(h.id)&&<Check size={15}/>}</button><div className="item-copy"><strong className={completed.includes(h.id)?'completed':''}>{h.title}</strong><small>{h.category}</small></div><button className="small-icon" title="Modifier" aria-label={`Modifier ${h.title}`} onClick={()=>openEdit('habit',h)}><Pencil size={15}/></button><button className="small-icon" title="Supprimer" aria-label={`Supprimer ${h.title}`} onClick={()=>deleteItem('habit',h.id)}><Trash2 size={15}/></button></div>)}{!data.habits.some(h=>h.period===period.name)&&<Empty message="Aucune habitude ici."/>}<button className="bottom-link" onClick={()=>{openAdd('habit');setFormPeriod(period.name)}}><Plus size={16}/> Ajouter</button></section>)}</div>{draggedHabitId&&habitDragPosition&&<div aria-hidden="true" style={{position:'fixed',left:habitDragPosition.x+18,top:habitDragPosition.y-24,zIndex:9999,pointerEvents:'none',padding:'12px 18px',borderRadius:14,background:'#302b46',border:'1px solid #9b83ee',boxShadow:'0 16px 40px #0008',color:'#fff',fontWeight:650,maxWidth:'min(75vw,380px)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',transform:'rotate(-2deg) scale(1.03)'}}>{data.habits.find(h=>h.id===draggedHabitId)?.title}</div>}</>}
  {page==='tasks'&&<><section className="page-intro" style={{marginBottom:18}}><div><h1>Mes tâches</h1></div><button className="primary-btn" onClick={()=>openAdd('task')}><Plus size={18}/> Nouvelle tâche</button></section>
<section className="panel tasks-panel" style={{padding:'clamp(14px,3vw,26px)'}}>
<div className="list-toolbar" style={{marginBottom:12,gap:12,flexWrap:'wrap'}}><div className="filter-tabs" role="tablist" aria-label="État des tâches">{(['À faire','Terminées'] as const).map(f=><button type="button" role="tab" aria-selected={taskFilter===f} key={f} className={taskFilter===f?'selected':''} onClick={()=>setTaskFilter(f)}>{f}</button>)}</div><span className="count-label">{displayedTasks.length} tâche{displayedTasks.length!==1?'s':''} {taskFilter==='À faire'?'restante'+(displayedTasks.length!==1?'s':''):'terminée'+(displayedTasks.length!==1?'s':'')}</span></div>
<div style={{display:'grid',gap:6}}>{displayedTasks.map(t=><div key={t.id} data-task-row={t.id} style={{padding:'12px 4px',borderBottom:'1px solid rgba(150,155,180,.14)',minWidth:0,opacity:draggedTaskId===t.id?.28:1,background:dragTargetId===t.id?'rgba(167,139,250,.13)':'transparent',outline:dragTargetId===t.id?'2px dashed rgba(167,139,250,.65)':'2px solid transparent',borderRadius:12,transition:'opacity .15s ease, background .15s ease, outline-color .15s ease'}}><div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
<button type="button" aria-label={`Maintenir et déplacer ${t.title}`} title="Maintenir pour réorganiser" onPointerDown={e=>beginTaskDrag(e,t.id)} onPointerMove={updateTaskDrag} onPointerUp={finishTaskDrag} onPointerCancel={()=>{taskDragRef.current=null;setDraggedTaskId(null)}} style={{touchAction:'none',cursor:'grab',padding:'10px 4px',display:'flex',alignItems:'center',justifyContent:'center',background:'transparent',border:0,color:'#a6a1ba',flexShrink:0}}><GripVertical size={21}/></button><button className={`check-btn ${t.done?'checked':''}`} style={{flexShrink:0}} onClick={()=>toggleTask(t.id)} aria-label={`${t.done?'Rouvrir':'Terminer'} ${t.title}`}>{t.done&&<Check size={16}/>}</button>
<div className="item-copy" style={{flex:'1 1 auto',minWidth:0,display:'grid',gap:4}}><strong className={t.done?'completed':''} style={{overflowWrap:'anywhere',lineHeight:1.35}}>{t.title}</strong><small style={{opacity:.68}}>{t.date===todayKey()?'Aujourd’hui':frDate(makeDate(t.date),{day:'numeric',month:'short'})}{t.recurring?' · ↻ Quotidienne':''}</small></div>
<button type="button" aria-label={`Afficher les sous-tâches de ${t.title}`} aria-expanded={expandedTaskId===t.id} onClick={()=>{setExpandedTaskId(expandedTaskId===t.id?null:t.id);setSubtaskDraft('')}} style={{border:0,background:'transparent',color:'#b9aed9',display:'flex',alignItems:'center',gap:5,padding:'9px 5px',cursor:'pointer',flexShrink:0,fontSize:12}}>{(t.subtasks||[]).length>0&&<span>{(t.subtasks||[]).filter(st=>st.done).length}/{(t.subtasks||[]).length}</span>}<ChevronDown size={18} style={{transform:expandedTaskId===t.id?'rotate(180deg)':'none',transition:'transform .2s'}}/></button><div data-task-menu style={{position:'relative',flexShrink:0}}><button type="button" aria-label={`Options pour ${t.title}`} aria-expanded={taskMenuId===t.id} onClick={()=>setTaskMenuId(taskMenuId===t.id?null:t.id)} style={{cursor:'pointer',border:0,background:'transparent',color:'inherit',padding:'8px',borderRadius:10,display:'flex',alignItems:'center'}}><MoreHorizontal size={21}/></button>{taskMenuId===t.id&&<div style={{position:'absolute',right:0,top:'100%',zIndex:5,background:'#202335',border:'1px solid #42445a',borderRadius:12,padding:6,boxShadow:'0 12px 25px #0005',minWidth:150,display:'grid',gap:3}}><button type="button" onClick={()=>{setTaskMenuId(null);openEdit('task',t)}} style={{display:'flex',alignItems:'center',gap:9,padding:10,border:0,background:'transparent',color:'inherit',textAlign:'left',cursor:'pointer'}}><Pencil size={16}/> Modifier</button><button type="button" onClick={()=>{setTaskMenuId(null);deleteItem('task',t.id)}} style={{display:'flex',alignItems:'center',gap:9,padding:10,border:0,background:'transparent',color:'#fca5a5',textAlign:'left',cursor:'pointer'}}><Trash2 size={16}/> Supprimer</button></div>}</div>
</div>{expandedTaskId===t.id&&<div style={{margin:'8px 0 4px 38px',padding:'12px 14px',borderRadius:14,background:'rgba(120,120,140,.07)',display:'grid',gap:10,border:'1px solid rgba(150,155,180,.10)'}}><strong style={{fontSize:13}}>Sous-tâches · {(t.subtasks||[]).filter(st=>st.done).length}/{(t.subtasks||[]).length}</strong>{(t.subtasks||[]).map(st=><div key={st.id} style={{display:'flex',alignItems:'center',gap:9}}><input type="checkbox" checked={st.done} onChange={()=>toggleSubtask(t.id,st.id)} aria-label={st.title}/><span style={{flex:1,fontSize:13,textDecoration:st.done?'line-through':'none',opacity:st.done?.6:1,overflowWrap:'anywhere'}}>{st.title}</span><button type="button" style={{background:'transparent',border:0,color:'#a8a5b8',padding:8,cursor:'pointer'}} aria-label={`Supprimer la sous-tâche ${st.title}`} onClick={()=>removeSubtask(t.id,st.id)}><Trash2 size={15}/></button></div>)}<form onSubmit={e=>{e.preventDefault();addSubtask(t.id)}} style={{display:'flex',gap:8,minWidth:0}}><input value={subtaskDraft} onChange={e=>setSubtaskDraft(e.target.value)} placeholder="Ajouter une étape…" aria-label="Nouvelle sous-tâche" maxLength={200} style={{flex:1,minWidth:0,padding:'9px 10px',borderRadius:8,background:'transparent',color:'inherit',border:'1px solid rgba(150,155,180,.3)'}}/><button type="submit" disabled={!subtaskDraft.trim()} className="secondary-btn" style={{padding:'8px 12px'}}>Ajouter</button></form></div>}</div>)}{draggedTaskId&&dragPosition&&<div aria-hidden="true" style={{position:'fixed',left:dragPosition.x+18,top:dragPosition.y-24,zIndex:9999,pointerEvents:'none',padding:'12px 18px',borderRadius:14,background:'#302b46',border:'1px solid #9b83ee',boxShadow:'0 16px 40px #0008',color:'#fff',fontWeight:650,maxWidth:'min(75vw,380px)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',transform:'rotate(-2deg) scale(1.03)'}}>{data.tasks.find(t=>t.id===draggedTaskId)?.title}</div>}{displayedTasks.length===0&&<div style={{padding:'30px 12px',textAlign:'center',opacity:.75}}>{taskFilter==='À faire'?'Tout est fait pour le moment.':'Aucune tâche terminée pour le moment.'}</div>}</div></section></>}
   {page==='goals'&&<>
   <div role="tablist" aria-label="Type d'objectifs" style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
    <button type="button" role="tab" aria-selected={goalsTab==='personal'} className={goalsTab==='personal'?'primary-btn':'secondary-btn'} onClick={()=>setGoalsTab('personal')}><CircleCheck size={17}/> Personnels</button>
    <button type="button" role="tab" aria-selected={goalsTab==='shared'} className={goalsTab==='shared'?'primary-btn':'secondary-btn'} onClick={()=>setGoalsTab('shared')}><Users size={17}/> Partagés</button>
   </div>
   {goalsTab==='personal'?<GoalsPage goals={data.goals||[]} onChange={goals=>setData(prev=>{
   const xpLedger=awardCompletedGoals(prev.xpLedger,prev.goals||[],goals,progressPercent)
   return {...prev,goals,xpLedger}
  })}/>:session?.user?<SharedGoalsPage userId={session.user.id}/>:null}
  </>}
  {page==='calendar'&&<><section className="page-intro"><div><h1>Calendrier</h1></div><button className="primary-btn" onClick={()=>openAdd('event',selectedDate)}><Plus size={18}/> Nouvelle activité</button></section><div className="calendar-layout"><section className="panel calendar-panel"><div className="calendar-header"><h2>{frDate(visibleMonth,{month:'long',year:'numeric'})}</h2><div className="calendar-controls"><button onClick={()=>{const d=new Date();setVisibleMonth(new Date(d.getFullYear(),d.getMonth(),1));setSelectedDate(todayKey())}}>Aujourd'hui</button><button aria-label="Mois précédent" onClick={()=>setVisibleMonth(new Date(visibleMonth.getFullYear(),visibleMonth.getMonth()-1,1))}><ChevronLeft size={20}/></button><button aria-label="Mois suivant" onClick={()=>setVisibleMonth(new Date(visibleMonth.getFullYear(),visibleMonth.getMonth()+1,1))}><ChevronRight size={20}/></button></div></div><label style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'8px 2px 16px',fontSize:13,fontWeight:600,cursor:'pointer'}}><span>Afficher mes tâches</span><input type="checkbox" role="switch" checked={showCalendarTasks} onChange={e=>setShowCalendarTasks(e.target.checked)} aria-label="Afficher mes tâches sur le calendrier" style={{width:19,height:19,accentColor:'#a78bfa',cursor:'pointer'}}/></label><div className="calendar-weekdays">{['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=><span key={d}>{d}</span>)}</div><div className="calendar-days">{monthDays.map(d=>{const key=dateKey(d);const isCurrent=d.getMonth()===visibleMonth.getMonth();const dayEvents=data.events.filter(e=>eventOccursOn(e,key)).sort((a,b)=>a.time.localeCompare(b.time));const dayTasks=showCalendarTasks?data.tasks.filter(t=>t.date===key):[];const dayItems=[...dayEvents.map(ev=>({id:'event-'+ev.id,label:`${ev.time}${ev.endTime?'–'+ev.endTime:''} ${ev.title}`,isTask:false,isSport:ev.category==='Sport'})),...dayTasks.map(t=>({id:'task-'+t.id,label:`${t.done?'✓ ':''}${t.title}`,isTask:true,isSport:false}))];return <button key={key} type="button" aria-label={`${frDate(d,{weekday:'long',day:'numeric',month:'long'})}, ${dayItems.length} élément(s)`} className={`calendar-day ${isCurrent?'':'outside'} ${key===todayKey()?'is-today':''} ${key===selectedDate?'is-selected':''}`} style={{minHeight:92,display:'flex',flexDirection:'column',alignItems:'stretch',justifyContent:'flex-start',gap:4,padding:'7px 5px',overflow:'hidden',position:'relative'}} onClick={()=>{setSelectedDate(key);if(!isCurrent)setVisibleMonth(new Date(d.getFullYear(),d.getMonth(),1))}}><span style={{alignSelf:'flex-start',flexShrink:0,position:'relative'}}>{d.getDate()}</span><div style={{display:'flex',flexDirection:'column',gap:3,width:'100%',minWidth:0,overflow:'hidden',position:'relative',flex:'0 1 auto'}}>{dayItems.slice(0,2).map(item=><div key={item.id} title={item.label} style={{display:'block',boxSizing:'border-box',width:'100%',maxWidth:'100%',minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',borderRadius:5,padding:'3px 5px',fontSize:10,fontWeight:600,lineHeight:'13px',textAlign:'left',background:item.isTask?'#dbeafe':item.isSport?'#dcfce7':'#ede9fe',color:item.isTask?'#1d4ed8':item.isSport?'#166534':'#5b21b6',position:'relative',flexShrink:0}}>{item.label}</div>)}{dayItems.length>2&&<div style={{fontSize:10,textAlign:'left',opacity:.7,lineHeight:'13px',flexShrink:0}}>+{dayItems.length-2} autre(s)</div>}</div></button>})}</div><div className="calendar-legend"><span><i className="dot-purple"/> Activités planifiées</span>{showCalendarTasks&&<span><i className="dot-green"/> Tâches</span>}</div></section><section className="panel selected-panel"><div className="panel-heading"><div><h2>{frDate(makeDate(selectedDate),{weekday:'long',day:'numeric',month:'long'})}</h2><p>Votre planning du jour</p></div></div><div className="schedule-block"><div className="schedule-subtitle">ACTIVITÉS</div>{selectedEvents.map(ev=><div className="schedule-item" key={ev.id}><span className="schedule-time">{ev.time}{ev.endTime?` – ${ev.endTime}`:""}</span><span className={`agenda-stripe ${categoryClass[ev.category]||'lavender'}`}/><div><strong>{ev.title}</strong><small>{ev.category}</small></div><button className="small-icon" aria-label={`Modifier ${ev.title}`} onClick={()=>openEdit('event',ev)}><Pencil size={15}/></button><button className="small-icon" aria-label={`Supprimer ${ev.title}`} onClick={()=>deleteItem('event',ev.id)}><Trash2 size={15}/></button></div>)}{selectedEvents.length===0&&<Empty message="Aucune activité prévue."/>}<button className="bottom-link" onClick={()=>openAdd('event',selectedDate)}><Plus size={16}/> Ajouter une activité</button></div>{showCalendarTasks&&<div className="schedule-block"><div className="schedule-subtitle">TÂCHES</div>{selectedCalendarTasks.map(t=><div className="schedule-item" key={t.id}><div><strong>{t.title}</strong><small>{t.done?'Terminée':t.category}</small></div></div>)}{selectedCalendarTasks.length===0&&<Empty message="Aucune tâche prévue."/>}<button className="bottom-link" onClick={()=>openAdd('task',selectedDate)}><Plus size={16}/> Planifier une tâche</button></div>}</section></div></>}
  </main></div>
  {backupOpen&&<Modal title="Mes sauvegardes" onClose={closeBackup}><div className="backup-panel"><p className="backup-lead">Vos données sont synchronisées avec votre compte. Exportez une copie pour disposer d’une sauvegarde indépendante.</p><div className="backup-stat"><ShieldCheck size={20}/><span><strong>{data.habits.length} habitudes · {data.tasks.length} tâches · {data.events.length} activités · {(data.goals||[]).length} objectifs</strong><small>Votre progression quotidienne est également incluse.</small></span></div><button type="button" className="backup-action backup-export" onClick={exportBackup}><Download size={19}/><span><strong>Exporter ma sauvegarde</strong><small>Télécharger un fichier Forma (.json)</small></span></button><label className="backup-action backup-import"><Upload size={19}/><span><strong>Importer une sauvegarde</strong><small>Choisir un fichier Forma (.json)</small></span><input type="file" accept=".json,application/json" onChange={e=>{void readBackup(e.target.files?.[0]);e.target.value=''}}/></label>{backupError&&<p role="alert" className="backup-error">{backupError}</p>}{restorePreview&&<div className="backup-preview"><strong>Sauvegarde prête à restaurer</strong><p>{restorePreview.habits.length} habitudes · {restorePreview.tasks.length} tâches · {restorePreview.events.length} activités</p><p>Attention : la restauration remplacera les données de votre compte sur tous vos appareils.</p><div className="backup-actions"><button type="button" className="delete-cancel" onClick={()=>setRestorePreview(null)}>Annuler</button><button type="button" className="backup-confirm" onClick={()=>{void restoreBackup()}} disabled={restoringBackup}>{restoringBackup?"Restauration…":"Restaurer mes données"}</button></div></div>}<p className="backup-footnote">Ce fichier reste sous votre contrôle. Vos données sont synchronisées via votre compte Supabase.</p></div></Modal>}
  {pendingDelete&&<Modal title="Confirmer la suppression" onClose={()=>setPendingDelete(null)}><div className="delete-confirm"><div className="delete-confirm-icon"><Trash2 size={22}/></div><p>Supprimer cet élément ?</p><span>Cette action est irréversible.</span><div className="delete-confirm-actions"><button type="button" className="delete-cancel" onClick={()=>setPendingDelete(null)}>Annuler</button><button type="button" className="delete-danger" onClick={confirmDelete}>Supprimer</button></div></div></Modal>}
  {modal&&<Modal title={`${editing?'Modifier':'Ajouter'} ${modal==='habit'?'une habitude':modal==='task'?'une tâche':'une activité'}`} onClose={()=>setModal(null)}><form onSubmit={submit} className="modal-form"><label>Nom<input autoFocus maxLength={100} required placeholder={modal==='habit'?'Ex. : Méditer 10 minutes':modal==='task'?'Ex. : Préparer la présentation':'Ex. : Séance de sport'} value={formTitle} onChange={e=>setFormTitle(e.target.value)}/></label><label>Catégorie<select value={formCategory} onChange={e=>setFormCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>{modal==='habit'&&<label>Moment de la journée<select value={formPeriod} onChange={e=>setFormPeriod(e.target.value as Period)}>{periods.map(p=><option key={p.name}>{p.name}</option>)}</select></label>}{modal==='task'&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,padding:'14px 16px',border:'1px solid rgba(120,120,128,.18)',borderRadius:16,background:'rgba(120,120,128,.06)'}}><div><div style={{fontSize:14,fontWeight:600}}>Répéter tous les jours</div><div style={{fontSize:12,opacity:.62,marginTop:3}}>Une nouvelle validation chaque jour</div></div><button type="button" role="switch" aria-checked={formRecurring} aria-label="Répéter tous les jours" onClick={()=>setFormRecurring(v=>!v)} style={{flexShrink:0,width:51,height:31,padding:2,border:0,borderRadius:999,cursor:'pointer',background:formRecurring?'#34C759':'#D1D1D6',display:'flex',alignItems:'center',justifyContent:formRecurring?'flex-end':'flex-start',transition:'background 180ms ease'}}><span style={{display:'block',width:27,height:27,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,.18)',transition:'transform 180ms ease'}}/></button></div>}{modal!=='event'&&<SkillSelector value={formSkillIds} onChange={setFormSkillIds}/>}{modal!=='habit'&&<label>Date<input type="date" required value={formDate} onChange={e=>setFormDate(e.target.value)}/></label>}{modal==='event'&&<><label>Heure de début<input type="time" required value={formTime} onChange={e=>setFormTime(e.target.value)}/></label><label>Heure de fin<input type="time" required min={formTime} value={formEndTime} onChange={e=>setFormEndTime(e.target.value)}/></label>{formEndTime<=formTime&&<p role="alert" style={{color:'#f87171',fontSize:13,margin:0}}>L’heure de fin doit être après l’heure de début.</p>}<div style={{padding:'12px 14px',border:'1px solid rgba(120,120,128,.2)',borderRadius:14,background:'rgba(120,120,128,.06)'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><div><strong style={{fontSize:14}}>Répéter chaque semaine</strong><div style={{fontSize:12,opacity:.65,marginTop:3}}>Choisir les jours de répétition</div></div><button type="button" role="switch" aria-checked={formRepeatDays.length>0} aria-label="Répéter chaque semaine" onClick={()=>setFormRepeatDays(days=>days.length?[]:[makeDate(formDate).getDay()])} style={{width:51,height:31,border:0,borderRadius:99,padding:2,flexShrink:0,display:'flex',alignItems:'center',justifyContent:formRepeatDays.length?'flex-end':'flex-start',background:formRepeatDays.length?'#34C759':'#D1D1D6',cursor:'pointer'}}><span style={{width:27,height:27,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,.18)'}}/></button></div>{formRepeatDays.length>0&&<div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:12}}>{weekdayOptions.map(({day,label})=><button key={day} type="button" aria-pressed={formRepeatDays.includes(day)} onClick={()=>setFormRepeatDays(days=>days.includes(day)?days.length>1?days.filter(d=>d!==day):days:[...days,day])} style={{borderRadius:10,padding:'8px 9px',fontSize:12,fontWeight:600,border:'1px solid rgba(120,120,128,.2)',background:formRepeatDays.includes(day)?'#34C759':'rgba(120,120,128,.12)',color:formRepeatDays.includes(day)?'#fff':'inherit',cursor:'pointer'}}>{label}</button>)}</div>}</div></>}<div className="form-actions"><button type="button" className="secondary-btn" onClick={()=>setModal(null)}>Annuler</button><button type="submit" className="primary-btn"><Check size={17}/>{editing?'Enregistrer':'Ajouter'}</button></div></form></Modal>}
 </div>
}
export default App
