import { habitStats, type HabitLike } from './habitStats'
import type { XpLedger } from './xpEngine'

type Props = { habit: HabitLike & { title: string }; completed: Record<string, string[]>; today: string; ledger?: XpLedger }

const LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const STATE_LABEL = { done: 'fait', missed: 'manqué', rest: 'repos', future: 'à venir', before: 'avant la création' } as const

/** Fiche d'une habitude : série, meilleure série, régularité et les 5 dernières semaines. */
export default function HabitStatsView({ habit, completed, today, ledger }: Props) {
  const stats = habitStats(habit, completed, today)
  const events = (ledger?.events ?? []).filter(e => e.key.startsWith(`habit:${habit.id}:`) || e.key.startsWith(`missed-habit:${habit.id}:`))
  const xp = Math.round(events.reduce((sum, e) => sum + e.amountPerSkill * e.skillIds.length, 0))
  const fmt = (date: string) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`))
  return <div className="habit-stats">
    <div className="stat-tiles">
      <div><strong>{stats.currentStreak}</strong><small>série actuelle</small></div>
      <div><strong>{stats.bestStreak}</strong><small>meilleure série</small></div>
      <div><strong>{stats.rate30 === null ? '–' : `${stats.rate30} %`}</strong><small>sur 30 jours</small></div>
    </div>
    <div className="habit-calendar" role="img" aria-label={`5 dernières semaines : ${stats.calendar.filter(d => d.state === 'done').length} jours faits`}>
      {LETTERS.map((l, i) => <span key={i} className="habit-cal-head" aria-hidden="true">{l}</span>)}
      {stats.calendar.map(day => <span key={day.date} className={`habit-cal-day is-${day.state} ${day.date === today ? 'is-today' : ''}`} title={`${fmt(day.date)} : ${STATE_LABEL[day.state]}`} />)}
    </div>
    <p className="habit-stats-foot"><span className="dot is-done" /> fait <span className="dot is-missed" /> manqué <span className="dot is-rest" /> repos · {stats.doneCount} fois au total{events.length ? ` · ${xp >= 0 ? '+' : ''}${xp.toLocaleString('fr-FR')} XP` : ''}</p>
  </div>
}
