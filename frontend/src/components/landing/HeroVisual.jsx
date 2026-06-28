import { LineChart, Line, ResponsiveContainer } from 'recharts';
import Card from '../Card.jsx';
import RatingBadge from '../RatingBadge.jsx';
import RankPill from '../RankPill.jsx';
import Avatar from '../Avatar.jsx';

const trend = [
  { v: 6.9 },
  { v: 7.2 },
  { v: 7.1 },
  { v: 7.6 },
  { v: 7.9 },
  { v: 8.0 },
  { v: 8.3 },
];

// Marketing showcase card — static aspirational data per the product spec.
export default function HeroVisual() {
  return (
    <Card className="w-full max-w-sm p-6">
      <div className="flex items-center gap-3">
        <Avatar name="Sarah Spiker" size="lg" />
        <div className="flex-1">
          <div className="font-display text-lg font-bold text-text-primary">Sarah Spiker</div>
          <div className="text-sm text-text-muted">Outside Hitter · Bay Area VBC</div>
          <div className="mt-1">
            <RankPill rank={14} movement="up" />
          </div>
        </div>
        <RatingBadge score={8.3} size="lg" />
      </div>

      <div className="mt-5 h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend}>
            <Line
              type="monotone"
              dataKey="v"
              stroke="rgb(37 99 235)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ['48', 'Matches'],
          ['68%', 'Win Rate'],
          ['5', 'Badges'],
        ].map(([v, l]) => (
          <div key={l} className="rounded-lg bg-bg-surface py-2">
            <div className="font-display text-lg font-bold text-brand-400">{v}</div>
            <div className="text-xs text-text-muted">{l}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {['🌟 Rising Star', '🎯 Top Server', '🔥 Consistent'].map((b) => (
          <span
            key={b}
            className="rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-medium text-brand-300"
          >
            {b}
          </span>
        ))}
      </div>
    </Card>
  );
}
