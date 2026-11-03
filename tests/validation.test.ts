import test from 'node:test'
import assert from 'node:assert/strict'
import { isXpLedger, upsertXpEvent } from '../src/skillModel.ts'
import { isAppData } from '../src/appData.ts'
const event = { id: 'task:t', action: 'task', skillIds: ['reading'], status: 'completed', occurredAt: '2026-11-01T12:00:00Z' }
const valid = () => ({ habits: [], tasks: [], events: [], completedHabits: {}, xpLedger: { events: [event], levelFloors: { reading: 2 } } })

test('ancien document sans journal XP et journal complet valides', () => {
  assert.equal(isAppData({ habits: [], tasks: [], events: [], completedHabits: {} }), true)
  assert.equal(isAppData(valid()), true)
})
test('journal corrompu : action, statut, date, compétences, doublons et planchers rejetés', () => {
  for (const ledger of [
    null, { events: [null] }, { events: [{ ...event, action: 'constructor' }] },
    { events: [{ ...event, status: 'bonus' }] }, { events: [{ ...event, occurredAt: 'invalid' }] },
    { events: [{ ...event, skillIds: ['unknown'] }] }, { events: [{ ...event, skillIds: ['reading', 'reading'] }] },
    { events: [event, event] }, { events: [event], levelFloors: { reading: 101 } },
    { events: [event], levelFloors: { reading: 1.5 } }, { events: [event], levelFloors: { unknown: 2 } },
    { events: [event], levelFloors: [] },
  ]) {
    assert.equal(isXpLedger(ledger), false)
    assert.equal(isAppData({ ...valid(), xpLedger: ledger }), false)
  }
})
test('un événement invalide est refusé par le moteur également', () => {
  const ledger = { events: [] }
  assert.equal(upsertXpEvent(ledger, { ...event, action: 'unknown' } as never), ledger)
})
test('données invalides : dates impossibles, occurrence étrangère et identifiants dupliqués', () => {
  const task = { id: 't', title: 'test', category: 'Personnel', date: '2026-11-01', done: false }
  for (const patch of [
    { xpProcessedThrough: '2026-02-30' },
    { tasks: [{ ...task, xpRewardId: 12 }] },
    { tasks: [{ ...task, xpRewardId: 'task:other' }] },
    { tasks: [task, task] },
    { tasks: [{ ...task, skillIds: ['fake'] }] },
    { tasks: [null] },
  ]) assert.equal(isAppData({ ...valid(), ...patch }), false)
})
