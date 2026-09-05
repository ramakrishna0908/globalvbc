/** Loading placeholders. Purely decorative; the parent announces loading. */
export function Skeleton({ className = 'h-4 w-full', style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/** A stack of card-shaped placeholders (lists of matches, teams, tournaments). */
export function SkeletonCards({ count = 3, className = '' }) {
  return (
    <div className={`grid gap-3 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border-default bg-bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Table-shaped placeholder. */
export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="table-wrap" aria-hidden="true">
      <div className="bg-bg-surface px-3 py-2">
        <Skeleton className="h-3 w-1/3" />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-t border-border-default px-3 py-3">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={`h-3.5 ${c === 0 ? 'w-1/3' : 'w-12'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
