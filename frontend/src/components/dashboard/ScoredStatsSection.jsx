// "Official stats" — everything derived from scorer-submitted matches.
// The presentational pieces are exported so the public profile can reuse them.
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import Card, { CardHeader } from '../Card.jsx';
import ChartCard from '../ChartCard.jsx';
import ProgressBar from '../ProgressBar.jsx';
import EmptyState from '../EmptyState.jsx';
import Icon from '../ui/Icon.jsx';
import StatCard from '../StatCard.jsx';
import { SectionHeader } from '../ui/Section.jsx';
import { LoadingBlock, ErrorBlock } from '../ui/Loading.jsx';
import { usePlayerStats, usePlayerRatingEvents } from '../../hooks/queries.js';
import useChartTheme from '../../hooks/useChartTheme.js';
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

/** Recent form as W/L squares, oldest → newest. */
export function FormDots({ form = [], size = 'md' }) {
  if (!form.length) return <span className="text-sm text-text-muted">No results yet</span>;
  const dim = size === 'sm' ? 'h-5 w-5 text-[10px]' : 'h-7 w-7 text-xs';
  return (
    <ol className="flex flex-wrap gap-1" aria-label={`Recent form: ${form.join(' ')}`} data-testid="form-dots">
      {form.map((r, i) => (
        <li key={i} className={`flex items-center justify-center rounded-md font-display font-bold ${dim} ${r === 'W' ? 'bg-status-success/20 text-status-success' : 'bg-status-danger/20 text-status-danger'}`} title={r === 'W' ? 'Win' : 'Loss'}>
          {r}
        </li>
      ))}
    </ol>
  );
}

/** Elo over time, one point per scored match. */
export function RatingTrendChart({ trend = [], height = 180, title = 'Rating trend' }) {
  const theme = useChartTheme();
  const data = trend.map((t, i) => ({ index: i + 1, elo: Number(t.elo), delta: Number(t.delta), date: t.date }));
  if (data.length < 2) {
    return (
      <Card padding>
        <CardHeader title={title} />
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
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis dataKey="index" hide />
        <YAxis domain={[min, max]} stroke={theme.axis} fontSize={11} width={40} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={theme.tooltipStyle} labelFormatter={(_, payload) => (payload?.[0]?.payload?.date ? formatDate(payload[0].payload.date) : '')} formatter={(value, name, item) => [`${value} (${signed(item.payload.delta)})`, 'Elo']} />
        <Line type="monotone" dataKey="elo" stroke={theme.series[0]} strokeWidth={2.5} dot={{ r: 2.5, fill: theme.series[0], strokeWidth: 0 }} activeDot={{ r: 4 }} />
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

/** Career totals + per-match averages. */
export function CareerGrid({ career }) {
  if (!career) return null;
  const pm = career.per_match || {};
  const avg = (k) => (pm[k] != null ? `${pm[k]} / match` : null);
  const eff = Number(career.hitting_efficiency ?? 0);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" data-testid="career-grid">
      <StatCard size="sm" label="Matches" value={career.matches ?? 0} sublabel={`${career.wins ?? 0}–${career.losses ?? 0} · ${career.win_rate ?? 0}% wins`} />
      <StatCard size="sm" label="Points" value={career.points ?? 0} sublabel={avg('points')} accent="gold" />
      <StatCard size="sm" label="Kills" value={career.kills ?? 0} sublabel={avg('kills')} />
      <StatCard size="sm" label="Kill %" value={`${career.kill_pct ?? 0}%`} sublabel={`${career.attacks ?? 0} attempts`} />
      <StatCard size="sm" label="Hitting eff." value={eff.toFixed(3).replace(/^0/, '')} sublabel={`${career.attack_errors ?? 0} attack errors`} accent={eff >= 0.2 ? 'success' : eff < 0 ? 'danger' : 'default'} />
      <StatCard size="sm" label="Aces" value={career.aces ?? 0} sublabel={avg('aces')} />
      <StatCard size="sm" label="Blocks" value={career.blocks ?? 0} sublabel={avg('blocks')} />
      <StatCard size="sm" label="Digs" value={career.digs ?? 0} sublabel={avg('digs')} />
      <StatCard size="sm" label="Assists" value={career.assists ?? 0} sublabel={avg('assists')} />
      <StatCard size="sm" label="Errors" value={career.errors ?? 0} sublabel={avg('errors')} accent="danger" />
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
      <div className="flex shrink-0 items-baseline gap-2 font-display tabular-nums">
        <span className="text-text-secondary">{event.rating_before}</span>
        <Icon name="arrowRight" size={14} className="self-center text-text-muted" />
        <span className="text-lg font-bold text-text-primary">{event.rating_after}</span>
        <span className={`rounded-md px-1.5 text-base font-bold ${cls} ${delta > 0 ? 'bg-status-success/15' : delta < 0 ? 'bg-status-danger/15' : ''}`}>{signed(delta)}</span>
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
              <Link to={`/matches/${event.match_id}`} className="link">
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

  if (stats.isLoading) return <LoadingBlock label="Loading official stats…" variant="cards" />;
  if (stats.isError) return <ErrorBlock error={stats.error} retry={() => stats.refetch()} />;
  const data = stats.data;
  const played = data?.career?.matches || 0;

  return (
    <section aria-labelledby="official-stats-heading" className="space-y-4" data-testid="official-stats">
      <SectionHeader
        id="official-stats-heading"
        title="Official stats"
        action={
          played ? (
            <Link to={`/p/${userId}`} className="link inline-flex min-h-11 items-center gap-1 text-sm">
              Full profile <Icon name="arrowRight" size={14} />
            </Link>
          ) : null
        }
      />
      <p className="-mt-2 text-sm text-text-secondary">From scorer-submitted matches. Self-reported results don't count here.</p>

      {!played ? (
        <EmptyState icon="list" headline="No official stats yet" copy={`${NO_SCORED_COPY} Join a team, register for a tournament, and your box scores, skills and rating history will show up here.`} ctaLabel="Explore tournaments" onCta={() => navigate('/tournaments')} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card padding className="flex flex-col justify-between gap-3">
              <div>
                <div className="eyebrow">Official rating</div>
                <div className="num-display mt-1 text-4xl text-brand-400">
                  {Number(data.player?.rating_score ?? 0).toFixed(1)}
                  <span className="ml-2 font-display text-base font-semibold text-text-secondary">{data.player?.elo} Elo</span>
                </div>
                <div className="mt-1 text-sm text-text-secondary">
                  {data.career.wins}–{data.career.losses} · {data.career.win_rate}% win rate
                </div>
              </div>
              <div>
                <div className="eyebrow mb-1">Recent form</div>
                <FormDots form={data.form} />
              </div>
            </Card>
            <div className="lg:col-span-2">
              <RatingTrendChart trend={data.ratingTrend} />
            </div>
          </div>

          <CareerGrid career={data.career} />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card padding>
              <CardHeader title="Skills" />
              <SkillBars skills={data.skills} />
            </Card>
            <Card padding>
              <CardHeader title="Latest rating change" />
              {events.isLoading ? (
                <LoadingBlock label="Loading…" variant="text" />
              ) : events.data?.length ? (
                <ul>
                  <RatingChangeRow event={events.data[0]} />
                </ul>
              ) : (
                <p className="text-sm text-text-muted">No rating changes recorded yet.</p>
              )}
              <Link to={`/p/${userId}`} className="link mt-2 inline-flex min-h-11 items-center gap-1 text-sm">
                Why did my rating change? <Icon name="arrowRight" size={14} />
              </Link>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
