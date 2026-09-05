/**
 * Quick stat actions. The six primary actions are always visible; "More"
 * reveals the full action vocabulary. Every target is ≥ 56px tall.
 */
export const PRIMARY_ACTIONS = [
  { key: 'dig', label: 'Dig', icon: '🛡️' },
  { key: 'set', label: 'Set', icon: '🤲' },
  { key: 'attack', label: 'Spike', icon: '💥' },
  { key: 'block', label: 'Block', icon: '🧱' },
  { key: 'serve', label: 'Serve', icon: '🎯' },
  { key: 'receive', label: 'Receive', icon: '📥' },
];

export const MORE_ACTIONS = [
  { key: 'kill', label: 'Kill', icon: '🔥' },
  { key: 'attack_error', label: 'Attack error', icon: '❌' },
  { key: 'ace', label: 'Ace', icon: '⚡' },
  { key: 'serve_error', label: 'Serve error', icon: '🚫' },
  { key: 'assist', label: 'Assist', icon: '🎯' },
  { key: 'block_assist', label: 'Block assist', icon: '🧱' },
  { key: 'receive_positive', label: 'Receive +', icon: '👍' },
  { key: 'receive_negative', label: 'Receive −', icon: '👎' },
  { key: 'defensive_error', label: 'Def. error', icon: '⚠️' },
];

export const ACTION_LABELS = Object.fromEntries([...PRIMARY_ACTIONS, ...MORE_ACTIONS].map((a) => [a.key, a.label]));

export function ActionButton({ action, selected, onSelect, size = 'md', className = '' }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(action.key)}
      aria-pressed={selected}
      data-testid={`action-${action.key}`}
      className={`flex items-center justify-center gap-1.5 rounded-xl border font-bold uppercase tracking-wide transition-colors ${
        size === 'lg' ? 'min-h-[64px] px-3 text-base' : 'min-h-[56px] px-2 text-sm'
      } ${
        selected
          ? 'border-accent-500 bg-accent-500 text-white'
          : 'border-border-strong bg-bg-card text-text-primary hover:border-accent-500 hover:bg-bg-elevated'
      } ${className}`}
    >
      <span aria-hidden="true">{action.icon}</span>
      <span className="truncate">{action.label}</span>
    </button>
  );
}

export default function QuickActionBar({ selected, onSelect, showMore, onToggleMore, disabled }) {
  return (
    <div aria-label="Quick stats" role="group" className={disabled ? 'pointer-events-none opacity-50' : ''}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">Quick stats</span>
        <button type="button" onClick={onToggleMore} className="min-h-[44px] px-2 text-xs font-semibold text-accent-400 hover:underline" aria-expanded={showMore}>
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
