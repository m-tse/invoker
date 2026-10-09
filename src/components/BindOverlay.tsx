import { Action, ACTION_LABELS, codeLabel } from '../keys'

interface Props {
  action: Action
  current: string
  error: string | null
  onCancel: () => void
}

export function BindOverlay({ action, current, error, onCancel }: Props) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <p className="overlay-label">Rebinding</p>
        <h2>{ACTION_LABELS[action]}</h2>
        <p className="overlay-prompt">Press any key, or middle / side mouse button</p>
        <p className="overlay-current">
          Current: <kbd>{codeLabel(current)}</kbd>
        </p>
        {error && <p className="overlay-error">{error}</p>}
        <p className="overlay-hint">
          <kbd>Esc</kbd> to cancel
        </p>
      </div>
    </div>
  )
}
