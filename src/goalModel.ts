export type GoalHistory={at:string;from:number;to:number}
export type GoalMode='cumulative'|'measured'
export type Goal={id:string;title:string;category:string;unit:string;target:number;current:number;deadline?:string;history?:GoalHistory[];mode?:GoalMode;start?:number}
export const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100
export function progressPercent(goal:Goal){
 if(goal.mode==='measured'){
  const start=goal.start??goal.current
  const distance=goal.target-start
  if(distance===0)return goal.current===goal.target?100:0
  return Math.max(0,Math.min(100,Math.round((goal.current-start)/distance*100)))
 }
 return Math.max(0,Math.min(100,Math.round(goal.current/goal.target*100)))
}
export function isValidGoal(g:Goal){
 const num=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1000000000
 const str=(s:unknown)=>typeof s==='string'&&s.length<=200
 if(!g||!str(g.id)||!str(g.title)||!str(g.category)||!str(g.unit)||!num(g.target)||g.target<=0||!num(g.current))return false
 if(g.mode!==undefined&&g.mode!=='cumulative'&&g.mode!=='measured')return false
 if(g.mode==='measured'&&(!num(g.start)||g.start===g.target))return false
 if(g.deadline!==undefined&&(!str(g.deadline)||!/^\d{4}-\d{2}-\d{2}$/.test(g.deadline)))return false
 if(g.history!==undefined&&(!Array.isArray(g.history)||g.history.length>100000||!g.history.every(h=>h&&str(h.at)&&num(h.from)&&num(h.to))))return false
 return true
}
