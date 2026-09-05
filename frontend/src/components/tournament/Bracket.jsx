import { Link } from 'react-router-dom';
import StatusBadge from '../ui/StatusBadge.jsx';
import Icon from '../ui/Icon.jsx';
import { Eyebrow } from '../ui/Section.jsx';

function sourceLabel(src) {
  if (!src) return 'TBD';
  if (src.type === 'pool') return `${src.rank}${['st', 'nd', 'rd'][src.rank - 1] || 'th'} Pool ${src.pool}`;
  return `${src.type === 'winner' ? 'Winner' : 'Loser'} ${src.match}`;
}

function Slot({ name, source, score, winner, loser, side }) {
  const bar = side === 'A' ? 'bg-team-a' : 'bg-team-b';
  return (
    <div className={`flex min-h-9 items-center gap-2 px-2.5 text-sm ${winner ? 'font-bold text-text-primary' : loser ? 'text-text-muted' : 'text-text-secondary'}`}>
      <span className={`h-5 w-1 shrink-0 rounded-full ${bar}`} aria-hidden="true" />
      <span className={`min-w-0 flex-1 truncate font-display text-[15px] font-bold uppercase tracking-wide ${name ? '' : 'font-medium normal-case italic tracking-normal text-text-muted'}`}>{name || sourceLabel(source)}</span>
      {winner ? <Icon name="check" size={14} className="text-status-success" label="Winner" /> : null}
      <span className="w-5 text-right font-display text-lg font-bold tabular-nums">{score ?? ''}</span>
    </div>
  );
}

function MatchBox({ m }) {
  const done = m.status === 'submitted';
  const live = m.status === 'live';
  const snap = m.state_snapshot;
  const winA = done && m.winner_team_id === m.team_a_id;
  const winB = done && m.winner_team_id === m.team_b_id;
  return (
    <Link
      to={live ? `/live/${m.id}` : `/matches/${m.id}`}
      className={`block w-60 rounded-lg border bg-bg-card shadow-card transition-colors hover:border-accent-400 ${live ? 'border-status-live/60 ring-1 ring-status-live/25' : 'border-border-default'}`}
      aria-label={`${m.bracket_key}: ${m.team_a_name || 'TBD'} vs ${m.team_b_name || 'TBD'}`}
    >
      <div className="flex min-h-7 items-center justify-between gap-2 border-b border-border-default px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider text-text-muted">
        <span className="font-mono">{m.bracket_key}</span>
        {live ? <StatusBadge status="live" size="sm" /> : done ? <StatusBadge status="final" size="sm" /> : m.court_name ? <span>{m.court_name}</span> : null}
      </div>
      <div className="divide-y divide-border-default py-0.5">
        <Slot name={m.team_a_name} source={m.source_a} score={done || live ? (live ? snap?.scoreA : m.sets_a) : null} winner={winA} loser={winB} side="A" />
        <Slot name={m.team_b_name} source={m.source_b} score={done || live ? (live ? snap?.scoreB : m.sets_b) : null} winner={winB} loser={winA} side="B" />
      </div>
    </Link>
  );
}

/** Rounds laid out left-to-right; horizontally scrollable on small screens. */
export default function Bracket({ matches }) {
  if (!matches?.length) return <p className="text-sm text-text-muted">No bracket generated yet.</p>;
  let groups = ['winners', 'losers', 'final'].map((type) => ({ type, list: matches.filter((m) => (m.bracket_type || 'winners') === type) })).filter((g) => g.list.length);
  // Single-elimination: the final is just the last column of the winners bracket.
  if (groups.length === 2 && groups.every((g) => g.type !== 'losers')) {
    const winners = groups.find((g) => g.type === 'winners');
    const finals = groups.find((g) => g.type === 'final');
    const lastRound = Math.max(...winners.list.map((m) => m.bracket_round || 1));
    groups = [{ type: 'winners', list: [...winners.list, ...finals.list.map((m) => ({ ...m, bracket_round: lastRound + 1, _final: true }))] }];
  }
  return (
    <div className="space-y-6">
      {groups.map((g) => {
        const rounds = [...new Set(g.list.map((m) => m.bracket_round))].sort((a, b) => a - b);
        return (
          <div key={g.type}>
            {groups.length > 1 ? <Eyebrow className="mb-2">{g.type === 'final' ? 'Grand final' : `${g.type} bracket`}</Eyebrow> : null}
            <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" tabIndex={0} role="region" aria-label={`${g.type === 'final' ? 'Final' : g.type + ' bracket'} — scrollable`}>
              <div className="flex min-w-max gap-8">
                {rounds.map((r, ri) => {
                  const list = g.list.filter((m) => m.bracket_round === r).sort((a, b) => a.bracket_slot - b.bracket_slot);
                  const fromEnd = rounds.length - 1 - ri;
                  const isFinal = g.type === 'final' || list.every((m) => m._final) || (fromEnd === 0 && g.type === 'winners' && list.length === 1);
                  const label = isFinal ? 'Final' : g.type === 'winners' && fromEnd === 1 && list.length === 2 ? 'Semi-finals' : g.type === 'winners' && fromEnd === 2 && list.length === 4 ? 'Quarter-finals' : `Round ${r}`;
                  return (
                    <div key={r} className="flex flex-col justify-around gap-4">
                      <Eyebrow>{label}</Eyebrow>
                      {list.map((m) => (
                        <MatchBox key={m.id} m={m} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
