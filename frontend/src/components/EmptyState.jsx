import Button from './Button.jsx';
import Icon, { ICON_NAMES } from './ui/Icon.jsx';

/**
 * Empty state with a single clear next step. `icon` accepts an icon name from
 * the design-system set (preferred) or a legacy emoji string.
 */
export default function EmptyState({ icon = 'ball', headline, copy, ctaLabel, onCta, ctaTo, secondary, compact = false, className = '' }) {
  const isIcon = ICON_NAMES.includes(icon);
  return (
    <div className={`court-lines flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-bg-surface text-center ${compact ? 'px-4 py-8' : 'px-6 py-12'} ${className}`}>
      <div className={`mb-3 flex items-center justify-center rounded-full bg-bg-elevated text-text-secondary ${compact ? 'h-11 w-11' : 'h-14 w-14'}`} aria-hidden="true">
        {isIcon ? <Icon name={icon} size={compact ? 22 : 28} /> : <span className={compact ? 'text-2xl' : 'text-3xl'}>{icon}</span>}
      </div>
      <h3 className="font-display text-xl font-bold text-text-primary">{headline}</h3>
      {copy ? <p className="mt-1 max-w-sm text-sm text-text-secondary">{copy}</p> : null}
      {ctaLabel ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={onCta} to={ctaTo}>
            {ctaLabel}
          </Button>
          {secondary}
        </div>
      ) : null}
    </div>
  );
}
