/**
 * Surface container. `tone` adds a coloured left bar / border for state:
 * live (red), a / b (team colours), success, warning. `interactive` adds the
 * hover treatment used by link cards. `padding` false for flush tables/lists.
 */
const TONES = {
  live: 'border-status-live/60 ring-1 ring-status-live/30',
  a: 'team-bar-a',
  b: 'team-bar-b',
  success: 'border-status-success/50',
  warning: 'border-status-warning/50',
  accent: 'border-accent-500/60',
  gold: 'border-brand-500/50',
};

export default function Card({ className = '', tone, interactive = false, padding = false, as: Tag = 'div', children, ...props }) {
  return (
    <Tag
      className={`rounded-lg border border-border-default bg-bg-card shadow-card ${tone ? TONES[tone] || '' : ''} ${
        interactive ? 'transition-colors hover:border-accent-400 focus-within:border-accent-400' : ''
      } ${padding ? 'p-4 md:p-5' : ''} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Card header row: title on the left, optional action on the right. */
export function CardHeader({ title, action, eyebrow, className = '', as: Tag = 'h3' }) {
  return (
    <div className={`mb-3 flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <Tag className="font-display text-lg font-bold leading-tight">{title}</Tag>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
