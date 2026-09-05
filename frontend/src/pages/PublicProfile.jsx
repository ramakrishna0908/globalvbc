// Player Profile v2 — public share card plus everything derived from
// scorer-submitted matches (rating trend, skills, career, history, rating log).
import { useParams, Link } from 'react-router-dom';
import PageShell from '../components/ui/PageShell.jsx';
import { LoadingBlock, ErrorBlock } from '../components/ui/Loading.jsx';
import { useToast } from '../components/ui/ToastProvider.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Avatar from '../components/Avatar.jsx';
import RatingBadge from '../components/RatingBadge.jsx';
import RankPill from '../components/RankPill.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { MatchStatusPill } from '../components/tournament/MatchCard.jsx';
import { FormDots, RatingTrendChart, SkillBars, CareerGrid, RatingChangeRow, NO_SCORED_COPY } from '../components/dashboard/ScoredStatsSection.jsx';
import { usePublicProfile, usePlayerStats, usePlayerMatches, usePlayerRatingEvents } from '../hooks/queries.js';
import { positionLabel, formatDate, signed, ROLE_LABELS } from '../lib/format.js';

const TOURNAMENT_STATUS = {
  draft: 'bg-bg-elevated text-text-muted',
  published: 'bg-accent-500/15 text-accent-400',
  live: 'bg-status-danger text-white',
  completed: 'bg-status-success/20 text-status-success',
  cancelled: 'bg-bg-elevated text-text-muted line-through',
};

function ShareCard({ profile }) {
  const { toast } = useToast();
  const url = `${window.location.origin}/p/${profile.id}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&bgcolor=255-255-255&data=${encodeURIComponent(url)}`;

  async function share() {
    const data = {
      title: `${profile.name} on GlobalVBC`,
      text: `Check out ${profile.name}'s volleyball profile — rating ${Number(profile.rating_score).toFixed(1)}.`,
      url,
    };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(url);
        toast('Profile link copied to clipboard', { tone: 'success', icon: '🔗' });
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-accent-600 to-violet-600 p-6 text-white">
        <div className="flex items-center gap-4">
          <Avatar src={profile.photo_url} name={profile.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-bold">{profile.name}</h1>
            <p className="opacity-90">
              {positionLabel(profile.position)}
              {profile.jersey_number != null ? <span className="ml-2 font-mono">#{profile.jersey_number}</span> : null}
              {profile.role && profile.role !== 'player' ? <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">{ROLE_LABELS[profile.role] || profile.role}</span> : null}
            </p>
            <div className="mt-2">
              <RankPill rank={profile.rank} movement="same" />
            </div>
          </div>
          <RatingBadge score={profile.rating_score} size="lg" />
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border-default border-b border-border-default text-center">
        {[
          [Number(profile.rating_score).toFixed(1), 'Rating'],
          [`${profile.win_rate}%`, 'Win Rate'],
          [profile.matches_played, 'Matches'],
        ].map(([v, l]) => (
          <div key={l} className="p-4">
            <div className="font-display text-xl font-bold text-brand-400">{v}</div>
            <div className="text-xs text-text-muted">{l}</div>
          </div>
        ))}
      </div>

      <div className="p-5">
        {profile.badges?.length ? (
          <div className="mb-4 flex flex-wrap gap-2" aria-label="Badges">
            {profile.badges.map((b) => (
              <span key={b.key} className="rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-medium text-brand-300">
                {b.icon} {b.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-text-muted">No badges earned yet.</p>
        )}

        <div className="flex items-center justify-between gap-4">
          <img src={qr} alt="Scan to view profile" className="h-[120px] w-[120px] rounded-lg bg-white p-1" />
          <div className="flex-1">
            <p className="text-sm text-text-secondary">Scan or share this card.</p>
            <Button className="mt-2 min-h-[44px] w-full" onClick={share}>
              Share Profile
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SectionTitle({ id, children, right }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 id={id} className="font-display text-xl font-bold">
        {children}
      </h2>
      {right}
    </div>
  );
}

function TeamsRow({ teams }) {
  if (!teams?.length) return null;
  return (
    <section aria-labelledby="teams-heading">
      <SectionTitle id="teams-heading">Teams</SectionTitle>
      <ul className="flex flex-wrap gap-2">
        {teams.map((t) => (
          <li key={t.id}>
            <Link to={`/teams/${t.id}`} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border-strong bg-bg-surface px-3 text-sm font-semibold hover:border-accent-500 hover:bg-bg-elevated">
              <Avatar src={t.logo_url} name={t.name} size="sm" />
              <span>{t.name}</span>
              {t.jersey_number != null ? <span className="font-mono text-xs text-text-muted">#{t.jersey_number}</span> : null}
              {t.position ? <span className="text-xs text-text-muted">{positionLabel(t.position)}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TournamentHistory({ tournaments }) {
  if (!tournaments?.length) return null;
  return (
    <section aria-labelledby="tournaments-heading">
      <SectionTitle id="tournaments-heading">Tournament history</SectionTitle>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-text-muted">
              <th scope="col" className="px-4 py-2 font-semibold">Tournament</th>
              <th scope="col" className="px-2 py-2 font-semibold">Status</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Matches</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Wins</th>
              <th scope="col" className="px-4 py-2 text-right font-semibold">Points</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((t) => (
              <tr key={t.id} className="border-t border-border-default">
                <td className="px-4 py-2">
                  <Link to={`/tournaments/${t.id}`} className="inline-flex min-h-[32px] items-center font-semibold text-text-primary hover:text-accent-400">
                    {t.name}
                  </Link>
                  <div className="text-xs text-text-muted">{formatDate(t.starts_on)}</div>
                </td>
                <td className="px-2 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wider ${TOURNAMENT_STATUS[t.status] || TOURNAMENT_STATUS.draft}`}>{t.status}</span>
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums">{t.matches}</td>
                <td className="px-2 py-2 text-right font-mono tabular-nums">{t.wins}</td>
                <td className="px-4 py-2 text-right font-mono font-bold tabular-nums">{t.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

function MatchHistory({ query }) {
  return (
    <section aria-labelledby="matches-heading">
      <SectionTitle id="matches-heading">Match history</SectionTitle>
      {query.isLoading ? (
        <LoadingBlock label="Loading matches…" />
      ) : query.isError ? (
        <ErrorBlock error={query.error} retry={() => query.refetch()} />
      ) : !query.data?.length ? (
        <p className="text-sm text-text-muted">No scored matches yet.</p>
      ) : (
        <Card className="divide-y divide-border-default">
          {query.data.map((m) => {
            const opponent = m.side === 'A' ? m.team_b_name : m.team_a_name;
            const own = m.side === 'A' ? m.team_a_name : m.team_b_name;
            const setsOwn = m.side === 'A' ? m.sets_a : m.sets_b;
            const setsOpp = m.side === 'A' ? m.sets_b : m.sets_a;
            const delta = Number(m.rating_delta) || 0;
            return (
              <Link key={m.id} to={`/matches/${m.id}`} className="flex min-h-[64px] flex-col gap-1 p-4 hover:bg-bg-elevated sm:flex-row sm:items-center sm:justify-between" data-testid="match-row">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-black ${m.won ? 'bg-status-success/20 text-status-success' : 'bg-status-danger/20 text-status-danger'}`}>{m.won ? 'WON' : 'LOST'}</span>
                    <span className="font-semibold text-text-primary">
                      {own} <span className="font-mono tabular-nums">{setsOwn}–{setsOpp}</span> {opponent}
                    </span>
                    {m.status !== 'submitted' ? <MatchStatusPill status={m.status} /> : null}
                  </div>
                  <div className="mt-0.5 text-xs text-text-muted">
                    {m.tournament_name || 'Friendly match'} · {formatDate(m.completed_at)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-sm">
                  <span className="font-mono text-xs text-text-secondary" aria-label="Personal line">
                    {m.points} pts · {m.kills} K · {m.aces} ace · {m.blocks} blk · {m.digs} dig
                  </span>
                  <span className={`font-mono font-bold tabular-nums ${delta > 0 ? 'text-status-success' : delta < 0 ? 'text-status-danger' : 'text-text-muted'}`}>{signed(delta)}</span>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </section>
  );
}

function RatingLog({ query }) {
  return (
    <section aria-labelledby="rating-log-heading">
      <SectionTitle id="rating-log-heading">Why did my rating change?</SectionTitle>
      {query.isLoading ? (
        <LoadingBlock label="Loading rating history…" />
      ) : query.isError ? (
        <ErrorBlock error={query.error} retry={() => query.refetch()} />
      ) : !query.data?.length ? (
        <p className="text-sm text-text-muted">No rating changes yet.</p>
      ) : (
        <Card className="px-4">
          <ul className="divide-y divide-border-default" data-testid="rating-log">
            {query.data.map((e) => (
              <RatingChangeRow key={e.id} event={e} />
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

export default function PublicProfile() {
  const { id } = useParams();
  const profileQ = usePublicProfile(id);
  const profile = profileQ.data;
  // The share endpoint accepts 'sample'; every stats hook needs the numeric id.
  const playerId = profile?.id;
  const stats = usePlayerStats(playerId);
  const matches = usePlayerMatches(playerId);
  const ratingEvents = usePlayerRatingEvents(playerId);

  if (profileQ.isLoading) {
    return (
      <PageShell>
        <LoadingBlock label="Loading profile…" />
      </PageShell>
    );
  }
  if (profileQ.isError || !profile) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md">
          <EmptyState icon="🤔" headline="Profile not found" copy="This player profile doesn't exist." />
        </div>
      </PageShell>
    );
  }

  const data = stats.data;
  const played = data?.career?.matches || 0;

  return (
    <PageShell wide>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
          <ShareCard profile={profile} />
          <p className="text-center text-sm text-text-muted">
            <Link to="/register" className="font-semibold text-accent-400 hover:underline">
              Build your own volleyball profile →
            </Link>
          </p>
        </div>

        <div className="space-y-8 lg:col-span-2">
          {stats.isLoading ? (
            <LoadingBlock label="Loading official stats…" />
          ) : stats.isError ? (
            <ErrorBlock error={stats.error} retry={() => stats.refetch()} />
          ) : !played ? (
            <>
              <EmptyState icon="📋" headline="No official stats yet" copy={NO_SCORED_COPY} />
              <TeamsRow teams={data?.teams} />
            </>
          ) : (
            <>
              {/* ---------- rating ---------- */}
              <section aria-labelledby="rating-heading">
                <SectionTitle id="rating-heading">Rating</SectionTitle>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
                  <Card className="flex flex-col justify-between gap-3 p-5">
                    <div>
                      <div className="text-sm text-text-muted">Official rating</div>
                      <div className="font-display text-3xl font-bold text-brand-400" data-testid="rating-score">
                        {Number(data.player?.rating_score ?? profile.rating_score).toFixed(1)}
                      </div>
                      <div className="font-mono text-sm text-text-secondary">{data.player?.elo ?? profile.elo} Elo</div>
                    </div>
                    <div className="text-sm text-text-secondary">
                      <span className="font-bold text-text-primary">
                        {data.career.wins}–{data.career.losses}
                      </span>{' '}
                      · {data.career.win_rate}% win rate
                    </div>
                    <div>
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Recent form</div>
                      <FormDots form={data.form} />
                    </div>
                  </Card>
                  <div className="md:col-span-2">
                    <RatingTrendChart trend={data.ratingTrend} />
                  </div>
                </div>
              </section>

              {/* ---------- skills ---------- */}
              <section aria-labelledby="skills-heading">
                <SectionTitle id="skills-heading">Skills</SectionTitle>
                <Card className="p-5">
                  <SkillBars skills={data.skills} />
                  <p className="mt-3 text-xs text-text-muted">0–100 efficiency scores derived from every scored action. They update after each submitted match.</p>
                </Card>
              </section>

              {/* ---------- career ---------- */}
              <section aria-labelledby="career-heading">
                <SectionTitle id="career-heading">Career statistics</SectionTitle>
                <CareerGrid career={data.career} />
              </section>

              <TeamsRow teams={data.teams} />
              <TournamentHistory tournaments={data.tournaments} />
              <MatchHistory query={matches} />
              <RatingLog query={ratingEvents} />
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
