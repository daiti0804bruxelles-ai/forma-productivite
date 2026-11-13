import assert from 'node:assert/strict'
import { build } from 'esbuild'
const bundle = await build({entryPoints:['src/xpSchedule.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const {rollOverTasks, eventOccursOn} = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))
const skillIds=['consistency']
const base = {
  habits:[{id:'h1',skillIds,createdOn:'2026-11-01'},{id:'h2',skillIds,createdOn:'2026-11-03'}],
  tasks:[{id:'t1',date:'2026-11-01',done:false,skillIds,createdOn:'2026-11-01'}],
  completedHabits:{'2026-11-01':['h1']},
  lastPenaltyCheckDate:'2026-11-01',
}
const first = rollOverTasks(base,'2026-11-02')
assert.equal(first.tasks[0].date,'2026-11-02')
assert.equal(first.tasks[0].dueDate,'2026-11-01')
assert.equal(first.xpLedger.events.filter(e=>e.key==='late-task:t1:2026-11-02').length,1)
assert.equal(first.xpLedger.events.some(e=>e.key.startsWith('missed-habit:h2')),false,'no penalty before habit creation')
assert.equal(rollOverTasks(first,'2026-11-02'),first,'same-day refresh must be idempotent')
const third=rollOverTasks(first,'2026-11-03')
assert.equal(third.xpLedger.events.filter(e=>e.key.startsWith('late-task:t1')).length,2,'two distinct overdue days')
assert.equal(third.xpLedger.events.filter(e=>e.key==='missed-habit:h1:2026-11-02').length,1)
const recurring=rollOverTasks({
  habits:[],completedHabits:{},lastPenaltyCheckDate:'2026-11-01',
  tasks:[{id:'r1',date:'2026-11-01',done:true,recurring:true,skillIds}]
},'2026-11-02')
assert.equal(recurring.xpLedger?.events.length??0,0,'completed recurring task must not be penalized')
assert.equal(recurring.tasks[0].done,false)
const missed=rollOverTasks(recurring,'2026-11-03')
assert.equal(missed.xpLedger.events.filter(e=>e.source==='penalty').length,1,'missed recurring day incurs one penalty')
const historical=rollOverTasks({
  habits:[],completedHabits:{},lastPenaltyCheckDate:'2026-11-01',
  tasks:[{id:'r2',date:'2026-11-01',done:false,recurring:true,skillIds,createdOn:'2026-10-30'}],
  xpLedger:{events:[{key:'task:r2:2026-11-01',source:'task',at:'2026-11-01T19:00:00.000Z',skillIds,amountPerSkill:3}]}
},'2026-11-02')
assert.equal(historical.xpLedger.events.length,1,'historical completion must not become a penalty')
const multiDay=rollOverTasks({
  habits:[],completedHabits:{},lastPenaltyCheckDate:'2026-11-01',
  tasks:[{id:'r3',date:'2026-11-01',done:false,recurring:true,skillIds,createdOn:'2026-10-30'}],
  xpLedger:{events:[{key:'task:r3:2026-11-02',source:'task',at:'2026-11-02T19:00:00.000Z',skillIds,amountPerSkill:3}]}
},'2026-11-04')
assert.deepEqual(multiDay.xpLedger.events.filter(e=>e.source==='penalty').map(e=>e.key),
  ['late-task:r3:2026-11-01','late-task:r3:2026-11-03'],
  'a completed recurring day must not be penalized even across multiple offline days')
const untouched=rollOverTasks({habits:[],tasks:[],completedHabits:{}},'2026-11-03')
assert.equal(untouched.xpLedger,undefined,'no retrospective XP penalty on first launch')
// 2026-11-02 est un lundi (1), 2026-11-03 un mardi (2)
const rest=rollOverTasks({habits:[{id:'hw',skillIds,createdOn:'2026-11-01',days:[2,4]}],tasks:[],completedHabits:{},lastPenaltyCheckDate:'2026-11-02'},'2026-11-04')
assert.deepEqual(rest.xpLedger.events.map(e=>e.key),['missed-habit:hw:2026-11-03'],'pas de pénalité les jours de repos prévus')
// Activités du calendrier : lundi (1), mercredi (3), vendredi (5). 2026-11-02 = lundi.
const sport={id:'e1',date:'2026-11-02',repeatDays:[1,3,5],skillIds:['strength','cardio'],createdOn:'2026-11-02'}
const plain={id:'e2',date:'2026-11-02',repeatDays:[1,3,5]}
assert.equal(eventOccursOn(sport,'2026-11-04'),true,'mercredi')
assert.equal(eventOccursOn(sport,'2026-11-03'),false,'mardi')
const week=rollOverTasks({habits:[],tasks:[],events:[sport,plain],completedHabits:{},completedEvents:{'2026-11-02':['e1']},lastPenaltyCheckDate:'2026-11-02'},'2026-11-07')
const keys=week.xpLedger.events.map(e=>e.key)
assert.deepEqual(keys.filter(k=>k.startsWith('missed-event')).sort(),['missed-event:e1:2026-11-04','missed-event:e1:2026-11-06'],'pénalité mercredi et vendredi non cochés, pas lundi (coché) ni mardi/jeudi')
assert.equal(week.xpLedger.events.find(e=>e.key==='missed-event:e1:2026-11-04').amountPerSkill,-5)
assert.deepEqual(week.xpLedger.events.find(e=>e.key==='missed-event:e1:2026-11-04').skillIds,['strength','cardio'])
assert.equal(keys.some(k=>k.includes(':e2:')),false,'activité sans compétences : jamais de pénalité')
const before=rollOverTasks({habits:[],tasks:[],events:[{...sport,createdOn:'2026-11-05'}],completedHabits:{},lastPenaltyCheckDate:'2026-11-02'},'2026-11-07')
assert.deepEqual(before.xpLedger.events.map(e=>e.key),['missed-event:e1:2026-11-06'],'pas de pénalité avant l’activation de l’XP')
// Mode repos : Musculation + Cardio en pause du 9 au 11 ; une habitude de lecture reste pénalisée ; excuser un élément un jour.
const sick=rollOverTasks({habits:[{id:'gym',skillIds:['strength','consistency'],createdOn:'2026-11-01'},{id:'read',skillIds:['reading'],createdOn:'2026-11-01'}],
  tasks:[],events:[{id:'run',date:'2026-11-02',repeatDays:[0,1,2,3,4,5,6],skillIds:['cardio'],createdOn:'2026-11-02'}],completedHabits:{},
  restPeriods:[{id:'r',from:'2026-11-09',to:'2026-11-11',skillIds:['strength','cardio'],reason:'Malade'}],excused:{'2026-11-12':['read']},lastPenaltyCheckDate:'2026-11-09'},'2026-11-13')
const sickKeys=sick.xpLedger.events.map(e=>e.key).sort()
assert.deepEqual(sickKeys,['missed-event:run:2026-11-12','missed-habit:gym:2026-11-12','missed-habit:read:2026-11-09','missed-habit:read:2026-11-10','missed-habit:read:2026-11-11'],'repos du 9 au 11 pour le sport, lecture excusée le 12')
console.log('Tests de calendrier XP réussis : échéances, journées manquées, récurrence, création, idempotence.')
