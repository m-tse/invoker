import { Orb, resolveSpell, SPELLS } from './data'

export const MIN_SPELLS = 1
export const MAX_SPELLS = 100
export const clampCount = (n: number) => Math.min(MAX_SPELLS, Math.max(MIN_SPELLS, Number.isFinite(n) ? Math.round(n) : 10))

export type Phase = 'idle' | 'playing' | 'finished'
export type Slot = 1 | 2

export interface Split {
  spellId: string
  ms: number
}

export interface GameState {
  phase: Phase
  requireCast: boolean
  orbs: Orb[]
  slot1: string | null
  slot2: string | null
  queue: string[] // queue[0] is the current target
  total: number
  startedAt: number
  lastSplitAt: number
  finishedMs: number | null
  splits: Split[]
  misses: number
  // Count of successful invokes, so the UI can play the invoke sound.
  invokes: number
  // Latest correct/miss result; n bumps every time so the UI can replay the board flash.
  flash: { ok: boolean; n: number } | null
  // Bumped on every cast so the UI can replay the slot animation.
  castFx: { slot: Slot; ok: boolean; n: number } | null
}

export type GameAction =
  | { type: 'start'; requireCast: boolean; queue: string[]; now: number }
  | { type: 'reset'; requireCast: boolean; count: number }
  | { type: 'orb'; orb: Orb }
  | { type: 'invoke'; now: number }
  | { type: 'cast'; slot: Slot; now: number }

export const shuffle = <T,>(xs: T[]) => {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// A run of `count` spells: whole shuffled decks of the 10 spells, trimmed to length, so every
// spell appears as evenly as possible. A spell never follows itself (it would already be in slot 1).
export function buildQueue(count: number): string[] {
  const ids = SPELLS.map((s) => s.id)
  const queue: string[] = []
  while (queue.length < count) {
    const deck = shuffle(ids)
    if (deck[0] === queue[queue.length - 1]) [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]]
    queue.push(...deck)
  }
  return queue.slice(0, count)
}

export const initialState = (requireCast: boolean, count: number): GameState => ({
  phase: 'idle',
  requireCast,
  orbs: [],
  slot1: null,
  slot2: null,
  queue: [],
  total: count,
  startedAt: 0,
  lastSplitAt: 0,
  finishedMs: null,
  splits: [],
  misses: 0,
  invokes: 0,
  castFx: null,
  flash: null,
})

const flash = (s: GameState, ok: boolean) => ({ ok, n: (s.flash?.n ?? 0) + 1 })
const miss = (s: GameState): GameState => ({ ...s, misses: s.misses + 1, flash: flash(s, false) })

function advance(prev: GameState, now: number): GameState {
  const s = { ...prev, flash: flash(prev, true) }
  const splits = [...s.splits, { spellId: s.queue[0], ms: now - s.lastSplitAt }]
  const queue = s.queue.slice(1)
  if (queue.length === 0) {
    return { ...s, queue, splits, phase: 'finished', finishedMs: now - s.startedAt }
  }
  return { ...s, queue, splits, lastSplitAt: now }
}

export function reducer(s: GameState, a: GameAction): GameState {
  switch (a.type) {
    case 'start':
      return {
        ...initialState(a.requireCast, a.queue.length),
        phase: 'playing',
        queue: a.queue,
        startedAt: a.now,
        lastSplitAt: a.now,
      }
    case 'reset':
      return initialState(a.requireCast, a.count)
  }

  if (s.phase !== 'playing') return s

  switch (a.type) {
    case 'orb':
      return { ...s, orbs: [...s.orbs, a.orb].slice(-3) }

    case 'invoke': {
      const spell = resolveSpell(s.orbs)
      if (!spell) return s
      // Dota slot rules: re-invoking slot 1 is a no-op, slot 2 swaps up, anything new pushes down.
      let { slot1, slot2 } = s
      if (spell.id === slot2) [slot1, slot2] = [slot2, slot1]
      else if (spell.id !== slot1) [slot1, slot2] = [spell.id, slot1]
      const next = { ...s, slot1, slot2, invokes: s.invokes + 1 }

      // In cast mode only casting is judged, so any invoke just rearranges the slots.
      if (s.requireCast) return next
      if (spell.id === s.queue[0]) return advance(next, a.now)
      // Invoking the wrong spell is a miss, unless it was already sitting in a slot (a free swap).
      const wasSlotted = spell.id === s.slot1 || spell.id === s.slot2
      return wasSlotted ? next : miss(next)
    }

    case 'cast': {
      const spellId = a.slot === 1 ? s.slot1 : s.slot2
      const ok = spellId != null && spellId === s.queue[0]
      const castFx = { slot: a.slot, ok: ok || !s.requireCast, n: (s.castFx?.n ?? 0) + 1 }
      if (!s.requireCast) return spellId ? { ...s, castFx } : s
      if (ok) return advance({ ...s, castFx }, a.now)
      return miss({ ...s, castFx })
    }
  }
}
