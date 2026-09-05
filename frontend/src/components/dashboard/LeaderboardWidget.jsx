import { Link } from 'react-router-dom';
import Card, { CardHeader } from '../Card.jsx';
import RankPill from '../RankPill.jsx';
import Icon from '../ui/Icon.jsx';

export default function LeaderboardWidget({ entries }) {
  if (!entries?.length) return null;
  return (
    <Card padding>
      <CardHeader
        title="Local leaderboard"
        action={
          <Link to="/leaderboard" className="link inline-flex min-h-8 items-center gap-1 text-xs">
            Full board <Icon name="arrowRight" size={12} />
          </Link>
        }
      />
      <ul className="divide-y divide-border-default">
        {entries.map((e) => (
          <li key={e.userId} className={`flex min-h-11 items-center justify-between gap-2 py-1.5 ${e.isYou ? '-mx-2 rounded-md bg-accent-500/10 px-2' : ''}`}>
            <div className="flex min-w-0 items-center gap-2.5">
              <RankPill rank={e.rank} movement={e.movement} />
              <span className={`truncate text-sm ${e.isYou ? 'font-bold text-accent-400' : 'font-semibold text-text-primary'}`}>{e.isYou ? 'You' : e.name}</span>
            </div>
            <span className="font-display text-base font-bold tabular-nums text-brand-400">{Number(e.rating_score).toFixed(1)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
