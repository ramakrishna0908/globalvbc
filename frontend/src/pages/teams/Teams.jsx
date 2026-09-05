import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageShell from '../../components/ui/PageShell.jsx';
import Field from '../../components/ui/Field.jsx';
import Button from '../../components/Button.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';
import Avatar from '../../components/Avatar.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { LoadingBlock, ErrorBlock } from '../../components/ui/Loading.jsx';
import { useToast } from '../../components/ui/ToastProvider.jsx';
import { useTeams, useInvalidate } from '../../hooks/queries.js';
import { teamsApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDebounced, errorMessage } from '../tournaments/tournamentUi.jsx';

function TeamCard({ team }) {
  return (
    <Card as="article" interactive className="relative flex h-full items-center gap-3 p-4">
      <Avatar src={team.logo_url} name={team.name} size="md" shape="square" />
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-display text-xl font-bold uppercase leading-none tracking-wide">
          <Link to={`/teams/${team.id}`} className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none">
            {team.name}
          </Link>
        </h2>
        <div className="mt-1 truncate text-xs text-text-muted">
          {team.coach_name ? `Coach ${team.coach_name}` : 'No coach'}
          {team.community_name ? ` · ${team.community_name}` : ''}
        </div>
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
          <div>
            <dt className="sr-only">Rating</dt>
            <dd>
              <span className="font-display text-base font-bold tabular-nums text-brand-400">{team.elo}</span> rating
            </dd>
          </div>
          <div>
            <dt className="sr-only">Players</dt>
            <dd>
              <span className="font-display text-base font-bold tabular-nums">{team.member_count}</span> players
            </dd>
          </div>
          <div>
            <dt className="sr-only">Record</dt>
            <dd className="font-display text-base font-bold tabular-nums">
              <span className="text-status-success">{team.wins}</span>
              <span className="text-text-muted">–</span>
              <span className="text-text-secondary">{team.losses}</span>
            </dd>
          </div>
        </dl>
      </div>
      <Icon name="chevronRight" size={18} className="text-text-muted" />
    </Card>
  );
}

function CreateTeam({ onDone, onCancel }) {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Team name is required');
      return;
    }
    setSaving(true);
    try {
      const team = await teamsApi.create({ name: name.trim(), logo_url: logo.trim() || undefined });
      invalidate('teams');
      toast(`${team.name} created`, { tone: 'success' });
      onDone(team);
    } catch (err) {
      toast(errorMessage(err, 'Could not create team'), { tone: 'error', duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding tone="accent" className="mb-5" role="region" aria-label="Create team">
      <CardHeader title="Create a team" as="h2" />
      <p className="-mt-2 text-sm text-text-secondary">You become the coach and can build the roster right after.</p>
      <form onSubmit={submit} noValidate className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <Field label="Team name" required value={name} onChange={(e) => (setName(e.target.value), setError(''))} error={error} placeholder="Riverside Spikers" />
        <Field label="Logo URL (optional)" type="url" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…/logo.png" />
        <div className="flex gap-2 sm:mt-6">
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function Teams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const mine = params.get('mine') === '1';
  const [search, setSearch] = useState(params.get('q') || '');
  const q = useDebounced(search.trim(), 300);
  const [creating, setCreating] = useState(false);
  const teams = useTeams({ q: q || undefined, mine: mine && user ? 1 : undefined });

  const setMine = (on) => {
    const next = new URLSearchParams(params);
    if (on) next.set('mine', '1');
    else next.delete('mine');
    setParams(next, { replace: true });
  };

  const list = teams.data || [];

  return (
    <PageShell
      title={mine ? 'My teams' : 'Teams'}
      subtitle={mine ? 'Teams you coach, created or play for.' : 'Every squad on GlobalVBC, ranked by team rating.'}
      actions={
        user ? (
          <>
            <Button variant={mine ? 'primary' : 'secondary'} aria-pressed={mine} onClick={() => setMine(!mine)}>
              {mine ? <Icon name="check" size={16} /> : null} My teams
            </Button>
            <Button variant={creating ? 'secondary' : 'gold'} aria-pressed={creating} onClick={() => setCreating((v) => !v)}>
              <Icon name="plus" size={16} /> Create team
            </Button>
          </>
        ) : null
      }
    >
      {creating && user ? <CreateTeam onDone={(team) => navigate(`/teams/${team.id}`)} onCancel={() => setCreating(false)} /> : null}

      <div className="relative mb-5 max-w-md">
        <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <label className="sr-only" htmlFor="team-search">
          Search teams
        </label>
        <input id="team-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search teams by name…" className="input pl-10" />
      </div>

      {teams.isLoading ? (
        <LoadingBlock label="Loading teams…" variant="cards" count={6} />
      ) : teams.isError ? (
        <ErrorBlock error={teams.error} retry={teams.refetch} />
      ) : !list.length ? (
        <EmptyState
          icon="users"
          headline={q ? `No teams match “${q}”` : mine ? 'You are not on a team yet' : 'No teams yet'}
          copy={q ? 'Try a shorter name.' : user ? 'Create a team and add players from their profiles.' : 'Sign in to create a team.'}
          ctaLabel={q ? 'Clear search' : user ? 'Create team' : 'Sign in'}
          onCta={q ? () => setSearch('') : user ? () => setCreating(true) : () => navigate('/login')}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((team) => (
            <li key={team.id}>
              <TeamCard team={team} />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
