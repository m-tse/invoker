import { useState } from 'react'
import { ORBS, Spell } from '../data'

// Spells use Valve's CDN icon. If it fails to load (offline, CDN change) we fall back to
// a generated tile striped in their orb colours, in combo order.
export function SpellIcon({ spell, size = 56 }: { spell: Spell | null; size?: number }) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size }

  if (!spell) return <div className="spell-icon empty" style={style} />

  if (spell.icon && !failed) {
    return (
      <img
        className="spell-icon"
        style={style}
        src={spell.icon}
        alt={spell.name}
        draggable={false}
        onError={() => setFailed(true)}
      />
    )
  }

  const initials = spell.name
    .split(/\s+/)
    .filter((w) => !/^of$/i.test(w))
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
  const [a, b, c] = spell.combo.map((o) => ORBS[o].color)
  return (
    <div
      className="spell-icon generated"
      style={{
        ...style,
        fontSize: size * 0.34,
        background: `linear-gradient(135deg, ${a} 0 33%, ${b} 33% 66%, ${c} 66% 100%)`,
      }}
      aria-label={spell.name}
    >
      <span>{initials}</span>
    </div>
  )
}
