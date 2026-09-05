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
import Icon from '../components/ui/Icon.jsx';
import StatusBadge, { TOURNAMENT_STATUS } from '../components/ui/StatusBadge.jsx';
import { SectionHeader } from '../components/ui/Section.jsx';
import { Table, TableWrap, Th, Td } from '../components/ui/Table.jsx';
import { MatchStatusPill } from '../components/tournament/MatchCard.jsx';
import { FormDots, RatingTrendChart, SkillBars, CareerGrid, RatingChangeRow, NO_SCORED_COPY } from '../components/dashboard/ScoredStatsSection.jsx';
import { usePublicProfile, usePlayerStats, usePlayerMatches, usePlayerRatingEvents } from '../hooks/queries.js';
import { positionLabel, formatDate, signed, ROLE_LABELS } from '../lib/format.js';

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
        toast('Profile link copied to clipboard');
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative bg-bg-inverse p-5 text-text-inverse">
        <div className="court-lines pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <Avatar src={profile.photo_url} name={profile.name} size="lg" className="ring-2 ring-brand-500" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow !text-brand-400">Player card</p>
            <h1 className="truncate font-display text-3xl font-bold uppercase leading-none">{profile.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm opacity-90">
              {positionLabel(profile.position)}
              {profile.jersey_number != null ? <span className="font-display font-bold">#{profile.jersey_number}</span> : null}
              {profile.role && profile.role !== 'player' ? <span className="rounded-full bg-white/15 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider">{ROLE_LABELS[profile.role] || profile.role}</span> : null}
            </p>
            <div className="mt-2">
              <RankPill rank={profile.rank} movement="same" className="!bg-white/10 !text-text-inverse" />
            </div>
          </div>
          <RatingBadge score={profile.rating_score} size="lg" />
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border-default border-b border-border-default text-center">
        {[
          [Number(profile.rating_score).toFixed(1), 'Rating', 'text-brand-400'],
          [`${profile.win_rate}%`, 'Win rate', ''],
          [profile.matches_played, 'Matches', ''],
        ].map(([v, l, c]) => (
          <div key={l} className="p-3">
            <div className={`num-display text-2xl ${c}`}>{v}</div>
            <div className="eyebrow mt-0.5 !text-[10px]">{l}</div>
          </div>
        ))}
      </div>

      <div className="p-4">
        {profile.badges?.length ? (
          <ul className="mb-4 flex flex-wrap gap-2" aria-label="Badges">
            {profile.badges.map((b) => (
              <li key={b.key} className="rounded-full border border-brand-500/40 bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-400">
                {b.icon} {b.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-text-muted">No badges earned yet.</p>
        )}

        <div className="flex items-center justify-between gap-4">
          <img src={qr} alt="QR code linking to this profile" className="h-[104px] w-[104px] rounded-md bg-white p-1" width={104} height={104} />
          <div className="flex-1">
            <p className="text-sm text-text-secondary">Scan or share this card.</p>
            <Button className="mt-2 w-full" onClick={share}>
              <Icon name="share" size={16} /> Share profile
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function TeamsRow({ teams }) {
  if (!teams?.length) return null;
  return (
    <section aria-labelledby="teams-heading">
      <SectionHeader id="teams-heading" title="Teams" />
      <ul className="flex flex-wrap gap-2">
        {teams.map((t) => (
          <li key={t.id}>
            <Link to={`/teams/${t.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong bg-bg-card px-3 text-sm font-semibold hover:border-accent-400">
              <Avatar src={t.logo_url} name={t.name} size="xs" shape="square" />
              <span className="font-display text-base font-bold uppercase tracking-wide">{t.name}</span>
              {t.jersey_number != null ? <span className="font-display text-sm font-bold text-text-muted">#{t.jersey_number}</span> : null}
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
      <SectionHeader id="tournaments-heading" title="Tournament history" />
      <TableWrap>
        <Table caption="Tournament history">
          <thead>
            <tr>
              <Th sticky>Tournament</Th>
              <Th>Status</Th>
              <Th num>Matches</Th>
              <Th num>Wins</Th>
              <Th num>Points</Th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((t) => (
              <tr key={t.id}>
                <Td sticky>
                  <Link to={`/tournaments/${t.id}`} className="inline-flex min-h-8 items-center font-semibold text-text-primary hover:text-accent-400">
                    {t.name}
                  </Link>
                  <div className="text-xs text-text-muted">{formatDate(t.starts_on)}</div>
                </Td>
                <Td>
                  <StatusBadge status={TOURNAMENT_STATUS[t.status] || t.status} size="sm" />
                </Td>
                <Td num>{t.matches}</Td>
                <Td num>{t.wins}</Td>
                <Td num strong>
                  {t.points}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </section>
  );
}

function MatchHistory({ query }) {
  return (
    <section aria-labelledby="matches-heading">
      <SectionHeader id="matches-heading" title="Match history" />
      {query.isLoading ? (
        <LoadingBlock label="Loading matches…" variant="cards" />
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
              <Link key={m.id} to={`/matches/${m.id}`} className="flex min-h-16 flex-col gap-2 p-3 hover:bg-bg-elevated sm:flex-row sm:items-center sm:justify-between" data-testid="match-row">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-display text-base font-bold ${m.won ? 'bg-status-success/15 text-status-success' : 'bg-status-danger/15 text-status-danger'}`} aria-label={m.won ? 'Won' : 'Lost'}>
                    {m.won ? 'W' : 'L'}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-base font-bold uppercase tracking-wide text-text-primary">
                        {own} <span className="num-display text-lg">{setsOwn}–{setsOpp}</span> {opponent}
                      </span>
                      {m.status !== 'submitted' ? <MatchStatusPill status={m.status} /> : null}
                    </div>
                    <div className="mt-0.5 text-xs text-text-muted">
                      {m.tournament_name || 'Friendly match'} · {formatDate(m.completed_at)}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-sm sm:pl-3">
                  <span className="font-display text-sm font-semibold tabular-nums text-text-secondary" aria-label="Personal line">
                    {m.points} pts · {m.kills} K · {m.aces} ace · {m.blocks} blk · {m.digs} dig
                  </span>
                  <span className={`num-display text-lg ${delta > 0 ? 'text-status-success' : delta < 0 ? 'text-status-danger' : 'text-text-muted'}`}>{signed(delta)}</span>
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
      <SectionHeader id="rating-log-heading" title="Why did my rating change?" />
      {query.isLoading ? (
        <LoadingBlock label="Loading rating history…" variant="text" />
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
        <LoadingBlock label="Loading profile…" variant="cards" />
      </PageShell>
    );
  }
  if (profileQ.isError || !profile) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md">
          <EmptyState icon="search" headline="Profile not found" copy="This player profile doesn't exist." ctaLabel="Browse the leaderboard" ctaTo="/leaderboard" />
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
            <Link to="/register" className="link">
              Build your own volleyball profile
            </Link>
          </p>
        </div>

        <div className="space-y-8 lg:col-span-2">
          {stats.isLoading ? (
            <LoadingBlock label="Loading official stats…" variant="cards" />
          ) : stats.isError ? (
            <ErrorBlock error={stats.error} retry={() => stats.refetch()} />
          ) : !played ? (
            <>
              <EmptyState icon="list" headline="No official stats yet" copy={NO_SCORED_COPY} />
              <TeamsRow teams={data?.teams} />
            </>
          ) : (
            <>
              <section aria-labelledby="rating-heading">
                <SectionHeader id="rating-heading" title="Rating" />
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
                  <Card padding className="flex flex-col justify-between gap-3">
                    <div>
                      <div className="eyebrow">Official rating</div>
                      <div className="num-display mt-1 text-4xl text-brand-400" data-testid="rating-score">
                        {Number(data.player?.rating_score ?? profile.rating_score).toFixed(1)}
                      </div>
                      <div className="font-display text-sm font-semibold text-text-secondary">{data.player?.elo ?? profile.elo} Elo</div>
                    </div>
                    <div className="text-sm text-text-secondary">
                      <span className="font-display text-lg font-bold text-text-primary">
                        {data.career.wins}–{data.career.losses}
                      </span>{' '}
                      · {data.career.win_rate}% win rate
                    </div>
                    <div>
                      <div className="eyebrow mb-1">Recent form</div>
                      <FormDots form={data.form} />
                    </div>
                  </Card>
                  <div className="md:col-span-2">
                    <RatingTrendChart trend={data.ratingTrend} />
                  </div>
                </div>
              </section>

              <section aria-labelledby="skills-heading">
                <SectionHeader id="skills-heading" title="Skills" />
                <Card padding>
                  <SkillBars skills={data.skills} />
                  <p className="mt-3 text-xs text-text-muted">0–100 efficiency scores derived from every scored action. They update after each submitted match.</p>
                </Card>
              </section>

              <section aria-labelledby="career-heading">
                <SectionHeader id="career-heading" title="Career statistics" />
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
