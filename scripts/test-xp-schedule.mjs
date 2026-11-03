import assert from 'node:assert/strict'
import { build } from 'esbuild'
const bundle = await build({entryPoints:['src/xpSchedule.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const {rollOverTasks} = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))
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
const untouched=rollOverTasks({habits:[],tasks:[],completedHabits:{}},'2026-11-03')
assert.equal(untouched.xpLedger,undefined,'no retrospective XP penalty on first launch')
console.log('Tests de calendrier XP réussis : échéances, journées manquées, récurrence, création, idempotence.')
