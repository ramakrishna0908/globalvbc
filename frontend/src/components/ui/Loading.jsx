export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div role="status" className="py-16 text-center text-text-muted">
      <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-border-strong border-t-accent-500 align-middle" aria-hidden="true" />
      <span className="ml-3 align-middle">{label}</span>
    </div>
  );
}

export function ErrorBlock({ error, retry }) {
  const message = error?.response?.data?.error || error?.message || 'Something went wrong';
  return (
    <div role="alert" className="rounded-xl border border-status-danger/50 bg-status-danger/10 p-4 text-sm">
      <p className="font-semibold text-text-primary">{message}</p>
      {retry ? (
        <button type="button" onClick={retry} className="mt-2 min-h-[44px] rounded-lg border border-border-strong px-3 font-semibold hover:bg-bg-elevated">
          Try again
        </button>
      ) : null}
    </div>
  );
}
