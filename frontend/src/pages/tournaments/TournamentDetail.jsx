import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageShell from '../../components/ui/PageShell.jsx';
import Tabs, { TabPanel } from '../../components/ui/Tabs.jsx';
import Button from '../../components/Button.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';
import Avatar from '../../components/Avatar.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import StatCard from '../../components/StatCard.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Field from '../../components/ui/Field.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { GroupLabel, SectionHeader } from '../../components/ui/Section.jsx';
import LoadMore, { usePaged } from '../../components/ui/LoadMore.jsx';
import { Table, TableWrap, Th, Td } from '../../components/ui/Table.jsx';
import { LoadingBlock, ErrorBlock } from '../../components/ui/Loading.jsx';
import { useToast } from '../../components/ui/ToastProvider.jsx';
import MatchCard from '../../components/tournament/MatchCard.jsx';
import StandingsTable from '../../components/tournament/StandingsTable.jsx';
import Bracket from '../../components/tournament/Bracket.jsx';
import { useTournament, useScoredMatches, useStandings, useBracket, useTournamentLeaders, useTeams, useInvalidate } from '../../hooks/queries.js';
import { tournamentsApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { TOURNAMENT_FORMAT_LABELS, LEVEL_LABELS, formatDate, signed } from '../../lib/format.js';
import { TournamentStatusPill, RegistrationStatusPill, LiveBadge, dateRange, placeLabel, errorMessage, BRACKET_FORMATS, POOL_FORMATS } from './tournamentUi.jsx';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'standings', label: 'Standings' },
  { key: 'bracket', label: 'Bracket' },
  { key: 'leaders', label: 'Leaders' },
  { key: 'teams', label: 'Teams' },
];

function MatchGroup({ title, matches, emptyCopy, step = 8 }) {
  const paged = usePaged(matches, step);
  return (
    <section>
      <GroupLabel count={matches.length}>{title}</GroupLabel>
      {matches.length ? (
        <>
          <div className="grid gap-2 md:grid-cols-2">
            {paged.items.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
          <LoadMore remaining={paged.remaining} onMore={paged.more} label="Show more results" />
        </>
      ) : (
        <p className="text-sm text-text-muted">{emptyCopy}</p>
      )}
    </section>
  );
}

function Overview({ t }) {
  const q = useScoredMatches({ tournament: t.id, limit: 200 }, { refetchInterval: 10000 });
  const matches = q.data || [];
  const live = matches.filter((m) => m.status === 'live');
  const upcoming = matches.filter((m) => m.status === 'scheduled').sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0));
  const completed = matches.filter((m) => m.status === 'submitted' || m.status === 'completed').sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));
  const liveCount = live.length || t.live_count;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <StatCard size="sm" label="Teams" value={t.team_count} />
        <StatCard size="sm" label="Courts" value={t.court_count} />
        <StatCard size="sm" label="Matches" value={t.match_count} />
        <StatCard size="sm" label="Live" value={liveCount} accent={liveCount ? 'live' : 'default'} />
        <StatCard size="sm" label="Completed" value={t.completed_count} accent="success" />
      </div>
      {t.description ? <p className="max-w-3xl whitespace-pre-line text-sm text-text-secondary">{t.description}</p> : null}
      {q.isLoading ? (
        <LoadingBlock label="Loading matches…" variant="cards" count={4} />
      ) : q.isError ? (
        <ErrorBlock error={q.error} retry={q.refetch} />
      ) : !matches.length ? (
        <EmptyState icon="list" headline="No schedule yet" copy={t.status === 'draft' || t.status === 'published' ? 'The organizer has not generated the schedule. Check back once registration closes.' : 'No matches were recorded for this tournament.'} />
      ) : (
        <>
          {live.length ? <MatchGroup title="Live now" matches={live} /> : null}
          <MatchGroup title="Upcoming" matches={upcoming} emptyCopy="Nothing left to play." />
          <MatchGroup title="Results" matches={completed} emptyCopy="No results yet." />
        </>
      )}
    </div>
  );
}

function Standings({ t }) {
  const q = useStandings(t.id, { refetchInterval: 15000 });
  if (q.isLoading) return <LoadingBlock label="Loading standings…" variant="table" />;
  if (q.isError) return <ErrorBlock error={q.error} retry={q.refetch} />;
  const standings = q.data || [];
  const hasRows = standings.some((d) => d.groups.some((g) => g.rows?.length));
  if (!hasRows) return <EmptyState icon="chart" headline="No standings yet" copy="Standings appear once teams are approved and matches are scheduled." />;
  return (
    <div className="space-y-8">
      {standings.map((d) => {
        const championRow = d.champion ? d.groups.flatMap((g) => g.rows).find((r) => Number(r.teamId) === Number(d.champion)) : null;
        const division = t.divisions?.find((x) => Number(x.id) === Number(d.division.id));
        const settings = { ...(t.settings || {}), ...(division?.settings || {}) };
        const advance = POOL_FORMATS.includes(d.division.format) && d.groups.length > 1 ? Number(settings.advance || 2) : null;
        return (
          <section key={d.division.id} aria-labelledby={`standings-${d.division.id}`}>
            <SectionHeader
              id={`standings-${d.division.id}`}
              size="sm"
              title={
                <>
                  {d.division.name} <span className="text-sm font-semibold text-text-muted">· {TOURNAMENT_FORMAT_LABELS[d.division.format] || d.division.format}</span>
                </>
              }
              action={
                championRow ? (
                  <Link to={`/teams/${championRow.teamId}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-500/15 px-3 font-display text-sm font-bold uppercase tracking-wide text-brand-400 ring-1 ring-inset ring-brand-500/40 hover:bg-brand-500/25">
                    <Icon name="trophy" size={16} /> Champion: {championRow.team?.name || `Team ${championRow.teamId}`}
                  </Link>
                ) : null
              }
            />
            <div className="space-y-4">
              {d.groups.map((g) => (
                <div key={g.pool || 'all'}>
                  <StandingsTable rows={g.rows} title={g.pool ? `Pool ${g.pool}` : d.groups.length > 1 ? 'Overall' : null} champion={d.champion} advance={advance} complete={g.complete} />
                  {g.total ? (
                    <p className="mt-1.5 text-xs text-text-muted">
                      {g.played}/{g.total} matches played{g.complete ? ' · complete' : ''}
                      {advance ? ` · top ${advance} advance` : ''}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-text-muted">Ranked by wins, then set ratio (SR), then point ratio (PR).</p>
          </section>
        );
      })}
    </div>
  );
}

function BracketTab({ t }) {
  const q = useBracket(t.id, { refetchInterval: 15000 });
  if (q.isLoading) return <LoadingBlock label="Loading bracket…" />;
  if (q.isError) return <ErrorBlock error={q.error} retry={q.refetch} />;
  const bracket = q.data || [];
  const formatOf = (divisionId) => t.divisions?.find((d) => Number(d.id) === Number(divisionId))?.format || t.format;
  const any = bracket.some((b) => BRACKET_FORMATS.includes(formatOf(b.division.id)) || b.matches?.length);
  if (!any) {
    return <EmptyState icon="layers" headline="This format has no bracket" copy={`${TOURNAMENT_FORMAT_LABELS[t.format] || t.format} is decided on the standings table.`} />;
  }
  return (
    <div className="space-y-8">
      {bracket.map((b) => {
        const fmt = formatOf(b.division.id);
        return (
          <section key={b.division.id}>
            <SectionHeader
              size="sm"
              title={
                <>
                  {b.division.name} <span className="text-sm font-semibold text-text-muted">· {TOURNAMENT_FORMAT_LABELS[fmt] || fmt}</span>
                </>
              }
            />
            {BRACKET_FORMATS.includes(fmt) || b.matches?.length ? <Bracket matches={b.matches} /> : <p className="text-sm text-text-muted">{TOURNAMENT_FORMAT_LABELS[fmt] || fmt} — no bracket for this division.</p>}
          </section>
        );
      })}
    </div>
  );
}

const LEADER_METRICS = [
  ['points', 'Points'],
  ['kills', 'Kills'],
  ['aces', 'Aces'],
  ['blocks', 'Blocks'],
  ['digs', 'Digs'],
  ['assists', 'Assists'],
];

function LeaderTable({ title, rows, metric }) {
  return (
    <Card>
      <div className="eyebrow border-b border-border-default bg-bg-surface px-3 py-2">{title}</div>
      {rows?.length ? (
        <ol className="divide-y divide-border-default">
          {rows.map((p, i) => (
            <li key={p.id} className="flex min-h-12 items-center gap-3 px-3 py-1.5">
              <span className={`flex h-6 w-6 items-center justify-center rounded-md font-display text-sm font-bold tabular-nums ${i === 0 ? 'bg-brand-500/20 text-brand-400' : 'bg-bg-elevated text-text-muted'}`}>{i + 1}</span>
              <Avatar src={p.photo_url} name={p.name} size="sm" />
              <span className="min-w-0 flex-1">
                <Link to={`/p/${p.id}`} className="block truncate font-semibold hover:text-accent-400">
                  {p.name}
                </Link>
                <span className="block truncate text-xs text-text-muted">{p.team_name || '—'}</span>
              </span>
              <span className="num-display text-xl text-brand-400">{p[metric]}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-3 py-4 text-sm text-text-muted">No stats yet.</p>
      )}
    </Card>
  );
}

function Leaders({ t }) {
  const q = useTournamentLeaders(t.id);
  if (q.isLoading) return <LoadingBlock label="Crunching the numbers…" variant="cards" />;
  if (q.isError) return <ErrorBlock error={q.error} retry={q.refetch} />;
  const leaders = q.data || {};
  const any = LEADER_METRICS.some(([k]) => leaders[k]?.length) || leaders.mvp?.length;
  if (!any) return <EmptyState icon="star" headline="No player stats yet" copy="Leaders appear once scored matches are submitted." />;
  return (
    <div className="space-y-6">
      {leaders.mvp?.length ? (
        <TableWrap>
          <div className="eyebrow border-b border-border-default bg-bg-surface px-3 py-2">MVP candidates</div>
          <Table caption="MVP candidates with per-tournament totals">
            <thead>
              <tr>
                <Th sticky>Player</Th>
                <Th num title="Matches">M</Th>
                <Th num title="Points">Pts</Th>
                <Th num title="Kills">K</Th>
                <Th num title="Aces">A</Th>
                <Th num title="Blocks">B</Th>
                <Th num title="Digs">D</Th>
                <Th num title="Assists">Ast</Th>
                <Th num title="Errors">Err</Th>
                <Th num>Δ Rating</Th>
              </tr>
            </thead>
            <tbody>
              {leaders.mvp.map((p, i) => (
                <tr key={p.id}>
                  <Td sticky>
                    <span className="flex items-center gap-2">
                      <span className="w-5 font-display font-bold tabular-nums text-text-muted">{i + 1}</span>
                      <span className="min-w-0">
                        <Link to={`/p/${p.id}`} className="block truncate font-semibold hover:text-accent-400">
                          {p.name}
                        </Link>
                        <span className="block truncate text-xs text-text-muted">{p.team_name}</span>
                      </span>
                    </span>
                  </Td>
                  <Td num>{p.matches}</Td>
                  <Td num strong className="text-brand-400">{p.points}</Td>
                  <Td num>{p.kills}</Td>
                  <Td num>{p.aces}</Td>
                  <Td num>{p.blocks}</Td>
                  <Td num>{p.digs}</Td>
                  <Td num>{p.assists}</Td>
                  <Td num muted>{p.errors}</Td>
                  <Td num className={p.rating_delta > 0 ? 'font-bold text-status-success' : p.rating_delta < 0 ? 'font-bold text-status-danger' : ''}>{signed(p.rating_delta || 0)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LEADER_METRICS.map(([k, label]) => (
          <LeaderTable key={k} title={label} rows={leaders[k]} metric={k} />
        ))}
      </div>
    </div>
  );
}

function TeamsTab({ t }) {
  const approved = (t.registrations || []).filter((r) => r.status === 'approved');
  if (!approved.length) return <EmptyState icon="users" headline="No teams approved yet" copy={t.registration_open ? 'Registration is open — coaches can request a spot from this page.' : 'Registration is closed.'} />;
  const byDivision = new Map();
  for (const r of approved) {
    const key = r.division_name || 'Open';
    if (!byDivision.has(key)) byDivision.set(key, []);
    byDivision.get(key).push(r);
  }
  return (
    <div className="space-y-6">
      {[...byDivision.entries()].map(([division, regs]) => (
        <section key={division}>
          <GroupLabel count={regs.length}>{division}</GroupLabel>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {regs.map((r) => (
              <li key={r.id}>
                <Link to={`/teams/${r.team_id}`} className="flex min-h-16 items-center gap-3 rounded-lg border border-border-default bg-bg-card p-3 shadow-card transition-colors hover:border-accent-400">
                  <Avatar src={r.team_logo} name={r.team_name} size="md" shape="square" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-lg font-bold uppercase tracking-wide">{r.team_name}</span>
                    <span className="block text-xs text-text-muted">
                      {r.seed ? `Seed ${r.seed} · ` : ''}
                      {r.member_count} players · {r.team_elo} rating
                    </span>
                  </span>
                  <Icon name="chevronRight" size={18} className="text-text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function RegisterPanel({ t, onClose }) {
  const teams = useTeams({ mine: 1 });
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const [busy, setBusy] = useState(null);
  const [division, setDivision] = useState(t.divisions?.[0]?.id || '');
  const regByTeam = new Map((t.registrations || []).map((r) => [Number(r.team_id), r]));

  const register = async (team) => {
    setBusy(team.id);
    try {
      const reg = await tournamentsApi.register(t.id, { team_id: team.id, division_id: division || undefined });
      invalidate('tournament', 'tournaments');
      toast(reg.status === 'approved' ? `${team.name} is in` : `${team.name} requested a spot — waiting for approval`, { tone: 'success', duration: 3000 });
    } catch (err) {
      toast(errorMessage(err, 'Registration failed'), { tone: 'error', duration: 4000 });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card padding tone="accent" role="region" aria-label="Register a team">
      <CardHeader
        title="Register a team"
        as="h2"
        action={
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close registration panel">
            <Icon name="x" size={18} />
          </Button>
        }
      />
      <p className="-mt-2 text-sm text-text-secondary">Pick one of your teams. The organizer approves requests.</p>
      {t.divisions?.length > 1 ? (
        <Field as="select" label="Division" value={division} onChange={(e) => setDivision(e.target.value)} className="mt-3 max-w-xs">
          {t.divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Field>
      ) : null}
      {teams.isLoading ? (
        <LoadingBlock label="Loading your teams…" />
      ) : teams.isError ? (
        <ErrorBlock error={teams.error} retry={teams.refetch} />
      ) : !teams.data?.length ? (
        <p className="mt-3 text-sm text-text-secondary">
          You do not coach a team yet.{' '}
          <Link to="/teams?mine=1" className="link">
            Create one
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border-default">
          {teams.data.map((team) => {
            const reg = regByTeam.get(Number(team.id));
            return (
              <li key={team.id} className="flex min-h-14 items-center gap-3 py-2">
                <Avatar src={team.logo_url} name={team.name} size="sm" shape="square" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-bold uppercase tracking-wide">{team.name}</span>
                  <span className="block text-xs text-text-muted">
                    {team.member_count} players · {team.elo} rating
                  </span>
                </span>
                {reg && reg.status !== 'withdrawn' ? (
                  <RegistrationStatusPill status={reg.status} size="md" />
                ) : (
                  <Button size="sm" disabled={busy === team.id} onClick={() => register(team)}>
                    {busy === team.id ? 'Sending…' : 'Register'}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default function TournamentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const q = useTournament(id, { refetchInterval: 20000 });
  const [tab, setTab] = useState('overview');
  const [registering, setRegistering] = useState(false);

  if (q.isLoading) {
    return (
      <PageShell>
        <LoadingBlock label="Loading tournament…" variant="cards" />
      </PageShell>
    );
  }
  if (q.isError) {
    return (
      <PageShell title="Tournament">
        <ErrorBlock error={q.error} retry={q.refetch} />
      </PageShell>
    );
  }
  const t = q.data;
  const place = placeLabel(t);
  const canRegister = user && ['coach', 'organizer', 'admin'].includes(user.role) && t.status !== 'completed' && t.status !== 'cancelled' && (t.registration_open || t.canManage);
  const approved = (t.registrations || []).filter((r) => r.status === 'approved').length;
  const tabsId = 'tournament-tabs';

  return (
    <PageShell wide back={{ to: '/tournaments', label: 'All tournaments' }}>
      <header className="mb-5 border-b border-border-default pb-5">
        <div className="flex flex-wrap items-center gap-2">
          {t.status === 'live' && t.live_count ? <LiveBadge count={t.live_count} /> : <TournamentStatusPill status={t.status} />}
          {t.registration_open && t.status === 'published' ? <StatusBadge status="registration_open" /> : null}
          <span className="eyebrow">
            {LEVEL_LABELS[t.level] || t.level} · {TOURNAMENT_FORMAT_LABELS[t.format] || t.format}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-display-md font-bold">{t.name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="calendar" size={15} className="text-text-muted" />
                {dateRange(t)}
              </span>
              {place ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="pin" size={15} className="text-text-muted" />
                  {place}
                </span>
              ) : null}
              {t.organizer_name ? (
                <span className="inline-flex items-center gap-1.5 text-text-muted">
                  <Icon name="whistle" size={15} />
                  Organized by {t.organizer_name}
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setTab('standings')}>
              <Icon name="chart" size={16} /> Standings
            </Button>
            {canRegister ? (
              <Button variant={registering ? 'secondary' : 'gold'} aria-pressed={registering} onClick={() => setRegistering((v) => !v)}>
                <Icon name="users" size={16} /> Register team
              </Button>
            ) : null}
            {t.canManage ? (
              <Button to={`/tournaments/${t.id}/manage`}>
                Manage
                {t.pending_count ? <span className="rounded-full bg-white/20 px-1.5 text-xs">{t.pending_count}</span> : null}
              </Button>
            ) : null}
          </div>
        </div>
        {registering ? (
          <div className="mt-4">
            <RegisterPanel t={t} onClose={() => setRegistering(false)} />
          </div>
        ) : null}
      </header>

      <Tabs id={tabsId} label="Tournament sections" tabs={TABS.map((x) => (x.key === 'teams' ? { ...x, count: approved } : x))} value={tab} onChange={setTab} className="mb-5" />
      <TabPanel id={tabsId} value={tab}>
        {tab === 'overview' ? <Overview t={t} /> : null}
        {tab === 'standings' ? <Standings t={t} /> : null}
        {tab === 'bracket' ? <BracketTab t={t} /> : null}
        {tab === 'leaders' ? <Leaders t={t} /> : null}
        {tab === 'teams' ? <TeamsTab t={t} /> : null}
      </TabPanel>
      {t.starts_on && t.status === 'published' ? <p className="mt-8 text-center text-xs text-text-muted">Starts {formatDate(t.starts_on)}. Scores go live here as they are entered by scorers.</p> : null}
    </PageShell>
  );
}
