import { Link } from 'react-router-dom';

/**
 * Brand mark: the volleyball + "GlobalVBC" wordmark. The ball is an inline SVG
 * (consistent across platforms, tinted with the brand gold) so the identity is
 * the same everywhere: header, footer, auth pages.
 */
export function BallMark({ size = 28, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="14" fill="rgb(var(--brand-500))" />
      <g fill="none" stroke="rgb(var(--brand-950))" strokeWidth="1.8" strokeLinecap="round">
        <path d="M16 2.5c-4.2 4.6-6.2 10.4-5.6 16.3" />
        <path d="M2.6 13.2c5.3-1.4 11.3-.2 15.8 3.5" />
        <path d="M29.4 13.4c-4.7 3-7.8 8.2-8.4 13.9" />
        <path d="M10.4 18.8c2.4 3.7 6.2 6.4 10.6 7.5" />
        <path d="M18.4 16.7c3.9-1.5 8.3-1.6 12.3-.1" />
      </g>
    </svg>
  );
}

export default function Logo({ to = '/', size = 'md', className = '' }) {
  const text = size === 'sm' ? 'text-lg' : 'text-[1.35rem]';
  return (
    <Link to={to} className={`inline-flex min-h-11 items-center gap-2 ${className}`} aria-label="GlobalVBC home">
      <BallMark size={size === 'sm' ? 24 : 28} />
      <span className={`font-display font-bold uppercase leading-none tracking-wide text-text-primary ${text}`}>
        Global<span className="text-brand-400">VBC</span>
      </span>
    </Link>
  );
}
