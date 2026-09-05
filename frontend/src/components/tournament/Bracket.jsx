import { Link } from 'react-router-dom';

function sourceLabel(src) {
  if (!src) return 'TBD';
  if (src.type === 'pool') return `${src.rank}${['st', 'nd', 'rd'][src.rank - 1] || 'th'} Pool ${src.pool}`;
  return `${src.type === 'winner' ? 'Winner' : 'Loser'} ${src.match}`;
}

function Slot({ name, source, score, winner, side }) {
  return (
    <div className={`flex items-center justify-between gap-2 px-2 py-1 text-sm ${winner ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>
      <span className={`truncate ${name ? '' : 'italic text-text-muted'}`}>{name || sourceLabel(source)}</span>
      <span className={`tabular-nums ${side === 'A' ? 'text-team-a' : 'text-team-b'}`}>{score ?? ''}</span>
    </div>
  );
}

function MatchBox({ m }) {
  const done = m.status === 'submitted';
  const live = m.status === 'live';
  const snap = m.state_snapshot;
  return (
    <Link
      to={live ? `/live/${m.id}` : `/matches/${m.id}`}
      className={`block w-52 rounded-lg border bg-bg-card shadow-card transition-colors hover:border-accent-500 ${live ? 'border-status-danger' : 'border-border-default'}`}
      aria-label={`${m.bracket_key}: ${m.team_a_name || 'TBD'} vs ${m.team_b_name || 'TBD'}`}
    >
      <div className="flex items-center justify-between border-b border-border-default px-2 py-1 text-[10px] uppercase tracking-wider text-text-muted">
        <span>{m.bracket_key}</span>
        {live ? <span className="font-black text-status-danger">● Live</span> : done ? <span>Final</span> : m.court_name ? <span>{m.court_name}</span> : null}
      </div>
      <Slot name={m.team_a_name} source={m.source_a} score={done || live ? (live ? snap?.scoreA : m.sets_a) : null} winner={done && m.winner_team_id === m.team_a_id} side="A" />
      <Slot name={m.team_b_name} source={m.source_b} score={done || live ? (live ? snap?.scoreB : m.sets_b) : null} winner={done && m.winner_team_id === m.team_b_id} side="B" />
    </Link>
  );
}

/** Rounds laid out left-to-right; horizontally scrollable on small screens. */
export default function Bracket({ matches }) {
  if (!matches?.length) return <p className="text-sm text-text-muted">No bracket generated yet.</p>;
  const groups = ['winners', 'losers', 'final'].map((type) => ({ type, list: matches.filter((m) => (m.bracket_type || 'winners') === type) })).filter((g) => g.list.length);
  return (
    <div className="space-y-6">
      {groups.map((g) => {
        const rounds = [...new Set(g.list.map((m) => m.bracket_round))].sort((a, b) => a - b);
        return (
          <div key={g.type}>
            {groups.length > 1 ? <div className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">{g.type === 'final' ? 'Grand final' : `${g.type} bracket`}</div> : null}
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-max gap-6">
                {rounds.map((r) => (
                  <div key={r} className="flex flex-col justify-around gap-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{g.type === 'final' ? 'Final' : `Round ${r}`}</div>
                    {g.list
                      .filter((m) => m.bracket_round === r)
                      .sort((a, b) => a.bracket_slot - b.bracket_slot)
                      .map((m) => (
                        <MatchBox key={m.id} m={m} />
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
