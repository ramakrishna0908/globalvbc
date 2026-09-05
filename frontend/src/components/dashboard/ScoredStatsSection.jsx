// "Official stats" — everything derived from scorer-submitted matches.
// The presentational pieces are exported so the public profile can reuse them.
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import Card from '../Card.jsx';
import ChartCard from '../ChartCard.jsx';
import ProgressBar from '../ProgressBar.jsx';
import EmptyState from '../EmptyState.jsx';
import { LoadingBlock, ErrorBlock } from '../ui/Loading.jsx';
import { usePlayerStats, usePlayerRatingEvents } from '../../hooks/queries.js';
import { formatDate, signed } from '../../lib/format.js';

export const SKILL_LABELS = [
  ['serve', 'Serve'],
  ['receive', 'Receive'],
  ['set', 'Set'],
  ['attack', 'Attack / Spike'],
  ['block', 'Block'],
  ['dig', 'Dig'],
  ['defense', 'Defense'],
];

export const NO_SCORED_COPY = 'No officially scored matches yet — stats appear after a scorer submits a match.';

/** Recent form as W/L dots, oldest → newest. */
export function FormDots({ form = [], size = 'md' }) {
  if (!form.length) return <span className="text-sm text-text-muted">No results yet</span>;
  const dim = size === 'sm' ? 'h-5 w-5 text-[10px]' : 'h-7 w-7 text-xs';
  return (
    <ol className="flex flex-wrap gap-1" aria-label={`Recent form: ${form.join(' ')}`} data-testid="form-dots">
      {form.map((r, i) => (
        <li
          key={i}
          className={`flex items-center justify-center rounded-full font-black ${dim} ${
            r === 'W' ? 'bg-status-success/20 text-status-success' : 'bg-status-danger/20 text-status-danger'
          }`}
          title={r === 'W' ? 'Win' : 'Loss'}
        >
          {r}
        </li>
      ))}
    </ol>
  );
}

const axis = { stroke: 'rgb(138 126 107)', fontSize: 11 };

/** Elo over time, one point per scored match. */
export function RatingTrendChart({ trend = [], height = 180, title = 'Rating trend' }) {
  const data = trend.map((t, i) => ({ index: i + 1, elo: Number(t.elo), delta: Number(t.delta), date: t.date }));
  if (data.length < 2) {
    return (
      <Card className="p-5">
        <h3 className="mb-2 text-base font-display font-semibold text-text-primary">{title}</h3>
        <p className="text-sm text-text-muted">{data.length === 1 ? 'One rated match so far — the trend line appears after your next one.' : 'The trend line appears after your first rated match.'}</p>
      </Card>
    );
  }
  const values = data.map((d) => d.elo);
  const min = Math.floor((Math.min(...values) - 20) / 10) * 10;
  const max = Math.ceil((Math.max(...values) + 20) / 10) * 10;
  return (
    <ChartCard title={title} height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(58 53 48 / 0.4)" />
        <XAxis dataKey="index" hide />
        <YAxis domain={[min, max]} {...axis} width={40} />
        <Tooltip
          contentStyle={{ background: 'rgb(30 26 22)', border: 'none', borderRadius: 8, color: 'rgb(245 240 232)' }}
          labelFormatter={(_, payload) => (payload?.[0]?.payload?.date ? formatDate(payload[0].payload.date) : '')}
          formatter={(value, name, item) => [`${value} (${signed(item.payload.delta)})`, 'Elo']}
        />
        <Line type="monotone" dataKey="elo" stroke="rgb(212 162 62)" strokeWidth={2.5} dot={{ r: 2.5, fill: 'rgb(212 162 62)' }} activeDot={{ r: 4 }} />
      </LineChart>
    </ChartCard>
  );
}

/** Seven 0–100 skill bars from the engine's skillScores(). */
export function SkillBars({ skills = {} }) {
  return (
    <div className="space-y-3" data-testid="skill-bars">
      {SKILL_LABELS.map(([key, label]) => (
        <ProgressBar key={key} label={label} value={Number(skills[key]) || 0} max={100} accent={key === 'attack' || key === 'serve' ? 'gold' : 'blue'} />
      ))}
    </div>
  );
}

function Tile({ label, value, sub, accent = 'text-text-primary' }) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-surface p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
      {sub ? <div className="text-xs text-text-secondary">{sub}</div> : null}
    </div>
  );
}

/** Career totals + per-match averages. */
export function CareerGrid({ career }) {
  if (!career) return null;
  const pm = career.per_match || {};
  const avg = (k) => (pm[k] != null ? `${pm[k]} / match` : null);
  const eff = Number(career.hitting_efficiency ?? 0);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="career-grid">
      <Tile label="Matches" value={career.matches ?? 0} sub={`${career.wins ?? 0}–${career.losses ?? 0} · ${career.win_rate ?? 0}% wins`} />
      <Tile label="Points" value={career.points ?? 0} sub={avg('points')} accent="text-brand-400" />
      <Tile label="Kills" value={career.kills ?? 0} sub={avg('kills')} />
      <Tile label="Kill %" value={`${career.kill_pct ?? 0}%`} sub={`${career.attacks ?? 0} attempts`} />
      <Tile label="Hitting eff." value={eff.toFixed(3).replace(/^0/, '')} sub={`${career.attack_errors ?? 0} attack errors`} accent={eff >= 0.2 ? 'text-status-success' : eff < 0 ? 'text-status-danger' : 'text-text-primary'} />
      <Tile label="Aces" value={career.aces ?? 0} sub={avg('aces')} />
      <Tile label="Blocks" value={career.blocks ?? 0} sub={avg('blocks')} />
      <Tile label="Digs" value={career.digs ?? 0} sub={avg('digs')} />
      <Tile label="Assists" value={career.assists ?? 0} sub={avg('assists')} />
      <Tile label="Errors" value={career.errors ?? 0} sub={avg('errors')} accent="text-status-danger" />
    </div>
  );
}

/** One rating event: before → after, coloured delta, reason and date. */
export function RatingChangeRow({ event, showMatch = true }) {
  const delta = Number(event.delta) || 0;
  const cls = delta > 0 ? 'text-status-success' : delta < 0 ? 'text-status-danger' : 'text-text-muted';
  const versus = event.team_a_name && event.team_b_name ? `${event.team_a_name} ${event.sets_a ?? ''}–${event.sets_b ?? ''} ${event.team_b_name}` : null;
  return (
    <li className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4" data-testid="rating-change">
      <div className="flex shrink-0 items-baseline gap-2 font-mono tabular-nums">
        <span className="text-text-secondary">{event.rating_before}</span>
        <span className="text-text-muted" aria-hidden="true">
          →
        </span>
        <span className="font-bold text-text-primary">{event.rating_after}</span>
        <span className={`font-bold ${cls}`}>{signed(delta)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-primary">{event.reason || 'Rating updated after a scored match.'}</p>
        <p className="text-xs text-text-muted">
          {formatDate(event.created_at)}
          {versus ? <span> · {versus}</span> : null}
          {showMatch && event.match_id ? (
            <>
              {' '}
              ·{' '}
              <Link to={`/matches/${event.match_id}`} className="font-semibold text-accent-400 hover:underline">
                Box score
              </Link>
            </>
          ) : null}
        </p>
      </div>
    </li>
  );
}

/**
 * Player dashboard block: rating trend, form, career grid, skills and the
 * latest rating change. Renders an EmptyState when nothing has been scored.
 */
export default function ScoredStatsSection({ userId }) {
  const navigate = useNavigate();
  const stats = usePlayerStats(userId);
  const events = usePlayerRatingEvents(userId);

  if (stats.isLoading) return <LoadingBlock label="Loading official stats…" />;
  if (stats.isError) return <ErrorBlock error={stats.error} retry={() => stats.refetch()} />;
  const data = stats.data;
  const played = data?.career?.matches || 0;

  return (
    <section aria-labelledby="official-stats-heading" className="space-y-4" data-testid="official-stats">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="official-stats-heading" className="font-display text-xl font-bold">
            Official stats
          </h2>
          <p className="text-sm text-text-secondary">From scorer-submitted matches. Self-reported results don't count here.</p>
        </div>
        {played ? (
          <Link to={`/p/${userId}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-accent-400 hover:underline">
            Full profile →
          </Link>
        ) : null}
      </div>

      {!played ? (
        <EmptyState
          icon="📋"
          headline="No official stats yet"
          copy={`${NO_SCORED_COPY} Join a team, register for a tournament, and your box scores, skills and rating history will show up here.`}
          ctaLabel="Explore tournaments"
          onCta={() => navigate('/tournaments')}
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="flex flex-col justify-between gap-3 p-5">
              <div>
                <div className="text-sm text-text-muted">Official rating</div>
                <div className="font-display text-3xl font-bold text-brand-400">
                  {Number(data.player?.rating_score ?? 0).toFixed(1)}
                  <span className="ml-2 font-mono text-base font-medium text-text-secondary">{data.player?.elo} Elo</span>
                </div>
                <div className="mt-1 text-sm text-text-secondary">
                  {data.career.wins}–{data.career.losses} · {data.career.win_rate}% win rate
                </div>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Recent form</div>
                <FormDots form={data.form} />
              </div>
            </Card>
            <div className="lg:col-span-2">
              <RatingTrendChart trend={data.ratingTrend} />
            </div>
          </div>

          <CareerGrid career={data.career} />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-4 text-base font-display font-semibold">Skills</h3>
              <SkillBars skills={data.skills} />
            </Card>
            <Card className="p-5">
              <h3 className="mb-2 text-base font-display font-semibold">Latest rating change</h3>
              {events.isLoading ? (
                <LoadingBlock label="Loading…" />
              ) : events.data?.length ? (
                <ul>
                  <RatingChangeRow event={events.data[0]} />
                </ul>
              ) : (
                <p className="text-sm text-text-muted">No rating changes recorded yet.</p>
              )}
              <Link to={`/p/${userId}`} className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-accent-400 hover:underline">
                Why did my rating change? →
              </Link>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
