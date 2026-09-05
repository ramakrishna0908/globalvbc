import { Link } from 'react-router-dom';
import AppHeader from '../AppHeader.jsx';
import Icon from './Icon.jsx';

/**
 * Standard page chrome: header + constrained main column + optional page
 * title block (eyebrow, title, subtitle, actions, back link).
 */
export default function PageShell({ title, subtitle, eyebrow, back, actions, children, wide = false, headerRight, className = '' }) {
  return (
    <>
      <AppHeader right={headerRight} />
      <main id="main" className={`mx-auto px-4 py-6 md:py-8 ${wide ? 'max-w-7xl' : 'max-w-6xl'} ${className}`}>
        {back ? (
          <Link to={back.to} className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-text-secondary hover:text-text-primary">
            <Icon name="arrowLeft" size={16} /> {back.label || 'Back'}
          </Link>
        ) : null}
        {title ? (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              {eyebrow ? <div className="mb-1.5 flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
              <h1 className="font-display text-display-md font-bold">{title}</h1>
              {subtitle ? <p className="mt-1.5 max-w-2xl text-text-secondary">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
        ) : null}
        {children}
      </main>
    </>
  );
}
