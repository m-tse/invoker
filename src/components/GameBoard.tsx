import { useEffect, useState } from 'react'
import type { Settings } from '../App'
import { INVOKE_ICON, ORBS, Orb, spellById } from '../data'
import type { GameState, Slot } from '../game'
import { Action, Binds, codeLabel } from '../keys'
import { Combo } from './OrbDot'
import { SpellIcon } from './SpellIcon'

interface Props {
  game: GameState
  binds: Binds
  pressed: Set<Action>
  settings: Settings
  best?: number
  lastResult: { ms: number; prevBest?: number } | null
  onStart: () => void
  onStop: () => void
}

export const fmt = (ms: number) => (ms / 1000).toFixed(2)

function useElapsed(game: GameState) {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    if (game.phase !== 'playing') return
    let raf = 0
    const tick = () => {
      setNow(performance.now())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [game.phase])
  if (game.phase === 'finished') return game.finishedMs ?? 0
  if (game.phase === 'playing') return Math.max(0, now - game.startedAt)
  return 0
}

export function GameBoard({ game, binds, pressed, settings, best, lastResult, onStart, onStop }: Props) {
  const elapsed = useElapsed(game)
  const done = game.splits.length

  return (
    <section className="board">
      {/* Remount on every result so the flash replays: green when a spell counts, red on a miss. */}
      {game.phase !== 'idle' && game.flash && (
        <div key={game.flash.n} className={`board-flash ${game.flash.ok ? 'ok' : 'bad'}`} aria-hidden />
      )}
      <div className="stats">
        <Stat label="Time" value={fmt(elapsed)} big />
        <Stat label="Progress" value={`${done}/${game.total}`} />
        <Stat label="Misses" value={String(game.misses)} warn={game.misses > 0} />
        <Stat label="Best" value={best != null ? fmt(best) : '—'} />
      </div>
      <div className="progress" aria-hidden>
        <div className="progress-fill" style={{ width: `${(done / game.total) * 100}%` }} />
      </div>

      <div className="stage">
        {game.phase === 'idle' && <IdleCard onStart={onStart} settings={settings} binds={binds} />}
        {game.phase === 'playing' && <TargetCard game={game} settings={settings} />}
        {game.phase === 'finished' && lastResult && (
          <ResultCard game={game} result={lastResult} onStart={onStart} onStop={onStop} />
        )}
      </div>

      <OrbTray orbs={game.orbs} />
      <AbilityBar game={game} binds={binds} pressed={pressed} />
    </section>
  )
}

function Stat({ label, value, big, warn }: { label: string; value: string; big?: boolean; warn?: boolean }) {
  return (
    <div className={`stat ${big ? 'big' : ''} ${warn ? 'warn' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

function IdleCard({ onStart, settings, binds }: { onStart: () => void; settings: Settings; binds: Binds }) {
  return (
    <div className="card idle">
      <img className="idle-icon" src={INVOKE_ICON} alt="" />
      <h2>Ready to invoke?</h2>
      <p className="muted">
        {settings.spellCount} {settings.spellCount === 1 ? 'spell' : 'spells'} ·{' '}
        {settings.requireCast
          ? `invoke, then cast with ${codeLabel(binds.spell1)} / ${codeLabel(binds.spell2)}`
          : 'invoke to complete'}
      </p>
      <button className="primary" onClick={(e) => (onStart(), e.currentTarget.blur())}>
        Start <kbd>Enter</kbd>
      </button>
    </div>
  )
}

function TargetCard({ game, settings }: { game: GameState; settings: Settings }) {
  const target = spellById(game.queue[0])
  const upcoming = game.queue.slice(1, 4).map(spellById)

  return (
    <div className="card target" key={game.queue[0]}>
      <SpellIcon spell={target} size={96} />
      <h2 className="target-name">{target?.name}</h2>
      {settings.showHints && target && <Combo combo={target.combo} size={16} />}
      {settings.showUpcoming && upcoming.length > 0 && (
        <div className="upcoming">
          <span className="muted">Next</span>
          {upcoming.map((s, i) => (
            <SpellIcon key={s?.id ?? i} spell={s} size={30 - i * 4} />
          ))}
        </div>
      )}
    </div>
  )
}

function ResultCard({
  game,
  result,
  onStart,
  onStop,
}: {
  game: GameState
  result: { ms: number; prevBest?: number }
  onStart: () => void
  onStop: () => void
}) {
  const isRecord = result.prevBest == null || result.ms < result.prevBest
  const delta = result.prevBest != null ? result.ms - result.prevBest : null
  const maxSplit = Math.max(...game.splits.map((s) => s.ms))
  const avg = result.ms / game.splits.length

  return (
    <div className="card result">
      {isRecord && <span className="badge">{result.prevBest == null ? 'First run' : 'New record'}</span>}
      <div className="result-time">{fmt(result.ms)}s</div>
      <p className="muted">
        {fmt(avg)}s per spell · {game.misses} {game.misses === 1 ? 'miss' : 'misses'}
        {delta != null && (
          <span className={delta < 0 ? 'good' : 'bad'}>
            {' '}
            · {delta < 0 ? '−' : '+'}
            {fmt(Math.abs(delta))}s vs best
          </span>
        )}
      </p>
      <ol className="splits">
        {game.splits.map((s, i) => {
          const spell = spellById(s.spellId)
          return (
            <li key={i} className={s.ms === maxSplit ? 'slowest' : ''}>
              <SpellIcon spell={spell} size={20} />
              <span className="split-name">{spell?.name}</span>
              <span className="split-bar">
                <i style={{ width: `${(s.ms / maxSplit) * 100}%` }} />
              </span>
              <span className="split-ms">{fmt(s.ms)}</span>
            </li>
          )
        })}
      </ol>
      <div className="result-actions">
        <button className="primary" onClick={(e) => (onStart(), e.currentTarget.blur())}>
          Again <kbd>Enter</kbd>
        </button>
        <button className="ghost" onClick={(e) => (onStop(), e.currentTarget.blur())}>
          Done <kbd>Esc</kbd>
        </button>
      </div>
    </div>
  )
}

function OrbTray({ orbs }: { orbs: Orb[] }) {
  return (
    <div className="orb-tray">
      <div className="orbs">
        {[0, 1, 2].map((i) => {
          const o = orbs[i]
          return <div key={`${i}-${o ?? 'x'}`} className={`orb ${o ?? 'empty'}`} title={o ? ORBS[o].name : ''} />
        })}
      </div>
    </div>
  )
}

function AbilityBar({ game, binds, pressed }: { game: GameState; binds: Binds; pressed: Set<Action> }) {
  return (
    <div className="ability-bar">
      {(['q', 'w', 'e'] as const).map((o) => (
        <Ability key={o} keyLabel={codeLabel(binds[o])} pressed={pressed.has(o)}>
          <img src={ORBS[o].icon} alt={ORBS[o].name} draggable={false} />
        </Ability>
      ))}
      <span className="bar-gap" />
      {/* Slots only matter when spells must be cast, so plain Invoke mode hides them. */}
      {game.requireCast &&
        ([1, 2] as Slot[]).map((slot) => {
          const id = slot === 1 ? game.slot1 : game.slot2
          const action: Action = slot === 1 ? 'spell1' : 'spell2'
          const fx = game.castFx?.slot === slot ? game.castFx : null
          return (
            <Ability
              key={slot}
              keyLabel={codeLabel(binds[action])}
              pressed={pressed.has(action)}
              fx={fx}
            >
              <SpellIcon spell={spellById(id)} size={64} />
            </Ability>
          )
        })}
      {game.requireCast && <span className="bar-gap" />}
      <Ability keyLabel={codeLabel(binds.invoke)} pressed={pressed.has('invoke')}>
        <img src={INVOKE_ICON} alt="Invoke" draggable={false} />
      </Ability>
    </div>
  )
}

function Ability({
  keyLabel,
  pressed,
  fx,
  children,
}: {
  keyLabel: string
  pressed: boolean
  fx?: { ok: boolean; n: number } | null
  children: React.ReactNode
}) {
  return (
    <div className={`ability ${pressed ? 'pressed' : ''}`}>
      {children}
      {fx && <span key={fx.n} className={`cast-fx ${fx.ok ? 'ok' : 'bad'}`} />}
      <kbd className="ability-key">{keyLabel}</kbd>
    </div>
  )
}
