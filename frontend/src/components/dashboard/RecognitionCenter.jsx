import Card from '../Card.jsx';
import BadgeChip from '../BadgeChip.jsx';
import EmptyState from '../EmptyState.jsx';

export default function RecognitionCenter({ badges, onRecord }) {
  const earned = badges.filter((b) => b.earned);
  if (!earned.length) {
    return (
      <EmptyState
        icon="🏅"
        headline="Recognition Starts Here"
        copy="Play matches and track progress to unlock your first badge."
        ctaLabel="Record a Match"
        onCta={onRecord}
      />
    );
  }
  return (
    <Card className="p-5">
      <h3 className="mb-4 font-display text-base font-semibold">
        Recognition Center
        <span className="ml-2 text-sm font-normal text-text-muted">
          {earned.length}/{badges.length} unlocked
        </span>
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {badges.map((b) => (
          <BadgeChip
            key={b.key}
            name={b.name}
            icon={b.icon}
            earned={b.earned}
            requirement={b.requirement}
          />
        ))}
      </div>
    </Card>
  );
}
