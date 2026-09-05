import AppHeader from '../AppHeader.jsx';

/** Standard page chrome: header + constrained main column. */
export default function PageShell({ title, subtitle, actions, children, wide = false, headerRight }) {
  return (
    <>
      <AppHeader right={headerRight} />
      <main className={`mx-auto px-4 py-6 md:py-8 ${wide ? 'max-w-7xl' : 'max-w-6xl'}`}>
        {title ? (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold md:text-3xl">{title}</h1>
              {subtitle ? <p className="mt-1 text-text-secondary">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
        ) : null}
        {children}
      </main>
    </>
  );
}
