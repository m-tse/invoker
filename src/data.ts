export type Orb = 'q' | 'w' | 'e'

export interface Spell {
  id: string
  name: string
  combo: [Orb, Orb, Orb]
  icon: string
}

const CDN = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities'
export const abilityIcon = (slug: string) => `${CDN}/invoker_${slug}.png`

export const ORBS: Record<Orb, { name: string; icon: string; color: string }> = {
  q: { name: 'Quas', icon: abilityIcon('quas'), color: '#5fd0ff' },
  w: { name: 'Wex', icon: abilityIcon('wex'), color: '#d27bff' },
  e: { name: 'Exort', icon: abilityIcon('exort'), color: '#ff9b3d' },
}
export const INVOKE_ICON = abilityIcon('invoke')

const spell = (slug: string, name: string, combo: string): Spell => ({
  id: slug,
  name,
  combo: combo.split('') as Spell['combo'],
  icon: abilityIcon(slug),
})

export const SPELLS: Spell[] = [
  spell('cold_snap', 'Cold Snap', 'qqq'),
  spell('ghost_walk', 'Ghost Walk', 'qqw'),
  spell('ice_wall', 'Ice Wall', 'qqe'),
  spell('emp', 'E.M.P.', 'www'),
  spell('tornado', 'Tornado', 'qww'),
  spell('alacrity', 'Alacrity', 'wwe'),
  spell('sun_strike', 'Sun Strike', 'eee'),
  spell('forge_spirit', 'Forge Spirit', 'qee'),
  spell('chaos_meteor', 'Chaos Meteor', 'wee'),
  spell('deafening_blast', 'Deafening Blast', 'qwe'),
]

const comboKey = (orbs: Orb[]) => [...orbs].sort().join('')
const LOOKUP = new Map(SPELLS.map((s) => [comboKey(s.combo), s]))

// Orb order doesn't matter in Dota 2: QWE and EWQ both make Deafening Blast.
export function resolveSpell(orbs: Orb[]): Spell | null {
  if (orbs.length < 3) return null
  return LOOKUP.get(comboKey(orbs)) ?? null
}

export const spellById = (id: string | null) => SPELLS.find((s) => s.id === id) ?? null
