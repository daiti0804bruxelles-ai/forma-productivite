import assert from 'node:assert/strict'
import { build } from 'esbuild'

// Ajout rapide malin et statistiques d'habitude (vrai code TypeScript).
const load = async entry => {
  const bundle = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
  return import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))
}
const { parseQuickText } = await load('src/quickParse.ts')
const { habitStats } = await load('src/habitStats.ts')

const today = '2026-11-08' // dimanche
const p = text => parseQuickText(text, today)

let r = p('Appeler le comptable demain 14h')
assert.equal(r.title, 'Appeler le comptable'); assert.equal(r.date, '2026-11-09'); assert.equal(r.time, '14:00')
r = p('Séance muscu lundi à 7h30')
assert.equal(r.title, 'Séance muscu'); assert.equal(r.date, '2026-11-09'); assert.equal(r.time, '07:30')
r = p('Faire 50 pompes tous les jours')
assert.equal(r.title, 'Faire 50 pompes'); assert.equal(r.everyDay, true); assert.equal(r.date, undefined)
r = p('Payer le loyer le 15')
assert.equal(r.title, 'Payer le loyer'); assert.equal(r.date, '2026-11-15')
r = p('Payer le loyer le 3')
assert.equal(r.date, '2026-12-03', 'jour déjà passé ce mois : mois suivant')
r = p('Dentiste 2 décembre 9h')
assert.equal(r.title, 'Dentiste'); assert.equal(r.date, '2026-12-02'); assert.equal(r.time, '09:00')
r = p('Bilan dimanche')
assert.equal(r.date, '2026-11-15', 'un jour de la semaine = le prochain, jamais aujourd’hui')
r = p('Réunion après-demain 18:00')
assert.equal(r.title, 'Réunion'); assert.equal(r.date, '2026-11-10'); assert.equal(r.time, '18:00')
// Rien à comprendre : on ne touche à rien, même avec des chiffres.
r = p('Lire 20 pages'); assert.equal(r.title, 'Lire 20 pages'); assert.deepEqual(r.labels, [])
r = p('Faire 3 séries de 12'); assert.equal(r.title, 'Faire 3 séries de 12'); assert.deepEqual(r.labels, [])
r = p('Regarder Demain nous appartient'); assert.equal(r.date, '2026-11-09', 'mot reconnu même en majuscule')

// Statistiques d'une habitude : tous les jours, faite les 3 derniers jours, ratée avant-hier-3.
const habit = { id: 'h', createdOn: '2026-11-01' }
const done = { '2026-11-01': ['h'], '2026-11-02': ['h'], '2026-11-03': ['h'], '2026-11-05': ['h'], '2026-11-06': ['h'], '2026-11-07': ['h'] }
let s = habitStats(habit, done, today)
assert.equal(s.currentStreak, 3, 'aujourd’hui pas encore fait : la série court jusqu’à hier')
assert.equal(s.bestStreak, 3); assert.equal(s.doneCount, 6)
assert.equal(s.rate30, 86, '6 faits sur 7 jours prévus (aujourd’hui compté seulement si fait)')
// Jours de repos ignorés : habitude du lundi uniquement.
s = habitStats({ id: 'm', createdOn: '2026-10-01', days: [1] }, { '2026-11-02': ['m'], '2026-10-26': ['m'] }, today)
assert.equal(s.currentStreak, 2, 'les jours de repos ne cassent pas la série')

console.log('Tests ajout rapide et statistiques réussis : jours, heures, tous les jours, séries, régularité.')
