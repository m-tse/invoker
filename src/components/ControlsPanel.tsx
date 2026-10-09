import type { Settings } from '../App'
import { INVOKE_ICON, ORBS } from '../data'
import { Action, ACTION_LABELS, Binds, codeLabel, DEFAULT_BINDS } from '../keys'

interface Props {
  binds: Binds
  settings: Settings
  onBind: (a: Action) => void
  onReset: () => void
  onSettings: (patch: Partial<Settings>) => void
}

const GROUPS: { title: string; actions: Action[] }[] = [
  { title: 'Orbs', actions: ['q', 'w', 'e', 'invoke'] },
  { title: 'Spell slots', actions: ['spell1', 'spell2'] },
]

function ActionGlyph({ action }: { action: Action }) {
  if (action === 'q' || action === 'w' || action === 'e')
    return <img className="glyph" src={ORBS[action].icon} alt="" draggable={false} />
  if (action === 'invoke') return <img className="glyph" src={INVOKE_ICON} alt="" draggable={false} />
  return <span className="glyph slot-glyph">{action === 'spell1' ? '1' : '2'}</span>
}

export function ControlsPanel({ binds, settings, onBind, onReset, onSettings }: Props) {
  const isDefault = (Object.keys(DEFAULT_BINDS) as Action[]).every((a) => binds[a] === DEFAULT_BINDS[a])

  return (
    <aside className="panel">
      <div className="panel-head">
        <h2>Keybinds</h2>
        <button className="link-btn" onClick={onReset} disabled={isDefault}>
          Reset
        </button>
      </div>

      {GROUPS.map((g) => (
        <section key={g.title} className="bind-group">
          <h3>{g.title}</h3>
          {g.actions.map((a) => (
            <button
              key={a}
              className="bind-row"
              onClick={(e) => {
                onBind(a)
                e.currentTarget.blur()
              }}
            >
              <ActionGlyph action={a} />
              <span className="bind-name">{ACTION_LABELS[a]}</span>
              <kbd className={binds[a] !== DEFAULT_BINDS[a] ? 'custom' : ''}>{codeLabel(binds[a])}</kbd>
            </button>
          ))}
        </section>
      ))}

      <section className="bind-group">
        <h3>Options</h3>
        <Toggle
          label="Show upcoming spells"
          checked={settings.showUpcoming}
          onChange={(v) => onSettings({ showUpcoming: v })}
        />
        <Toggle
          label="Show combo hints"
          checked={settings.showHints}
          onChange={(v) => onSettings({ showHints: v })}
        />
        <Toggle label="Sound effects" checked={settings.sound} onChange={(v) => onSettings({ sound: v })} />
        <label className={`volume ${settings.sound ? '' : 'disabled'}`}>
          <span>Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            disabled={!settings.sound}
            onChange={(e) => onSettings({ volume: Number(e.target.value) })}
            onPointerUp={(e) => e.currentTarget.blur()}
          />
        </label>
      </section>

      <section className="bind-group help">
        <h3>How to play</h3>
        <p>
          <kbd>Enter</kbd> start / restart · <kbd>Esc</kbd> stop
        </p>
        <p>
          Invoke every spell as fast as you can. In <b>Invoke + Cast</b> mode, a spell only counts once you cast it
          from its slot with <kbd>{codeLabel(binds.spell1)}</kbd> or <kbd>{codeLabel(binds.spell2)}</kbd>.
        </p>
      </section>
    </aside>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked)
          e.currentTarget.blur()
        }}
      />
      <span className="track" aria-hidden />
      <span>{label}</span>
    </label>
  )
}
