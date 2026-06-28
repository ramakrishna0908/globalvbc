import Card from '../Card.jsx';
import EmptyState from '../EmptyState.jsx';
import { formatDate, signed } from '../../lib/format.js';

export default function MatchHistory({ matches, onRecord }) {
  if (!matches.length) {
    return (
      <EmptyState
        headline="No Matches Yet"
        copy="Add your first match to receive your initial player rating."
        ctaLabel="Record First Match"
        onCta={onRecord}
      />
    );
  }
  return (
    <Card className="divide-y divide-border-default">
      {matches.map((m) => {
        const won = m.result === 'won';
        return (
          <div key={m.id} className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                    won ? 'bg-status-success/20 text-status-success' : 'bg-status-danger/20 text-status-danger'
                  }`}
                >
                  {won ? 'WON' : 'LOST'}
                </span>
                <span className="font-semibold text-text-primary">vs {m.opponent_name}</span>
              </div>
              <div className="mt-0.5 text-sm text-text-muted">{formatDate(m.played_at)}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-text-primary">
                {m.score_for}–{m.score_against}
              </div>
              <div
                className={`text-sm font-semibold ${
                  m.elo_delta >= 0 ? 'text-status-success' : 'text-status-danger'
                }`}
              >
                {signed(m.elo_delta)} Rating
              </div>
            </div>
          </div>
        );
      })}
    </Card>
  );
}
