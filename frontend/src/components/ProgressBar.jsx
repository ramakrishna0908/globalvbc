const ACCENTS = {
  blue: 'bg-accent-500',
  gold: 'bg-brand-500',
  violet: 'bg-violet-500',
};

export default function ProgressBar({ value, max = 100, accent = 'blue', label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      {label ? (
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-text-secondary">{label}</span>
          <span className="text-text-muted">{Math.round(value)}</span>
        </div>
      ) : null}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated"
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`h-full rounded-full transition-all ${ACCENTS[accent] || ACCENTS.blue}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
