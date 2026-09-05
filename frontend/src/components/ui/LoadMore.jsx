import { useState } from 'react';
import Button from '../Button.jsx';

/** Client-side pagination: show `step` items, then a "Show more" control. */
export function usePaged(list, step = 12) {
  const [limit, setLimit] = useState(step);
  const items = list.slice(0, limit);
  const remaining = Math.max(0, list.length - limit);
  return { items, remaining, more: () => setLimit((l) => l + step), reset: () => setLimit(step) };
}

export default function LoadMore({ remaining, onMore, label = 'Show more', className = '' }) {
  if (!remaining) return null;
  return (
    <div className={`flex justify-center pt-2 ${className}`}>
      <Button variant="secondary" onClick={onMore}>
        {label} <span className="text-text-muted">({remaining})</span>
      </Button>
    </div>
  );
}
