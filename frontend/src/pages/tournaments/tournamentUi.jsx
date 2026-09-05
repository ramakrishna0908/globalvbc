import { useEffect, useState } from 'react';
import StatusBadge, { LiveCount, TOURNAMENT_STATUS } from '../../components/ui/StatusBadge.jsx';
import { formatDate } from '../../lib/format.js';

/** Shared bits for the tournament + team pages. */

export function TournamentStatusPill({ status, className = '', size = 'md' }) {
  return <StatusBadge status={TOURNAMENT_STATUS[status] || status} size={size} className={className} />;
}

export function LiveBadge({ count, className = '' }) {
  return <LiveCount count={count} className={className} />;
}

export function RegistrationStatusPill({ status, size = 'sm' }) {
  return <StatusBadge status={status} size={size} />;
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
