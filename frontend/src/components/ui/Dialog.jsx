import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal dialog: role=dialog + aria-modal, labelled by its title,
 * focus moves in on open and returns on close, Tab is trapped, Escape and the
 * backdrop close it, and page scroll is locked while open.
 */
export default function Dialog({ open, onClose, title, description, children, size = 'md', className = '' }) {
  const ref = useRef(null);
  const bodyRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const node = ref.current;
    // Prefer the first control in the body (e.g. the first form field) over the close button.
    const first = bodyRef.current?.querySelector(FOCUSABLE) || node?.querySelector(FOCUSABLE);
    (first || node)?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      } else if (e.key === 'Tab' && node) {
        const items = [...node.querySelectorAll(FOCUSABLE)];
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-md';
  const dialog = (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`w-full ${width} max-h-[92vh] overflow-y-auto rounded-t-xl border border-border-default bg-bg-card p-5 shadow-elevated outline-none motion-safe:animate-fade-up sm:rounded-xl sm:p-6 ${className}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h2 id={titleId} className="font-display text-2xl font-bold leading-tight">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p id={descId} className="mt-1 text-sm text-text-secondary">
                {description}
              </p>
            ) : null}
          </div>
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Close dialog" className="-mr-2 -mt-2 flex min-h-11 min-w-11 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary">
              <Icon name="x" size={20} />
            </button>
          ) : null}
        </div>
        <div ref={bodyRef} className="mt-4">
          {children}
        </div>
      </div>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(dialog, document.body) : dialog;
}
