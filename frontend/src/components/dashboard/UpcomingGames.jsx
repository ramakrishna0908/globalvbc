import { Link } from 'react-router-dom';
import Card, { CardHeader } from '../Card.jsx';
import EmptyState from '../EmptyState.jsx';
import Icon from '../ui/Icon.jsx';
import MatchCard from '../tournament/MatchCard.jsx';
import { LoadingBlock } from '../ui/Loading.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useScoredMatches } from '../../hooks/queries.js';

/**
 * The player's scheduled and live team matches (any team they belong to or
 * are in a lineup for). Live matches link to the spectator view.
 */
export default function UpcomingGames() {
  const { user } = useAuth();
  const q = useScoredMatches({ player: user?.id, status: 'scheduled,live', limit: 6 }, { enabled: Boolean(user?.id), refetchInterval: 30000 });
  const matches = q.data || [];
  return (
    <Card padding>
      <CardHeader
        title="Upcoming games"
        action={
          matches.length ? (
            <Link to="/tournaments" className="link inline-flex min-h-8 items-center gap-1 text-xs">
              All tournaments <Icon name="arrowRight" size={12} />
            </Link>
          ) : null
        }
      />
      {q.isLoading ? (
        <LoadingBlock label="Loading…" variant="cards" count={2} />
      ) : matches.length ? (
        <div className="space-y-2">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} compact />
          ))}
        </div>
      ) : (
        <EmptyState compact icon="calendar" headline="No upcoming games" copy="Join a team and register for a tournament." ctaLabel="Find a tournament" ctaTo="/tournaments" />
      )}
    </Card>
  );
}
