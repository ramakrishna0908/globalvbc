/**
 * The one status vocabulary for the whole product. Every pill — tournament,
 * match, registration, live view, bracket slot — renders through here so the
 * same word always looks the same.
 *
 *   <StatusBadge status="live" />          → pulsing red LIVE
 *   <StatusBadge status="final" />         → green FINAL
 *   <StatusBadge status="pending" />       → amber PENDING APPROVAL
 */
export const STATUS_STYLES = {
  live: { label: 'Live', cls: 'bg-status-live text-white', dot: true },
  upcoming: { label: 'Upcoming', cls: 'bg-accent-500/15 text-accent-400 ring-1 ring-inset ring-accent-500/30' },
  scheduled: { label: 'Scheduled', cls: 'bg-bg-elevated text-text-secondary' },
  registration_open: { label: 'Registration open', cls: 'bg-status-success/15 text-status-success ring-1 ring-inset ring-status-success/30' },
  final: { label: 'Final', cls: 'bg-status-success/15 text-status-success ring-1 ring-inset ring-status-success/30' },
  completed: { label: 'Completed', cls: 'bg-status-success/15 text-status-success ring-1 ring-inset ring-status-success/30' },
  awaiting: { label: 'Awaiting submit', cls: 'bg-status-warning/15 text-status-warning ring-1 ring-inset ring-status-warning/40' },
  postponed: { label: 'Postponed', cls: 'bg-status-warning/15 text-status-warning ring-1 ring-inset ring-status-warning/40' },
  forfeit: { label: 'Forfeit', cls: 'bg-status-danger/15 text-status-danger ring-1 ring-inset ring-status-danger/30' },
  qualified: { label: 'Qualified', cls: 'bg-status-success/15 text-status-success ring-1 ring-inset ring-status-success/30' },
  eliminated: { label: 'Eliminated', cls: 'bg-bg-elevated text-text-muted' },
  pending: { label: 'Pending approval', cls: 'bg-status-warning/15 text-status-warning ring-1 ring-inset ring-status-warning/40' },
  approved: { label: 'Approved', cls: 'bg-status-success/15 text-status-success ring-1 ring-inset ring-status-success/30' },
  rejected: { label: 'Rejected', cls: 'bg-status-danger/15 text-status-danger ring-1 ring-inset ring-status-danger/30' },
  withdrawn: { label: 'Withdrawn', cls: 'bg-bg-elevated text-text-muted line-through' },
  draft: { label: 'Draft', cls: 'bg-transparent text-text-secondary ring-1 ring-inset ring-border-strong' },
  cancelled: { label: 'Cancelled', cls: 'bg-bg-elevated text-text-muted line-through' },
  waiting: { label: 'Waiting for scorer', cls: 'bg-bg-elevated text-text-secondary' },
  champion: { label: 'Champion', cls: 'bg-brand-500/20 text-brand-400 ring-1 ring-inset ring-brand-500/40' },
  demo: { label: 'Demo', cls: 'bg-brand-500/15 text-brand-400 ring-1 ring-inset ring-brand-500/40' },
  neutral: { label: '', cls: 'bg-bg-elevated text-text-secondary' },
};

/** Backend status strings → badge vocabulary. */
export const TOURNAMENT_STATUS = { draft: 'draft', published: 'upcoming', live: 'live', completed: 'completed', cancelled: 'cancelled' };
export const MATCH_STATUS = { scheduled: 'scheduled', live: 'live', completed: 'awaiting', submitted: 'final', cancelled: 'cancelled', postponed: 'postponed', forfeit: 'forfeit' };

const SIZES = {
  sm: 'min-h-[20px] px-2 text-2xs',
  md: 'min-h-[24px] px-2.5 text-xs',
  lg: 'min-h-[30px] px-3 text-sm',
};

export default function StatusBadge({ status, label, size = 'md', className = '', pulse = true, ...props }) {
  const s = STATUS_STYLES[status] || { label: status, cls: STATUS_STYLES.neutral.cls };
  const text = label ?? s.label ?? status;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-display font-bold uppercase tracking-wider ${SIZES[size]} ${s.cls} ${className}`} {...props}>
      {s.dot ? (
        <span className="relative flex h-2 w-2" aria-hidden="true">
          {pulse ? <span className="absolute inline-flex h-full w-full rounded-full bg-white/80 motion-safe:animate-ping" /> : null}
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
      ) : null}
      {text}
    </span>
  );
}

/** Small "LIVE · 3" indicator for lists (count of live matches). */
export function LiveCount({ count, className = '' }) {
  if (!count) return null;
  return <StatusBadge status="live" size="sm" label={`Live · ${count}`} className={className} />;
}
