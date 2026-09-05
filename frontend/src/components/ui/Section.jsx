/**
 * Section heading primitives so every page groups content the same way.
 *
 *   <SectionHeader title="Results" count={14} action={<Link/>} />
 *   <Eyebrow>Pool A</Eyebrow>
 */
export function Eyebrow({ as: Tag = 'p', children, tone, className = '', ...props }) {
  const color = tone === 'accent' ? 'text-accent-400' : tone === 'gold' ? 'text-brand-400' : tone === 'live' ? 'text-status-danger' : '';
  return (
    <Tag className={`eyebrow ${color} ${className}`} {...props}>
      {children}
    </Tag>
  );
}

export function SectionHeader({ title, count, action, as: Tag = 'h2', size = 'md', id, className = '' }) {
  const sizes = { sm: 'text-lg', md: 'text-xl md:text-2xl', lg: 'text-2xl md:text-3xl' };
  return (
    <div className={`mb-3 flex flex-wrap items-end justify-between gap-2 ${className}`}>
      <Tag id={id} className={`font-display font-bold leading-none ${sizes[size]}`}>
        {title}
        {count != null ? <span className="ml-2 align-middle font-display text-sm font-semibold text-text-muted">{count}</span> : null}
      </Tag>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Uppercase group label with an optional count, used above lists of matches/teams. */
export function GroupLabel({ children, count, as: Tag = 'h3', className = '' }) {
  return (
    <Tag className={`eyebrow mb-2 flex items-center gap-2 ${className}`}>
      {children}
      {count != null ? <span className="rounded-full bg-bg-elevated px-1.5 py-px text-[10px] text-text-secondary">{count}</span> : null}
    </Tag>
  );
}
