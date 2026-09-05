import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageShell from '../../components/ui/PageShell.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { LoadingBlock, ErrorBlock } from '../../components/ui/Loading.jsx';
import { useTournaments } from '../../hooks/queries.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { TOURNAMENT_FORMAT_LABELS, LEVEL_LABELS } from '../../lib/format.js';
import { TournamentStatusPill, LiveBadge, dateRange, placeLabel } from './tournamentUi.jsx';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

const FILTER_STATUS = { live: ['live'], upcoming: ['published'], completed: ['completed'] };

function TournamentCard({ t }) {
  const place = placeLabel(t);
  return (
    <Link to={`/tournaments/${t.id}`} className="block focus-visible:outline-none">
      <Card className={`h-full p-4 transition-colors hover:border-accent-500 ${t.status === 'live' ? 'border-status-danger/60' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-bold leading-tight text-text-primary">{t.name}</h2>
          <TournamentStatusPill status={t.status} className="shrink-0" />
        </div>
        <div className="mt-2 space-y-1 text-sm text-text-secondary">
          <div>
            <span aria-hidden="true">📅 </span>
            {dateRange(t)}
          </div>
          {place ? (
            <div className="truncate">
              <span aria-hidden="true">📍 </span>
              {place}
            </div>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          <span className="rounded-full bg-bg-elevated px-2 py-0.5">{LEVEL_LABELS[t.level] || t.level}</span>
          <span className="rounded-full bg-bg-elevated px-2 py-0.5">{TOURNAMENT_FORMAT_LABELS[t.format] || t.format}</span>
          <span className="rounded-full bg-bg-elevated px-2 py-0.5">
            {t.team_count} {t.team_count === 1 ? 'team' : 'teams'}
          </span>
          <LiveBadge count={t.live_count} />
        </div>
      </Card>
    </Link>
  );
}

export default function Tournaments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const mine = params.get('mine') === '1';
  const [filter, setFilter] = useState('all');
  const q = useTournaments(mine && user ? { mine: 1 } : {});

  const all = q.data || [];
  const list = filter === 'all' ? all : all.filter((t) => FILTER_STATUS[filter].includes(t.status));
  const canCreate = ['organizer', 'coach', 'scorer', 'admin'].includes(user?.role);

  const setMine = (on) => {
    const next = new URLSearchParams(params);
    if (on) next.set('mine', '1');
    else next.delete('mine');
    setParams(next, { replace: true });
  };

  return (
    <PageShell
      title={mine ? 'My tournaments' : 'Tournaments'}
      subtitle={mine ? 'Everything you organize, including drafts.' : 'Live scores, standings and brackets from every event on GlobalVBC.'}
      actions={
        <>
          {user ? (
            <Button variant={mine ? 'primary' : 'secondary'} className="min-h-[44px]" aria-pressed={mine} onClick={() => setMine(!mine)}>
              {mine ? '✓ My tournaments' : 'My tournaments'}
            </Button>
          ) : null}
          {canCreate ? (
            <Link to="/tournaments/new">
              <Button className="min-h-[44px]">+ Create tournament</Button>
            </Link>
          ) : null}
        </>
      }
    >
      <div role="group" aria-label="Filter tournaments" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.key === 'all' ? all.length : all.filter((t) => FILTER_STATUS[f.key].includes(t.status)).length;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.key)}
              className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold transition-colors ${
                active ? 'border-accent-500 bg-accent-500/15 text-text-primary' : 'border-border-default bg-bg-surface text-text-secondary hover:text-text-primary'
              }`}
            >
              {f.label}
              {count ? <span className="ml-1.5 text-xs text-text-muted">{count}</span> : null}
            </button>
          );
        })}
      </div>

      {q.isLoading ? (
        <LoadingBlock label="Loading tournaments…" />
      ) : q.isError ? (
        <ErrorBlock error={q.error} retry={q.refetch} />
      ) : !list.length ? (
        <EmptyState
          icon="🏆"
          headline={all.length ? `No ${filter} tournaments` : mine ? 'You have not created a tournament yet' : 'No tournaments yet'}
          copy={all.length ? 'Try another filter.' : canCreate ? 'Set up your first event in a couple of minutes — formats, courts and scoring rules included.' : 'Check back soon, or ask an organizer to publish their event.'}
          ctaLabel={all.length ? 'Show all' : canCreate ? 'Create tournament' : undefined}
          onCta={all.length ? () => setFilter('all') : () => navigate('/tournaments/new')}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => (
            <li key={t.id}>
              <TournamentCard t={t} />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
