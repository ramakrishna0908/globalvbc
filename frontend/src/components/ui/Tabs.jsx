import { useId, useRef } from 'react';

/**
 * Accessible tab strip (WAI-ARIA tabs pattern): role=tablist, roving focus,
 * Left/Right/Home/End keyboard navigation, aria-controls → `${id}-panel-${key}`.
 * `tabs` = [{ key, label, count? }]. Scrolls horizontally on phones.
 */
export default function Tabs({ tabs, value, onChange, className = '', id: idProp, label = 'Sections' }) {
  const auto = useId();
  const id = idProp || auto;
  const refs = useRef([]);

  const onKeyDown = (e, index) => {
    const keys = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = (keys[e.key] + tabs.length) % tabs.length;
    refs.current[next]?.focus();
    onChange(tabs[next].key);
  };

  return (
    <div role="tablist" aria-label={label} className={`-mx-4 flex gap-1 overflow-x-auto border-b border-border-default px-4 sm:mx-0 sm:px-0 ${className}`}>
      {tabs.map((t, i) => {
        const selected = value === t.key;
        return (
          <button
            key={t.key}
            ref={(el) => (refs.current[i] = el)}
            id={`${id}-tab-${t.key}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`${id}-panel-${t.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-[3px] px-3 font-display text-sm font-bold uppercase tracking-wide transition-colors ${
              selected ? 'border-brand-400 text-text-primary' : 'border-transparent text-text-secondary hover:border-border-strong hover:text-text-primary'
            }`}
          >
            {t.label}
            {t.count != null ? <span className={`rounded-full px-1.5 py-px text-2xs ${selected ? 'bg-brand-500/20 text-brand-400' : 'bg-bg-elevated text-text-muted'}`}>{t.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Panel paired with Tabs; pass the same `id` and the tab `value`. */
export function TabPanel({ id, value, className = '', children }) {
  return (
    <div role="tabpanel" id={id ? `${id}-panel-${value}` : undefined} aria-labelledby={id ? `${id}-tab-${value}` : undefined} tabIndex={0} className={`outline-none ${className}`}>
      {children}
    </div>
  );
}
