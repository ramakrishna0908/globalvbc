import { Link } from 'react-router-dom';

/**
 * The one button. Variants map to intent, sizes to touch targets:
 *   primary   — the main action on a screen (Register team, Start match)
 *   secondary — supporting actions
 *   ghost     — low-emphasis / inline
 *   gold      — celebratory or brand actions (Publish results)
 *   danger    — destructive confirmations
 *   live      — "Watch live"
 * Every size is ≥ 40px tall; md (default) is the 44px touch target.
 * Pass `to` to render a router link with identical styling.
 */
const VARIANTS = {
  primary: 'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)]',
  secondary: 'border border-border-strong bg-bg-card text-text-primary hover:border-accent-400 hover:bg-bg-elevated',
  ghost: 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
  gold: 'bg-brand-500 text-brand-950 hover:bg-brand-400 shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)]',
  danger: 'bg-status-danger-solid text-white hover:opacity-90',
  live: 'bg-status-live text-white hover:opacity-90 shadow-[inset_0_-2px_0_rgb(0_0_0/0.2)]',
};

const SIZES = {
  sm: 'min-h-10 px-3 text-sm gap-1.5',
  md: 'min-h-11 px-4 text-sm gap-2',
  lg: 'min-h-[52px] px-6 text-base gap-2',
  xl: 'min-h-16 px-8 text-lg gap-2',
};

export default function Button({ variant = 'primary', size = 'md', className = '', type = 'button', to, href, full = false, children, ...props }) {
  const cls = `inline-flex items-center justify-center rounded-md font-display font-bold uppercase tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${full ? 'w-full' : ''} ${className}`;
  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} {...props}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={cls} {...props}>
      {children}
    </button>
  );
}

/** Square icon-only button (44px). Always give it an aria-label. */
export function IconButton({ className = '', size = 'md', variant = 'ghost', children, ...props }) {
  const dim = size === 'sm' ? 'min-h-10 min-w-10' : 'min-h-11 min-w-11';
  return (
    <Button variant={variant} size={size} className={`!px-0 ${dim} ${className}`} {...props}>
      {children}
    </Button>
  );
}
