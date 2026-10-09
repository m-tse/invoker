import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { buildQueue, clampCount, initialState, reducer } from './game'
import { Action, ACTIONS, Binds, DEFAULT_BINDS, mouseCode, RESERVED_CODES } from './keys'
import { load, save } from './storage'
import { ControlsPanel } from './components/ControlsPanel'
import { GameBoard } from './components/GameBoard'
import { SpellList } from './components/SpellList'
import { BindOverlay } from './components/BindOverlay'
import { SpellCount } from './components/SpellCount'
import { playSound, setVolume, unlockAudio } from './sound'

export interface Settings {
  requireCast: boolean
  showUpcoming: boolean
  showHints: boolean
  spellCount: number
  sound: boolean
  volume: number
}

const DEFAULT_SETTINGS: Settings = {
  requireCast: false,
  showUpcoming: true,
  showHints: true,
  spellCount: 10,
  sound: true,
  volume: 0.6,
}

// 10-spell runs keep the original key so earlier bests still show up.
export const bestKey = (requireCast: boolean, count: number) =>
  `${requireCast ? 'cast' : 'invoke'}${count === 10 ? '' : `:${count}`}`

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => {
    const s = load('settings', DEFAULT_SETTINGS)
    return { ...s, spellCount: clampCount(s.spellCount) }
  })
  const [binds, setBinds] = useState<Binds>(() => load('binds', DEFAULT_BINDS))
  const [bests, setBests] = useState<Record<string, number>>(() => load('bests', {}))
  const [binding, setBinding] = useState<Action | null>(null)
  const [bindError, setBindError] = useState<string | null>(null)
  const [pressed, setPressed] = useState<Set<Action>>(new Set())
  const [game, dispatch] = useReducer(reducer, undefined, () =>
    initialState(settings.requireCast, settings.spellCount),
  )
  const [lastResult, setLastResult] = useState<{ ms: number; prevBest?: number } | null>(null)

  useEffect(() => save('settings', settings), [settings])
  useEffect(() => save('binds', binds), [binds])
  useEffect(() => save('bests', bests), [bests])
  useEffect(() => setVolume(settings.sound ? settings.volume : 0), [settings.sound, settings.volume])

  // Cast sounds: in cast mode, every cast of a slotted spell (right or wrong, like in Dota);
  // in plain Invoke mode there is no casting, so a correct invoke plays the spell instead.
  useEffect(() => {
    if (game.invokes === 0) return
    playSound('invoke')
    // Practice in plain Invoke mode has no casting, so the invoked spell (now in slot 1) plays too.
    if (!game.requireCast && game.phase !== 'playing' && game.slot1) playSound(game.slot1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.invokes])
  useEffect(() => {
    if (!game.requireCast || !game.castFx) return
    const id = game.castFx.slot === 1 ? game.slot1 : game.slot2
    if (id) playSound(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.castFx?.n])
  useEffect(() => {
    const last = game.splits[game.splits.length - 1]
    if (!game.requireCast && last) playSound(last.spellId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.splits.length])

  // Switching cast rules or run length resets the board.
  useEffect(() => {
    dispatch({ type: 'reset', requireCast: settings.requireCast, count: settings.spellCount })
    setLastResult(null)
  }, [settings.requireCast, settings.spellCount])

  useEffect(() => {
    if (game.phase !== 'finished' || game.finishedMs == null) return
    const key = bestKey(game.requireCast, game.total)
    const prevBest = bests[key]
    setLastResult({ ms: game.finishedMs, prevBest })
    if (prevBest == null || game.finishedMs < prevBest) setBests((b) => ({ ...b, [key]: game.finishedMs! }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase, game.finishedMs])

  const start = useCallback(() => {
    setLastResult(null)
    // Shuffle here, not in the reducer: reducers must stay pure (StrictMode runs them twice).
    const queue = buildQueue(settings.spellCount)
    dispatch({ type: 'start', requireCast: settings.requireCast, queue, now: performance.now() })
  }, [settings.requireCast, settings.spellCount])

  const stop = useCallback(() => {
    setLastResult(null)
    dispatch({ type: 'reset', requireCast: settings.requireCast, count: settings.spellCount })
  }, [settings.requireCast, settings.spellCount])

  const assignBind = useCallback((action: Action, code: string) => {
    if (RESERVED_CODES.has(code)) {
      setBindError('Enter and Escape are reserved for starting and stopping the game.')
      return
    }
    setBinds((prev) => {
      const next = { ...prev, [action]: code }
      // If another action already used this key, give it this action's old key (swap).
      const clash = ACTIONS.find((a) => a !== action && prev[a] === code)
      if (clash) next[clash] = prev[action]
      return next
    })
    setBinding(null)
    setBindError(null)
  }, [])

  const handleAction = useCallback((action: Action) => {
    const now = performance.now()
    if (action === 'q' || action === 'w' || action === 'e') dispatch({ type: 'orb', orb: action })
    else if (action === 'invoke') dispatch({ type: 'invoke', now })
    else dispatch({ type: 'cast', slot: action === 'spell1' ? 1 : 2, now })
  }, [])

  // Keep a ref to the latest handlers so the global listeners are attached only once.
  const ctx = useRef({ binds, binding, phase: game.phase, start, stop, assignBind, handleAction })
  ctx.current = { binds, binding, phase: game.phase, start, stop, assignBind, handleAction }

  useEffect(() => {
    const actionFor = (code: string) => ACTIONS.find((a) => ctx.current.binds[a] === code)
    const press = (a: Action, down: boolean) =>
      setPressed((p) => {
        if (p.has(a) === down) return p
        const n = new Set(p)
        down ? n.add(a) : n.delete(a)
        return n
      })

    const onKeyDown = (e: KeyboardEvent) => {
      unlockAudio()
      const c = ctx.current
      if (!c.binding && e.target instanceof HTMLInputElement && e.target.type === 'text') return // typing in a field
      if (c.binding) {
        e.preventDefault()
        if (e.code === 'Escape') {
          setBinding(null)
          setBindError(null)
        } else c.assignBind(c.binding, e.code)
        return
      }
      if (e.metaKey && !e.code.startsWith('Meta')) return // leave browser shortcuts alone
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault()
        if (!e.repeat) c.start()
        return
      }
      if (e.code === 'Escape') {
        c.stop()
        return
      }
      const action = actionFor(e.code)
      if (!action) return
      e.preventDefault()
      press(action, true)
      if (!e.repeat) c.handleAction(action)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const action = actionFor(e.code)
      if (action) press(action, false)
    }

    const onMouseDown = (e: MouseEvent) => {
      unlockAudio()
      const code = mouseCode(e.button)
      const c = ctx.current
      if (!code) return
      if (c.binding) {
        e.preventDefault()
        c.assignBind(c.binding, code)
        return
      }
      const action = actionFor(code)
      if (!action) return
      e.preventDefault()
      press(action, true)
      c.handleAction(action)
    }

    const onMouseUp = (e: MouseEvent) => {
      const code = mouseCode(e.button)
      const action = code && actionFor(code)
      if (!action) return
      e.preventDefault() // stops back/forward navigation on side buttons
      press(action, false)
    }

    const onBlur = () => setPressed(new Set())

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }))

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-orbs" aria-hidden>
            <i className="o q" />
            <i className="o w" />
            <i className="o e" />
          </span>
          <h1>Invoker Trainer</h1>
        </div>
        <div className="topbar-controls">
          <SpellCount value={settings.spellCount} onChange={(n) => update({ spellCount: n })} />
          <div className="segmented" role="radiogroup" aria-label="Completion rule">
            {[false, true].map((rc) => (
              <button
                key={String(rc)}
                role="radio"
                aria-checked={settings.requireCast === rc}
                className={settings.requireCast === rc ? 'active' : ''}
                onClick={(e) => {
                  update({ requireCast: rc })
                  e.currentTarget.blur()
                }}
                title={rc ? 'Invoke the spell, then cast it with Spell 1 / Spell 2' : 'A spell counts as soon as it is invoked'}
              >
                {rc ? 'Invoke + Cast' : 'Invoke'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="layout">
        <ControlsPanel
          binds={binds}
          settings={settings}
          onBind={(a) => {
            setBindError(null)
            setBinding(a)
          }}
          onReset={() => setBinds(DEFAULT_BINDS)}
          onSettings={update}
        />
        <GameBoard
          game={game}
          binds={binds}
          pressed={pressed}
          settings={settings}
          best={bests[bestKey(settings.requireCast, settings.spellCount)]}
          lastResult={lastResult}
          onStart={start}
          onStop={stop}
        />
        <SpellList game={game} showHints={settings.showHints} />
      </main>

      <footer className="footer">
        Inspired by <a href="https://invoker-game.com/">invoker-game.com</a> by ozzy. Dota 2 is a trademark of
        Valve Corporation.
      </footer>

      {binding && (
        <BindOverlay
          action={binding}
          current={binds[binding]}
          error={bindError}
          onCancel={() => {
            setBinding(null)
            setBindError(null)
          }}
        />
      )}
    </div>
  )
}
