import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageShell from '../../components/ui/PageShell.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import Field, { inputClass } from '../../components/ui/Field.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import Avatar from '../../components/Avatar.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { LoadingBlock, ErrorBlock } from '../../components/ui/Loading.jsx';
import { useToast } from '../../components/ui/ToastProvider.jsx';
import MatchCard from '../../components/tournament/MatchCard.jsx';
import { useTeam, useTeamStats, useScoredMatches, usePlayerSearch, useInvalidate } from '../../hooks/queries.js';
import { teamsApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { POSITION_LABELS, positionLabel, formatDate, signed } from '../../lib/format.js';
import { TournamentStatusPill, useDebounced, errorMessage } from '../tournaments/tournamentUi.jsx';

const TABS = [
  { key: 'roster', label: 'Roster' },
  { key: 'matches', label: 'Matches' },
  { key: 'analytics', label: 'Analytics' },
];

function useTeamAction(teamId) {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const [busy, setBusy] = useState(false);
  const run = async (fn, success) => {
    setBusy(true);
    try {
      const out = await fn();
      invalidate('team', 'teams', 'team-stats');
      if (success) toast(success, { tone: 'success' });
      return out;
    } catch (err) {
      toast(errorMessage(err), { tone: 'error', duration: 4000 });
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, teamId };
}

function AddPlayer({ team }) {
  const { run, busy } = useTeamAction(team.id);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null);
  const [email, setEmail] = useState('');
  const [jersey, setJersey] = useState('');
  const [position, setPosition] = useState('');
  const [captain, setCaptain] = useState(false);
  const debounced = useDebounced(query.trim(), 250);
  const search = usePlayerSearch(picked ? '' : debounced);
  const memberIds = new Set(team.members.map((m) => Number(m.id)));
  const results = (search.data || []).filter((p) => !memberIds.has(Number(p.id))).slice(0, 8);

  const submit = async (e) => {
    e.preventDefault();
    if (!picked && !email.trim()) return;
    const body = {
      user_id: picked?.id,
      email: picked ? undefined : email.trim(),
      jersey_number: jersey === '' ? null : Number(jersey),
      position: position || undefined,
      is_captain: captain,
    };
    const out = await run(() => teamsApi.addMember(team.id, body), `${picked?.name || email.trim()} added to the roster`);
    if (out) {
      setPicked(null);
      setQuery('');
      setEmail('');
      setJersey('');
      setPosition('');
      setCaptain(false);
    }
  };

  return (
    <Card className="p-4" role="region" aria-label="Add player">
      <h3 className="font-display text-lg font-bold">Add a player</h3>
      <form onSubmit={submit} noValidate className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="relative sm:col-span-2">
          <label className="block text-sm">
            <span className="font-semibold text-text-secondary">Find by name</span>
            {picked ? (
              <div className="mt-1 flex min-h-[44px] items-center gap-2 rounded-lg border border-accent-500 bg-accent-500/10 px-3">
                <Avatar src={picked.photo_url} name={picked.name} size="sm" />
                <span className="flex-1 font-semibold">{picked.name}</span>
                <button type="button" onClick={() => setPicked(null)} className="min-h-[36px] px-2 text-sm text-text-secondary hover:text-text-primary" aria-label="Clear selected player">
                  ✕
                </button>
              </div>
            ) : (
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type at least 2 letters…" className={inputClass} autoComplete="off" aria-autocomplete="list" aria-expanded={results.length > 0} />
            )}
          </label>
          {!picked && debounced.length >= 2 ? (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border-default bg-bg-card shadow-elevated" role="listbox" aria-label="Player results">
              {search.isLoading ? (
                <div className="px-3 py-2 text-sm text-text-muted">Searching…</div>
              ) : results.length ? (
                results.map((p) => (
                  <button key={p.id} type="button" role="option" aria-selected="false" onClick={() => setPicked(p)} className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left hover:bg-bg-elevated">
                    <Avatar src={p.photo_url} name={p.name} size="sm" />
                    <span className="flex-1 truncate font-semibold">{p.name}</span>
                    <span className="text-xs text-text-muted">
                      {positionLabel(p.position)} · {p.elo}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-text-muted">No players found — invite by email below.</div>
              )}
            </div>
          ) : null}
        </div>
        {!picked ? <Field label="…or by email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="player@example.com" hint="Must already have a GlobalVBC account." /> : null}
        <Field label="Jersey #" type="number" min={0} max={99} value={jersey} onChange={(e) => setJersey(e.target.value)} />
        <Field label="Position" as="select" value={position} onChange={(e) => setPosition(e.target.value)}>
          <option value="">Use player’s default</option>
          {Object.entries(POSITION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Field>
        <label className="flex min-h-[44px] items-center gap-3 self-end text-sm">
          <input type="checkbox" checked={captain} onChange={(e) => setCaptain(e.target.checked)} className="h-5 w-5 accent-accent-500" />
          <span className="font-semibold text-text-secondary">Captain</span>
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy || (!picked && !email.trim())} className="min-h-[44px]">
            {busy ? 'Adding…' : 'Add to roster'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function EditTeam({ team, onDone }) {
  const { run, busy } = useTeamAction(team.id);
  const [name, setName] = useState(team.name);
  const [logo, setLogo] = useState(team.logo_url || '');
  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const out = await run(() => teamsApi.update(team.id, { name: name.trim(), logo_url: logo.trim() }), 'Team updated');
    if (out) onDone();
  };
  return (
    <Card className="p-4" role="region" aria-label="Edit team">
      <h3 className="font-display text-lg font-bold">Edit team</h3>
      <form onSubmit={submit} noValidate className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Field label="Logo URL" type="url" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…" />
        <div className="flex gap-2">
          <Button type="submit" disabled={busy || !name.trim()} className="min-h-[44px]">
            Save
          </Button>
          <Button type="button" variant="ghost" onClick={onDone} className="min-h-[44px]">
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

function RemoveButton({ team, member }) {
  const { run, busy } = useTeamAction(team.id);
  const [arm, setArm] = useState(false);
  if (!arm) {
    return (
      <Button variant="ghost" size="sm" className="min-h-[44px] text-status-danger" onClick={() => setArm(true)} aria-label={`Remove ${member.name}`}>
        Remove
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs text-text-muted">Sure?</span>
      <Button
        size="sm"
        className="min-h-[44px] bg-status-danger hover:bg-status-danger/80"
        disabled={busy}
        onClick={async () => {
          await run(() => teamsApi.removeMember(team.id, member.id), `${member.name} removed`);
          setArm(false);
        }}
      >
        Yes, remove
      </Button>
      <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={() => setArm(false)}>
        No
      </Button>
    </span>
  );
}

function Roster({ team, canEdit }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="space-y-5">
      {canEdit ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-text-secondary">You manage this team. Add players by name or email.</p>
          <Button variant="secondary" className="min-h-[44px]" aria-pressed={editing} onClick={() => setEditing((v) => !v)}>
            Edit team
          </Button>
        </div>
      ) : null}
      {canEdit && editing ? <EditTeam team={team} onDone={() => setEditing(false)} /> : null}
      {canEdit ? <AddPlayer team={team} /> : null}
      {team.members.length ? (
        <div className="overflow-x-auto rounded-xl border border-border-default">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-bg-surface text-left text-[11px] uppercase tracking-wider text-text-muted">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2">Position</th>
                <th className="px-2 py-2 text-center">Rating</th>
                <th className="px-2 py-2 text-center">Scored matches</th>
                {canEdit ? <th className="px-2 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {team.members.map((m) => (
                <tr key={m.id} className="border-t border-border-default">
                  <td className="px-3 py-2 font-mono text-text-secondary">{m.jersey_number != null ? `#${m.jersey_number}` : '—'}</td>
                  <td className="px-3 py-2">
                    <Link to={`/p/${m.id}`} className="inline-flex items-center gap-2 font-semibold hover:text-accent-400">
                      <Avatar src={m.photo_url} name={m.name} size="sm" />
                      {m.name}
                    </Link>
                    {m.is_captain ? <span className="ml-2 rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-400">Captain</span> : null}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{positionLabel(m.position)}</td>
                  <td className="px-2 py-2 text-center font-bold tabular-nums text-brand-400">{m.elo}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{m.scored_matches}</td>
                  {canEdit ? (
                    <td className="px-2 py-1 text-right">
                      <RemoveButton team={team} member={m} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="🧑‍🤝‍🧑" headline="No players yet" copy={canEdit ? 'Add players above to build the roster.' : 'The coach has not added any players.'} />
      )}
    </div>
  );
}

function Matches({ team }) {
  const q = useScoredMatches({ team: team.id, limit: 100 }, { refetchInterval: 15000 });
  if (q.isLoading) return <LoadingBlock label="Loading matches…" />;
  if (q.isError) return <ErrorBlock error={q.error} retry={q.refetch} />;
  const matches = q.data || [];
  if (!matches.length) return <EmptyState icon="🏐" headline="No matches yet" copy="Matches appear here once the team is scheduled in a tournament or scored ad hoc." />;
  const order = { live: 0, scheduled: 1, completed: 2, submitted: 3, cancelled: 4 };
  const sorted = [...matches].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || new Date(b.scheduled_at || b.completed_at || 0) - new Date(a.scheduled_at || a.completed_at || 0));
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {sorted.map((m) => (
        <MatchCard key={m.id} match={m} />
      ))}
    </div>
  );
}

const COLS = [
  ['name', 'Player', 'left'],
  ['matches', 'M'],
  ['points', 'Pts'],
  ['kills', 'K'],
  ['kill_pct', 'K%'],
  ['aces', 'A'],
  ['blocks', 'B'],
  ['digs', 'D'],
  ['assists', 'Ast'],
  ['errors', 'Err'],
  ['rating_delta', 'Δ'],
];

function Analytics({ team }) {
  const q = useTeamStats(team.id);
  const [sort, setSort] = useState({ key: 'points', dir: 'desc' });
  const players = useMemo(() => {
    const list = (q.data?.players || []).map((p) => ({ ...p, kill_pct: p.attacks ? Math.round((p.kills / p.attacks) * 100) : 0 }));
    const { key, dir } = sort;
    return list.sort((a, b) => {
      const av = a[key] ?? 0;
      const bv = b[key] ?? 0;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return dir === 'asc' ? cmp : -cmp;
    });
  }, [q.data, sort]);
  if (q.isLoading) return <LoadingBlock label="Loading analytics…" />;
  if (q.isError) return <ErrorBlock error={q.error} retry={q.refetch} />;
  const results = q.data?.matches || [];
  if (!players.length && !results.length) return <EmptyState icon="📈" headline="No analytics yet" copy="Stats build up as scored matches are submitted." />;

  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 'asc' ? 'desc' : 'asc') : key === 'name' ? 'asc' : 'desc' }));

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">Player totals</h3>
        {players.length ? (
          <div className="overflow-x-auto rounded-xl border border-border-default">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-bg-surface text-[11px] uppercase tracking-wider text-text-muted">
                <tr>
                  {COLS.map(([key, label, align]) => (
                    <th key={key} className={`px-2 py-1 ${align === 'left' ? 'text-left' : 'text-center'}`} aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" onClick={() => toggle(key)} className={`min-h-[44px] font-semibold uppercase hover:text-text-primary ${sort.key === key ? 'text-accent-400' : ''}`}>
                        {label}
                        {sort.key === key ? <span aria-hidden="true">{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span> : null}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="border-t border-border-default">
                    <td className="px-2 py-2">
                      <Link to={`/p/${p.id}`} className="font-semibold hover:text-accent-400">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums">{p.matches}</td>
                    <td className="px-2 py-2 text-center font-bold tabular-nums text-brand-400">{p.points}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{p.kills}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{p.kill_pct}%</td>
                    <td className="px-2 py-2 text-center tabular-nums">{p.aces}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{p.blocks}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{p.digs}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{p.assists}</td>
                    <td className="px-2 py-2 text-center tabular-nums text-text-secondary">{p.errors}</td>
                    <td className={`px-2 py-2 text-center tabular-nums ${p.rating_delta > 0 ? 'text-status-success' : p.rating_delta < 0 ? 'text-status-danger' : ''}`}>{signed(p.rating_delta || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-text-muted">No player stats yet.</p>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">Recent results</h3>
        {results.length ? (
          <ul className="divide-y divide-border-default rounded-xl border border-border-default">
            {results.slice(0, 15).map((m) => {
              const home = Number(m.team_a_id) === Number(team.id);
              const opponent = home ? m.team_b_name : m.team_a_name;
              const sets = home ? `${m.sets_a}–${m.sets_b}` : `${m.sets_b}–${m.sets_a}`;
              return (
                <li key={m.id}>
                  <Link to={`/matches/${m.id}`} className="flex min-h-[48px] items-center gap-3 px-3 py-2 hover:bg-bg-elevated">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${m.won ? 'bg-status-success' : 'bg-status-danger'}`} aria-label={m.won ? 'Win' : 'Loss'} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">vs {opponent || 'TBD'}</span>
                      <span className="block truncate text-xs text-text-muted">
                        {m.tournament_name || 'Friendly'}
                        {m.completed_at ? ` · ${formatDate(m.completed_at)}` : ''}
                      </span>
                    </span>
                    <span className={`font-display text-lg font-black tabular-nums ${m.won ? 'text-status-success' : 'text-text-secondary'}`}>{sets}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">No completed matches yet.</p>
        )}
      </section>
    </div>
  );
}

export default function TeamDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const q = useTeam(id);
  const [tab, setTab] = useState('roster');

  if (q.isLoading) {
    return (
      <PageShell>
        <LoadingBlock label="Loading team…" />
      </PageShell>
    );
  }
  if (q.isError) {
    return (
      <PageShell title="Team">
        <ErrorBlock error={q.error} retry={q.refetch} />
      </PageShell>
    );
  }
  const team = q.data;
  const canEdit = Boolean(user && (Number(user.id) === Number(team.coach_user_id) || Number(user.id) === Number(team.created_by) || user.role === 'admin'));

  return (
    <PageShell wide>
      <header className="mb-5 flex flex-wrap items-center gap-4">
        <Avatar src={team.logo_url} name={team.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold md:text-4xl">{team.name}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {team.coach_name ? `Coach ${team.coach_name}` : 'No coach assigned'}
            {team.community_name ? ` · ${team.community_name}` : ''}
            {' · '}
            {team.member_count} players
          </p>
          {team.tournaments?.length ? (
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="Tournament history">
              {team.tournaments.map((t) => (
                <li key={t.id}>
                  <Link to={`/tournaments/${t.id}`} className="inline-flex min-h-[32px] items-center gap-2 rounded-full border border-border-default bg-bg-surface px-3 text-xs font-semibold hover:border-accent-500">
                    {t.name}
                    <TournamentStatusPill status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border border-border-default bg-bg-card px-4 py-2 text-center shadow-card">
            <div className="font-display text-2xl font-black tabular-nums text-brand-400">{team.elo}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Rating</div>
          </div>
          <div className="rounded-xl border border-border-default bg-bg-card px-4 py-2 text-center shadow-card">
            <div className="font-display text-2xl font-black tabular-nums">
              <span className="text-status-success">{team.wins}</span>–<span className="text-text-secondary">{team.losses}</span>
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">W–L</div>
          </div>
        </div>
      </header>

      <Tabs tabs={TABS.map((t) => (t.key === 'roster' ? { ...t, count: team.members.length } : t))} value={tab} onChange={setTab} className="mb-5" />
      <div role="tabpanel">
        {tab === 'roster' ? <Roster team={team} canEdit={canEdit} /> : null}
        {tab === 'matches' ? <Matches team={team} /> : null}
        {tab === 'analytics' ? <Analytics team={team} /> : null}
      </div>
    </PageShell>
  );
}
