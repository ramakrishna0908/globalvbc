import { Link } from 'react-router-dom';
import { formatDateTime } from '../../lib/format.js';

const STATUS = {
  scheduled: { label: 'Scheduled', cls: 'bg-bg-elevated text-text-secondary' },
  live: { label: 'Live', cls: 'bg-status-danger text-white motion-safe:animate-pulse' },
  completed: { label: 'Awaiting submit', cls: 'bg-status-warning text-brand-950' },
  submitted: { label: 'Final', cls: 'bg-status-success/20 text-status-success' },
  cancelled: { label: 'Cancelled', cls: 'bg-bg-elevated text-text-muted line-through' },
};

export function MatchStatusPill({ status }) {
  const s = STATUS[status] || STATUS.scheduled;
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wider ${s.cls}`}>{s.label}</span>;
}

/**
 * Compact match summary used on dashboards and tournament pages. `action`
 * renders a CTA (e.g. "Score" / "Resume") on the right.
 */
export default function MatchCard({ match, action, to, compact = false }) {
  const snap = match.state_snapshot;
  const live = match.status === 'live';
  const final = match.status === 'submitted' || match.status === 'completed';
  const scoreA = live ? snap?.scoreA : final ? match.sets_a : null;
  const scoreB = live ? snap?.scoreB : final ? match.sets_b : null;
  const href = to || (live ? `/live/${match.id}` : `/matches/${match.id}`);
  const meta = [match.tournament_name, match.division_name, match.court_name, match.pool_name ? `Pool ${match.pool_name}` : null].filter(Boolean).join(' · ');
  const Wrapper = action ? 'div' : Link;
  const wrapperProps = action ? {} : { to: href };
  return (
    <Wrapper {...wrapperProps} className={`flex items-center gap-3 rounded-xl border bg-bg-card p-3 shadow-card ${live ? 'border-status-danger/60' : 'border-border-default'} ${action ? '' : 'transition-colors hover:border-accent-500'}`}>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
          <MatchStatusPill status={match.status} />
          {meta ? <span className="truncate">{meta}</span> : null}
          {match.scheduled_at && !live ? <span>{formatDateTime(match.scheduled_at)}</span> : null}
        </div>
        <div className={`grid items-center gap-x-2 ${compact ? 'text-sm' : 'text-base'}`} style={{ gridTemplateColumns: '1fr auto' }}>
          <span className={`truncate font-bold ${final && match.winner_team_id === match.team_a_id ? 'text-text-primary' : 'text-text-secondary'}`}>{match.team_a_name || 'TBD'}</span>
          <span className="font-display text-lg font-black tabular-nums text-team-a">{scoreA ?? ''}</span>
          <span className={`truncate font-bold ${final && match.winner_team_id === match.team_b_id ? 'text-text-primary' : 'text-text-secondary'}`}>{match.team_b_name || 'TBD'}</span>
          <span className="font-display text-lg font-black tabular-nums text-team-b">{scoreB ?? ''}</span>
        </div>
        {live && snap ? (
          <div className="mt-1 text-xs text-text-muted">
            Set {snap.currentSet} · sets {snap.setsA}–{snap.setsB}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </Wrapper>
  );
}
