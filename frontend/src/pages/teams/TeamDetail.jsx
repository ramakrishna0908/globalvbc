import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageShell from '../../components/ui/PageShell.jsx';
import Tabs, { TabPanel } from '../../components/ui/Tabs.jsx';
import Field, { Checkbox, inputClass } from '../../components/ui/Field.jsx';
import Button from '../../components/Button.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';
import Avatar from '../../components/Avatar.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import StatCard from '../../components/StatCard.jsx';
import Icon from '../../components/ui/Icon.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { GroupLabel } from '../../components/ui/Section.jsx';
import { Table, TableWrap, Th, Td, SortableTh } from '../../components/ui/Table.jsx';
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
    <Card padding role="region" aria-label="Add player">
      <CardHeader title="Add a player" />
      <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
        <div className="relative sm:col-span-2">
          <label htmlFor="add-player-search" className="mb-1 block text-sm font-semibold text-text-secondary">
            Find by name
          </label>
          {picked ? (
            <div className="flex min-h-11 items-center gap-2 rounded-md border border-accent-500 bg-accent-500/10 px-3">
              <Avatar src={picked.photo_url} name={picked.name} size="xs" />
              <span className="flex-1 font-semibold">{picked.name}</span>
              <button type="button" onClick={() => setPicked(null)} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-text-secondary hover:text-text-primary" aria-label="Clear selected player">
                <Icon name="x" size={16} />
              </button>
            </div>
          ) : (
            <input id="add-player-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type at least 2 letters…" className={inputClass} autoComplete="off" aria-autocomplete="list" aria-expanded={results.length > 0} />
          )}
          {!picked && debounced.length >= 2 ? (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border-default bg-bg-card shadow-elevated" role="listbox" aria-label="Player results">
              {search.isLoading ? (
                <div className="px-3 py-2 text-sm text-text-muted">Searching…</div>
              ) : results.length ? (
                results.map((p) => (
                  <button key={p.id} type="button" role="option" aria-selected="false" onClick={() => setPicked(p)} className="flex min-h-11 w-full items-center gap-2 px-3 text-left hover:bg-bg-elevated">
                    <Avatar src={p.photo_url} name={p.name} size="xs" />
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
        <Checkbox className="self-end" label="Captain" checked={captain} onChange={(e) => setCaptain(e.target.checked)} />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy || (!picked && !email.trim())}>
            <Icon name="plus" size={16} /> {busy ? 'Adding…' : 'Add to roster'}
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
    <Card padding role="region" aria-label="Edit team">
      <CardHeader title="Edit team" />
      <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Field label="Logo URL" type="url" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…" />
        <div className="flex gap-2 sm:mt-6">
          <Button type="submit" disabled={busy || !name.trim()}>
            Save
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
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
      <Button variant="ghost" size="sm" className="text-status-danger" onClick={() => setArm(true)} aria-label={`Remove ${member.name}`}>
        Remove
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs text-text-muted">Sure?</span>
      <Button
        size="sm"
        variant="danger"
        disabled={busy}
        onClick={async () => {
          await run(() => teamsApi.removeMember(team.id, member.id), `${member.name} removed`);
          setArm(false);
        }}
      >
        Yes, remove
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setArm(false)}>
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
          <Button variant="secondary" aria-pressed={editing} onClick={() => setEditing((v) => !v)}>
            <Icon name="edit" size={16} /> Edit team
          </Button>
        </div>
      ) : null}
      {canEdit && editing ? <EditTeam team={team} onDone={() => setEditing(false)} /> : null}
      {canEdit ? <AddPlayer team={team} /> : null}
      {team.members.length ? (
        <TableWrap>
          <Table caption="Roster">
            <thead>
              <tr>
                <Th className="w-14">#</Th>
                <Th sticky>Player</Th>
                <Th>Position</Th>
                <Th num>Rating</Th>
                <Th num className="hidden sm:table-cell">
                  Scored matches
                </Th>
                {canEdit ? <Th className="text-right">Manage</Th> : null}
              </tr>
            </thead>
            <tbody>
              {team.members.map((m) => (
                <tr key={m.id}>
                  <Td className="font-display text-lg font-bold tabular-nums text-text-secondary">{m.jersey_number != null ? `#${m.jersey_number}` : '—'}</Td>
                  <Td sticky>
                    <span className="flex items-center gap-2">
                      <Link to={`/p/${m.id}`} className="inline-flex min-h-10 items-center gap-2 font-semibold hover:text-accent-400">
                        <Avatar src={m.photo_url} name={m.name} size="sm" />
                        {m.name}
                      </Link>
                      {m.is_captain ? <StatusBadge status="champion" size="sm" label="Captain" /> : null}
                    </span>
                  </Td>
                  <Td muted>{positionLabel(m.position)}</Td>
                  <Td num strong className="text-brand-400">
                    {m.elo}
                  </Td>
                  <Td num className="hidden sm:table-cell">
                    {m.scored_matches}
                  </Td>
                  {canEdit ? (
                    <Td className="text-right">
                      <RemoveButton team={team} member={m} />
                    </Td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      ) : (
        <EmptyState icon="users" headline="No players yet" copy={canEdit ? 'Add players above to build the roster.' : 'The coach has not added any players.'} />
      )}
    </div>
  );
}

function Matches({ team }) {
  const q = useScoredMatches({ team: team.id, limit: 100 }, { refetchInterval: 15000 });
  if (q.isLoading) return <LoadingBlock label="Loading matches…" variant="cards" />;
  if (q.isError) return <ErrorBlock error={q.error} retry={q.refetch} />;
  const matches = q.data || [];
  if (!matches.length) return <EmptyState icon="ball" headline="No matches yet" copy="Matches appear here once the team is scheduled in a tournament or scored ad hoc." />;
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
  ['matches', 'M', 'Matches'],
  ['points', 'Pts', 'Points'],
  ['kills', 'K', 'Kills'],
  ['kill_pct', 'K%', 'Kill percentage'],
  ['aces', 'A', 'Aces'],
  ['blocks', 'B', 'Blocks'],
  ['digs', 'D', 'Digs'],
  ['assists', 'Ast', 'Assists'],
  ['errors', 'Err', 'Errors'],
  ['rating_delta', 'Δ', 'Rating change'],
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
  if (q.isLoading) return <LoadingBlock label="Loading analytics…" variant="table" />;
  if (q.isError) return <ErrorBlock error={q.error} retry={q.refetch} />;
  const results = q.data?.matches || [];
  if (!players.length && !results.length) return <EmptyState icon="chart" headline="No analytics yet" copy="Stats build up as scored matches are submitted." />;

  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 'asc' ? 'desc' : 'asc') : key === 'name' ? 'asc' : 'desc' }));

  return (
    <div className="space-y-6">
      <section>
        <GroupLabel>Player totals</GroupLabel>
        {players.length ? (
          <TableWrap>
            <Table caption="Player totals — sortable" minWidth={720}>
              <thead>
                <tr>
                  {COLS.map(([key, label, align]) => (
                    <SortableTh key={key} label={label} title={align === 'left' ? undefined : align} num={align !== 'left'} sticky={key === 'name'} active={sort.key === key} dir={sort.key === key ? sort.dir : null} onSort={() => toggle(key)} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <Td sticky>
                      <Link to={`/p/${p.id}`} className="font-semibold hover:text-accent-400">
                        {p.name}
                      </Link>
                    </Td>
                    <Td num>{p.matches}</Td>
                    <Td num strong className="text-brand-400">
                      {p.points}
                    </Td>
                    <Td num>{p.kills}</Td>
                    <Td num>{p.kill_pct}%</Td>
                    <Td num>{p.aces}</Td>
                    <Td num>{p.blocks}</Td>
                    <Td num>{p.digs}</Td>
                    <Td num>{p.assists}</Td>
                    <Td num muted>
                      {p.errors}
                    </Td>
                    <Td num className={p.rating_delta > 0 ? 'font-bold text-status-success' : p.rating_delta < 0 ? 'font-bold text-status-danger' : ''}>
                      {signed(p.rating_delta || 0)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        ) : (
          <p className="text-sm text-text-muted">No player stats yet.</p>
        )}
      </section>
      <section>
        <GroupLabel>Recent results</GroupLabel>
        {results.length ? (
          <Card as="ul" className="divide-y divide-border-default">
            {results.slice(0, 15).map((m) => {
              const home = Number(m.team_a_id) === Number(team.id);
              const opponent = home ? m.team_b_name : m.team_a_name;
              const sets = home ? `${m.sets_a}–${m.sets_b}` : `${m.sets_b}–${m.sets_a}`;
              return (
                <li key={m.id}>
                  <Link to={`/matches/${m.id}`} className="flex min-h-14 items-center gap-3 px-3 py-2 hover:bg-bg-elevated">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-display text-sm font-bold ${m.won ? 'bg-status-success/15 text-status-success' : 'bg-status-danger/15 text-status-danger'}`} aria-label={m.won ? 'Win' : 'Loss'}>
                      {m.won ? 'W' : 'L'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-base font-bold uppercase tracking-wide">vs {opponent || 'TBD'}</span>
                      <span className="block truncate text-xs text-text-muted">
                        {m.tournament_name || 'Friendly'}
                        {m.completed_at ? ` · ${formatDate(m.completed_at)}` : ''}
                      </span>
                    </span>
                    <span className={`num-display text-2xl ${m.won ? 'text-text-primary' : 'text-text-secondary'}`}>{sets}</span>
                  </Link>
                </li>
              );
            })}
          </Card>
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
        <LoadingBlock label="Loading team…" variant="cards" />
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
  const tabsId = 'team-tabs';

  return (
    <PageShell wide back={{ to: '/teams', label: 'All teams' }}>
      <header className="mb-5 flex flex-col gap-4 border-b border-border-default pb-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center">
          <Avatar src={team.logo_url} name={team.name} size="lg" shape="square" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Team</p>
            <h1 className="font-display text-display-sm font-bold uppercase leading-none sm:text-display-md">{team.name}</h1>
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
                  <Link to={`/tournaments/${t.id}`} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border-default bg-bg-card px-3 text-xs font-semibold hover:border-accent-400">
                    {t.name}
                    <TournamentStatusPill status={t.status} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:shrink-0">
          <StatCard size="sm" align="center" label="Rating" value={team.elo} accent="gold" className="min-w-[96px]" />
          <StatCard
            size="sm"
            align="center"
            label="W–L"
            className="min-w-[96px]"
            value={
              <>
                <span className="text-status-success">{team.wins}</span>
                <span className="text-text-muted">–</span>
                <span className="text-text-secondary">{team.losses}</span>
              </>
            }
          />
        </div>
      </header>

      <Tabs id={tabsId} label="Team sections" tabs={TABS.map((t) => (t.key === 'roster' ? { ...t, count: team.members.length } : t))} value={tab} onChange={setTab} className="mb-5" />
      <TabPanel id={tabsId} value={tab}>
        {tab === 'roster' ? <Roster team={team} canEdit={canEdit} /> : null}
        {tab === 'matches' ? <Matches team={team} /> : null}
        {tab === 'analytics' ? <Analytics team={team} /> : null}
      </TabPanel>
    </PageShell>
  );
}
