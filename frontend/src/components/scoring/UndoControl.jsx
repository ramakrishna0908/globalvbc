export default function UndoControl({ onUndo, disabled, label = 'Undo', className = '' }) {
  return (
    <button
      type="button"
      onClick={onUndo}
      disabled={disabled}
      data-testid="undo"
      aria-label="Undo last action"
      className={`inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-status-warning/70 bg-bg-card px-4 font-bold uppercase tracking-wide text-text-primary transition-colors hover:bg-status-warning/15 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      <span aria-hidden="true">↶</span>
      {label}
    </button>
  );
}
