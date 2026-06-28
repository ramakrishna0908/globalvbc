import Card from '../Card.jsx';
import Button from '../Button.jsx';

// Upcoming games are a stub for MVP — always shows the empty state per spec.
export default function UpcomingGames() {
  return (
    <Card className="p-5">
      <h3 className="mb-4 font-display text-base font-semibold">Upcoming Games</h3>
      <div className="flex flex-col items-center py-6 text-center">
        <div className="text-3xl">📅</div>
        <p className="mt-2 text-text-secondary">No upcoming games. Join a local match.</p>
        <Button size="sm" className="mt-3">
          Find a Match
        </Button>
      </div>
    </Card>
  );
}
