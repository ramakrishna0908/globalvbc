import Card from './Card.jsx';

const ACCENTS = {
  gold: 'text-brand-400',
  blue: 'text-accent-400',
  success: 'text-status-success',
  danger: 'text-status-danger',
  live: 'text-status-danger',
  default: 'text-text-primary',
};

/**
 * Number tile. `size="sm"` is the compact tournament/team overview tile;
 * default is the dashboard stat card. `accent` colours the value.
 */
export default function StatCard({ label, value, sublabel, accent = 'default', icon, size = 'md', align = 'left', className = '' }) {
  const color = ACCENTS[accent] || ACCENTS.default;
  const center = align === 'center' ? 'items-center text-center' : '';
  if (size === 'sm') {
    return (
      <Card className={`flex flex-col justify-center px-3 py-2.5 ${center} ${className}`}>
        <div className={`num-display text-2xl ${color}`}>{value ?? 0}</div>
        <div className="eyebrow mt-0.5 !text-[10px]">{label}</div>
        {sublabel ? <div className="mt-0.5 text-xs text-text-secondary">{sublabel}</div> : null}
      </Card>
    );
  }
  return (
    <Card className={`flex flex-col p-4 md:p-5 ${center} ${className}`}>
      <div className="flex w-full items-center justify-between gap-2">
        <span className="eyebrow">{label}</span>
        {icon ? <span className="text-text-muted">{icon}</span> : null}
      </div>
      <div className={`num-display mt-2 text-3xl md:text-4xl ${color}`}>{value}</div>
      {sublabel ? <div className="mt-1 text-sm text-text-secondary">{sublabel}</div> : null}
    </Card>
  );
}
