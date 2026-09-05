/** Accessible tab strip (role=tablist). `tabs` = [{ key, label, count? }]. */
export default function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div role="tablist" className={`flex gap-1 overflow-x-auto border-b border-border-default ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          type="button"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={`-mb-px min-h-[44px] whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors ${
            value === t.key ? 'border-accent-500 text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          {t.label}
          {t.count != null ? <span className="ml-1.5 rounded-full bg-bg-elevated px-1.5 text-xs text-text-muted">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
