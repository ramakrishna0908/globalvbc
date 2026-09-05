import StatCard from '../StatCard.jsx';

export default function SummaryCards({ user, metrics, rank, badgeCount }) {
  const cards = [
    { label: 'Rating score', value: Number(user.rating_score).toFixed(1), accent: 'gold' },
    { label: 'Local rank', value: rank ? `#${rank}` : '—', accent: 'blue' },
    { label: 'Matches played', value: metrics.matches_played, accent: 'default' },
    { label: 'Win rate', value: `${metrics.win_rate}%`, accent: 'blue' },
    { label: 'Win streak', value: metrics.win_streak, accent: metrics.win_streak >= 3 ? 'success' : 'default' },
    { label: 'Badges earned', value: badgeCount, accent: 'gold' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <StatCard key={c.label} size="sm" {...c} />
      ))}
    </div>
  );
}
