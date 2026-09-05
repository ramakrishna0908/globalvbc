import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageShell from '../../components/ui/PageShell.jsx';
import Field from '../../components/ui/Field.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import Avatar from '../../components/Avatar.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { LoadingBlock, ErrorBlock } from '../../components/ui/Loading.jsx';
import { useToast } from '../../components/ui/ToastProvider.jsx';
import { useTeams, useInvalidate } from '../../hooks/queries.js';
import { teamsApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { inputClass } from '../../components/ui/Field.jsx';
import { useDebounced, errorMessage } from '../tournaments/tournamentUi.jsx';

function TeamCard({ team }) {
  return (
    <Link to={`/teams/${team.id}`} className="block">
      <Card className="flex h-full items-center gap-3 p-4 transition-colors hover:border-accent-500">
        <Avatar src={team.logo_url} name={team.name} size="md" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg font-bold leading-tight">{team.name}</h2>
          <div className="mt-0.5 truncate text-xs text-text-muted">
            {team.coach_name ? `Coach ${team.coach_name}` : 'No coach'}
            {team.community_name ? ` · ${team.community_name}` : ''}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
            <span>
              <span className="font-bold tabular-nums text-brand-400">{team.elo}</span> rating
            </span>
            <span>
              <span className="font-bold tabular-nums">{team.member_count}</span> players
            </span>
            <span className="tabular-nums">
              <span className="font-bold text-status-success">{team.wins}</span>–<span className="font-bold text-text-secondary">{team.losses}</span>
            </span>
          </div>
        </div>
      </Card>
    </Link>
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
      toast(`${team.name} created`, { tone: 'success', icon: '🎉' });
      onDone(team);
    } catch (err) {
      toast(errorMessage(err, 'Could not create team'), { tone: 'error', duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-5 p-4" role="region" aria-label="Create team">
      <h2 className="font-display text-lg font-bold">Create a team</h2>
      <p className="text-sm text-text-secondary">You become the coach and can build the roster right after.</p>
      <form onSubmit={submit} noValidate className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Team name" required value={name} onChange={(e) => (setName(e.target.value), setError(''))} error={error} placeholder="Riverside Spikers" />
        <Field label="Logo URL (optional)" type="url" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…/logo.png" />
        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="min-h-[44px]">
            {saving ? 'Creating…' : 'Create'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} className="min-h-[44px]">
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
            <Button variant={mine ? 'primary' : 'secondary'} aria-pressed={mine} className="min-h-[44px]" onClick={() => setMine(!mine)}>
              {mine ? '✓ My teams' : 'My teams'}
            </Button>
            <Button variant={creating ? 'secondary' : 'gold'} aria-pressed={creating} className="min-h-[44px]" onClick={() => setCreating((v) => !v)}>
              + Create team
            </Button>
          </>
        ) : null
      }
    >
      {creating && user ? <CreateTeam onDone={(team) => navigate(`/teams/${team.id}`)} onCancel={() => setCreating(false)} /> : null}

      <label className="mb-5 block">
        <span className="sr-only">Search teams</span>
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search teams by name…" className={`${inputClass} mt-0`} aria-label="Search teams" />
      </label>

      {teams.isLoading ? (
        <LoadingBlock label="Loading teams…" />
      ) : teams.isError ? (
        <ErrorBlock error={teams.error} retry={teams.refetch} />
      ) : !list.length ? (
        <EmptyState
          icon="👥"
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
