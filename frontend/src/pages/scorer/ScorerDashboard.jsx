import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../../components/ui/PageShell.jsx';
import Button from '../../components/Button.jsx';
import EmptyState from '../../components/EmptyState.jsx';
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
      <h2 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">
        {title} <span className="text-text-muted/70">({matches.length})</span>
      </h2>
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

  const cta = (m) => {
    const label = m.status === 'live' ? 'Resume' : m.status === 'completed' ? 'Submit' : 'Score';
    return (
      <Link to={`/score/${m.id}`}>
        <Button size="md" className="min-h-[48px] min-w-[96px]">
          {label}
          {m.pending ? <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px]" title="Unsynced events">{m.pending}</span> : null}
        </Button>
      </Link>
    );
  };

  return (
    <PageShell
      title="Scorer dashboard"
      subtitle={`Welcome back, ${user?.name?.split(' ')[0] || 'scorer'}. ${active.length ? 'You have a match in progress.' : 'Pick a match or start a new one.'}`}
      actions={
        <Link to="/score/new">
          <Button size="lg" className="min-h-[56px]">
            ▶ Start scoring
          </Button>
        </Link>
      }
    >
      {q.isLoading ? (
        <LoadingBlock label="Loading your matches…" />
      ) : q.isError ? (
        <ErrorBlock error={q.error} retry={q.refetch} />
      ) : !matches.length ? (
        <EmptyState
          icon="🏐"
          headline="No matches assigned yet"
          copy="Organizers assign scorers from the tournament schedule. You can also start an ad-hoc match between any two teams right now."
          ctaLabel="Start a match"
          onCta={() => (window.location.href = '/score/new')}
        />
      ) : (
        <div className="space-y-8">
          {active.length ? <Section title="Active" matches={active} cta={cta} /> : null}
          <Section title="Today" matches={today} cta={cta} emptyCopy="Nothing scheduled for today." />
          <Section title="Upcoming" matches={upcoming} cta={cta} emptyCopy="No upcoming assignments." />
          <Section title="Recently completed" matches={recent} cta={(m) => <Link to={`/matches/${m.id}`} className="text-sm font-semibold text-accent-400 hover:underline">Box score</Link>} emptyCopy="No completed matches yet." />
        </div>
      )}
    </PageShell>
  );
}
