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
