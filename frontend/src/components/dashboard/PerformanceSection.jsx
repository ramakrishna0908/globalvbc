import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import ChartCard from '../ChartCard.jsx';
import Card from '../Card.jsx';

const axis = { stroke: 'rgb(138 126 107)', fontSize: 12 };

export default function PerformanceSection({ stats, rank }) {
  const { ratingTrend = [], winRateTrend = [], monthlyMatches = [] } = stats;

  const first = ratingTrend[0]?.rating ?? 0;
  const last = ratingTrend[ratingTrend.length - 1]?.rating ?? 0;
  const delta = (last - first).toFixed(1);
  const improving = last >= first;

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-text-muted">Rating</div>
          <div className="font-display text-3xl font-bold text-brand-400">
            {Number(last).toFixed(1)}
            <span
              className={`ml-2 text-base ${improving ? 'text-status-success' : 'text-status-danger'}`}
            >
              {improving ? '↑' : '↓'} {delta > 0 ? `+${delta}` : delta} this season
            </span>
          </div>
        </div>
        {rank && rank > 10 ? (
          <p className="text-text-secondary">
            You're climbing — keep winning to break into the{' '}
            <span className="font-semibold text-accent-400">Top 10</span>.
          </p>
        ) : rank ? (
          <p className="font-semibold text-accent-400">You're in the Top 10! 🏆</p>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Rating Trend">
          <LineChart data={ratingTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(58 53 48 / 0.4)" />
            <XAxis dataKey="index" hide />
            <YAxis domain={[0, 10]} {...axis} width={28} />
            <Tooltip
              contentStyle={{ background: 'rgb(30 26 22)', border: 'none', borderRadius: 8 }}
            />
            <Line type="monotone" dataKey="rating" stroke="rgb(212 162 62)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Win Rate Trend">
          <LineChart data={winRateTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(58 53 48 / 0.4)" />
            <XAxis dataKey="index" hide />
            <YAxis domain={[0, 100]} {...axis} width={32} />
            <Tooltip
              contentStyle={{ background: 'rgb(30 26 22)', border: 'none', borderRadius: 8 }}
            />
            <Line type="monotone" dataKey="winRate" stroke="rgb(37 99 235)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ChartCard>
      </div>

      <ChartCard title="Matches Played by Month" height={180}>
        <BarChart data={monthlyMatches}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(58 53 48 / 0.4)" />
          <XAxis dataKey="month" {...axis} />
          <YAxis allowDecimals={false} {...axis} width={24} />
          <Tooltip
            cursor={{ fill: 'rgb(58 53 48 / 0.3)' }}
            contentStyle={{ background: 'rgb(30 26 22)', border: 'none', borderRadius: 8 }}
          />
          <Bar dataKey="count" fill="rgb(139 92 246)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>
    </div>
  );
}
