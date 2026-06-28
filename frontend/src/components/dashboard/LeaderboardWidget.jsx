import Card from '../Card.jsx';
import RankPill from '../RankPill.jsx';

export default function LeaderboardWidget({ entries }) {
  if (!entries?.length) return null;
  return (
    <Card className="p-5">
      <h3 className="mb-4 font-display text-base font-semibold">Leaderboard</h3>
      <ul className="divide-y divide-border-default">
        {entries.map((e) => (
          <li
            key={e.userId}
            className={`flex items-center justify-between py-2.5 ${
              e.isYou ? 'rounded-lg bg-accent-500/10 px-2' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <RankPill rank={e.rank} movement={e.movement} />
              <span className={`text-sm ${e.isYou ? 'font-bold text-accent-400' : 'text-text-primary'}`}>
                {e.isYou ? 'You' : e.name}
              </span>
            </div>
            <span className="font-mono text-sm text-text-secondary">
              {Number(e.rating_score).toFixed(1)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
