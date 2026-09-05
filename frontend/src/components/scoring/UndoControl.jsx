import Icon from '../ui/Icon.jsx';

export default function UndoControl({ onUndo, disabled, label = 'Undo', className = '' }) {
  return (
    <button
      type="button"
      onClick={onUndo}
      disabled={disabled}
      data-testid="undo"
      aria-label="Undo last action"
      className={`inline-flex min-h-12 items-center gap-2 rounded-lg border-2 border-status-warning/70 bg-bg-card px-4 font-display font-bold uppercase tracking-wide text-text-primary transition-colors hover:bg-status-warning/15 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      <Icon name="undo" size={18} />
      {label}
    </button>
  );
}
