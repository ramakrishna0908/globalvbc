const ACCENTS = {
  blue: 'bg-accent-500',
  gold: 'bg-brand-500',
  success: 'bg-status-success',
  teal: 'bg-[rgb(var(--chart-series-3))]',
  violet: 'bg-accent-500',
};

export default function ProgressBar({ value, max = 100, accent = 'blue', label, showValue = true }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-baseline justify-between text-sm">
          <span className="font-semibold text-text-secondary">{label}</span>
          {showValue ? <span className="font-display font-bold tabular-nums text-text-primary">{Math.round(value)}</span> : null}
        </div>
      ) : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}>
        <div className={`h-full rounded-full transition-[width] ${ACCENTS[accent] || ACCENTS.blue}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
