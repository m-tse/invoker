import { useEffect, useRef, useState } from 'react'
import { clampCount, MAX_SPELLS, MIN_SPELLS } from '../game'

interface Props {
  value: number
  onChange: (n: number) => void
}

// Number of spells per run. The text field keeps a draft so typing "2" on the way to "25"
// doesn't reset the board mid-edit; it commits on blur or Enter.
export function SpellCount({ value, onChange }: Props) {
  const [draft, setDraft] = useState(String(value))
  const cancelled = useRef(false)
  useEffect(() => setDraft(String(value)), [value])

  const commit = (n: number) => {
    const clamped = clampCount(n)
    if (clamped !== value) onChange(clamped)
    else setDraft(String(value))
  }

  return (
    <div className="spell-count" title={`Spells per run (${MIN_SPELLS}–${MAX_SPELLS})`}>
      <span className="spell-count-label">Spells</span>
      <button
        aria-label="Fewer spells"
        disabled={value <= MIN_SPELLS}
        onClick={(e) => (commit(value - 1), e.currentTarget.blur())}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label="Spells per run"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
        onBlur={() => {
          if (cancelled.current) setDraft(String(value))
          else if (draft !== '') commit(Number(draft))
          else setDraft(String(value))
          cancelled.current = false
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') {
            cancelled.current = e.key === 'Escape'
            e.currentTarget.blur()
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            commit(value + (e.key === 'ArrowUp' ? 1 : -1))
          }
        }}
      />
      <button
        aria-label="More spells"
        disabled={value >= MAX_SPELLS}
        onClick={(e) => (commit(value + 1), e.currentTarget.blur())}
      >
        +
      </button>
    </div>
  )
}
