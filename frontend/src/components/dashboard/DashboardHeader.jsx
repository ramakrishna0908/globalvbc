import Avatar from '../Avatar.jsx';
import Button from '../Button.jsx';
import RatingBadge from '../RatingBadge.jsx';
import RankPill from '../RankPill.jsx';
import Card from '../Card.jsx';
import Icon from '../ui/Icon.jsx';
import { positionLabel } from '../../lib/format.js';

export default function DashboardHeader({ user, rank, movement }) {
  return (
    <Card className="relative overflow-hidden p-5 md:p-6">
      <div className="court-lines pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar src={user.photo_url} name={user.name} size="lg" className="ring-2 ring-brand-500" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">My dashboard</p>
          <h1 className="truncate font-display text-display-sm font-bold uppercase leading-none md:text-display-md">{user.name}</h1>
          <p className="mt-1 text-text-secondary">
            {positionLabel(user.position)}
            {user.jersey_number != null ? <span className="ml-2 font-display font-bold">#{user.jersey_number}</span> : null}
          </p>
          {rank ? (
            <div className="mt-2">
              <RankPill rank={rank} movement={movement} />
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <RatingBadge score={user.rating_score} size="lg" />
            <div className="eyebrow mt-1 !text-[10px]">Rating</div>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" to={`/p/${user.id}`}>
              <Icon name="share" size={14} /> Share profile
            </Button>
            <Button size="sm" variant="secondary" to="/onboarding">
              <Icon name="edit" size={14} /> Edit profile
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
