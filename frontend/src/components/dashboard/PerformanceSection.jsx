import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import ChartCard from '../ChartCard.jsx';
import Card from '../Card.jsx';
import Icon from '../ui/Icon.jsx';
import useChartTheme from '../../hooks/useChartTheme.js';

export default function PerformanceSection({ stats, rank }) {
  const theme = useChartTheme();
  const { ratingTrend = [], winRateTrend = [], monthlyMatches = [] } = stats;

  const first = ratingTrend[0]?.rating ?? 0;
  const last = ratingTrend[ratingTrend.length - 1]?.rating ?? 0;
  const delta = (last - first).toFixed(1);
  const improving = last >= first;
  const axis = { stroke: theme.axis, fontSize: 11, tickLine: false, axisLine: false };

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
        <div>
          <div className="eyebrow">Self-reported rating</div>
          <div className="num-display mt-1 flex flex-wrap items-baseline gap-2 text-4xl text-brand-400">
            {Number(last).toFixed(1)}
            <span className={`inline-flex items-center gap-1 font-display text-base font-bold ${improving ? 'text-status-success' : 'text-status-danger'}`}>
              <span aria-hidden="true">{improving ? '▲' : '▼'}</span> {delta > 0 ? `+${delta}` : delta} this season
            </span>
          </div>
        </div>
        {rank && rank > 10 ? (
          <p className="text-sm text-text-secondary">
            You're climbing — keep winning to break into the <span className="font-bold text-accent-400">Top 10</span>.
          </p>
        ) : rank ? (
          <p className="inline-flex items-center gap-2 font-display text-lg font-bold uppercase text-accent-400">
            <Icon name="trophy" size={18} className="text-brand-400" /> You're in the Top 10
          </p>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Rating trend">
          <LineChart data={ratingTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
            <XAxis dataKey="index" hide />
            <YAxis domain={[0, 10]} {...axis} width={28} />
            <Tooltip contentStyle={theme.tooltipStyle} />
            <Line type="monotone" dataKey="rating" stroke={theme.series[0]} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Win rate trend">
          <LineChart data={winRateTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
            <XAxis dataKey="index" hide />
            <YAxis domain={[0, 100]} {...axis} width={32} />
            <Tooltip contentStyle={theme.tooltipStyle} />
            <Line type="monotone" dataKey="winRate" stroke={theme.series[1]} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ChartCard>
      </div>

      <ChartCard title="Matches played by month" height={180}>
        <BarChart data={monthlyMatches}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
          <XAxis dataKey="month" {...axis} />
          <YAxis allowDecimals={false} {...axis} width={24} />
          <Tooltip cursor={{ fill: theme.grid, opacity: 0.4 }} contentStyle={theme.tooltipStyle} />
          <Bar dataKey="count" fill={theme.series[1]} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ChartCard>
    </div>
  );
}
