import { useState } from 'react'
import type { FormEvent } from 'react'
import { Flame, Plus, Shield, Trash2, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PERKS, boostActive, buy, goldBalance, applyJoker, type GameState, type PerkId } from './game'

type Props = { state: GameState; today: string; onChange: (next: GameState) => void }
const tomorrowOf = (day: string) => { const [y, m, d] = day.split('-').map(Number); const x = new Date(y, m - 1, d + 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
const pick = (s: GameState): GameState => ({ goldLedger: s.goldLedger, rewards: s.rewards, inventory: s.inventory, protectedDays: s.protectedDays, boostUntil: s.boostUntil })
const PERK_UI: Record<PerkId, { icon: LucideIcon; short: string; hint: string }> = {
  joker: { icon: Shield, short: 'Joker', hint: 'Une journée sans pénalité' },
  shield: { icon: Flame, short: 'Série', hint: 'Sauve ta flamme un jour vide (automatique)' },
  boost: { icon: Zap, short: 'Boost ×2', hint: 'XP doublée pendant 24 h' },
}

export function Coin({ amount }: { amount: number }) {
  return <span className="coin-amount"><span className="coin" aria-hidden="true" />{amount.toLocaleString('fr-FR')}</span>
}

/** Boutique épurée : 3 bonus en cartes, tes récompenses avec leur progression. Achat en deux touches. */
export default function Shop({ state, today, onChange }: Props) {
  const balance = goldBalance(state.goldLedger)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const rewards = state.rewards ?? []
  const tomorrow = tomorrowOf(today)
  const jokers = state.inventory?.joker ?? 0

  const purchase = (id: string, item: Parameters<typeof buy>[1]) => {
    if (confirm !== id) { setConfirm(id); return }
    const next = buy(state, item)
    setConfirm(null)
    if (next) onChange(pick(next))
  }
  const protect = (day: string) => { const next = applyJoker(state, day); if (next) onChange(pick(next)) }
  const addReward = (e: FormEvent) => {
    e.preventDefault()
    const value = Number(price)
    if (!title.trim() || !Number.isInteger(value) || value <= 0) return
    onChange(pick({ ...state, rewards: [...rewards, { id: Math.random().toString(36).slice(2, 10), title: title.trim().slice(0, 80), price: Math.min(value, 100000) }] }))
    setTitle(''); setPrice(''); setAdding(false)
  }

  return <div className="shop">
    <div className="shop-balance"><span>Ton or</span><Coin amount={balance} /></div>

    <div className="perk-grid">
      {PERKS.map(perk => {
        const ui = PERK_UI[perk.id]
        const id = `perk-${perk.id}`
        const count = perk.id === 'boost' ? 0 : state.inventory?.[perk.id] ?? 0
        const active = perk.id === 'boost' && boostActive(state)
        return <button key={perk.id} type="button" title={ui.hint} aria-label={`${perk.name} : ${ui.hint}. ${perk.price} or`}
          className={`perk-card ${confirm === id ? 'is-confirm' : ''}`} disabled={balance < perk.price && confirm !== id} onClick={() => purchase(id, { kind: 'perk', id: perk.id })}>
          {(count > 0 || active) && <span className="perk-badge">{active ? 'actif' : `×${count}`}</span>}
          <ui.icon size={26} strokeWidth={1.8} />
          <strong>{ui.short}</strong>
          <span className="perk-price">{confirm === id ? 'Confirmer' : <Coin amount={perk.price} />}</span>
        </button>
      })}
    </div>
    {jokers > 0 && <div className="shop-actions">
      <button type="button" className="chip" disabled={state.protectedDays?.includes(today)} onClick={() => protect(today)}>{state.protectedDays?.includes(today) ? 'Aujourd’hui protégé' : 'Joker : protéger aujourd’hui'}</button>
      <button type="button" className="chip" disabled={state.protectedDays?.includes(tomorrow)} onClick={() => protect(tomorrow)}>{state.protectedDays?.includes(tomorrow) ? 'Demain protégé' : 'Demain'}</button>
    </div>}

    <section className="settings-group">
      <div className="rewards-head"><h3>Mes récompenses</h3><button type="button" className="text-action" onClick={() => setAdding(v => !v)}><Plus size={16} /> Ajouter</button></div>
      {adding && <form className="reward-form" onSubmit={addReward}>
        <input autoFocus aria-label="Nom de la récompense" placeholder="Ex. : Soirée ciné" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} />
        <input aria-label="Prix en or" inputMode="numeric" placeholder="Prix" value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        <button type="submit" className="secondary-btn" disabled={!title.trim() || !Number(price)}>OK</button>
      </form>}
      {rewards.length === 0 && !adding && <p className="settings-hint">Aucune pour l’instant.</p>}
      <div className="reward-list">
        {rewards.map(reward => {
          const id = `reward-${reward.id}`
          const ratio = Math.min(1, balance / reward.price)
          const ready = balance >= reward.price
          return <div className="reward-row" key={reward.id}>
            <div className="reward-copy">
              <div className="reward-top"><strong>{reward.title}</strong><small>{Math.min(balance, reward.price).toLocaleString('fr-FR')} / {reward.price.toLocaleString('fr-FR')}</small></div>
              <div className="bar bar-thin"><div style={{ width: `${ratio * 100}%` }} /></div>
            </div>
            {ready
              ? <button type="button" className={`buy-btn ${confirm === id ? 'is-confirm' : ''}`} onClick={() => purchase(id, { kind: 'reward', reward })}>{confirm === id ? 'Confirmer' : 'Obtenir'}</button>
              : <button type="button" className="small-icon" aria-label={`Supprimer ${reward.title}`} onClick={() => onChange(pick({ ...state, rewards: rewards.filter(r => r.id !== reward.id) }))}><Trash2 size={16} /></button>}
          </div>
        })}
      </div>
    </section>
  </div>
}
