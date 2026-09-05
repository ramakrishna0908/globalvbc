import { ACTION_LABELS } from './QuickActionBar.jsx';
import Icon from '../ui/Icon.jsx';

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
        const team = e.payload?.team;
        return (
          <li key={e.clientEventId || e.seq} className={`flex min-h-11 items-center gap-3 py-1 text-sm ${isUndone ? 'text-text-muted line-through' : 'text-text-primary'}`}>
            <span className="hidden w-[4.5rem] shrink-0 font-mono text-2xs text-text-muted sm:block">{time(e.clientTs || e.ts)}</span>
            <span className={`h-5 w-1 shrink-0 rounded-full ${team === 'A' ? 'bg-team-a' : team === 'B' ? 'bg-team-b' : 'bg-border-strong'}`} aria-hidden="true" />
            <span className="w-12 shrink-0 font-display text-sm font-bold tabular-nums text-text-secondary">{scoreBySeq.get(e.seq) || ''}</span>
            <span className="min-w-0 flex-1 truncate">{describe(e, playerName)}</span>
            {e.provisional ? (
              <span className="rounded bg-status-warning/15 px-1 font-display text-[10px] font-bold uppercase tracking-wider text-status-warning" title="Not yet synced">
                local
              </span>
            ) : null}
            {undoable ? (
              <button type="button" onClick={() => onUndo(e.seq)} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 font-display text-xs font-bold uppercase tracking-wide text-accent-400 hover:bg-bg-elevated" aria-label={`Undo: ${describe(e, playerName)}`}>
                <Icon name="undo" size={14} /> Undo
              </button>
            ) : (
              <span className="min-w-11" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
