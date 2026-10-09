import { SPELLS } from '../data'
import type { GameState } from '../game'
import { Combo } from './OrbDot'
import { SpellIcon } from './SpellIcon'

export function SpellList({ game, showHints }: { game: GameState; showHints: boolean }) {
  const playing = game.phase === 'playing'
  const target = playing ? game.queue[0] : null
  // How many times each spell still has to be completed this run (current target included).
  const left = new Map<string, number>()
  for (const id of game.queue) left.set(id, (left.get(id) ?? 0) + 1)
  const showCounts = game.total > SPELLS.length

  return (
    <aside className="panel spells-panel">
      <div className="panel-head">
        <h2>Spells</h2>
        <span className="muted">{SPELLS.length}</span>
      </div>
      <ul className="spell-list">
        {SPELLS.map((s) => {
          const n = left.get(s.id) ?? 0
          return (
            <li key={s.id} className={[playing && n === 0 ? 'done' : '', s.id === target ? 'target' : ''].join(' ')}>
              <SpellIcon spell={s} size={32} />
              <span className="spell-name">{s.name}</span>
              {playing && showCounts && n > 0 && <span className="spell-left">×{n}</span>}
              {showHints && <Combo combo={s.combo} size={12} />}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
