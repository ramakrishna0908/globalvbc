/** The 0–10 rating score as a gold crest. */
export default function RatingBadge({ score, size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-10 w-10 text-base',
    md: 'h-14 w-14 text-xl',
    lg: 'h-20 w-20 text-3xl',
  };
  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-500 font-display font-bold tabular-nums text-brand-950 shadow-[inset_0_-3px_0_rgb(0_0_0/0.18)] ${sizes[size]} ${className}`}
      title="Rating score (0–10)"
      aria-label={`Rating ${Number(score).toFixed(1)} out of 10`}
      role="img"
    >
      {Number(score).toFixed(1)}
    </div>
  );
}
