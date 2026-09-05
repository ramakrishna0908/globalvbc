const SIZES = {
  xs: 'h-7 w-7 text-xs',
  sm: 'h-9 w-9 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-20 w-20 text-2xl',
  xl: 'h-28 w-28 text-4xl',
};

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/**
 * Player photo or team crest. Players are circular; pass `shape="square"` for
 * team logos (rounded square, like a crest). Falls back to initials.
 */
export default function Avatar({ src, name = '', size = 'md', shape = 'circle', className = '' }) {
  const radius = shape === 'square' ? 'rounded-md' : 'rounded-full';
  if (src) {
    return <img src={src} alt={name} className={`${radius} shrink-0 bg-bg-elevated object-cover ${SIZES[size]} ${className}`} />;
  }
  return (
    <div className={`flex shrink-0 items-center justify-center ${radius} bg-bg-elevated font-display font-bold uppercase text-text-secondary ring-1 ring-inset ring-border-strong ${SIZES[size]} ${className}`} aria-label={name} role="img">
      {initials(name) || '?'}
    </div>
  );
}
