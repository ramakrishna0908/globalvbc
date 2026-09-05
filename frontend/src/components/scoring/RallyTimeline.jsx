import { ACTION_LABELS } from './QuickActionBar.jsx';

function time(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function describe(entry, playerName) {
  const p = entry.payload || {};
  switch (entry.type) {
    case 'RALLY_WON':
      return `Team ${p.team} +1${p.actionType ? ` · ${ACTION_LABELS[p.actionType] || p.actionType} ${playerName(p.playerId)}` : ''}`;
    case 'PLAYER_ACTION':
      return `${playerName(p.playerId)} ${ACTION_LABELS[p.actionType] || p.actionType}`;
    case 'TIMEOUT':
      return `Timeout Team ${p.team}`;
    case 'SUBSTITUTION':
      return `Sub Team ${p.team}: ${playerName(p.out)} → ${playerName(p.in)}`;
    case 'SET_START':
      return 'Set started';
    case 'MATCH_START':
      return 'Match started';
    case 'MATCH_END':
      return 'Match ended';
    case 'UNDO':
      return `Undo #${p.targetSeq}`;
    default:
      return entry.type;
  }
}

/**
 * Live event history, newest first, with per-row undo. Score after each rally
 * comes from the derived state so it always matches the scoreboard.
 */
export default function RallyTimeline({ events, state, playerName = (id) => `#${id}`, onUndo, limit = 12, canUndo = true }) {
  const undone = new Set(events.filter((e) => e.type === 'UNDO').map((e) => e.payload?.targetSeq));
  const scoreBySeq = new Map();
  for (const s of state?.sets || []) for (const r of s.rallies) scoreBySeq.set(r.seq, `${r.scoreA}–${r.scoreB}`);
  const rows = [...events]
    .filter((e) => e.type !== 'UNDO')
    .reverse()
    .slice(0, limit);
  if (!rows.length) return <p className="text-sm text-text-muted">No rallies yet.</p>;
  return (
    <ol className="divide-y divide-border-default" aria-label="Recent events" data-testid="timeline">
      {rows.map((e) => {
        const isUndone = undone.has(e.seq);
        const undoable = canUndo && !isUndone && !['MATCH_START', 'SET_START', 'MATCH_END'].includes(e.type) && !!onUndo;
        return (
          <li key={e.clientEventId || e.seq} className={`flex items-center gap-3 py-1.5 text-sm ${isUndone ? 'text-text-muted line-through' : 'text-text-primary'}`}>
            <span className="w-16 shrink-0 font-mono text-[11px] text-text-muted">{time(e.clientTs || e.ts)}</span>
            <span className={`w-12 shrink-0 font-mono text-xs tabular-nums ${e.payload?.team === 'A' ? 'text-team-a' : e.payload?.team === 'B' ? 'text-team-b' : 'text-text-muted'}`}>
              {scoreBySeq.get(e.seq) || ''}
            </span>
            <span className="min-w-0 flex-1 truncate">{describe(e, playerName)}</span>
            {e.provisional ? <span className="text-[10px] uppercase tracking-wider text-status-warning" title="Not yet synced">local</span> : null}
            {undoable ? (
              <button
                type="button"
                onClick={() => onUndo(e.seq)}
                className="min-h-[44px] min-w-[44px] rounded-lg px-2 text-xs font-bold uppercase text-accent-400 hover:bg-bg-elevated"
                aria-label={`Undo: ${describe(e, playerName)}`}
              >
                Undo
              </button>
            ) : (
              <span className="min-w-[44px]" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
