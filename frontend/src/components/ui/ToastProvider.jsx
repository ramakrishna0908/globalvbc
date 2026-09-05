import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icon from './Icon.jsx';

const ToastContext = createContext(null);

const TONES = {
  success: { cls: 'border-status-success/40 bg-bg-card', icon: 'check', iconCls: 'bg-status-success/20 text-status-success' },
  error: { cls: 'border-status-danger/50 bg-bg-card', icon: 'alert', iconCls: 'bg-status-danger/20 text-status-danger' },
  info: { cls: 'border-accent-500/40 bg-bg-card', icon: 'info', iconCls: 'bg-accent-500/20 text-accent-400' },
  warning: { cls: 'border-status-warning/50 bg-bg-card', icon: 'alert', iconCls: 'bg-status-warning/20 text-status-warning' },
};

/**
 * Non-blocking toasts. `toast(message, { tone, duration, icon })`. Announced
 * via aria-live=polite; never steals focus, never requires dismissal.
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
        {items.map((t) => {
          const tone = TONES[t.tone] || TONES.info;
          return (
            <div key={t.id} role="status" className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm font-semibold text-text-primary shadow-elevated motion-safe:animate-toast-in ${tone.cls}`}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone.iconCls}`} aria-hidden="true">
                {t.icon ? <span className="text-sm">{t.icon}</span> : <Icon name={tone.icon} size={16} />}
              </span>
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: () => {}, dismiss: () => {} };
  return ctx;
}
