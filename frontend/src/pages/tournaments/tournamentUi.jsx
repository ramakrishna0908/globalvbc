import { useEffect, useState } from 'react';
import { formatDate } from '../../lib/format.js';

/** Shared bits for the tournament + team pages. */

const STATUS = {
  draft: { label: 'Draft', cls: 'bg-bg-elevated text-text-secondary border border-border-strong' },
  published: { label: 'Upcoming', cls: 'bg-accent-500/15 text-accent-400' },
  live: { label: 'Live', cls: 'bg-status-danger text-white motion-safe:animate-pulse' },
  completed: { label: 'Completed', cls: 'bg-status-success/20 text-status-success' },
  cancelled: { label: 'Cancelled', cls: 'bg-bg-elevated text-text-muted line-through' },
};

export function TournamentStatusPill({ status, className = '' }) {
  const s = STATUS[status] || { label: status, cls: 'bg-bg-elevated text-text-secondary' };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${s.cls} ${className}`}>{s.label}</span>;
}

export function LiveBadge({ count }) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-status-danger/15 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-status-danger">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-status-danger opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-status-danger" />
      </span>
      Live · {count}
    </span>
  );
}

export function RegistrationStatusPill({ status }) {
  const map = {
    pending: 'bg-status-warning/20 text-status-warning',
    approved: 'bg-status-success/20 text-status-success',
    rejected: 'bg-status-danger/15 text-status-danger',
    withdrawn: 'bg-bg-elevated text-text-muted line-through',
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wider ${map[status] || 'bg-bg-elevated text-text-secondary'}`}>{status}</span>;
}

export const FORMAT_HELP = {
  round_robin: 'Every team plays every other team once; standings decide the winner.',
  pool_play: 'Teams are split into pools and play round robin inside their pool.',
  single_elimination: 'Seeded knockout bracket — lose once and you are out.',
  double_elimination: 'Knockout with a losers bracket; a team must lose twice to be eliminated.',
  pool_knockout: 'Pool play first, then the top teams from each pool advance to a knockout bracket.',
};

export const POOL_FORMATS = ['pool_play', 'pool_knockout'];
export const BRACKET_FORMATS = ['single_elimination', 'double_elimination', 'pool_knockout'];

export function dateRange(t) {
  if (!t?.starts_on) return 'Dates TBD';
  const start = formatDate(t.starts_on);
  const end = t.ends_on && t.ends_on !== t.starts_on ? formatDate(t.ends_on) : null;
  return end ? `${start} – ${end}` : start;
}

export function placeLabel(t) {
  return [t?.venue_name, t?.venue_city || t?.location].filter(Boolean).join(', ') || null;
}

/** Returns `value` after it has been stable for `ms` milliseconds. */
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Pull the server's error message out of an axios error. */
export function errorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.error || err?.message || fallback;
}

/** ISO/Date → value for <input type="datetime-local"> in local time. */
export function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO date → value for <input type="date">. */
export function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}
