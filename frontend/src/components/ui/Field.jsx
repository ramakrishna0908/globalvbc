export const inputClass =
  'mt-1 w-full min-h-[44px] rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30';

/** Labelled form control. Renders <input> by default; pass `as="select"` or `as="textarea"`. */
export default function Field({ label, hint, error, as = 'input', className = '', children, ...props }) {
  const Tag = as;
  return (
    <label className={`block text-sm ${className}`}>
      <span className="font-semibold text-text-secondary">{label}</span>
      <Tag className={inputClass} aria-invalid={error ? 'true' : undefined} {...props}>
        {children}
      </Tag>
      {error ? <span className="mt-1 block text-xs text-status-danger">{error}</span> : hint ? <span className="mt-1 block text-xs text-text-muted">{hint}</span> : null}
    </label>
  );
}
