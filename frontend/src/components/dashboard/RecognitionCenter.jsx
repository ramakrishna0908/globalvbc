import Card, { CardHeader } from '../Card.jsx';
import BadgeChip from '../BadgeChip.jsx';
import EmptyState from '../EmptyState.jsx';

export default function RecognitionCenter({ badges, onRecord }) {
  const earned = badges.filter((b) => b.earned);
  if (!earned.length) {
    return <EmptyState icon="medal" headline="Recognition starts here" copy="Play matches and track progress to unlock your first badge." ctaLabel="Record a match" onCta={onRecord} />;
  }
  return (
    <Card padding>
      <CardHeader
        title={
          <>
            Recognition <span className="ml-1 font-display text-sm font-semibold text-text-muted">{earned.length}/{badges.length} unlocked</span>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {badges.map((b) => (
          <BadgeChip key={b.key} name={b.name} icon={b.icon} earned={b.earned} requirement={b.requirement} />
        ))}
      </div>
    </Card>
  );
}
