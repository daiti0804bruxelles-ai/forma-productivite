export type GoalMode='cumulative'|'measured'|'periodic'
export type GoalPeriod='week'|'month'
export type GoalHistory={at:string;from:number;to:number}
export type GoalEntry={id:string;at:string;amount:number;kind:'add'|'set';note?:string}
export type GoalLink={kind:'habit'|'task';sourceId:string;amount:number}
export type Goal={
 id:string;title:string;category:string;unit:string;target:number;current:number;
 deadline?:string;history?:GoalHistory[];mode?:GoalMode;start?:number;period?:GoalPeriod;
 entries?:GoalEntry[];links?:GoalLink[]
}
export const round=(value:number)=>Math.round((value+Number.EPSILON)*100)/100
export const localDay=(date:Date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')
export function periodKey(date:Date,period:GoalPeriod){
 if(period==='month')return localDay(date).slice(0,7)
 const d=new Date(date.getFullYear(),date.getMonth(),date.getDate())
 const weekday=(d.getDay()+6)%7
 d.setDate(d.getDate()-weekday)
 return localDay(d)
}
export function periodOfEntry(at:string,period:GoalPeriod){
 const d=new Date(at)
 return Number.isNaN(d.getTime())?'':periodKey(d,period)
}
export function periodicTotal(goal:Goal,key:string){
 const entries=(goal.entries||[]).filter(e=>periodOfEntry(e.at,goal.period||'month')===key).sort((a,b)=>a.at.localeCompare(b.at))
 return round(entries.reduce((total,e)=>e.kind==='set'?e.amount:total+e.amount,0))
}
export function goalValue(goal:Goal,date=new Date()){
 return goal.mode==='periodic'?periodicTotal(goal,periodKey(date,goal.period||'month')):goal.current
}
export function goalPercent(goal:Goal,date=new Date()){
 const value=goalValue(goal,date)
 if(goal.mode==='measured'){
  const start=goal.start??0
  if(start===goal.target)return value===goal.target?100:0
  return Math.max(0,Math.min(100,Math.round((value-start)/(goal.target-start)*100)))
 }
 return Math.max(0,Math.min(100,Math.round(value/goal.target*100)))
}
export function isValidGoal(goal:Goal){
 const num=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1000000000
 const text=(s:unknown,max=200)=>typeof s==='string'&&s.length<=max
 if(!goal||!text(goal.id)||!text(goal.title)||!text(goal.category)||!text(goal.unit)||!num(goal.target)||goal.target<=0||!num(goal.current)||goal.current<0)return false
 if(goal.mode!==undefined&&!['cumulative','measured','periodic'].includes(goal.mode))return false
 if(goal.mode==='measured'&&(!num(goal.start)||goal.start===goal.target))return false
 if(goal.mode==='periodic'&&goal.period!==undefined&&!['week','month'].includes(goal.period))return false
 if(goal.deadline!==undefined&&(!text(goal.deadline,10)||!/^\d{4}-\d{2}-\d{2}$/.test(goal.deadline)))return false
 if(goal.history!==undefined&&(!Array.isArray(goal.history)||goal.history.length>100000||!goal.history.every(h=>h&&text(h.at,40)&&num(h.from)&&num(h.to))))return false
 if(goal.entries!==undefined&&(!Array.isArray(goal.entries)||goal.entries.length>100000||!goal.entries.every(e=>e&&text(e.id)&&text(e.at,40)&&num(e.amount)&&['add','set'].includes(e.kind)&&(e.note===undefined||text(e.note)))))return false
 if(goal.links!==undefined&&(!Array.isArray(goal.links)||goal.links.length>100||!goal.links.every(l=>l&&['habit','task'].includes(l.kind)&&text(l.sourceId)&&num(l.amount)&&l.amount>0)))return false
 return true
}
