import { Link } from 'react-router-dom';
import StatusBadge, { MATCH_STATUS } from '../ui/StatusBadge.jsx';
import Icon from '../ui/Icon.jsx';
import { formatDateTime } from '../../lib/format.js';

/** Match status pill — same vocabulary as every other badge. */
export function MatchStatusPill({ status, size = 'sm' }) {
  return <StatusBadge status={MATCH_STATUS[status] || status} size={size} />;
}

function TeamRow({ side, name, score, winner, loser, live, setScore }) {
  const bar = side === 'A' ? 'bg-team-a' : 'bg-team-b';
  return (
    <div className={`flex min-h-8 items-center gap-2.5 ${loser ? 'text-text-muted' : 'text-text-primary'}`}>
      <span className={`h-6 w-1 shrink-0 rounded-full ${bar}`} aria-hidden="true" />
      <span className={`min-w-0 flex-1 truncate font-display text-base font-bold uppercase tracking-wide ${winner ? '' : loser ? 'font-semibold' : ''}`}>
        {name || <span className="italic text-text-muted">TBD</span>}
      </span>
      {winner ? <Icon name="check" size={16} className="text-status-success" label="Winner" /> : null}
      {live && setScore != null ? <span className="w-7 text-right font-display text-sm font-semibold tabular-nums text-text-secondary">{setScore}</span> : null}
      <span className={`w-7 text-right num-display text-2xl ${score == null ? 'text-text-muted' : winner ? 'text-text-primary' : loser ? 'text-text-muted' : 'text-text-primary'}`}>{score ?? ''}</span>
    </div>
  );
}

/**
 * Fixture / result row used on dashboards, tournament overviews and team
 * pages. The winner is bold with a check; the loser is dimmed; live matches
 * show sets plus the running set score. `action` renders a CTA on the right.
 */
export default function MatchCard({ match, action, to, compact = false }) {
  const snap = match.state_snapshot;
  const live = match.status === 'live';
  const final = match.status === 'submitted' || match.status === 'completed';
  const setsA = live ? snap?.setsA : final ? match.sets_a : null;
  const setsB = live ? snap?.setsB : final ? match.sets_b : null;
  const winA = final && match.winner_team_id != null && Number(match.winner_team_id) === Number(match.team_a_id);
  const winB = final && match.winner_team_id != null && Number(match.winner_team_id) === Number(match.team_b_id);
  const href = to || (live ? `/live/${match.id}` : `/matches/${match.id}`);
  const meta = [match.tournament_name, match.division_name, match.pool_name ? `Pool ${match.pool_name}` : null].filter(Boolean).join(' · ');
  const Wrapper = action ? 'div' : Link;
  const wrapperProps = action ? {} : { to: href, 'aria-label': `${match.team_a_name || 'TBD'} vs ${match.team_b_name || 'TBD'}` };
  return (
    <Wrapper
      {...wrapperProps}
      className={`flex items-stretch gap-3 rounded-lg border bg-bg-card shadow-card ${compact ? 'p-2.5' : 'p-3'} ${live ? 'border-status-live/60 ring-1 ring-status-live/25' : 'border-border-default'} ${
        action ? '' : 'transition-colors hover:border-accent-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400'
      }`}
      data-testid="match-card"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs font-semibold uppercase tracking-wider text-text-muted">
          <MatchStatusPill status={match.status} />
          {meta ? <span className="truncate">{meta}</span> : null}
          {match.court_name ? <span className="inline-flex items-center gap-1"><Icon name="court" size={12} />{match.court_name}</span> : null}
          {match.scheduled_at && !live && !final ? <span className="inline-flex items-center gap-1"><Icon name="clock" size={12} />{formatDateTime(match.scheduled_at)}</span> : null}
        </div>
        <div className="space-y-0.5">
          <TeamRow side="A" name={match.team_a_name} score={setsA} winner={winA} loser={winB} live={live} setScore={snap?.scoreA} />
          <TeamRow side="B" name={match.team_b_name} score={setsB} winner={winB} loser={winA} live={live} setScore={snap?.scoreB} />
        </div>
        {live && snap ? (
          <div className="mt-1.5 text-xs font-semibold text-text-secondary">
            Set {snap.currentSet} in progress
          </div>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
    </Wrapper>
  );
}
