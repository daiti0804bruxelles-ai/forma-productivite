import { useState } from 'react'
import type { FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { PERKS, boostActive, buy, goldBalance, applyJoker, type GameState, type PerkId, type Reward } from './game'

type Props = { state: GameState; today: string; onChange: (next: GameState) => void }
const tomorrowOf = (day: string) => { const [y, m, d] = day.split('-').map(Number); const x = new Date(y, m - 1, d + 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
const pick = (s: GameState): GameState => ({ goldLedger: s.goldLedger, rewards: s.rewards, inventory: s.inventory, protectedDays: s.protectedDays, boostUntil: s.boostUntil })

export function Coin({ amount }: { amount: number }) {
  return <span className="coin-amount"><span className="coin" aria-hidden="true" />{amount.toLocaleString('fr-FR')} <small>or</small></span>
}

/** Boutique : bonus de jeu + récompenses réelles définies par toi. Chaque achat demande une confirmation. */
export default function Shop({ state, today, onChange }: Props) {
  const balance = goldBalance(state.goldLedger)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const rewards = state.rewards ?? []
  const tomorrow = tomorrowOf(today)
  const history = [...(state.goldLedger?.events ?? [])].filter(e => e.amount < 0 || e.key.startsWith('chest:')).reverse().slice(0, 8)

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
    const reward: Reward = { id: Math.random().toString(36).slice(2, 10), title: title.trim().slice(0, 80), price: Math.min(value, 100000) }
    onChange(pick({ ...state, rewards: [...rewards, reward] }))
    setTitle(''); setPrice('')
  }
  const owned = (id: PerkId) => id === 'boost' ? 0 : state.inventory?.[id] ?? 0

  return <div className="shop">
    <div className="shop-balance"><span>Ton or</span><Coin amount={balance} /></div>

    <section className="settings-group">
      <h3>Bonus</h3>
      <div className="shop-list">
        {PERKS.map(perk => {
          const id = `perk-${perk.id}`
          const affordable = balance >= perk.price
          return <div className="shop-item" key={perk.id}>
            <div className="shop-item-copy">
              <strong>{perk.name}{owned(perk.id) ? <small className="owned"> · {owned(perk.id)} en réserve</small> : null}{perk.id === 'boost' && boostActive(state) ? <small className="owned"> · actif</small> : null}</strong>
              <small>{perk.description}</small>
              {perk.id === 'joker' && owned('joker') > 0 && <div className="shop-actions">
                <button type="button" className="chip" disabled={state.protectedDays?.includes(today)} onClick={() => protect(today)}>{state.protectedDays?.includes(today) ? 'Aujourd’hui protégé' : 'Protéger aujourd’hui'}</button>
                <button type="button" className="chip" disabled={state.protectedDays?.includes(tomorrow)} onClick={() => protect(tomorrow)}>{state.protectedDays?.includes(tomorrow) ? 'Demain protégé' : 'Protéger demain'}</button>
              </div>}
            </div>
            <button type="button" className={`buy-btn ${confirm === id ? 'is-confirm' : ''}`} disabled={!affordable} onClick={() => purchase(id, { kind: 'perk', id: perk.id })}>
              {confirm === id ? 'Confirmer' : <Coin amount={perk.price} />}
            </button>
          </div>
        })}
      </div>
    </section>

    <section className="settings-group">
      <h3>Mes récompenses</h3>
      <div className="shop-list">
        {rewards.length === 0 && <p className="settings-hint shop-empty">Ajoute tes vraies récompenses : « Soirée ciné » 300 or, « Restaurant » 500 or, « Nouveau jeu » 1 500 or…</p>}
        {rewards.map(reward => {
          const id = `reward-${reward.id}`
          return <div className="shop-item" key={reward.id}>
            <div className="shop-item-copy"><strong>{reward.title}</strong></div>
            <button type="button" className="small-icon" aria-label={`Supprimer ${reward.title}`} onClick={() => onChange(pick({ ...state, rewards: rewards.filter(r => r.id !== reward.id) }))}><Trash2 size={16} /></button>
            <button type="button" className={`buy-btn ${confirm === id ? 'is-confirm' : ''}`} disabled={balance < reward.price} onClick={() => purchase(id, { kind: 'reward', reward })}>
              {confirm === id ? 'Confirmer' : <Coin amount={reward.price} />}
            </button>
          </div>
        })}
      </div>
      <form className="reward-form" onSubmit={addReward}>
        <input aria-label="Nom de la récompense" placeholder="Ex. : Soirée ciné" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} />
        <input aria-label="Prix en or" inputMode="numeric" placeholder="Prix" value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        <button type="submit" className="secondary-btn" disabled={!title.trim() || !Number(price)}>Ajouter</button>
      </form>
    </section>

    {history.length > 0 && <section className="settings-group">
      <h3>Historique</h3>
      <ul className="shop-history">{history.map(e => <li key={e.key}><span>{e.label}</span><span className={e.amount > 0 ? 'is-gain' : ''}>{e.amount > 0 ? '+' : '−'}{Math.abs(e.amount).toLocaleString('fr-FR')} or</span></li>)}</ul>
    </section>}
    <p className="settings-hint">Tu gagnes de l’or à chaque validation qui rapporte de l’XP (Facile 1, Moyen 2, Difficile 4, Épique 8) et un coffre à chaque palier de série. Les pénalités ne retirent jamais d’or.</p>
  </div>
}
