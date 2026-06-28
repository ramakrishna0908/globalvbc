export default function RatingBadge({ score, size = 'md' }) {
  const sizes = {
    sm: 'h-10 w-10 text-base',
    md: 'h-14 w-14 text-xl',
    lg: 'h-20 w-20 text-3xl',
  };
  return (
    <div
      className={`inline-flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-display font-bold text-brand-950 shadow-elevated ${sizes[size]}`}
      title="Rating Score (0–10)"
    >
      {Number(score).toFixed(1)}
    </div>
  );
}
