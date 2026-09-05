import { useMemo } from 'react';
import PageShell from '../../components/ui/PageShell.jsx';
import Button from '../../components/Button.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Icon from '../../components/ui/Icon.jsx';
import StatCard from '../../components/StatCard.jsx';
import { GroupLabel } from '../../components/ui/Section.jsx';
import MatchCard from '../../components/tournament/MatchCard.jsx';
import { LoadingBlock, ErrorBlock } from '../../components/ui/Loading.jsx';
import { useScoredMatches } from '../../hooks/queries.js';
import { listLocalMatches } from '../../scoring/matchStore.js';
import { useAuth } from '../../context/AuthContext.jsx';

function isToday(value) {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function Section({ title, matches, cta, emptyCopy }) {
  return (
    <section>
      <GroupLabel count={matches.length}>{title}</GroupLabel>
      {matches.length ? (
        <div className="grid gap-2 md:grid-cols-2">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} action={cta(m)} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">{emptyCopy}</p>
      )}
    </section>
  );
}

export default function ScorerDashboard() {
  const { user } = useAuth();
  const q = useScoredMatches({ scorer: 'me', limit: 100 }, { refetchInterval: 15000 });
  const local = useMemo(() => new Map(listLocalMatches().map((l) => [String(l.matchId), l])), [q.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const matches = (q.data || []).map((m) => ({ ...m, pending: local.get(String(m.id))?.pending || 0 }));
  const active = matches.filter((m) => m.status === 'live' || m.status === 'completed');
  const today = matches.filter((m) => m.status === 'scheduled' && isToday(m.scheduled_at));
  const upcoming = matches.filter((m) => m.status === 'scheduled' && !isToday(m.scheduled_at));
  const recent = matches.filter((m) => m.status === 'submitted').slice(0, 6);
  const unsynced = matches.reduce((n, m) => n + (m.pending || 0), 0);

  const cta = (m) => {
    const label = m.status === 'live' ? 'Resume' : m.status === 'completed' ? 'Submit' : 'Score';
    const variant = m.status === 'live' ? 'live' : m.status === 'completed' ? 'gold' : 'primary';
    return (
      <Button to={`/score/${m.id}`} variant={variant} size="md" className="min-w-[100px]">
        {m.status === 'live' ? <Icon name="play" size={14} /> : null}
        {label}
        {m.pending ? (
          <span className="rounded-full bg-white/20 px-1.5 text-[10px]" title="Unsynced events">
            {m.pending}
          </span>
        ) : null}
      </Button>
    );
  };

  return (
    <PageShell
      eyebrow={
        <span className="eyebrow inline-flex items-center gap-1.5">
          <Icon name="whistle" size={14} /> Scorer desk
        </span>
      }
      title={`Welcome back, ${user?.name?.split(' ')[0] || 'scorer'}`}
      subtitle={active.length ? 'You have a match in progress — resume it below.' : 'Pick an assigned match or start a new one.'}
      actions={
        <Button to="/score/new" size="lg">
          <Icon name="play" size={18} /> Start scoring
        </Button>
      }
    >
      {q.isLoading ? (
        <LoadingBlock label="Loading your matches…" variant="cards" count={4} />
      ) : q.isError ? (
        <ErrorBlock error={q.error} retry={q.refetch} />
      ) : !matches.length ? (
        <EmptyState icon="ball" headline="No matches assigned yet" copy="Organizers assign scorers from the tournament schedule. You can also start an ad-hoc match between any two teams right now." ctaLabel="Start a match" ctaTo="/score/new" />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard size="sm" label="In progress" value={active.length} accent={active.length ? 'live' : 'default'} />
            <StatCard size="sm" label="Today" value={today.length} accent="blue" />
            <StatCard size="sm" label="Upcoming" value={upcoming.length} />
            <StatCard size="sm" label="Unsynced events" value={unsynced} accent={unsynced ? 'danger' : 'success'} />
          </div>
          {active.length ? <Section title="Active" matches={active} cta={cta} /> : null}
          <Section title="Today" matches={today} cta={cta} emptyCopy="Nothing scheduled for today." />
          <Section title="Upcoming" matches={upcoming} cta={cta} emptyCopy="No upcoming assignments." />
          <Section
            title="Recently completed"
            matches={recent}
            cta={(m) => (
              <Button to={`/matches/${m.id}`} variant="secondary" size="sm">
                Box score
              </Button>
            )}
            emptyCopy="No completed matches yet."
          />
        </div>
      )}
    </PageShell>
  );
}
