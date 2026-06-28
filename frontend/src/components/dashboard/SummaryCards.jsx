import StatCard from '../StatCard.jsx';

export default function SummaryCards({ user, metrics, rank, badgeCount }) {
  const cards = [
    { label: 'Rating Score', value: Number(user.rating_score).toFixed(1), accent: 'gold' },
    { label: 'Local Rank', value: rank ? `#${rank}` : '—', accent: 'blue' },
    { label: 'Matches Played', value: metrics.matches_played, accent: 'default' },
    { label: 'Win Rate', value: `${metrics.win_rate}%`, accent: 'blue' },
    { label: 'Win Streak', value: metrics.win_streak, accent: 'gold' },
    { label: 'Badges Earned', value: badgeCount, accent: 'violet' },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <StatCard key={c.label} {...c} />
      ))}
    </div>
  );
}
