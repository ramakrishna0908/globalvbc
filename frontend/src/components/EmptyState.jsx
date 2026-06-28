import Button from './Button.jsx';

export default function EmptyState({ icon = '🏐', headline, copy, ctaLabel, onCta }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-bg-surface px-6 py-12 text-center">
      <div className="mb-3 text-4xl" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-lg font-display font-semibold text-text-primary">{headline}</h3>
      {copy ? <p className="mt-1 max-w-sm text-sm text-text-secondary">{copy}</p> : null}
      {ctaLabel ? (
        <Button className="mt-4" onClick={onCta}>
          {ctaLabel}
        </Button>
      ) : null}
    </div>
  );
}
