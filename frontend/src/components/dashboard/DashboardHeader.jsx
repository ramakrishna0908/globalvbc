import { useNavigate } from 'react-router-dom';
import Avatar from '../Avatar.jsx';
import Button from '../Button.jsx';
import RatingBadge from '../RatingBadge.jsx';
import RankPill from '../RankPill.jsx';
import Card from '../Card.jsx';
import { positionLabel } from '../../lib/format.js';

export default function DashboardHeader({ user, rank, movement }) {
  const navigate = useNavigate();
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar src={user.photo_url} name={user.name} size="lg" />
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-text-primary">{user.name}</h1>
          <p className="text-text-secondary">{positionLabel(user.position)}</p>
          <div className="mt-2 flex items-center gap-3">
            {rank ? <RankPill rank={rank} movement={movement} /> : null}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <RatingBadge score={user.rating_score} size="lg" />
            <div className="mt-1 text-xs text-text-muted">Rating</div>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" onClick={() => navigate(`/p/${user.id}`)}>
              Share Profile
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/onboarding')}>
              Edit Profile
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
