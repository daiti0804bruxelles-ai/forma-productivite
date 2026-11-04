import assert from 'node:assert/strict'
import { build } from 'esbuild'

// Teste le véritable moteur TypeScript, sans ajouter de dépendance de test.
const bundle = await build({
  entryPoints: ['src/xpEngine.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'silent',
})
const url = 'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
const { awardXp, penalizeXp, skillProgress, domainProgress, isValidXpLedger, awardCompletedGoals } = await import(url)
const skill = 'consistency'
let ledger = awardXp(undefined, 'habit:h1:2026-11-01', 'habit', [skill], 10)
assert.equal(ledger.events.length, 1)
ledger = awardXp(ledger, 'habit:h1:2026-11-01', 'habit', [skill], 10)
assert.equal(ledger.events.length, 1, 'recocher ne doit pas redonner des XP')
ledger = penalizeXp(ledger, 'missed-habit:h1:2026-11-02', [skill], -5)
assert.equal(ledger.events.length, 2)
ledger = penalizeXp(ledger, 'missed-habit:h1:2026-11-02', [skill], -5)
assert.equal(ledger.events.length, 2, 'une pénalité ne doit être appliquée qu’une fois')
assert.ok(isValidXpLedger(ledger))
assert.equal(skillProgress(ledger, skill).xp, 5)
ledger = awardXp(ledger, 'goal:g1', 'goal', [skill], 100)
assert.equal(skillProgress(ledger, skill).level, 2)
ledger = penalizeXp(ledger, 'late-task:t1:2026-11-03', [skill], -5)
assert.equal(skillProgress(ledger, skill).level, 2, 'un niveau acquis ne peut pas être perdu')
assert.equal(skillProgress(ledger, skill).xp, 100)
assert.equal(domainProgress(ledger, 'discipline').level >= 1, true)
assert.equal(isValidXpLedger({ events: [{ ...ledger.events[0], amountPerSkill: -5 }] }), false)
const previousGoal={id:'g-test',skillIds:['consistency','organization'],difficulty:'ambitious',history:[],percent:80}
const editedTarget={...previousGoal,percent:100}
assert.equal(awardCompletedGoals(undefined,[previousGoal],[editedTarget],g=>g.percent),undefined,
  'changing a target must not award XP')
const completedGoal={...previousGoal,history:[{at:'2026-11-03'}],percent:100}
const goalLedger=awardCompletedGoals(undefined,[previousGoal],[completedGoal],g=>g.percent)
assert.equal(goalLedger.events.length,1)
assert.equal(goalLedger.events[0].amountPerSkill,300)
assert.deepEqual(goalLedger.events[0].skillIds,['consistency','organization'])
assert.equal(domainProgress(goalLedger,'discipline').xp,120,'domain gets 20% of XP per selected skill')
assert.equal(awardCompletedGoals(goalLedger,[previousGoal],[completedGoal],g=>g.percent).events.length,1,
  'goal XP must not be awarded twice')
console.log('Tests XP réussis : gains, doublons, pénalités, protection des niveaux et validation.')
