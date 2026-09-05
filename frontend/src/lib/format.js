export const POSITION_LABELS = {
  setter: 'Setter',
  libero: 'Libero',
  outside_hitter: 'Outside Hitter',
  middle_blocker: 'Middle Blocker',
  opposite: 'Opposite',
};

export function positionLabel(p) {
  return POSITION_LABELS[p] || '—';
}

export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function signed(n) {
  const num = Number(n);
  return num > 0 ? `+${num}` : `${num}`;
}

export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export const ROLE_LABELS = { player: 'Player', scorer: 'Scorer', coach: 'Coach', organizer: 'Organizer', admin: 'Admin' };

export const TOURNAMENT_FORMAT_LABELS = {
  round_robin: 'Round robin',
  pool_play: 'Pool play',
  single_elimination: 'Single elimination',
  double_elimination: 'Double elimination',
  pool_knockout: 'Pools + knockout',
};

export const LEVEL_LABELS = { friendly: 'Friendly', local: 'Local', regional: 'Regional', national: 'National' };
