import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageShell from '../components/ui/PageShell.jsx';
import Tabs, { TabPanel } from '../components/ui/Tabs.jsx';
import Field from '../components/ui/Field.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/ui/Icon.jsx';
import { Table, TableWrap, Th, Td } from '../components/ui/Table.jsx';
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

const MEDAL = { 1: 'bg-brand-500 text-brand-950', 2: 'bg-surface-400 text-white', 3: 'bg-brand-700 text-white' };

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
  const clear = () => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])));
  const tabsId = 'leaderboard-metrics';

  return (
    <PageShell title="Leaderboard" subtitle="Ratings and stats built from scored matches only." wide>
      <Tabs id={tabsId} label="Leaderboard metric" tabs={tabs} value={metric} onChange={(m) => update({ metric: m })} className="mb-4" />

      <details className="mb-5 rounded-lg border border-border-default bg-bg-card md:open" open>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 font-display text-sm font-bold uppercase tracking-wide [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <Icon name="list" size={16} className="text-text-muted" /> Filters
            {hasFilters ? <span className="rounded-full bg-accent-500 px-1.5 text-2xs text-white">{FILTER_KEYS.filter((k) => filters[k]).length}</span> : null}
          </span>
          {hasFilters ? (
            <Button size="sm" variant="ghost" onClick={(e) => (e.preventDefault(), clear())}>
              Clear
            </Button>
          ) : null}
        </summary>
        <div className="grid grid-cols-2 gap-3 border-t border-border-default p-4 md:grid-cols-5" aria-label="Filters">
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
      </details>

      <TabPanel id={tabsId} value={metric}>
        {board.isLoading ? (
          <LoadingBlock label="Loading leaderboard…" variant="table" count={8} />
        ) : board.isError ? (
          <ErrorBlock error={board.error} retry={() => board.refetch()} />
        ) : !entries.length ? (
          <EmptyState
            icon="chart"
            headline="No scored matches match these filters yet"
            copy={hasFilters ? 'Try widening the filters, or score a match to put players on the board.' : 'Score and submit a match to put players on the board.'}
            ctaLabel={hasFilters ? 'Clear filters' : undefined}
            onCta={hasFilters ? clear : undefined}
          />
        ) : (
          <TableWrap>
            <Table caption={`${METRIC_LABELS[metric] || metric} — ${entries.length} players`}>
              <thead>
                <tr>
                  <Th className="w-12">#</Th>
                  <Th sticky>Player</Th>
                  <Th num>{VALUE_HEADER[metric] || board.data?.label || 'Value'}</Th>
                  <Th className="hidden md:table-cell">Team</Th>
                  <Th className="hidden md:table-cell">Position</Th>
                  <Th num className="hidden sm:table-cell">
                    Matches
                  </Th>
                  {isStat
                    ? STAT_COLUMNS.filter(([k]) => k !== metric).map(([k, label]) => (
                        <Th key={k} num title={VALUE_HEADER[k]}>
                          {label}
                        </Th>
                      ))
                    : null}
                </tr>
              </thead>
              <tbody>
                {entries.map((p) => (
                  <tr key={p.id} data-testid={`lb-row-${p.id}`} className={p.isYou ? 'bg-accent-500/10 ring-1 ring-inset ring-accent-500/40' : ''} aria-current={p.isYou ? 'true' : undefined}>
                    <Td>
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md font-display text-sm font-bold tabular-nums ${MEDAL[p.rank] || 'bg-bg-elevated text-text-secondary'}`}>{p.rank}</span>
                    </Td>
                    <Td sticky>
                      <Link to={`/p/${p.id}`} className="flex min-h-11 items-center gap-3 hover:text-accent-400">
                        <Avatar src={p.photo_url} name={p.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {p.name}
                            {p.isYou ? <span className="ml-2 rounded-full bg-accent-500 px-1.5 py-0.5 font-display text-[10px] font-bold uppercase text-white">You</span> : null}
                          </span>
                          <span className="block truncate text-xs text-text-muted md:hidden">
                            {p.team_name || '—'}
                            {p.position ? ` · ${positionLabel(p.position)}` : ''}
                          </span>
                        </span>
                      </Link>
                    </Td>
                    <Td num>
                      <span className={`num-display text-2xl ${metric === 'rating' ? 'text-brand-400' : 'text-text-primary'}`}>{p.value ?? '—'}</span>
                    </Td>
                    <Td muted className="hidden md:table-cell">
                      {p.team_name || '—'}
                    </Td>
                    <Td muted className="hidden md:table-cell">
                      {positionLabel(p.position)}
                    </Td>
                    <Td num muted className="hidden sm:table-cell">
                      {p.matches ?? 0}
                    </Td>
                    {isStat
                      ? STAT_COLUMNS.filter(([k]) => k !== metric).map(([k]) => (
                          <Td key={k} num muted>
                            {p[k] ?? 0}
                          </Td>
                        ))
                      : null}
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </TabPanel>
    </PageShell>
  );
}
