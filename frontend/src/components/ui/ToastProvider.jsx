import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const TONES = {
  success: 'border-status-success/40 bg-status-success/15 text-text-primary',
  error: 'border-status-danger/50 bg-status-danger/15 text-text-primary',
  info: 'border-accent-500/40 bg-accent-500/15 text-text-primary',
  warning: 'border-status-warning/50 bg-status-warning/15 text-text-primary',
};

/**
 * Non-blocking toasts. `toast(message, { tone, duration })`. Announced via
 * aria-live=polite; never steals focus, never requires dismissal.
 */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (message, { tone = 'success', duration = 1800, icon } = {}) => {
      const id = ++idRef.current;
      setItems((list) => [...list.slice(-3), { id, message, tone, icon }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4 sm:top-4">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-elevated backdrop-blur motion-safe:animate-toast-in ${TONES[t.tone] || TONES.info}`}
          >
            {t.icon ? <span aria-hidden="true">{t.icon}</span> : null}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: () => {}, dismiss: () => {} };
  return ctx;
}
