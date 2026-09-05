const MOVEMENT = {
  up: { glyph: '▲', cls: 'text-status-success' },
  down: { glyph: '▼', cls: 'text-status-danger' },
  same: { glyph: '–', cls: 'text-text-muted' },
};

export default function RankPill({ rank, movement = 'same', className = '' }) {
  const m = MOVEMENT[movement] || MOVEMENT.same;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-bg-elevated px-2.5 py-0.5 font-display text-sm font-bold tabular-nums text-text-primary ${className}`}>
      <span className="text-text-muted">#</span>
      {rank}
      <span className={`text-[10px] ${m.cls}`} aria-label={`moved ${movement}`}>
        {m.glyph}
      </span>
    </span>
  );
}
