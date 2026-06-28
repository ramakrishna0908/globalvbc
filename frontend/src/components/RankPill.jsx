const MOVEMENT = {
  up: { glyph: '▲', cls: 'text-status-success' },
  down: { glyph: '▼', cls: 'text-status-danger' },
  same: { glyph: '–', cls: 'text-text-muted' },
};

export default function RankPill({ rank, movement = 'same' }) {
  const m = MOVEMENT[movement] || MOVEMENT.same;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-elevated px-3 py-1 text-sm font-semibold text-text-primary">
      <span className="text-text-muted">#</span>
      {rank}
      <span className={`text-xs ${m.cls}`} aria-label={`moved ${movement}`}>
        {m.glyph}
      </span>
    </span>
  );
}
