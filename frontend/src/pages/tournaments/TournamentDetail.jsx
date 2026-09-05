import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageShell from '../../components/ui/PageShell.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import Avatar from '../../components/Avatar.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { LoadingBlock, ErrorBlock } from '../../components/ui/Loading.jsx';
import { useToast } from '../../components/ui/ToastProvider.jsx';
import MatchCard from '../../components/tournament/MatchCard.jsx';
import StandingsTable from '../../components/tournament/StandingsTable.jsx';
import Bracket from '../../components/tournament/Bracket.jsx';
import { useTournament, useScoredMatches, useStandings, useBracket, useTournamentLeaders, useTeams, useInvalidate } from '../../hooks/queries.js';
import { tournamentsApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { TOURNAMENT_FORMAT_LABELS, LEVEL_LABELS, formatDate } from '../../lib/format.js';
import { TournamentStatusPill, RegistrationStatusPill, LiveBadge, dateRange, placeLabel, errorMessage, BRACKET_FORMATS } from './tournamentUi.jsx';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'standings', label: 'Standings' },
  { key: 'bracket', label: 'Bracket' },
  { key: 'leaders', label: 'Leaders' },
  { key: 'teams', label: 'Teams' },
];

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-card px-3 py-3 text-center shadow-card">
      <div className={`font-display text-2xl font-black tabular-nums ${tone || 'text-text-primary'}`}>{value ?? 0}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</div>
    </div>
  );
}

function MatchGroup({ title, matches, emptyCopy }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">
        {title} <span className="text-text-muted/70">({matches.length})</span>
      </h3>
      {matches.length ? (
        <div className="grid gap-2 md:grid-cols-2">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
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
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <Stat label="Teams" value={t.team_count} />
        <Stat label="Courts" value={t.court_count} />
        <Stat label="Matches" value={t.match_count} />
        <Stat label="Live" value={live.length || t.live_count} tone={live.length || t.live_count ? 'text-status-danger' : undefined} />
        <Stat label="Completed" value={t.completed_count} tone="text-status-success" />
      </div>
      {t.description ? <p className="whitespace-pre-line text-sm text-text-secondary">{t.description}</p> : null}
      {q.isLoading ? (
        <LoadingBlock label="Loading matches…" />
      ) : q.isError ? (
        <ErrorBlock error={q.error} retry={q.refetch} />
      ) : !matches.length ? (
        <EmptyState icon="📋" headline="No schedule yet" copy={t.status === 'draft' || t.status === 'published' ? 'The organizer has not generated the schedule. Check back once registration closes.' : 'No matches were recorded for this tournament.'} />
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
  if (q.isLoading) return <LoadingBlock label="Loading standings…" />;
  if (q.isError) return <ErrorBlock error={q.error} retry={q.refetch} />;
  const standings = q.data || [];
  const hasRows = standings.some((d) => d.groups.some((g) => g.rows?.length));
  if (!hasRows) return <EmptyState icon="📊" headline="No standings yet" copy="Standings appear once teams are approved and matches are scheduled." />;
  return (
    <div className="space-y-8">
      {standings.map((d) => {
        const championRow = d.champion ? d.groups.flatMap((g) => g.rows).find((r) => Number(r.teamId) === Number(d.champion)) : null;
        return (
          <section key={d.division.id} aria-labelledby={`standings-${d.division.id}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 id={`standings-${d.division.id}`} className="font-display text-lg font-bold">
                {d.division.name} <span className="text-sm font-normal text-text-muted">· {TOURNAMENT_FORMAT_LABELS[d.division.format] || d.division.format}</span>
              </h3>
              {championRow ? (
                <span className="rounded-full bg-brand-500/20 px-3 py-1 text-sm font-bold text-brand-400">
                  🏆 Champion: <Link to={`/teams/${championRow.teamId}`} className="hover:underline">{championRow.team?.name || `Team ${championRow.teamId}`}</Link>
                </span>
              ) : null}
            </div>
            <div className="space-y-4">
              {d.groups.map((g) => (
                <div key={g.pool || 'all'}>
                  <StandingsTable rows={g.rows} title={g.pool ? `Pool ${g.pool}` : d.groups.length > 1 ? 'Overall' : null} champion={d.champion} />
                  {g.total ? (
                    <p className="mt-1 text-xs text-text-muted">
                      {g.played}/{g.total} matches played{g.complete ? ' · complete' : ''}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
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
    return <EmptyState icon="🪜" headline="This format has no bracket" copy={`${TOURNAMENT_FORMAT_LABELS[t.format] || t.format} is decided on the standings table.`} />;
  }
  return (
    <div className="space-y-8">
      {bracket.map((b) => {
        const fmt = formatOf(b.division.id);
        return (
          <section key={b.division.id}>
            <h3 className="mb-3 font-display text-lg font-bold">
              {b.division.name} <span className="text-sm font-normal text-text-muted">· {TOURNAMENT_FORMAT_LABELS[fmt] || fmt}</span>
            </h3>
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
    <Card className="overflow-hidden">
      <div className="border-b border-border-default bg-bg-surface px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">{title}</div>
      {rows?.length ? (
        <ol className="divide-y divide-border-default">
          {rows.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <span className="w-5 text-right text-sm font-bold tabular-nums text-text-muted">{i + 1}</span>
              <Avatar src={p.photo_url} name={p.name} size="sm" />
              <span className="min-w-0 flex-1">
                <Link to={`/p/${p.id}`} className="block truncate font-semibold hover:text-accent-400">
                  {p.name}
                </Link>
                <span className="block truncate text-xs text-text-muted">{p.team_name || '—'}</span>
              </span>
              <span className="font-display text-lg font-black tabular-nums text-brand-400">{p[metric]}</span>
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
  if (q.isLoading) return <LoadingBlock label="Crunching the numbers…" />;
  if (q.isError) return <ErrorBlock error={q.error} retry={q.refetch} />;
  const leaders = q.data || {};
  const any = LEADER_METRICS.some(([k]) => leaders[k]?.length) || leaders.mvp?.length;
  if (!any) return <EmptyState icon="⭐" headline="No player stats yet" copy="Leaders appear once scored matches are submitted." />;
  return (
    <div className="space-y-6">
      {leaders.mvp?.length ? (
        <Card className="overflow-x-auto">
          <div className="border-b border-border-default bg-bg-surface px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">MVP candidates</div>
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-text-muted">
              <tr>
                <th className="px-3 py-2">Player</th>
                <th className="px-2 py-2 text-center">M</th>
                <th className="px-2 py-2 text-center">Pts</th>
                <th className="px-2 py-2 text-center">K</th>
                <th className="px-2 py-2 text-center">A</th>
                <th className="px-2 py-2 text-center">B</th>
                <th className="px-2 py-2 text-center">D</th>
                <th className="px-2 py-2 text-center">Ast</th>
                <th className="px-2 py-2 text-center">Err</th>
                <th className="px-2 py-2 text-center">Δ Rating</th>
              </tr>
            </thead>
            <tbody>
              {leaders.mvp.map((p, i) => (
                <tr key={p.id} className="border-t border-border-default">
                  <td className="px-3 py-2">
                    <span className="mr-2 font-bold tabular-nums text-text-muted">{i + 1}</span>
                    <Link to={`/p/${p.id}`} className="font-semibold hover:text-accent-400">
                      {p.name}
                    </Link>
                    <span className="ml-2 text-xs text-text-muted">{p.team_name}</span>
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums">{p.matches}</td>
                  <td className="px-2 py-2 text-center font-bold tabular-nums text-brand-400">{p.points}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{p.kills}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{p.aces}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{p.blocks}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{p.digs}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{p.assists}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-text-secondary">{p.errors}</td>
                  <td className={`px-2 py-2 text-center tabular-nums ${p.rating_delta > 0 ? 'text-status-success' : p.rating_delta < 0 ? 'text-status-danger' : ''}`}>
                    {p.rating_delta > 0 ? `+${p.rating_delta}` : p.rating_delta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
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
  if (!approved.length) return <EmptyState icon="👥" headline="No teams approved yet" copy={t.registration_open ? 'Registration is open — coaches can request a spot from this page.' : 'Registration is closed.'} />;
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
          <h3 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">
            {division} <span className="text-text-muted/70">({regs.length})</span>
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {regs.map((r) => (
              <li key={r.id}>
                <Link to={`/teams/${r.team_id}`} className="flex min-h-[64px] items-center gap-3 rounded-xl border border-border-default bg-bg-card p-3 shadow-card transition-colors hover:border-accent-500">
                  <Avatar src={r.team_logo} name={r.team_name} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.team_name}</span>
                    <span className="block text-xs text-text-muted">
                      {r.seed ? `Seed ${r.seed} · ` : ''}
                      {r.member_count} players · {r.team_elo} elo
                    </span>
                  </span>
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
      toast(reg.status === 'approved' ? `${team.name} is in` : `${team.name} requested a spot — waiting for approval`, { tone: 'success', icon: reg.status === 'approved' ? '✅' : '⏳', duration: 3000 });
    } catch (err) {
      toast(errorMessage(err, 'Registration failed'), { tone: 'error', duration: 4000 });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-4" role="region" aria-label="Register a team">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Register a team</h2>
          <p className="text-sm text-text-secondary">Pick one of your teams. The organizer approves requests.</p>
        </div>
        <Button variant="ghost" className="min-h-[44px]" onClick={onClose} aria-label="Close registration panel">
          ✕
        </Button>
      </div>
      {t.divisions?.length > 1 ? (
        <label className="mt-3 block text-sm">
          <span className="font-semibold text-text-secondary">Division</span>
          <select value={division} onChange={(e) => setDivision(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-border-default bg-bg-surface px-3">
            {t.divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {teams.isLoading ? (
        <LoadingBlock label="Loading your teams…" />
      ) : teams.isError ? (
        <ErrorBlock error={teams.error} retry={teams.refetch} />
      ) : !teams.data?.length ? (
        <div className="mt-3 text-sm text-text-secondary">
          You do not coach a team yet.{' '}
          <Link to="/teams?mine=1" className="font-semibold text-accent-400 hover:underline">
            Create one
          </Link>
          .
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border-default">
          {teams.data.map((team) => {
            const reg = regByTeam.get(Number(team.id));
            return (
              <li key={team.id} className="flex items-center gap-3 py-2">
                <Avatar src={team.logo_url} name={team.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{team.name}</span>
                  <span className="block text-xs text-text-muted">
                    {team.member_count} players · {team.elo} elo
                  </span>
                </span>
                {reg && reg.status !== 'withdrawn' ? (
                  <RegistrationStatusPill status={reg.status} />
                ) : (
                  <Button size="sm" className="min-h-[44px]" disabled={busy === team.id} onClick={() => register(team)}>
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
        <LoadingBlock label="Loading tournament…" />
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

  return (
    <PageShell wide>
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <TournamentStatusPill status={t.status} />
          <LiveBadge count={t.live_count} />
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            {LEVEL_LABELS[t.level] || t.level} · {TOURNAMENT_FORMAT_LABELS[t.format] || t.format}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">{t.name}</h1>
            <p className="mt-1 text-text-secondary">
              <span aria-hidden="true">📅 </span>
              {dateRange(t)}
              {place ? (
                <>
                  {' '}
                  · <span aria-hidden="true">📍 </span>
                  {place}
                </>
              ) : null}
              {t.organizer_name ? <span className="text-text-muted"> · Organized by {t.organizer_name}</span> : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canRegister ? (
              <Button variant="secondary" className="min-h-[44px]" aria-pressed={registering} onClick={() => setRegistering((v) => !v)}>
                Register my team
              </Button>
            ) : null}
            {t.canManage ? (
              <Link to={`/tournaments/${t.id}/manage`}>
                <Button className="min-h-[44px]">
                  Manage
                  {t.pending_count ? <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[11px]">{t.pending_count}</span> : null}
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
        {registering ? (
          <div className="mt-4">
            <RegisterPanel t={t} onClose={() => setRegistering(false)} />
          </div>
        ) : null}
      </header>

      <Tabs tabs={TABS.map((x) => (x.key === 'teams' ? { ...x, count: approved } : x))} value={tab} onChange={setTab} className="mb-5" />
      <div role="tabpanel">
        {tab === 'overview' ? <Overview t={t} /> : null}
        {tab === 'standings' ? <Standings t={t} /> : null}
        {tab === 'bracket' ? <BracketTab t={t} /> : null}
        {tab === 'leaders' ? <Leaders t={t} /> : null}
        {tab === 'teams' ? <TeamsTab t={t} /> : null}
      </div>
      {t.starts_on && t.status === 'published' ? <p className="mt-8 text-center text-xs text-text-muted">Starts {formatDate(t.starts_on)}. Scores go live here as they are entered by scorers.</p> : null}
    </PageShell>
  );
}
