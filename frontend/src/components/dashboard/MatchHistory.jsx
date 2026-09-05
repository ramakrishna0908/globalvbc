import Card from '../Card.jsx';
import EmptyState from '../EmptyState.jsx';
import { formatDate, signed } from '../../lib/format.js';

export default function MatchHistory({ matches, onRecord }) {
  if (!matches.length) {
    return <EmptyState icon="ball" headline="No matches yet" copy="Add your first match to receive your initial player rating." ctaLabel="Record first match" onCta={onRecord} />;
  }
  return (
    <Card as="ul" className="divide-y divide-border-default">
      {matches.map((m) => {
        const won = m.result === 'won';
        return (
          <li key={m.id} className="flex min-h-14 items-center justify-between gap-3 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-display text-sm font-bold ${won ? 'bg-status-success/15 text-status-success' : 'bg-status-danger/15 text-status-danger'}`} aria-label={won ? 'Won' : 'Lost'}>
                {won ? 'W' : 'L'}
              </span>
              <div className="min-w-0">
                <div className="truncate font-display text-base font-bold uppercase tracking-wide text-text-primary">vs {m.opponent_name}</div>
                <div className="text-xs text-text-muted">{formatDate(m.played_at)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="num-display text-xl text-text-primary">
                {m.score_for}–{m.score_against}
              </div>
              <div className={`text-xs font-bold ${m.elo_delta >= 0 ? 'text-status-success' : 'text-status-danger'}`}>{signed(m.elo_delta)} rating</div>
            </div>
          </li>
        );
      })}
    </Card>
  );
}
