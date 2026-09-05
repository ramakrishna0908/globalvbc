/**
 * Quick stat actions. The six primary actions are always visible; "More"
 * reveals the full action vocabulary. Every target is ≥ 56px tall. Each
 * action carries the scorer's shorthand (D, S, SP …) instead of an icon.
 */
export const PRIMARY_ACTIONS = [
  { key: 'dig', label: 'Dig', abbr: 'D' },
  { key: 'set', label: 'Set', abbr: 'S' },
  { key: 'attack', label: 'Spike', abbr: 'SP' },
  { key: 'block', label: 'Block', abbr: 'B' },
  { key: 'serve', label: 'Serve', abbr: 'SV' },
  { key: 'receive', label: 'Receive', abbr: 'R' },
];

export const MORE_ACTIONS = [
  { key: 'kill', label: 'Kill', abbr: 'K' },
  { key: 'attack_error', label: 'Attack error', abbr: 'AE' },
  { key: 'ace', label: 'Ace', abbr: 'A' },
  { key: 'serve_error', label: 'Serve error', abbr: 'SE' },
  { key: 'assist', label: 'Assist', abbr: 'AS' },
  { key: 'block_assist', label: 'Block assist', abbr: 'BA' },
  { key: 'receive_positive', label: 'Receive +', abbr: 'R+' },
  { key: 'receive_negative', label: 'Receive −', abbr: 'R−' },
  { key: 'defensive_error', label: 'Def. error', abbr: 'DE' },
];

export const ACTION_LABELS = Object.fromEntries([...PRIMARY_ACTIONS, ...MORE_ACTIONS].map((a) => [a.key, a.label]));
export const ACTION_ABBR = Object.fromEntries([...PRIMARY_ACTIONS, ...MORE_ACTIONS].map((a) => [a.key, a.abbr]));

export function ActionButton({ action, selected, onSelect, size = 'md', className = '' }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(action.key)}
      aria-pressed={selected}
      data-testid={`action-${action.key}`}
      className={`flex items-center justify-center gap-2 rounded-lg border font-display font-bold uppercase tracking-wide transition-colors ${size === 'lg' ? 'min-h-16 px-3 text-base' : 'min-h-14 px-2 text-sm'} ${
        selected ? 'border-accent-500 bg-accent-500 text-white' : 'border-border-strong bg-bg-card text-text-primary hover:border-accent-400 hover:bg-bg-elevated'
      } ${className}`}
    >
      <span className={`flex h-6 min-w-6 items-center justify-center rounded px-1 text-2xs ${selected ? 'bg-white/20 text-white' : 'bg-bg-elevated text-text-secondary'}`} aria-hidden="true">
        {action.abbr || action.icon}
      </span>
      <span className="truncate">{action.label}</span>
    </button>
  );
}

export default function QuickActionBar({ selected, onSelect, showMore, onToggleMore, disabled }) {
  return (
    <div aria-label="Quick stats" role="group" className={disabled ? 'pointer-events-none opacity-50' : ''}>
      <div className="mb-2 flex items-center justify-between">
        <span className="eyebrow">Quick stats</span>
        <button type="button" onClick={onToggleMore} className="min-h-11 px-2 text-xs font-bold uppercase tracking-wide text-accent-400 hover:underline" aria-expanded={showMore}>
          {showMore ? 'Fewer actions' : 'More actions'}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {PRIMARY_ACTIONS.map((a) => (
          <ActionButton key={a.key} action={a} selected={selected === a.key} onSelect={onSelect} size="lg" />
        ))}
      </div>
      {showMore ? (
        <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-5" data-testid="more-actions">
          {MORE_ACTIONS.map((a) => (
            <ActionButton key={a.key} action={a} selected={selected === a.key} onSelect={onSelect} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
