import { Orb, ORBS } from '../data'

export function OrbDot({ orb, size = 14 }: { orb: Orb; size?: number }) {
  return <i className={`orb-dot ${orb}`} style={{ width: size, height: size }} title={ORBS[orb].name} />
}

export function Combo({ combo, size }: { combo: Orb[]; size?: number }) {
  return (
    <span className="combo">
      {combo.map((o, i) => (
        <OrbDot key={i} orb={o} size={size} />
      ))}
    </span>
  )
}
