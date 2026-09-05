import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageShell from '../components/ui/PageShell.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import Field from '../components/ui/Field.jsx';
import { LoadingBlock, ErrorBlock } from '../components/ui/Loading.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Avatar from '../components/Avatar.jsx';
import { usePlayerLeaderboard, useTournaments, useTeams, useCommunities } from '../hooks/queries.js';
import { POSITION_LABELS, positionLabel } from '../lib/format.js';

export const METRIC_LABELS = {
  rating: 'Overall rating',
  points: 'Top scorers',
  kills: 'Best attackers',
  aces: 'Best servers',
  blocks: 'Best blockers',
  digs: 'Most digs',
  assists: 'Most assists',
  mvp: 'MVP candidates',
};
const DEFAULT_METRICS = Object.keys(METRIC_LABELS);
const VALUE_HEADER = { rating: 'Rating', points: 'Points', kills: 'Kills', aces: 'Aces', blocks: 'Blocks', digs: 'Digs', assists: 'Assists', mvp: 'MVP score' };
const STAT_COLUMNS = [
  ['points', 'Pts'],
  ['kills', 'K'],
  ['aces', 'A'],
  ['blocks', 'B'],
  ['digs', 'D'],
  ['assists', 'Ast'],
];
const FILTER_KEYS = ['tournament', 'team', 'position', 'community', 'season'];

const thisYear = new Date().getFullYear();
const SEASONS = [thisYear, thisYear - 1, thisYear - 2];

export default function Leaderboard() {
  const [params, setParams] = useSearchParams();
  const metric = params.get('metric') || 'rating';
  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ''])), [params]);
  const query = useMemo(() => {
    const q = { metric };
    for (const k of FILTER_KEYS) if (filters[k]) q[k] = filters[k];
    return q;
  }, [metric, filters]);

  const board = usePlayerLeaderboard(query);
  const tournaments = useTournaments({ status: 'published,live,completed' });
  const teams = useTeams();
  const communities = useCommunities();

  const update = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const metrics = board.data?.metrics?.length ? board.data.metrics : DEFAULT_METRICS;
  const tabs = metrics.map((m) => ({ key: m, label: METRIC_LABELS[m] || board.data?.label || m }));
  const isStat = metric !== 'rating';
  const entries = board.data?.entries || [];
  const hasFilters = FILTER_KEYS.some((k) => filters[k]);

  return (
    <PageShell title="Leaderboard" subtitle="Ratings and stats built from scored matches only." wide>
      <Tabs tabs={tabs} value={metric} onChange={(m) => update({ metric: m })} className="mb-4" />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Filters">
        <Field as="select" label="Tournament" value={filters.tournament} onChange={(e) => update({ tournament: e.target.value })}>
          <option value="">All tournaments</option>
          {(tournaments.data || []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Field>
        <Field as="select" label="Team" value={filters.team} onChange={(e) => update({ team: e.target.value })}>
          <option value="">All teams</option>
          {(teams.data || []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Field>
        <Field as="select" label="Position" value={filters.position} onChange={(e) => update({ position: e.target.value })}>
          <option value="">All positions</option>
          {Object.entries(POSITION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Field>
        <Field as="select" label="Community" value={filters.community} onChange={(e) => update({ community: e.target.value })}>
          <option value="">All communities</option>
          {(communities.data || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Field>
        <Field as="select" label="Season" value={filters.season} onChange={(e) => update({ season: e.target.value })} hint={!isStat ? 'Applies to stat boards' : undefined}>
          <option value="">All seasons</option>
          {SEASONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Field>
      </div>

      {board.isLoading ? (
        <LoadingBlock label="Loading leaderboard…" />
      ) : board.isError ? (
        <ErrorBlock error={board.error} retry={() => board.refetch()} />
      ) : !entries.length ? (
        <EmptyState
          icon="📊"
          headline="No scored matches match these filters yet"
          copy={hasFilters ? 'Try widening the filters, or score a match to put players on the board.' : 'Score and submit a match to put players on the board.'}
          ctaLabel={hasFilters ? 'Clear filters' : undefined}
          onCta={hasFilters ? () => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, '']))) : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-default">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">
              {METRIC_LABELS[metric] || metric} — {entries.length} players
            </caption>
            <thead className="bg-bg-surface text-left text-[11px] uppercase tracking-wider text-text-muted">
              <tr>
                <th scope="col" className="px-3 py-2">
                  #
                </th>
                <th scope="col" className="px-3 py-2">
                  Player
                </th>
                <th scope="col" className="px-3 py-2">
                  Team
                </th>
                <th scope="col" className="px-3 py-2">
                  Position
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  {VALUE_HEADER[metric] || board.data?.label || 'Value'}
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Matches
                </th>
                {isStat
                  ? STAT_COLUMNS.filter(([k]) => k !== metric).map(([k, label]) => (
                      <th key={k} scope="col" className="px-2 py-2 text-right" title={VALUE_HEADER[k]}>
                        {label}
                      </th>
                    ))
                  : null}
              </tr>
            </thead>
            <tbody>
              {entries.map((p) => (
                <tr
                  key={p.id}
                  data-testid={`lb-row-${p.id}`}
                  className={`border-t border-border-default ${p.isYou ? 'bg-accent-500/10 ring-1 ring-inset ring-accent-500/40' : ''}`}
                  aria-current={p.isYou ? 'true' : undefined}
                >
                  <td className="px-3 py-2.5 font-bold tabular-nums text-text-secondary">
                    {p.rank <= 3 ? <span aria-hidden="true">{['🥇', '🥈', '🥉'][p.rank - 1]}</span> : null} {p.rank}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link to={`/p/${p.id}`} className="flex min-h-[44px] items-center gap-3 hover:text-accent-400">
                      <Avatar src={p.photo_url} name={p.name} size="sm" />
                      <span className="font-semibold">
                        {p.name}
                        {p.isYou ? <span className="ml-2 rounded-full bg-accent-500 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">You</span> : null}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary">{p.team_name || '—'}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{positionLabel(p.position)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`font-display text-lg font-black tabular-nums ${metric === 'rating' ? 'text-brand-400' : 'text-text-primary'}`}>{p.value ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{p.matches ?? 0}</td>
                  {isStat
                    ? STAT_COLUMNS.filter(([k]) => k !== metric).map(([k]) => (
                        <td key={k} className="px-2 py-2.5 text-right tabular-nums text-text-secondary">
                          {p[k] ?? 0}
                        </td>
                      ))
                    : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
