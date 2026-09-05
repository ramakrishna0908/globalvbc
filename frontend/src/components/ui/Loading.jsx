import Alert from './Alert.jsx';
import Button from '../Button.jsx';
import { SkeletonCards, SkeletonTable, SkeletonText } from './Skeleton.jsx';

/**
 * Loading state. `variant` renders a shape-matched skeleton (cards / table /
 * text); the default is a compact spinner. Always announced via role=status.
 */
export function LoadingBlock({ label = 'Loading…', variant = 'spinner', count = 3 }) {
  if (variant !== 'spinner') {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">{label}</span>
        {variant === 'table' ? <SkeletonTable rows={count} /> : variant === 'text' ? <SkeletonText lines={count} /> : <SkeletonCards count={count} />}
      </div>
    );
  }
  return (
    <div role="status" aria-busy="true" className="flex items-center justify-center gap-3 py-16 text-sm font-semibold text-text-muted">
      <span className="inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-border-strong border-t-accent-500" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBlock({ error, retry, title }) {
  const message = error?.response?.data?.error || error?.message || 'Something went wrong';
  return (
    <Alert
      tone="danger"
      title={title || message}
      action={
        retry ? (
          <Button variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
        ) : null
      }
    >
      {title ? message : null}
    </Alert>
  );
}
