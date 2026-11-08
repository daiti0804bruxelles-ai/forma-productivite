import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, CircleCheck, Users, MoreHorizontal, GripVertical, ChevronDown, Plus, Repeat2, Settings, Sparkles, Trash2, X, Pencil, Download, Upload, ShieldCheck, Sunrise, Sun, Moon, ListTodo, Palette, Globe, History } from 'lucide-react'
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
import { awardXp, awardCompletedGoals, isValidXpLedger, isDifficulty, xpForDifficulty, difficultyLabel, DIFFICULTIES, MAX_SKILLS_PER_ITEM, skillProgress, rankFor, type Difficulty, type XpLedger } from './xpEngine'
import { suggestSkills, skillName } from './skillSuggest'
import { WEEKDAYS, toggleWeekday, isScheduledOn, daysLabel } from './weekdays'
import { SKILL_GROUPS } from './skillsCatalog'
import { rollOverTasks as advanceDay, eventOccursOn } from './xpSchedule'
import { useCloudSync } from './useCloudSync'
import { createBackup, ensureWeeklyBackup, listBackups, readBackupData, type BackupInfo } from './backups'
import { currentDayKey, isValidTimeZone, setReferenceTimeZone } from './timeZone'
import TimeZoneSettings from './TimeZoneSettings'
import SyncIndicator from './SyncIndicator'
import HabitStatsView from './HabitStatsView'
import type { Session } from '@supabase/supabase-js'
import SwipeRow from './SwipeRow'
import StreakFlame from './StreakFlame'
import { useSortable, type SortGroups } from './useSortable'
import QuickAdd, { type QuickAddPayload, type QuickAddType } from './QuickAdd'
import AppearanceSettings from './AppearanceSettings'
import { isAppearance, readCachedAppearance, useAppearance, type Appearance } from './theme'
type Page = 'dashboard' | 'habits' | 'tasks' | 'calendar' | 'goals' | 'skills'
type Period = 'Matin' | 'Après-midi' | 'Soir'
type Habit = { id:string; title:string; period:Period; category:string; skillIds?:SkillId[]; createdOn?:string; difficulty?:Difficulty; days?:number[] }
type Subtask = { id:string; title:string; done:boolean }
type Task = { id:string; subtasks?:Subtask[]; title:string; category:string; date:string; done:boolean; recurring?:boolean; skillIds?:SkillId[]; dueDate?:string; createdOn?:string; difficulty?:Difficulty }
type Event = { id:string; title:string; date:string; time:string; endTime?:string; category:string; repeatDays?:number[]; skillIds?:SkillId[]; difficulty?:Difficulty; createdOn?:string }
type AppData = { habits:Habit[]; tasks:Task[]; taskOrder?:string[]; events:Event[]; goals?:Goal[]; completedHabits:Record<string,string[]>; completedEvents?:Record<string,string[]>; activityDays?:string[]; xpLedger?:XpLedger; characterAppearance?:CharacterAppearance; avatarPath?:string; avatarUpdatedAt?:string; lastPenaltyCheckDate?:string; appearance?:Appearance; xpVersion?:number; legacyXpLedger?:XpLedger; timeZone?:string }
const todayKey = () => currentDayKey()
const weekdayOptions=[{day:1,label:'Lun'},{day:2,label:'Mar'},{day:3,label:'Mer'},{day:4,label:'Jeu'},{day:5,label:'Ven'},{day:6,label:'Sam'},{day:0,label:'Dim'}]

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
 if(!d.events.every(e=>e&&validText(e.id)&&validText(e.title)&&validText(e.category)&&validDate(e.date)&&typeof e.time==='string'&&/^\d{2}:\d{2}$/.test(e.time)&&(e.endTime===undefined||(typeof e.endTime==='string'&&/^\d{2}:\d{2}$/.test(e.endTime)&&e.endTime>e.time))&&(e.repeatDays===undefined||(Array.isArray(e.repeatDays)&&e.repeatDays.length>0&&e.repeatDays.length<=7&&e.repeatDays.every(day=>Number.isInteger(day)&&day>=0&&day<=6)&&new Set(e.repeatDays).size===e.repeatDays.length))&&validSkills(e.skillIds)&&(e.difficulty===undefined||isDifficulty(e.difficulty))&&(e.createdOn===undefined||validDate(e.createdOn))))return false
 if(d.completedEvents!==undefined&&(!d.completedEvents||typeof d.completedEvents!=='object'||Array.isArray(d.completedEvents)||!Object.entries(d.completedEvents).every(([day,ids])=>validDate(day)&&Array.isArray(ids)&&ids.length<=1000&&ids.every(validText))))return false
 if(d.appearance!==undefined&&!isAppearance(d.appearance))return false
 if(d.xpVersion!==undefined&&typeof d.xpVersion!=='number')return false
 if(d.timeZone!==undefined&&!isValidTimeZone(d.timeZone))return false
 if(d.legacyXpLedger!==undefined&&!isValidXpLedger(d.legacyXpLedger))return false
 const validDays=(days:unknown)=>days===undefined||(Array.isArray(days)&&days.length>=1&&days.length<=7&&days.every(day=>Number.isInteger(day)&&day>=0&&day<=6)&&new Set(days).size===days.length)
 if(!d.habits.every(h=>(h.difficulty===undefined||isDifficulty(h.difficulty))&&validDays(h.days)))return false
 if(!d.tasks.every(t=>t.difficulty===undefined||isDifficulty(t.difficulty)))return false
 return Object.entries(d.completedHabits).every(([day,ids])=>validDate(day)&&Array.isArray(ids)&&ids.every(validText))
}
const nav:{id:Page;label:string;icon:LucideIcon}[]=[{id:'dashboard',label:'Aujourd’hui',icon:Sun},{id:'habits',label:'Mes habitudes',icon:Repeat2},{id:'tasks',label:'Mes tâches',icon:ListTodo},{id:'goals',label:'Mes objectifs',icon:CircleCheck},{id:'skills',label:'Compétences',icon:Sparkles},{id:'calendar',label:'Calendrier',icon:CalendarDays}]
const bottomTabs:{id:Page;short:string;icon:LucideIcon}[]=[{id:'dashboard',short:'Aujourd’hui',icon:Sun},{id:'habits',short:'Habitudes',icon:Repeat2},{id:'tasks',short:'Tâches',icon:ListTodo},{id:'calendar',short:'Calendrier',icon:CalendarDays}]
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
    <div className="auth-screen">
      <form onSubmit={handleSubmit} className="auth-card">
        <div className="auth-brand"><span className="brand-mark"><Check size={18} strokeWidth={3}/></span><span>forma</span></div>
        <div className="auth-copy">
          <h1>{isSignup ? 'Créer un compte' : 'Bon retour'}</h1>
          <p>{isSignup ? 'Organise tes journées en douceur.' : 'Connecte-toi pour retrouver ta journée.'}</p>
        </div>
        <label className="field"><span>Adresse e-mail</span>
          <input type="email" placeholder="toi@exemple.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="field"><span>Mot de passe</span>
          <input type="password" placeholder="6 caractères minimum" value={password} onChange={e => setPassword(e.target.value)} autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={6} required />
        </label>
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Chargement…' : isSignup ? "S'inscrire" : 'Se connecter'}
        </button>
        {message && <p role="status" className="auth-message">{message}</p>}
        <button type="button" className="text-action auth-switch" onClick={() => { setIsSignup(!isSignup); setMessage('') }}>
          {isSignup ? 'Déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire"}
        </button>
      </form>
    </div>
  )
}

function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button className="icon-button" aria-label="Fermer" onClick={onClose}><X size={19}/></button></div>{children}</div></div>}
/** Système XP v2 : nouveau départ à zéro (ancien journal archivé), compétences suggérées pour les éléments qui n'en ont pas. */
function migrateXp(value:AppData):AppData{
 if(value.xpVersion===2)return value
 const fill=<T extends {title:string;category:string;skillIds?:SkillId[]}>(item:T,kind:'task'|'habit'):T=>({...item,skillIds:item.skillIds?.length?item.skillIds.slice(0,MAX_SKILLS_PER_ITEM):suggestSkills(item.title,item.category,kind)})
 return {...value,xpVersion:2,legacyXpLedger:value.xpLedger?.events.length?value.xpLedger:value.legacyXpLedger,xpLedger:{events:[]},lastPenaltyCheckDate:todayKey(),
  habits:value.habits.map(h=>fill(h,'habit')),tasks:value.tasks.map(t=>fill(t,'task'))}
}
const ALL_SKILLS=SKILL_GROUPS.flatMap(group=>group.skills.map(skill=>({id:skill.id as SkillId,name:skill.name})))
function RoundCheck({done,label,onToggle}:{done:boolean;label:string;onToggle:()=>void}){return <button type="button" className="round-check" aria-pressed={done} aria-label={label} onClick={onToggle}>{done&&<Check size={15} strokeWidth={3}/>}</button>}
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
setReferenceTimeZone(data.timeZone)
const sync = useCloudSync<AppData>({ userId: session?.user?.id, data, setData, prepare: value => rollOverTasks(migrateXp(value)), fallback: demoData })
const dataLoading = sync.loading
const dataError = sync.loadError
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
 const [taskMenuId,setTaskMenuId]=useState<string|null>(null)
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
 const [formDifficulty,setFormDifficulty]=useState<Difficulty>('moyen')
 const [formDays,setFormDays]=useState<number[]>([])
 const [formSkillsTouched,setFormSkillsTouched]=useState(false)
 const [formEventXp,setFormEventXp]=useState(false)
 
// Sauvegarde automatique hebdomadaire, une fois par ouverture de l'app.
const weeklyBackupFor = useRef<string | null>(null)
useEffect(() => {
  const userId = session?.user?.id
  if (dataLoading || !userId || weeklyBackupFor.current === userId) return
  weeklyBackupFor.current = userId
  void ensureWeeklyBackup(userId, data)
}, [dataLoading, session?.user?.id, data])

 const completed=data.completedHabits[todayKey()]||[]
 const todayWeekday=makeDate(todayKey()).getDay()
 const todaysHabits=data.habits.filter(h=>isScheduledOn(h.days,todayWeekday))
 const habitsDone=todaysHabits.filter(h=>completed.includes(h.id)).length
 const todaysTasks=data.tasks.filter(t=>t.date===todayKey())
 const doneTasks=todaysTasks.filter(t=>t.done).length
 const habitProgress=todaysHabits.length?Math.round(habitsDone/todaysHabits.length*100):0
  const activityDays=new Set([...(data.activityDays||[]),...Object.entries(data.completedHabits).filter(([,ids])=>ids.length>0).map(([day])=>day)])
  const streakEnd=activityDays.has(todayKey())?makeDate(todayKey()):addDays(makeDate(todayKey()),-1)
  let activityStreak=0
  for(let day=streakEnd;activityStreak<20000&&activityDays.has(dateKey(day));day=addDays(day,-1))activityStreak++
 const todayEvents=data.events.filter(e=>eventOccursOn(e,todayKey())).sort((a,b)=>a.time.localeCompare(b.time))
 const go=(p:Page)=>{setPage(p);setMobileMoreOpen(false)}
 const toggleHabit=(habitId:string)=>setData(prev=>{
  const key=todayKey(), now=prev.completedHabits[key]||[]
  const alreadyDone=now.includes(habitId)
  const habit=prev.habits.find(h=>h.id===habitId)
  return {
    ...prev,
    completedHabits:{...prev.completedHabits,[key]:alreadyDone?now.filter(i=>i!==habitId):[...now,habitId]},
     activityDays:alreadyDone?prev.activityDays:Array.from(new Set([...(prev.activityDays||[]),key])),
    xpLedger: !alreadyDone && habit ? awardXp(prev.xpLedger,`habit:${habitId}:${key}`,'habit',habit.skillIds,xpForDifficulty(habit.difficulty)) : prev.xpLedger
  }
 })
 const toggleEvent=(eventId:string)=>setData(prev=>{
  const key=todayKey(), now=prev.completedEvents?.[key]||[]
  const alreadyDone=now.includes(eventId)
  const event=prev.events.find(ev=>ev.id===eventId)
  return {
   ...prev,
   completedEvents:{...(prev.completedEvents||{}),[key]:alreadyDone?now.filter(i=>i!==eventId):[...now,eventId]},
   activityDays:alreadyDone?prev.activityDays:Array.from(new Set([...(prev.activityDays||[]),key])),
   xpLedger:!alreadyDone&&event?.skillIds?.length?awardXp(prev.xpLedger,`event:${eventId}:${key}`,'event',event.skillIds,xpForDifficulty(event.difficulty)):prev.xpLedger
  }
 })
 const toggleTask=(taskId:string)=>setData(prev=>{
  const task=prev.tasks.find(t=>t.id===taskId)
  if(!task)return prev
  const key=task.recurring?`task:${task.id}:${task.date}`:`task:${task.id}`
  return {
    ...prev,
    tasks:prev.tasks.map(t=>t.id===taskId?{...t,done:!t.done}:t),
    activityDays:task.done?prev.activityDays:Array.from(new Set([...(prev.activityDays||[]),todayKey()])),
    xpLedger: !task.done ? awardXp(prev.xpLedger,key,'task',task.skillIds,xpForDifficulty(task.difficulty)) : prev.xpLedger
  }
 })
 const openAdd=(type:'task'|'habit'|'event',date=todayKey())=>{setEditing(null);setFormTitle('');setFormSkillIds([]);setFormCategory('Travail');setFormPeriod('Matin');setFormRecurring(false);setFormDate(date);setFormTime('09:00');setFormEndTime('10:00');setFormRepeatDays([]);setFormDifficulty('moyen');setFormDays([]);setFormSkillsTouched(false);setFormEventXp(false);setModal(type)}
 const openEdit=(type:'task'|'habit'|'event',record:Task|Habit|Event)=>{setEditing(record.id);setFormTitle(record.title);setFormSkillsTouched(true);setFormDifficulty('difficulty' in record&&record.difficulty?record.difficulty:'moyen');setFormDays('days' in record&&record.days?record.days:[]);setFormSkillIds('skillIds' in record ? (record.skillIds || []) : []);setFormEventXp(Boolean('skillIds' in record&&record.skillIds?.length));setFormCategory(record.category);if('period'in record)setFormPeriod(record.period);if('recurring'in record)setFormRecurring(Boolean(record.recurring));if('date'in record)setFormDate(record.date);if('time'in record){setFormRepeatDays(record.repeatDays||[]);setFormTime(record.time);const [hours,minutes]=record.time.split(':').map(Number);setFormEndTime(record.endTime||`${String(Math.min(hours+1,23)).padStart(2,'0')}:${String(hours===23?Math.min(minutes+1,59):minutes).padStart(2,'0')}`)}setModal(type)}
 // XP d'une activité : compétences + difficulté si activé. createdOn = début des pénalités (jamais rétroactives).
 const eventXpFields=(previous?:Event)=>formEventXp&&formSkillIds.length?{skillIds:formSkillIds,difficulty:formDifficulty,createdOn:previous?.skillIds?.length&&previous.createdOn?previous.createdOn:todayKey()}:{skillIds:undefined,difficulty:undefined,createdOn:undefined}
 const submit=(e:FormEvent)=>{e.preventDefault();if(!formTitle.trim()||!modal)return;if(modal==='event'&&formEndTime<=formTime)return;const title=formTitle.trim();if(modal==='habit'){setData(prev=>({...prev,habits:editing?prev.habits.map(h=>h.id===editing?{...h,title,period:formPeriod,category:formCategory,skillIds:formSkillIds,difficulty:formDifficulty,days:formDays.length?formDays:undefined}:h):[...prev.habits,{id:id(),title,period:formPeriod,category:formCategory,skillIds:formSkillIds,difficulty:formDifficulty,days:formDays.length?formDays:undefined,createdOn:todayKey()}]}))}if(modal==='task'){setData(prev=>({...prev,tasks:editing?prev.tasks.map(t=>t.id===editing?{...t,title,date:formDate,dueDate:formDate===t.date?t.dueDate:undefined,recurring:formRecurring,category:formCategory,skillIds:formSkillIds,difficulty:formDifficulty}:t):[...prev.tasks,{id:id(),title,date:formDate,recurring:formRecurring,category:formCategory,done:false,skillIds:formSkillIds,difficulty:formDifficulty,createdOn:todayKey()}]}))}if(modal==='event'){setData(prev=>({...prev,events:editing?prev.events.map(ev=>ev.id===editing?{...ev,title,date:formDate,time:formTime,endTime:formEndTime,repeatDays:formRepeatDays.length?formRepeatDays:undefined,category:formCategory,...eventXpFields(ev)}:ev):[...prev.events,{id:id(),title,date:formDate,time:formTime,endTime:formEndTime,category:formCategory,repeatDays:formRepeatDays.length?formRepeatDays:undefined,...eventXpFields()}]}))}setModal(null)}
 const deleteItem=(type:'task'|'habit'|'event',itemId:string)=>setPendingDelete({type,id:itemId})
 const confirmDelete=()=>{if(!pendingDelete)return;const {type,id:itemId}=pendingDelete;setData(prev=>type==='task'?{...prev,tasks:prev.tasks.filter(t=>t.id!==itemId)}:type==='event'?{...prev,events:prev.events.filter(e=>e.id!==itemId)}:{...prev,habits:prev.habits.filter(h=>h.id!==itemId)});setPendingDelete(null);setModal(null)}
 const [autoBackups,setAutoBackups]=useState<BackupInfo[]|null>(null)
 const [timeZoneOpen,setTimeZoneOpen]=useState(false)
 const [statsHabitId,setStatsHabitId]=useState<string|null>(null)
 const openBackup=()=>{setBackupError('');setRestorePreview(null);setBackupOpen(true);setSettingsOpen(false);setAutoBackups(null);if(session?.user?.id)listBackups(session.user.id).then(setAutoBackups).catch(()=>setAutoBackups([]))}
 const previewAutoBackup=async(backupId:string)=>{
  if(!session?.user?.id)return
  setBackupError('');setRestorePreview(null)
  try{const value=await readBackupData(session.user.id,backupId);if(!isAppData(value))throw Error('invalid');setRestorePreview(value)}
  catch{setBackupError('Impossible de lire cette sauvegarde automatique.')}
 }
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
   const restored=rollOverTasks(migrateXp(restorePreview))
   // Filet de sécurité : copie de l'état actuel avant de le remplacer.
   await createBackup(session.user.id,data,'avant restauration').catch(error=>console.warn('Copie avant restauration impossible :',error))
   await sync.replaceAll(restored)
   closeBackup()
  }catch(error){
   console.error('Erreur de restauration Supabase :',error)
   setBackupError('Restauration impossible : la sauvegarde n’a pas été enregistrée. Vérifiez votre connexion et réessayez.')
  }finally{setRestoringBackup(false)}
 }
 const displayedTasks=useMemo(()=>data.tasks.filter(t=>taskFilter==='Terminées'?t.done:!t.done).sort((a,b)=>{const order=data.taskOrder||data.tasks.map(t=>t.id);return order.indexOf(a.id)-order.indexOf(b.id)}),[data.tasks,data.taskOrder,taskFilter])
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
   xpLedger:newlyCompleted?awardXp(prev.xpLedger,key,'task',task.skillIds,xpForDifficulty(task.difficulty)):prev.xpLedger}
 })
 const removeSubtask=(taskId:string,subtaskId:string)=>setData(prev=>({...prev,tasks:prev.tasks.map(t=>t.id===taskId?{...t,subtasks:(t.subtasks||[]).filter(st=>st.id!==subtaskId)}:t)}))
 const monthDays=useMemo(()=>{const first=new Date(visibleMonth.getFullYear(),visibleMonth.getMonth(),1);const offset=(first.getDay()+6)%7;return Array.from({length:42},(_,i)=>new Date(first.getFullYear(),first.getMonth(),1-offset+i))},[visibleMonth])
 const selectedEvents=data.events.filter(e=>eventOccursOn(e,selectedDate)).sort((a,b)=>a.time.localeCompare(b.time))
 const selectedCalendarTasks=showCalendarTasks?data.tasks.filter(t=>t.date===selectedDate):[]
 const [quickAdd,setQuickAdd]=useState<QuickAddType|null>(null)
 const [appearanceOpen,setAppearanceOpen]=useState(false)
 const [xpFlash,setXpFlash]=useState<{id:string;amount:number}|null>(null)
 const [showDone,setShowDone]=useState(false)
 const [leaving,setLeaving]=useState<string[]>([])
 const [clock,setClock]=useState(()=>new Date())
 useEffect(()=>{const timer=window.setInterval(()=>setClock(new Date()),60000);return()=>window.clearInterval(timer)},[])
 const [cachedAppearance]=useState(readCachedAppearance)
 const appearance=dataLoading?cachedAppearance:(data.appearance??cachedAppearance)
 useAppearance(appearance)
 useEffect(()=>{if(!xpFlash)return;const timer=window.setTimeout(()=>setXpFlash(null),1600);return()=>window.clearTimeout(timer)},[xpFlash])
 const anyOverlayOpen=Boolean(statsHabitId||modal||pendingDelete||backupOpen||appearanceOpen||timeZoneOpen||quickAdd||mobileMoreOpen)
 useEffect(()=>{
  if(anyOverlayOpen)return
  const onKey=(e:KeyboardEvent)=>{
   if(e.key.toLowerCase()!=='n'||e.metaKey||e.ctrlKey||e.altKey)return
   const target=e.target as HTMLElement|null
   if(target&&(target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName)))return
   e.preventDefault()
   setQuickAdd(page==='habits'?'habit':page==='calendar'?'event':'task')
  }
  document.addEventListener('keydown',onKey)
  return()=>document.removeEventListener('keydown',onKey)
 },[anyOverlayOpen,page])
 const keepBriefly=(itemId:string)=>{setLeaving(prev=>[...prev,itemId]);window.setTimeout(()=>setLeaving(prev=>prev.filter(x=>x!==itemId)),1300)}
 const earned=(key:string)=>Boolean(data.xpLedger?.events.some(event=>event.key===key))
 const checkHabit=(h:Habit)=>{
  const done=completed.includes(h.id)
  toggleHabit(h.id)
  if(!done)keepBriefly(h.id)
  if(!done&&h.skillIds?.length&&!earned(`habit:${h.id}:${todayKey()}`))setXpFlash({id:h.id,amount:xpForDifficulty(h.difficulty)*(h.skillIds?.length||1)})
 }
 const checkTask=(t:Task)=>{
  const key=t.recurring?`task:${t.id}:${t.date}`:`task:${t.id}`
  toggleTask(t.id)
  if(!t.done)keepBriefly(t.id)
  if(!t.done&&t.skillIds?.length&&!earned(key))setXpFlash({id:t.id,amount:xpForDifficulty(t.difficulty)*(t.skillIds?.length||1)})
 }
 const completedEventsToday=data.completedEvents?.[todayKey()]||[]
 const checkEvent=(ev:Event)=>{
  const done=completedEventsToday.includes(ev.id)
  toggleEvent(ev.id)
  if(!done)keepBriefly(ev.id)
  if(!done&&ev.skillIds?.length&&!earned(`event:${ev.id}:${todayKey()}`))setXpFlash({id:ev.id,amount:xpForDifficulty(ev.difficulty)*ev.skillIds.length})
 }
 const tomorrowKey=dateKey(addDays(makeDate(todayKey()),1))
 // Reporter à demain : la tâche n'est plus due aujourd'hui (pas de pénalité de retard pour aujourd'hui).
 const postponeTask=(taskId:string)=>{setData(prev=>({...prev,tasks:prev.tasks.map(t=>t.id===taskId&&!t.recurring?{...t,date:tomorrowKey,dueDate:undefined}:t)}));keepBriefly(taskId)}
 const handleQuickAdd=(item:QuickAddPayload)=>{
  if(item.type==='task')setData(prev=>({...prev,tasks:[...prev.tasks,{id:id(),title:item.title,date:item.date,recurring:item.recurring,category:item.category,done:false,skillIds:item.skillIds,difficulty:item.difficulty,createdOn:todayKey()}]}))
  else if(item.type==='habit')setData(prev=>({...prev,habits:[...prev.habits,{id:id(),title:item.title,period:item.period,category:item.category,skillIds:item.skillIds,difficulty:item.difficulty,days:item.days,createdOn:todayKey()}]}))
  else setData(prev=>({...prev,events:[...prev.events,{id:id(),title:item.title,date:item.date,time:item.time,endTime:item.endTime,category:item.category}]}))
  setQuickAdd(null)
 }
 const quickAddMore=(type:QuickAddType,title:string)=>{setQuickAdd(null);openAdd(type);setFormTitle(title)}
 const openQuickAdd=()=>setQuickAdd(page==='habits'?'habit':page==='calendar'?'event':'task')
 const updateAppearance=(next:Appearance)=>setData(prev=>({...prev,appearance:next}))
 const taskOrder=data.taskOrder||data.tasks.map(t=>t.id)
 const orderedTodayTasks=[...todaysTasks].sort((a,b)=>taskOrder.indexOf(a.id)-taskOrder.indexOf(b.id))
 const sortedHabits=periods.flatMap(p=>todaysHabits.filter(h=>h.period===p.name))
 const nowTime=`${String(clock.getHours()).padStart(2,'0')}:${String(clock.getMinutes()).padStart(2,'0')}`
 const eventPast=(ev:Event)=>(ev.endTime||ev.time)<=nowTime
 // Une activité avec XP reste visible tant qu'elle n'est pas cochée ; une fois cochée, elle se range comme une tâche.
 const eventHidden=(ev:Event)=>ev.skillIds?.length?completedEventsToday.includes(ev.id)&&!leaving.includes(ev.id):eventPast(ev)
 const visibleEvents=showDone?todayEvents:todayEvents.filter(ev=>!eventHidden(ev))
 const visibleTasks=showDone?orderedTodayTasks:orderedTodayTasks.filter(t=>!t.done||leaving.includes(t.id))
 const visibleHabits=showDone?sortedHabits:sortedHabits.filter(h=>!completed.includes(h.id)||leaving.includes(h.id))
 const hiddenCount=todayEvents.filter(ev=>ev.skillIds?.length?completedEventsToday.includes(ev.id):eventPast(ev)).length+orderedTodayTasks.filter(t=>t.done).length+sortedHabits.filter(h=>completed.includes(h.id)).length
 const xpEventsToday=todayEvents.filter(ev=>ev.skillIds?.length)
 const dayDone=doneTasks+habitsDone+xpEventsToday.filter(ev=>completedEventsToday.includes(ev.id)).length
 const dayTotal=todaysTasks.length+todaysHabits.length+xpEventsToday.length
 const dayProgress=dayTotal?Math.round(dayDone/dayTotal*100):0
 const showFab=page==='dashboard'||page==='habits'||page==='tasks'||page==='calendar'
 const subtaskCount=(t:Task)=>{const list=t.subtasks||[];return list.length?`${list.filter(st=>st.done).length}/${list.length}`:''}
 const skillLevelsRef=useRef<Record<string,number>|null>(null)
 const [levelUps,setLevelUps]=useState<{key:string;title:string;detail:string;rank:boolean}[]>([])
 useEffect(()=>{
  if(dataLoading){skillLevelsRef.current=null;return}
  const levels:Record<string,number>=Object.fromEntries(ALL_SKILLS.map(skill=>[skill.id,skillProgress(data.xpLedger,skill.id).level]))
  const before=skillLevelsRef.current
  skillLevelsRef.current=levels
  if(!before)return
  const gained=ALL_SKILLS.filter(skill=>levels[skill.id]>before[skill.id]).map(skill=>{
   const level=levels[skill.id],rank=rankFor(level),newRank=rank!==rankFor(before[skill.id])
   return {key:`${skill.id}-${level}-${Date.now()}`,title:newRank?`Rang ${rank} débloqué`:`Niveau ${level}`,detail:newRank?`${skill.name} · niveau ${level}`:skill.name,rank:newRank}
  })
  if(gained.length>3)setLevelUps(prev=>[...prev,{key:`many-${Date.now()}`,title:`${gained.length} compétences progressent`,detail:'Ouvre Compétences pour voir le détail',rank:gained.some(g=>g.rank)}])
  else if(gained.length)setLevelUps(prev=>[...prev,...gained])
 },[data.xpLedger,dataLoading])
 useEffect(()=>{if(!levelUps.length)return;const timer=window.setTimeout(()=>setLevelUps(prev=>prev.slice(1)),3200);return()=>window.clearTimeout(timer)},[levelUps])
 const xpMeta=(item:{skillIds?:SkillId[];difficulty?:Difficulty})=>[item.skillIds?.length?item.skillIds.map(skillName).join(' · '):'',item.difficulty&&item.difficulty!=='moyen'?difficultyLabel(item.difficulty):''].filter(Boolean).join(' · ')
 const taskById=new Map(data.tasks.map(t=>[t.id,t]))
 const habitById=new Map(data.habits.map(h=>[h.id,h]))
 const taskSort=useSortable('tasks',{list:displayedTasks.map(t=>t.id)},next=>setData(prev=>{
  const visible=next.list
  const order=(prev.taskOrder||prev.tasks.map(t=>t.id)).filter(taskId=>prev.tasks.some(t=>t.id===taskId))
  prev.tasks.forEach(t=>{if(!order.includes(t.id))order.unshift(t.id)})
  const slots=order.map((taskId,i)=>visible.includes(taskId)?i:-1).filter(i=>i>=0)
  const result=[...order]
  slots.forEach((slot,k)=>{result[slot]=visible[k]})
  return {...prev,taskOrder:result}
 }))
 const habitGroups:SortGroups=Object.fromEntries(periods.map(p=>[p.name,data.habits.filter(h=>h.period===p.name).map(h=>h.id)]))
 const habitSort=useSortable('habits',habitGroups,next=>setData(prev=>{
  const placed=new Set(Object.values(next).flat())
  const regrouped=periods.flatMap(p=>(next[p.name]||[]).flatMap(habitId=>{const h=prev.habits.find(x=>x.id===habitId);return h?[{...h,period:p.name}]:[]}))
  return {...prev,habits:[...regrouped,...prev.habits.filter(h=>!placed.has(h.id))]}
 }))
 const sortedTaskRows=taskSort.items('list').flatMap(taskId=>{const t=taskById.get(taskId);return t?[t]:[]})
 const ghostTask=taskSort.activeId?taskById.get(taskSort.activeId):undefined
 const ghostHabit=habitSort.activeId?habitById.get(habitSort.activeId):undefined
 if (authLoading) return <div className="splash" role="status"><span className="brand-mark"><Check size={18} strokeWidth={3}/></span><span>Chargement…</span></div>
 if (!session) return <AuthScreen />
 if (dataLoading) return <div className="splash" role="status">{dataError?<><p>Impossible de charger tes données.</p><button type="button" className="primary-btn" onClick={()=>window.location.reload()}>Réessayer</button></>:<><span className="brand-mark"><Check size={18} strokeWidth={3}/></span><span>Chargement de ta journée…</span></>}</div>
 return <div className="app-shell">
  <aside className="sidebar" aria-label="Navigation">
   <button type="button" className="brand" onClick={()=>go('dashboard')} aria-label="Forma — revenir à l’accueil"><span className="brand-mark"><Check size={15} strokeWidth={3}/></span><span>forma</span></button>
   <nav className="nav">{nav.map(item=><button key={item.id} type="button" className={`nav-item ${page===item.id?'active':''}`} aria-current={page===item.id?'page':undefined} onClick={()=>go(item.id)}><item.icon size={19} strokeWidth={page===item.id?2.2:1.8}/><span>{item.label}</span></button>)}</nav>
  </aside>
  <div className="main-wrap">
   <header className="topbar">
    <button type="button" className="brand mobile-only" onClick={()=>go('dashboard')} aria-label="Forma — revenir à l’accueil"><span className="brand-mark"><Check size={13} strokeWidth={3}/></span><span>forma</span></button>
    <div className="topbar-right">
     <SyncIndicator status={sync.status} mergedAt={sync.mergedAt} onRetry={()=>{void sync.retry()}}/>
     {page!=='dashboard'&&<span className="today-pill desktop-only">{frDate(makeDate(todayKey()),{weekday:'long',day:'numeric',month:'long'})}</span>}
     <div data-forma-settings className="menu-anchor">
      <button type="button" className="icon-button" onClick={()=>setSettingsOpen(v=>!v)} aria-label="Paramètres de Forma" aria-expanded={settingsOpen} title="Paramètres"><Settings size={20}/></button>
      {settingsOpen&&<div role="menu" aria-label="Paramètres" className="menu-popover">
       <button type="button" role="menuitem" className="menu-item" onClick={()=>{setSettingsOpen(false);setAppearanceOpen(true)}}><Palette size={17}/> Apparence</button>
       <button type="button" role="menuitem" className="menu-item" onClick={()=>{setSettingsOpen(false);setTimeZoneOpen(true)}}><Globe size={17}/> Fuseau horaire</button>
       <button type="button" role="menuitem" className="menu-item" onClick={openBackup}><Download size={17}/> Sauvegarde et restauration</button>
      </div>}
     </div>
    </div>
   </header>
   <main className="content">
    {page==='skills'&&<SkillsPage ledger={data.xpLedger}/>}

    {page==='dashboard'&&<div className="today">
     <section className="today-head">
      <div><p className="today-date">{frDate(makeDate(todayKey()),{weekday:'long',day:'numeric',month:'long'})}</p><h1>Aujourd’hui</h1></div>
      <StreakFlame streak={activityStreak} activeToday={activityDays.has(todayKey())}/>
     </section>
     {dayTotal>0&&<div className="day-progress">
      <div className="day-progress-label"><span>{dayDone} sur {dayTotal} terminée{dayDone!==1?'s':''}</span><span>{dayProgress} %</span></div>
      <div className="bar" role="progressbar" aria-label="Progression du jour" aria-valuemin={0} aria-valuemax={100} aria-valuenow={dayProgress}><div style={{width:`${dayProgress}%`}}/></div>
     </div>}
     <section className="list-section today-events">
      <div className="section-head"><h2>Programme</h2><button type="button" className="text-action" onClick={()=>go('calendar')}>Calendrier <ArrowRight size={15}/></button></div>
      <div className="list-card">{visibleEvents.length?visibleEvents.map(ev=>{const xp=Boolean(ev.skillIds?.length);const done=completedEventsToday.includes(ev.id);return <div className={`event-row ${!xp&&eventPast(ev)?'is-past':''} ${leaving.includes(ev.id)&&!showDone?'is-leaving':''}`} key={ev.id}>{xp&&<RoundCheck done={done} label={`${done?'Annuler':'Valider'} ${ev.title}`} onToggle={()=>checkEvent(ev)}/>}<span className="event-time">{ev.time}</span><span className={`event-stripe ${categoryClass[ev.category]||'lavender'}`}/><div className="row-copy"><span className={done?'is-done':''}>{ev.title}</span><small>{ev.category}{ev.endTime?` · jusqu’à ${ev.endTime}`:''}{xp?` · +${xpForDifficulty(ev.difficulty)*(ev.skillIds?.length||0)} XP`:''}</small></div>{xpFlash?.id===ev.id&&<span className="xp-flash" aria-hidden="true">+{xpFlash.amount} XP</span>}</div>}):<Empty message={todayEvents.length?'Plus rien de prévu aujourd’hui.':'Rien de prévu aujourd’hui.'}/>}</div>
     </section>
     <section className="list-section today-tasks">
      <div className="section-head"><h2>Tâches</h2><button type="button" className="text-action" onClick={()=>go('tasks')}>Tout voir <ArrowRight size={15}/></button></div>
      <div className="list-card">{visibleTasks.length?visibleTasks.map(t=><SwipeRow key={t.id} className={leaving.includes(t.id)&&!showDone?'is-leaving':''} done={t.done} onComplete={()=>checkTask(t)} onPostpone={!t.recurring&&!t.done?()=>postponeTask(t.id):undefined} onDelete={()=>deleteItem('task',t.id)}>
       <div className="check-row">
        <RoundCheck done={t.done} label={`${t.done?'Rouvrir':'Terminer'} ${t.title}`} onToggle={()=>checkTask(t)}/>
        <div className="row-copy"><span className={t.done?'is-done':''}>{t.title}</span><small>{t.category}{t.recurring?' · chaque jour':''}{subtaskCount(t)?` · ${subtaskCount(t)}`:''}</small></div>
        {xpFlash?.id===t.id&&<span className="xp-flash">+{xpFlash.amount} XP</span>}
       </div>
      </SwipeRow>):<Empty message={orderedTodayTasks.length?'Toutes tes tâches du jour sont faites.':'Aucune tâche pour aujourd’hui.'}/>}</div>
     </section>
     <section className="list-section today-habits">
      <div className="section-head"><h2>Habitudes</h2><button type="button" className="text-action" onClick={()=>go('habits')}>Gérer <ArrowRight size={15}/></button></div>
      <div className="list-card">{visibleHabits.length?visibleHabits.map(h=>{const done=completed.includes(h.id);return <SwipeRow key={h.id} className={leaving.includes(h.id)&&!showDone?'is-leaving':''} done={done} completeLabel="Valider" onComplete={()=>checkHabit(h)}>
       <div className="check-row">
        <RoundCheck done={done} label={`${done?'Décocher':'Cocher'} ${h.title}`} onToggle={()=>checkHabit(h)}/>
        <div className="row-copy"><span className={done?'is-done':''}>{h.title}</span><small>{h.period} · {h.category}</small></div>
        {xpFlash?.id===h.id&&<span className="xp-flash">+{xpFlash.amount} XP</span>}
       </div>
      </SwipeRow>}):<Empty message={sortedHabits.length?'Toutes tes habitudes du jour sont faites.':'Aucune habitude pour le moment.'}/>}</div>
     </section>
     {(hiddenCount>0||showDone)&&<button type="button" className="text-action show-done" aria-pressed={showDone} onClick={()=>setShowDone(v=>!v)}>{showDone?'Masquer les éléments terminés':`Afficher les éléments terminés (${hiddenCount})`}</button>}
    </div>}

    {page==='habits'&&<>
     <section className="page-intro"><div><h1>Mes habitudes</h1><p>{habitsDone} sur {todaysHabits.length} réalisée{habitsDone!==1?'s':''} aujourd’hui</p></div><button type="button" className="primary-btn desktop-only" onClick={()=>openAdd('habit')}><Plus size={18}/> Nouvelle habitude</button></section>
     <div className="bar page-bar" role="progressbar" aria-label="Progression des habitudes" aria-valuemin={0} aria-valuemax={100} aria-valuenow={habitProgress}><div style={{width:`${habitProgress}%`}}/></div>
     <div className="period-grid">{periods.map(period=>{const ids=habitSort.items(period.name);return <section className="list-section" key={period.name} {...habitSort.zoneProps(period.name)}>
      <div className="section-head"><h2><period.icon size={18}/> {period.name}</h2><small>{period.time}</small></div>
      <div className="list-card">
       <div className="sort-list" {...habitSort.listProps(period.name)}>
        {ids.flatMap(habitId=>{const h=habitById.get(habitId);return h?[h]:[]}).map(h=>{const done=completed.includes(h.id);return <div key={h.id} {...habitSort.rowProps(h.id)} className={`check-row ${habitSort.activeId===h.id?'is-placeholder':''} ${isScheduledOn(h.days,todayWeekday)?'':'is-rest'}`}>
         <button type="button" className="drag-handle" {...habitSort.handleProps(h.id,`Déplacer ${h.title}`)}><GripVertical size={18}/></button>
         <RoundCheck done={done} label={`${done?'Décocher':'Cocher'} ${h.title}`} onToggle={()=>checkHabit(h)}/>
         <div className="row-copy is-tappable" role="button" tabIndex={0} aria-label={`Statistiques de ${h.title}`} onClick={()=>setStatsHabitId(h.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setStatsHabitId(h.id)}}}><span className={done?'is-done':''}>{h.title}</span><small>{isScheduledOn(h.days,todayWeekday)?'':'Repos aujourd’hui · '}{h.days?.length?daysLabel(h.days):h.category}{xpMeta(h)?` · ${xpMeta(h)}`:''}</small></div>
         {xpFlash?.id===h.id&&<span className="xp-flash">+{xpFlash.amount} XP</span>}
         <button type="button" className="small-icon" title="Modifier" aria-label={`Modifier ${h.title}`} onClick={()=>openEdit('habit',h)}><Pencil size={16}/></button>
         <button type="button" className="small-icon" title="Supprimer" aria-label={`Supprimer ${h.title}`} onClick={()=>deleteItem('habit',h.id)}><Trash2 size={16}/></button>
        </div>})}
       </div>
       {ids.length===0&&<Empty message={habitSort.activeId?'Dépose ici':'Aucune habitude ici.'}/>}
       <button type="button" className="add-row" onClick={()=>{openAdd('habit');setFormPeriod(period.name)}}><Plus size={16}/> Ajouter</button>
      </div>
     </section>})}</div>
     {ghostHabit&&<div ref={habitSort.ghostRef} className="sort-ghost" style={habitSort.ghostStyle} aria-hidden="true"><div className="check-row"><span className="drag-handle"><GripVertical size={18}/></span><span className="round-check" aria-pressed={completed.includes(ghostHabit.id)}/><div className="row-copy"><span>{ghostHabit.title}</span><small>{ghostHabit.category}</small></div></div></div>}
    </>}

    {page==='tasks'&&<>
     <section className="page-intro"><div><h1>Mes tâches</h1></div><button type="button" className="primary-btn desktop-only" onClick={()=>openAdd('task')}><Plus size={18}/> Nouvelle tâche</button></section>
     <div className="list-toolbar">
      <div className="segmented" role="tablist" aria-label="État des tâches">{(['À faire','Terminées'] as const).map(f=><button type="button" role="tab" aria-selected={taskFilter===f} key={f} onClick={()=>setTaskFilter(f)}>{f}</button>)}</div>
      <span className="count-label">{displayedTasks.length} tâche{displayedTasks.length!==1?'s':''} {taskFilter==='À faire'?'restante'+(displayedTasks.length!==1?'s':''):'terminée'+(displayedTasks.length!==1?'s':'')}</span>
     </div>
     <div className="list-card" {...taskSort.listProps('list')}>
      {sortedTaskRows.map(t=><div key={t.id} {...taskSort.rowProps(t.id)} className={`task-item ${taskSort.activeId===t.id?'is-placeholder':''}`}>
       <SwipeRow done={t.done} onComplete={()=>checkTask(t)} onPostpone={!t.recurring&&!t.done&&t.date<=todayKey()?()=>postponeTask(t.id):undefined} onDelete={()=>deleteItem('task',t.id)}>
        <div className="check-row">
         <button type="button" className="drag-handle" data-no-swipe {...taskSort.handleProps(t.id,`Déplacer ${t.title}`)}><GripVertical size={18}/></button>
         <RoundCheck done={t.done} label={`${t.done?'Rouvrir':'Terminer'} ${t.title}`} onToggle={()=>checkTask(t)}/>
         <div className="row-copy"><span className={t.done?'is-done':''}>{t.title}</span><small>{t.date===todayKey()?'Aujourd’hui':frDate(makeDate(t.date),{day:'numeric',month:'short'})}{t.recurring?' · chaque jour':''}{t.dueDate&&t.dueDate<t.date?' · en retard':''} · {xpMeta(t)||t.category}</small></div>
         {xpFlash?.id===t.id&&<span className="xp-flash">+{xpFlash.amount} XP</span>}
         <button type="button" className="subtask-toggle" aria-label={`Afficher les sous-tâches de ${t.title}`} aria-expanded={expandedTaskId===t.id} onClick={()=>{setExpandedTaskId(expandedTaskId===t.id?null:t.id);setSubtaskDraft('')}}>{subtaskCount(t)&&<span>{subtaskCount(t)}</span>}<ChevronDown size={18} className={expandedTaskId===t.id?'is-flipped':undefined}/></button>
         <button type="button" className="small-icon" title="Modifier" aria-label={`Modifier ${t.title}`} onClick={()=>openEdit('task',t)}><Pencil size={16}/></button>
        </div>
       </SwipeRow>
       {expandedTaskId===t.id&&<div className="subtasks" data-no-sort>
        <strong>Sous-tâches · {subtaskCount(t)||'0/0'}</strong>
        {(t.subtasks||[]).map(st=><div key={st.id} className="subtask"><input type="checkbox" checked={st.done} onChange={()=>toggleSubtask(t.id,st.id)} aria-label={st.title}/><span className={st.done?'is-done':''}>{st.title}</span><button type="button" className="small-icon" aria-label={`Supprimer la sous-tâche ${st.title}`} onClick={()=>removeSubtask(t.id,st.id)}><Trash2 size={15}/></button></div>)}
        <form onSubmit={e=>{e.preventDefault();addSubtask(t.id)}} className="subtask-form"><input value={subtaskDraft} onChange={e=>setSubtaskDraft(e.target.value)} placeholder="Ajouter une étape…" aria-label="Nouvelle sous-tâche" maxLength={200}/><button type="submit" disabled={!subtaskDraft.trim()} className="secondary-btn">Ajouter</button></form>
       </div>}
      </div>)}
      {displayedTasks.length===0&&<Empty message={taskFilter==='À faire'?'Tout est fait pour le moment.':'Aucune tâche terminée pour le moment.'}/>}
     </div>
     {ghostTask&&<div ref={taskSort.ghostRef} className="sort-ghost" style={taskSort.ghostStyle} aria-hidden="true"><div className="check-row"><span className="drag-handle"><GripVertical size={18}/></span><span className="round-check" aria-pressed={ghostTask.done}/><div className="row-copy"><span className={ghostTask.done?'is-done':''}>{ghostTask.title}</span><small>{ghostTask.category}</small></div></div></div>}
    </>}

    {page==='goals'&&<>
     <div className="segmented goals-tabs" role="tablist" aria-label="Type d'objectifs">
      <button type="button" role="tab" aria-selected={goalsTab==='personal'} onClick={()=>setGoalsTab('personal')}><CircleCheck size={16}/> Personnels</button>
      <button type="button" role="tab" aria-selected={goalsTab==='shared'} onClick={()=>setGoalsTab('shared')}><Users size={16}/> Partagés</button>
     </div>
     {goalsTab==='personal'?<GoalsPage goals={data.goals||[]} onChange={goals=>setData(prev=>{
      const xpLedger=awardCompletedGoals(prev.xpLedger,prev.goals||[],goals,progressPercent)
      return {...prev,goals,xpLedger}
     })}/>:<SharedGoalsPage userId={session.user.id}/>}
    </>}

    {page==='calendar'&&<>
     <section className="page-intro"><div><h1>Calendrier</h1></div><button type="button" className="primary-btn desktop-only" onClick={()=>openAdd('event',selectedDate)}><Plus size={18}/> Nouvelle activité</button></section>
     <div className="calendar-layout">
      <section className="panel calendar-panel">
       <div className="calendar-header"><h2>{frDate(visibleMonth,{month:'long',year:'numeric'})}</h2><div className="calendar-controls"><button type="button" onClick={()=>{const d=new Date();setVisibleMonth(new Date(d.getFullYear(),d.getMonth(),1));setSelectedDate(todayKey())}}>Aujourd’hui</button><button type="button" aria-label="Mois précédent" onClick={()=>setVisibleMonth(new Date(visibleMonth.getFullYear(),visibleMonth.getMonth()-1,1))}><ChevronLeft size={18}/></button><button type="button" aria-label="Mois suivant" onClick={()=>setVisibleMonth(new Date(visibleMonth.getFullYear(),visibleMonth.getMonth()+1,1))}><ChevronRight size={18}/></button></div></div>
       <div className="settings-row compact"><span><strong>Afficher mes tâches</strong></span><button type="button" role="switch" className="switch" aria-checked={showCalendarTasks} aria-label="Afficher mes tâches sur le calendrier" onClick={()=>setShowCalendarTasks(v=>!v)}><span/></button></div>
       <div className="calendar-weekdays">{['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=><span key={d}>{d}</span>)}</div>
       <div className="calendar-days">{monthDays.map(d=>{const key=dateKey(d);const isCurrent=d.getMonth()===visibleMonth.getMonth();const dayEvents=data.events.filter(e=>eventOccursOn(e,key)).sort((a,b)=>a.time.localeCompare(b.time));const dayTasks=showCalendarTasks?data.tasks.filter(t=>t.date===key):[];const dayItems=[...dayEvents.map(ev=>({id:'event-'+ev.id,label:`${ev.time} ${ev.title}`,kind:ev.category==='Sport'?'sport':'event'})),...dayTasks.map(t=>({id:'task-'+t.id,label:`${t.done?'✓ ':''}${t.title}`,kind:'task'}))];return <button key={key} type="button" aria-label={`${frDate(d,{weekday:'long',day:'numeric',month:'long'})}, ${dayItems.length} élément(s)`} className={`calendar-day ${isCurrent?'':'outside'} ${key===todayKey()?'is-today':''} ${key===selectedDate?'is-selected':''}`} onClick={()=>{setSelectedDate(key);if(!isCurrent)setVisibleMonth(new Date(d.getFullYear(),d.getMonth(),1))}}><span className="day-number">{d.getDate()}</span><span className="day-items">{dayItems.slice(0,2).map(item=><span key={item.id} title={item.label} className={`cal-chip ${item.kind}`}>{item.label}</span>)}{dayItems.length>2&&<span className="cal-more">+{dayItems.length-2}</span>}</span></button>})}</div>
       <div className="calendar-legend"><span><i className="dot event"/> Activités</span>{showCalendarTasks&&<span><i className="dot task"/> Tâches</span>}</div>
      </section>
      <section className="panel selected-panel">
       <h2 className="selected-title">{frDate(makeDate(selectedDate),{weekday:'long',day:'numeric',month:'long'})}</h2>
       <div className="schedule-block"><div className="schedule-subtitle">Activités</div>
        {selectedEvents.map(ev=><div className="event-row" key={ev.id}>{ev.skillIds?.length&&selectedDate===todayKey()?<RoundCheck done={completedEventsToday.includes(ev.id)} label={`${completedEventsToday.includes(ev.id)?'Annuler':'Valider'} ${ev.title}`} onToggle={()=>checkEvent(ev)}/>:null}<span className="event-time">{ev.time}{ev.endTime?` – ${ev.endTime}`:''}</span><span className={`event-stripe ${categoryClass[ev.category]||'lavender'}`}/><div className="row-copy"><span>{ev.title}</span><small>{ev.category}{ev.repeatDays?' · chaque semaine':''}{ev.skillIds?.length?` · +${xpForDifficulty(ev.difficulty)*ev.skillIds.length} XP`:''}</small></div><button type="button" className="small-icon" aria-label={`Modifier ${ev.title}`} onClick={()=>openEdit('event',ev)}><Pencil size={16}/></button><button type="button" className="small-icon" aria-label={`Supprimer ${ev.title}`} onClick={()=>deleteItem('event',ev.id)}><Trash2 size={16}/></button></div>)}
        {selectedEvents.length===0&&<Empty message="Aucune activité prévue."/>}
        <button type="button" className="add-row" onClick={()=>openAdd('event',selectedDate)}><Plus size={16}/> Ajouter une activité</button>
       </div>
       {showCalendarTasks&&<div className="schedule-block"><div className="schedule-subtitle">Tâches</div>
        {selectedCalendarTasks.map(t=><div className="event-row" key={t.id}><div className="row-copy"><span className={t.done?'is-done':''}>{t.title}</span><small>{t.done?'Terminée':t.category}</small></div></div>)}
        {selectedCalendarTasks.length===0&&<Empty message="Aucune tâche prévue."/>}
        <button type="button" className="add-row" onClick={()=>openAdd('task',selectedDate)}><Plus size={16}/> Planifier une tâche</button>
       </div>}
      </section>
     </div>
    </>}
   </main>
  </div>

  {showFab&&<button type="button" className="fab" aria-label="Ajout rapide" title="Ajout rapide (N)" onClick={openQuickAdd}><Plus size={26} strokeWidth={2.4}/></button>}

  <nav className="bottom-nav" aria-label="Navigation principale">
   {bottomTabs.map(item=><button key={item.id} type="button" className={page===item.id?'selected':''} aria-current={page===item.id?'page':undefined} onClick={()=>go(item.id)}><item.icon size={22} strokeWidth={page===item.id?2.2:1.8}/><span>{item.short}</span></button>)}
   <button type="button" className={mobileMoreOpen||page==='goals'||page==='skills'?'selected':''} onClick={()=>setMobileMoreOpen(v=>!v)} aria-expanded={mobileMoreOpen} aria-label="Plus de pages"><MoreHorizontal size={22}/><span>Plus</span></button>
  </nav>
  {mobileMoreOpen&&<div className="sheet-backdrop" onMouseDown={()=>setMobileMoreOpen(false)}><div className="sheet more-sheet" role="menu" aria-label="Autres pages" onMouseDown={e=>e.stopPropagation()}>
   <div className="sheet-grabber" aria-hidden="true"/>
   {nav.filter(item=>item.id==='goals'||item.id==='skills').map(item=><button type="button" role="menuitem" key={item.id} className="menu-item" onClick={()=>go(item.id)}><item.icon size={19}/> {item.label}</button>)}
  </div></div>}

  {quickAdd&&<QuickAdd initialType={quickAdd} today={todayKey()} tomorrow={tomorrowKey} categories={categories} onClose={()=>setQuickAdd(null)} onSubmit={handleQuickAdd} onMoreOptions={quickAddMore}/>}
  {statsHabitId&&(()=>{const h=data.habits.find(x=>x.id===statsHabitId);return h?<Modal title={h.title} onClose={()=>setStatsHabitId(null)}><HabitStatsView habit={h} completed={data.completedHabits} today={todayKey()} ledger={data.xpLedger}/><div className="form-actions"><button type="button" className="secondary-btn" onClick={()=>{setStatsHabitId(null);openEdit('habit',h)}}><Pencil size={16}/> Modifier</button></div></Modal>:null})()}
  {timeZoneOpen&&<Modal title="Fuseau horaire" onClose={()=>setTimeZoneOpen(false)}><TimeZoneSettings value={data.timeZone} onChange={zone=>setData(prev=>{const next={...prev};if(zone)next.timeZone=zone;else delete next.timeZone;return next})}/></Modal>}
  {appearanceOpen&&<Modal title="Apparence" onClose={()=>setAppearanceOpen(false)}><AppearanceSettings value={appearance} onChange={updateAppearance}/></Modal>}
  {backupOpen&&<Modal title="Mes sauvegardes" onClose={closeBackup}><div className="backup-panel"><p className="backup-lead">Vos données sont synchronisées avec votre compte. Exportez une copie pour disposer d’une sauvegarde indépendante.</p><div className="backup-stat"><ShieldCheck size={20}/><span><strong>{data.habits.length} habitudes · {data.tasks.length} tâches · {data.events.length} activités · {(data.goals||[]).length} objectifs</strong><small>Votre progression quotidienne est également incluse.</small></span></div><button type="button" className="backup-action backup-export" onClick={exportBackup}><Download size={19}/><span><strong>Exporter ma sauvegarde</strong><small>Télécharger un fichier Forma (.json)</small></span></button><label className="backup-action backup-import"><Upload size={19}/><span><strong>Importer une sauvegarde</strong><small>Choisir un fichier Forma (.json)</small></span><input type="file" accept=".json,application/json" onChange={e=>{void readBackup(e.target.files?.[0]);e.target.value=''}}/></label><div className="auto-backups"><p className="auto-backups-title"><History size={16}/> Sauvegardes automatiques</p>{autoBackups===null?<p className="settings-hint">Chargement…</p>:autoBackups.length===0?<p className="settings-hint">Aucune pour l’instant. Forma en crée une chaque semaine à l’ouverture et garde les 8 dernières.</p>:<ul>{autoBackups.map(b=><li key={b.id}><span>{new Date(b.created_at).toLocaleString('fr-FR',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} <small>{b.reason}</small></span><button type="button" className="text-action" onClick={()=>{void previewAutoBackup(b.id)}}>Voir</button></li>)}</ul>}</div>{backupError&&<p role="alert" className="backup-error">{backupError}</p>}{restorePreview&&<div className="backup-preview"><strong>Sauvegarde prête à restaurer</strong><p>{restorePreview.habits.length} habitudes · {restorePreview.tasks.length} tâches · {restorePreview.events.length} activités</p><p>Attention : la restauration remplacera les données de votre compte sur tous vos appareils. Une copie de l’état actuel est gardée dans les sauvegardes automatiques.</p><div className="backup-actions"><button type="button" className="delete-cancel" onClick={()=>setRestorePreview(null)}>Annuler</button><button type="button" className="backup-confirm" onClick={()=>{void restoreBackup()}} disabled={restoringBackup}>{restoringBackup?"Restauration…":"Restaurer mes données"}</button></div></div>}<p className="backup-footnote">Ce fichier reste sous votre contrôle. Vos données sont synchronisées via votre compte Supabase.</p></div></Modal>}
  {modal&&<Modal title={`${editing?'Modifier':'Ajouter'} ${modal==='habit'?'une habitude':modal==='task'?'une tâche':'une activité'}`} onClose={()=>setModal(null)}><form onSubmit={submit} className="modal-form">
   <label>Nom<input autoFocus maxLength={100} required placeholder={modal==='habit'?'Ex. : Méditer 10 minutes':modal==='task'?'Ex. : Préparer la présentation':'Ex. : Séance de sport'} value={formTitle} onChange={e=>{const value=e.target.value;setFormTitle(value);if((modal!=='event'||formEventXp)&&!editing&&!formSkillsTouched)setFormSkillIds(value.trim()?suggestSkills(value,formCategory,modal==='habit'||(modal==='event'&&formRepeatDays.length>0)?'habit':'task'):[])}}/></label>
   <label>Catégorie<select value={formCategory} onChange={e=>{const value=e.target.value;setFormCategory(value);if(modal!=='event'&&!editing&&!formSkillsTouched&&formTitle.trim())setFormSkillIds(suggestSkills(formTitle,value,modal==='habit'?'habit':'task'))}}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
   {modal==='habit'&&<label>Moment de la journée<select value={formPeriod} onChange={e=>setFormPeriod(e.target.value as Period)}>{periods.map(p=><option key={p.name}>{p.name}</option>)}</select></label>}
   {modal==='task'&&<div className="settings-row boxed"><span><strong>Répéter tous les jours</strong><small>Une nouvelle validation chaque jour</small></span><button type="button" role="switch" className="switch" aria-checked={formRecurring} aria-label="Répéter tous les jours" onClick={()=>setFormRecurring(v=>!v)}><span/></button></div>}
   {modal==='habit'&&<div className="field"><span>Jours {formDays.length?`· ${daysLabel(formDays)}`:'· tous les jours'}</span><div className="day-picker">{WEEKDAYS.map(w=><button key={w.day} type="button" className="day-chip" aria-label={w.name} aria-pressed={isScheduledOn(formDays,w.day)} onClick={()=>setFormDays(days=>toggleWeekday(days,w.day))}>{w.letter}</button>)}</div><small className="settings-hint">Les jours non cochés sont des jours de repos : pas de pénalité.</small></div>}
   {modal!=='event'&&<div className="field"><span>Difficulté</span><div className="chips">{DIFFICULTIES.map(d=><button key={d.id} type="button" className="chip" aria-pressed={formDifficulty===d.id} onClick={()=>setFormDifficulty(d.id)}>{d.label} <small>{d.xp} XP</small></button>)}</div></div>}
   {modal!=='event'&&<SkillSelector value={formSkillIds} onChange={next=>{setFormSkillsTouched(true);setFormSkillIds(next)}} hint={!editing&&!formSkillsTouched?'Suggestion automatique d’après le nom.':undefined}/>}
   {modal!=='habit'&&<label>Date<input type="date" required value={formDate} onChange={e=>setFormDate(e.target.value)}/></label>}
   {modal==='task'&&!formRecurring&&formDate<=todayKey()&&<button type="button" className="chip postpone-chip" onClick={()=>setFormDate(tomorrowKey)}><ArrowRight size={15}/> Reporter à demain</button>}
   {modal==='event'&&<>
    <div className="field-row"><label>Début<input type="time" required value={formTime} onChange={e=>setFormTime(e.target.value)}/></label><label>Fin<input type="time" required min={formTime} value={formEndTime} onChange={e=>setFormEndTime(e.target.value)}/></label></div>
    {formEndTime<=formTime&&<p role="alert" className="form-error">L’heure de fin doit être après l’heure de début.</p>}
    <div className="settings-row boxed"><span><strong>Répéter chaque semaine</strong><small>Choisir les jours de répétition</small></span><button type="button" role="switch" className="switch" aria-checked={formRepeatDays.length>0} aria-label="Répéter chaque semaine" onClick={()=>setFormRepeatDays(days=>days.length?[]:[makeDate(formDate).getDay()])}><span/></button></div>
    {formRepeatDays.length>0&&<div className="chips">{weekdayOptions.map(({day,label})=><button key={day} type="button" className="chip" aria-pressed={formRepeatDays.includes(day)} onClick={()=>setFormRepeatDays(days=>days.includes(day)?days.length>1?days.filter(d=>d!==day):days:[...days,day])}>{label}</button>)}</div>}
    <div className="settings-row boxed"><span><strong>Gagner de l’XP</strong><small>À cocher quand c’est fait · −5 XP si oublié</small></span><button type="button" role="switch" className="switch" aria-checked={formEventXp} aria-label="Gagner de l’XP avec cette activité" onClick={()=>{const on=!formEventXp;setFormEventXp(on);if(on&&!formSkillIds.length&&formTitle.trim())setFormSkillIds(suggestSkills(formTitle,formCategory,formRepeatDays.length?'habit':'task'))}}><span/></button></div>
    {formEventXp&&<>
     <div className="field"><span>Difficulté</span><div className="chips">{DIFFICULTIES.map(d=><button key={d.id} type="button" className="chip" aria-pressed={formDifficulty===d.id} onClick={()=>setFormDifficulty(d.id)}>{d.label} <small>{d.xp} XP</small></button>)}</div></div>
     <SkillSelector value={formSkillIds} onChange={next=>{setFormSkillsTouched(true);setFormSkillIds(next)}} hint={!formSkillsTouched?'Suggestion automatique d’après le nom.':undefined}/>
    </>}
   </>}
   <div className="form-actions">{editing&&<button type="button" className="danger-link" onClick={()=>deleteItem(modal,editing)}><Trash2 size={16}/> Supprimer</button>}<button type="button" className="secondary-btn" onClick={()=>setModal(null)}>Annuler</button><button type="submit" className="primary-btn"><Check size={17}/>{editing?'Enregistrer':'Ajouter'}</button></div>
  </form></Modal>}
  {levelUps[0]&&<div key={levelUps[0].key} className={`levelup ${levelUps[0].rank?'is-rank':''}`} role="status" aria-live="polite"><span className="levelup-icon"><Sparkles size={18}/></span><span><strong>{levelUps[0].title}</strong><small>{levelUps[0].detail}</small></span></div>}
  {pendingDelete&&<Modal title="Confirmer la suppression" onClose={()=>setPendingDelete(null)}><div className="delete-confirm"><div className="delete-confirm-icon"><Trash2 size={22}/></div><p>Supprimer cet élément ?</p><span>Cette action est irréversible.</span><div className="delete-confirm-actions"><button type="button" className="delete-cancel" onClick={()=>setPendingDelete(null)}>Annuler</button><button type="button" className="delete-danger" onClick={confirmDelete}>Supprimer</button></div></div></Modal>}
 </div>
}
export default App
