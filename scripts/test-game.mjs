import assert from 'node:assert/strict'
import { build } from 'esbuild'

const load = async entry => {
  const bundle = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
  return import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))
}
const G = await load('src/game.ts')
const { rollOverTasks } = await load('src/xpSchedule.ts')

// Or : gains, pas de doublon, solde.
let ledger = G.addGold(undefined, 'gold:habit:h1:2026-11-08', 2, 'Méditer')
ledger = G.addGold(ledger, 'gold:habit:h1:2026-11-08', 2, 'Méditer')
assert.equal(G.goldBalance(ledger), 2, 'même validation : or compté une seule fois')
ledger = G.addGold(ledger, 'chest:7:2026-11-08', 25, 'Coffre')
assert.equal(G.goldBalance(ledger), 27)

// Achats.
let state = { goldLedger: ledger }
assert.equal(G.buy(state, { kind: 'perk', id: 'joker' }), null, 'pas assez d’or')
state = { goldLedger: G.addGold(ledger, 'test', 300, 'test') } // 327
const now = new Date('2026-11-08T10:00:00Z')
state = G.buy(state, { kind: 'perk', id: 'joker' }, now)
assert.equal(state.inventory.joker, 1); assert.equal(G.goldBalance(state.goldLedger), 227)
state = G.buy(state, { kind: 'perk', id: 'boost' }, now)
assert.equal(state.boostUntil, '2026-11-09T10:00:00.000Z'); assert.equal(G.xpMultiplier(state, now), 2)
assert.equal(G.xpMultiplier(state, new Date('2026-11-09T11:00:00Z')), 1, 'boost terminé après 24 h')
state = G.buy(state, { kind: 'reward', reward: { id: 'r1', title: 'Soirée ciné', price: 100 } }, new Date('2026-11-08T10:01:00Z'))
assert.equal(G.goldBalance(state.goldLedger), 7)
assert.equal(G.goldEarned(state.goldLedger), 327, 'l’or gagné au total ne baisse pas avec les achats')

// Joker : journée protégée, aucune pénalité ce jour-là.
state = G.applyJoker(state, '2026-11-09')
assert.equal(state.inventory.joker, 0); assert.deepEqual(state.protectedDays, ['2026-11-09'])
assert.equal(G.applyJoker(state, '2026-11-10'), null, 'plus de joker')
const habits = [{ id: 'h1', skillIds: ['mental'], createdOn: '2026-11-01' }]
const rolled = rollOverTasks({ habits, tasks: [], completedHabits: {}, lastPenaltyCheckDate: '2026-11-08', protectedDays: ['2026-11-09'] }, '2026-11-11')
assert.deepEqual(rolled.xpLedger.events.map(e => e.key), ['missed-habit:h1:2026-11-08', 'missed-habit:h1:2026-11-10'], 'le 9 est protégé')

// Protection de série : sauve un jour vide juste après un jour actif, puis s'épuise.
const streakData = { habits: [], tasks: [], completedHabits: {}, lastPenaltyCheckDate: '2026-11-08', activityDays: ['2026-11-07', '2026-11-08'], inventory: { shield: 1 } }
const frozen = rollOverTasks(streakData, '2026-11-11')
assert.deepEqual(frozen.frozenDays, ['2026-11-09'], 'une seule protection utilisée, le 9')
assert.equal(frozen.inventory.shield, 0)
assert.equal(G.streakLength(['2026-11-07', '2026-11-08'], ['2026-11-09'], '2026-11-10'), 3, 'série gardée jusqu’au 9')
assert.equal(rollOverTasks({ ...streakData, inventory: {} }, '2026-11-11').frozenDays, undefined, 'sans protection : rien')

// Coffres de série.
assert.deepEqual(G.chestFor(7, true, undefined, '2026-11-08'), { key: 'chest:7:2026-11-08', amount: 25, label: 'Coffre de série · 7 jours' })
assert.equal(G.chestFor(7, true, { events: [{ key: 'chest:7:2026-11-08', amount: 25, at: '', label: '' }] }, '2026-11-08'), null)
assert.equal(G.chestFor(8, true, undefined, '2026-11-08'), null)
assert.equal(G.chestFor(7, false, undefined, '2026-11-08'), null, 'série pas encore prolongée aujourd’hui')

console.log('Tests du jeu réussis : or, achats, boost, joker, protection de série, coffres.')
