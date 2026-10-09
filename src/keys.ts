export type Action = 'q' | 'w' | 'e' | 'invoke' | 'spell1' | 'spell2'

export type Binds = Record<Action, string>

export const ACTIONS: Action[] = ['q', 'w', 'e', 'invoke', 'spell1', 'spell2']

export const ACTION_LABELS: Record<Action, string> = {
  q: 'Quas',
  w: 'Wex',
  e: 'Exort',
  invoke: 'Invoke',
  spell1: 'Spell 1',
  spell2: 'Spell 2',
}

// Bindings are stored as KeyboardEvent.code (layout-independent) or "Mouse3".."Mouse5".
export const DEFAULT_BINDS: Binds = {
  q: 'KeyQ',
  w: 'KeyW',
  e: 'KeyE',
  invoke: 'KeyR',
  spell1: 'KeyD',
  spell2: 'KeyF',
}

// Enter and Escape drive the game itself, so they can't be bound.
export const RESERVED_CODES = new Set(['Enter', 'NumpadEnter', 'Escape'])

const NAMED: Record<string, string> = {
  Space: 'Space',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Tab: 'Tab',
  CapsLock: 'Caps',
  Backspace: 'Bksp',
  ShiftLeft: 'L-Shift',
  ShiftRight: 'R-Shift',
  ControlLeft: 'L-Ctrl',
  ControlRight: 'R-Ctrl',
  AltLeft: 'L-Alt',
  AltRight: 'R-Alt',
  MetaLeft: 'L-Meta',
  MetaRight: 'R-Meta',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Mouse2: 'Mouse 3',
  Mouse3: 'Mouse 4',
  Mouse4: 'Mouse 5',
}

export function codeLabel(code: string): string {
  if (NAMED[code]) return NAMED[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`
  return code
}

// MouseEvent.button: 1 = middle, 3 = back, 4 = forward. Left/right click stay free for the UI.
export const mouseCode = (button: number) => (button >= 1 && button !== 2 ? `Mouse${button + 1}` : null)
