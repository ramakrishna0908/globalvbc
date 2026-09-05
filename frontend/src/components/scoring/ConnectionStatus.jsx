const STYLES = {
  online: { label: 'Online', cls: 'bg-status-success/15 text-status-success border-status-success/40', dot: 'bg-status-success' },
  syncing: { label: 'Syncing…', cls: 'bg-accent-500/15 text-accent-400 border-accent-500/40', dot: 'bg-accent-400 motion-safe:animate-pulse' },
  offline: { label: 'Offline — saving locally', cls: 'bg-status-warning/15 text-status-warning border-status-warning/50', dot: 'bg-status-warning' },
};

export default function ConnectionStatus({ connection = 'online', pending = 0 }) {
  const s = STYLES[connection] || STYLES.online;
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="connection-status"
      className={`inline-flex min-h-[32px] items-center gap-2 rounded-full border px-3 text-xs font-bold uppercase tracking-wider ${s.cls}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
      {pending > 0 ? <span className="rounded-full bg-bg-page/60 px-1.5 py-0.5 text-[10px] tabular-nums">{pending}</span> : null}
    </span>
  );
}
