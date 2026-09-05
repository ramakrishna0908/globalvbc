const TONE = {
  A: 'border-team-a/60 hover:bg-team-a/15 focus-visible:outline-team-a',
  B: 'border-team-b/60 hover:bg-team-b/15 focus-visible:outline-team-b',
};

export function playerLabel(p) {
  if (!p) return '?';
  const num = p.jersey_number != null ? `#${p.jersey_number}` : '';
  const first = (p.name || '').split(' ')[0];
  return `${num} ${first}`.trim();
}

/**
 * The lineup of one team as large tap targets. Starters (on court, in rotation
 * order) come first; bench players are shown smaller and dimmer.
 */
export default function PlayerGrid({ side, teamName, players, rotation = [], onPick, title, compact = false, highlightIds = [] }) {
  const byId = new Map((players || []).map((p) => [String(p.id), p]));
  const onCourt = rotation.map((id) => byId.get(String(id))).filter(Boolean);
  const onCourtIds = new Set(rotation.map(String));
  const bench = (players || []).filter((p) => !onCourtIds.has(String(p.id)));
  const highlight = new Set(highlightIds.map(String));
  return (
    <div data-testid={`player-grid-${side}`}>
      <div className={`mb-1.5 text-[11px] font-black uppercase tracking-[0.2em] ${side === 'A' ? 'text-team-a' : 'text-team-b'}`}>{title || teamName || `Team ${side}`}</div>
      {onCourt.length === 0 && bench.length === 0 ? <p className="text-sm text-text-muted">No lineup set.</p> : null}
      <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-3 md:grid-cols-3'}`}>
        {onCourt.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p, side)}
            data-testid={`player-${p.id}`}
            className={`flex min-h-[64px] flex-col items-center justify-center rounded-xl border-2 bg-bg-card px-1 font-bold leading-tight text-text-primary transition-colors ${TONE[side]} ${
              highlight.has(String(p.id)) ? 'ring-2 ring-accent-500' : ''
            }`}
          >
            <span className="text-lg">{p.jersey_number != null ? `#${p.jersey_number}` : `P${i + 1}`}</span>
            <span className="max-w-full truncate text-xs font-semibold text-text-secondary">{(p.name || '').split(' ')[0]}</span>
            {i === 0 ? <span className="text-[10px] uppercase tracking-wider text-text-muted">serve</span> : null}
          </button>
        ))}
      </div>
      {bench.length ? (
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {bench.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p, side)}
              data-testid={`player-${p.id}`}
              className="flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-border-default bg-bg-surface px-1 text-xs font-semibold text-text-secondary hover:bg-bg-elevated"
            >
              <span>{p.jersey_number != null ? `#${p.jersey_number}` : ''}</span>
              <span className="truncate">{(p.name || '').split(' ')[0]}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
