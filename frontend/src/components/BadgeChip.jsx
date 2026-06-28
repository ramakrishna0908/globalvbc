export default function BadgeChip({ name, icon = '🏅', earned = false, requirement }) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center ${
        earned
          ? 'border-brand-500/40 bg-brand-500/10'
          : 'border-border-default bg-bg-surface opacity-60 grayscale'
      }`}
      title={earned ? `${name} — earned` : requirement || `${name} — locked`}
    >
      <span className="text-3xl" aria-hidden="true">
        {earned ? icon : '🔒'}
      </span>
      <span className="text-sm font-semibold text-text-primary">{name}</span>
      {!earned && requirement ? (
        <span className="text-xs text-text-muted">{requirement}</span>
      ) : null}
    </div>
  );
}
