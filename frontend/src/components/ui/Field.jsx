import { useId } from 'react';

/** Shared control class — also used by bare <input>/<select> outside Field. */
export const inputClass = 'input';

/**
 * Labelled form control with hint + error wiring (aria-describedby,
 * aria-invalid). Renders <input> by default; `as="select"` or `as="textarea"`.
 */
export default function Field({ label, hint, error, as = 'input', className = '', inputClassName = '', children, id: idProp, required, ...props }) {
  const Tag = as;
  const auto = useId();
  const id = idProp || auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`text-sm ${className}`}>
      <label htmlFor={id} className="mb-1 block font-semibold text-text-secondary">
        {label}
        {required ? <span className="req" aria-hidden="true" /> : null}
      </label>
      <Tag id={id} className={`${inputClass} ${inputClassName}`} aria-invalid={error ? 'true' : undefined} aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined} required={required} {...props}>
        {children}
      </Tag>
      {error ? (
        <p id={errorId} className="mt-1 text-xs font-semibold text-status-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Labelled checkbox with a 44px row target. */
export function Checkbox({ label, hint, className = '', ...props }) {
  const id = useId();
  return (
    <label htmlFor={id} className={`flex min-h-11 cursor-pointer items-start gap-3 text-sm ${className}`}>
      <input id={id} type="checkbox" className="checkbox mt-0.5" {...props} />
      <span>
        <span className="font-semibold text-text-secondary">{label}</span>
        {hint ? <span className="block text-xs text-text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
