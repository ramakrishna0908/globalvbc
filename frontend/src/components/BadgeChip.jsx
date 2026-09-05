import Icon from './ui/Icon.jsx';

/** Achievement tile. Badge icons come from the API as emoji. */
export default function BadgeChip({ name, icon = '🏅', earned = false, requirement }) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center ${earned ? 'border-brand-500/40 bg-brand-500/10' : 'border-border-default bg-bg-surface text-text-muted'}`}
      title={earned ? `${name} — earned` : requirement || `${name} — locked`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full text-2xl ${earned ? 'bg-brand-500/15' : 'bg-bg-elevated grayscale'}`} aria-hidden="true">
        {earned ? icon : <Icon name="lock" size={18} className="text-text-muted" />}
      </span>
      <span className={`text-sm font-bold leading-tight ${earned ? 'text-text-primary' : 'text-text-secondary'}`}>{name}</span>
      {!earned && requirement ? <span className="text-xs text-text-muted">{requirement}</span> : null}
      <span className="sr-only">{earned ? 'Earned' : 'Locked'}</span>
    </div>
  );
}
