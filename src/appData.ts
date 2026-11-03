import type { Goal } from './goalModel.ts'
import { isValidGoal } from './goalModel.ts'
import type { SkillId, XpLedger } from './skillModel.ts'
import { isXpLedger, isSkillIds } from './skillModel.ts'
import type { AvatarConfig } from './avatarModel.ts'
import { isAvatarConfig } from './avatarModel.ts'
export type Period = 'Matin' | 'Après-midi' | 'Soir'
export type Habit = { id:string; title:string; period:Period; category:string; skillIds?:SkillId[]; createdOn?:string }
export type Task = { id:string; title:string; category:string; date:string; done:boolean; recurring?:boolean; skillIds?:SkillId[]; xpRewardId?:string }
export type Event = { id:string; title:string; date:string; time:string; endTime?:string; category:string; repeatDays?:number[] }
export type AppData = { habits:Habit[]; tasks:Task[]; events:Event[]; goals?:Goal[]; completedHabits:Record<string,string[]>; xpLedger?:XpLedger; xpProcessedThrough?:string; avatar?:AvatarConfig }

export function isAppData(value:unknown):value is AppData{
 if(!value||typeof value!=='object')return false
 const d=value as Partial<AppData>
 const validText=(s:unknown)=>typeof s==='string'&&s.length<=200
 const validDate=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s
 if(!Array.isArray(d.habits)||!Array.isArray(d.tasks)||!Array.isArray(d.events)||!d.completedHabits||typeof d.completedHabits!=='object'||Array.isArray(d.completedHabits))return false
 if(d.habits.length>10000||d.tasks.length>10000||d.events.length>10000||(d.goals!==undefined&&(!Array.isArray(d.goals)||d.goals.length>10000)))return false
 if(d.avatar!==undefined&&!isAvatarConfig(d.avatar))return false
 if(d.goals!==undefined&&!d.goals.every(isValidGoal))return false
 if(d.xpProcessedThrough!==undefined&&!validDate(d.xpProcessedThrough))return false
 if(d.xpLedger!==undefined&&!isXpLedger(d.xpLedger))return false
 if([d.habits,d.tasks,d.events,d.goals||[]].some(rows=>new Set(rows.map(row=>row?.id)).size!==rows.length))return false
 if(d.habits.some(h=>h&&((h.createdOn!==undefined&&!validDate(h.createdOn))||(h.skillIds!==undefined&&!isSkillIds(h.skillIds)))))return false
 if(d.tasks.some(t=>t&&((t.skillIds!==undefined&&!isSkillIds(t.skillIds))||(t.xpRewardId!==undefined&&(typeof t.xpRewardId!=='string'||t.xpRewardId!=='task:'+t.id&&(!t.xpRewardId.startsWith('task:'+t.id+':')||!validDate(t.xpRewardId.slice(('task:'+t.id+':').length))))))))return false
 if(!d.habits.every(h=>h&&validText(h.id)&&validText(h.title)&&validText(h.category)&&['Matin','Après-midi','Soir'].includes(h.period)))return false
 if(!d.tasks.every(t=>t&&validText(t.id)&&validText(t.title)&&validText(t.category)&&validDate(t.date)&&typeof t.done==='boolean'&&(t.recurring===undefined||typeof t.recurring==='boolean')))return false
 if(!d.events.every(e=>e&&validText(e.id)&&validText(e.title)&&validText(e.category)&&validDate(e.date)&&typeof e.time==='string'&&/^\d{2}:\d{2}$/.test(e.time)&&(e.endTime===undefined||(typeof e.endTime==='string'&&/^\d{2}:\d{2}$/.test(e.endTime)&&e.endTime>e.time))&&(e.repeatDays===undefined||(Array.isArray(e.repeatDays)&&e.repeatDays.length>0&&e.repeatDays.length<=7&&e.repeatDays.every(day=>Number.isInteger(day)&&day>=0&&day<=6)&&new Set(e.repeatDays).size===e.repeatDays.length))))return false
 return Object.entries(d.completedHabits).every(([day,ids])=>validDate(day)&&Array.isArray(ids)&&ids.every(validText))
}
