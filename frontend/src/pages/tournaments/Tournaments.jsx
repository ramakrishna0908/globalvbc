import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageShell from '../../components/ui/PageShell.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import FilterChips from '../../components/ui/FilterChips.jsx';
import Icon from '../../components/ui/Icon.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
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
  const live = t.status === 'live';
  return (
    <Card as="article" tone={live ? 'live' : undefined} interactive className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 p-4 pb-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {live && t.live_count ? <LiveBadge count={t.live_count} /> : <TournamentStatusPill status={t.status} size="sm" />}
          {t.registration_open && t.status === 'published' ? <StatusBadge status="registration_open" size="sm" /> : null}
        </div>
        <span className="eyebrow shrink-0 !text-[10px]">{LEVEL_LABELS[t.level] || t.level}</span>
      </div>
      <div className="flex-1 p-4 pt-2">
        <h2 className="font-display text-2xl font-bold leading-none">
          <Link to={`/tournaments/${t.id}`} className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none">
            {t.name}
          </Link>
        </h2>
        <dl className="mt-3 space-y-1 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <dt className="sr-only">Dates</dt>
            <Icon name="calendar" size={15} className="text-text-muted" />
            <dd>{dateRange(t)}</dd>
          </div>
          {place ? (
            <div className="flex items-center gap-2">
              <dt className="sr-only">Venue</dt>
              <Icon name="pin" size={15} className="text-text-muted" />
              <dd className="truncate">{place}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default px-4 py-2.5 text-xs font-semibold text-text-secondary">
        <span>{TOURNAMENT_FORMAT_LABELS[t.format] || t.format}</span>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Icon name="users" size={14} className="text-text-muted" />
          {t.team_count} {t.team_count === 1 ? 'team' : 'teams'}
        </span>
      </div>
    </Card>
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
  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, f.key === 'all' ? all.length : all.filter((t) => FILTER_STATUS[f.key].includes(t.status)).length]));

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
            <Button variant={mine ? 'primary' : 'secondary'} aria-pressed={mine} onClick={() => setMine(!mine)}>
              {mine ? <Icon name="check" size={16} /> : null} My tournaments
            </Button>
          ) : null}
          {canCreate ? (
            <Button to="/tournaments/new" variant={mine ? 'gold' : 'primary'}>
              <Icon name="plus" size={16} /> Create tournament
            </Button>
          ) : null}
        </>
      }
    >
      <FilterChips label="Filter tournaments" options={FILTERS.map((f) => ({ ...f, count: counts[f.key] }))} value={filter} onChange={setFilter} className="mb-5" />

      {q.isLoading ? (
        <LoadingBlock label="Loading tournaments…" variant="cards" count={6} />
      ) : q.isError ? (
        <ErrorBlock error={q.error} retry={q.refetch} />
      ) : !list.length ? (
        <EmptyState
          icon="trophy"
          headline={all.length ? `No ${filter} tournaments` : mine ? 'You have not created a tournament yet' : 'No tournaments yet'}
          copy={all.length ? 'Try another filter.' : canCreate ? 'Set up your first event in a couple of minutes — formats, courts and scoring rules included.' : 'Check back soon, or ask an organizer to publish their event.'}
          ctaLabel={all.length ? 'Show all' : canCreate ? 'Create tournament' : undefined}
          onCta={all.length ? () => setFilter('all') : () => navigate('/tournaments/new')}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => (
            <li key={t.id} className="relative">
              <TournamentCard t={t} />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
