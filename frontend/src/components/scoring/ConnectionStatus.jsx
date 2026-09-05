const STYLES = {
  online: { label: 'Online', cls: 'border-status-success/40 bg-status-success/10 text-status-success', dot: 'bg-status-success' },
  syncing: { label: 'Syncing…', cls: 'border-accent-500/40 bg-accent-500/10 text-accent-400', dot: 'bg-accent-400 motion-safe:animate-pulse' },
  offline: { label: 'Offline — saving locally', cls: 'border-status-warning/50 bg-status-warning/10 text-status-warning', dot: 'bg-status-warning' },
};

export default function ConnectionStatus({ connection = 'online', pending = 0 }) {
  const s = STYLES[connection] || STYLES.online;
  return (
    <span role="status" aria-live="polite" data-testid="connection-status" className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 font-display text-xs font-bold uppercase tracking-wider ${s.cls}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
      <span className="hidden sm:inline">{s.label}</span>
      <span className="sm:hidden">{connection === 'offline' ? 'Offline' : s.label}</span>
      {pending > 0 ? <span className="rounded-full bg-bg-page/60 px-1.5 py-0.5 text-[10px] tabular-nums">{pending}</span> : null}
    </span>
  );
}
