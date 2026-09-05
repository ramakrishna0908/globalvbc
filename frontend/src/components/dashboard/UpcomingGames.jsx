import { Link } from 'react-router-dom';
import Card from '../Card.jsx';
import Button from '../Button.jsx';
import MatchCard from '../tournament/MatchCard.jsx';
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
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Upcoming Games</h3>
        {matches.length ? (
          <Link to="/tournaments" className="text-xs font-semibold text-accent-400 hover:underline">
            All tournaments →
          </Link>
        ) : null}
      </div>
      {q.isLoading ? (
        <p className="py-6 text-center text-sm text-text-muted">Loading…</p>
      ) : matches.length ? (
        <div className="space-y-2">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} compact />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="text-3xl" aria-hidden="true">📅</div>
          <p className="mt-2 text-text-secondary">No upcoming games. Join a team and register for a tournament.</p>
          <Link to="/tournaments">
            <Button size="sm" className="mt-3 min-h-[44px]">
              Find a tournament
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
