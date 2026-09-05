/**
 * Segmented filter (All / Live / Upcoming …) rendered as pressed buttons.
 * `options` = [{ key, label, count? }]. Horizontally scrollable on phones.
 */
export default function FilterChips({ options, value, onChange, label = 'Filter', className = '' }) {
  return (
    <div role="group" aria-label={label} className={`-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 ${className}`}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.key)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 font-display text-sm font-bold uppercase tracking-wide transition-colors ${
              active ? 'border-accent-500 bg-accent-500 text-white' : 'border-border-strong bg-bg-card text-text-secondary hover:border-accent-400 hover:text-text-primary'
            }`}
          >
            {o.label}
            {o.count != null && o.count !== 0 ? <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/20 text-white' : 'bg-bg-elevated text-text-muted'}`}>{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
