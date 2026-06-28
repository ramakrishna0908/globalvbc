const VARIANTS = {
  primary:
    'bg-accent-500 text-white hover:bg-accent-400 focus-visible:outline-accent-500',
  secondary:
    'border border-border-strong bg-bg-surface text-text-primary hover:bg-bg-elevated',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-surface',
  gold: 'bg-brand-500 text-brand-950 hover:bg-brand-400',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
