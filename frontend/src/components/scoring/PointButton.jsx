import { useRef } from 'react';

const TONE = {
  A: 'bg-team-a-solid text-team-a-ink hover:brightness-110 active:brightness-95 focus-visible:outline-team-a',
  B: 'bg-team-b-solid text-team-b-ink hover:brightness-110 active:brightness-95 focus-visible:outline-team-b',
};

/**
 * The primary scoring control. Substantially larger than everything else,
 * with a short double-tap guard so a bounce cannot score twice.
 */
export default function PointButton({ side, label, onPoint, disabled, guardMs = 300, className = '' }) {
  const lastRef = useRef(0);
  const fire = () => {
    const now = Date.now();
    if (now - lastRef.current < guardMs) return;
    lastRef.current = now;
    if (navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch {
        /* unsupported */
      }
    }
    onPoint(side);
  };
  return (
    <button
      type="button"
      onClick={fire}
      disabled={disabled}
      aria-label={`${label || `Team ${side}`} point`}
      data-testid={`point-${side}`}
      className={`flex min-h-24 w-full min-w-0 select-none flex-col items-center justify-center overflow-hidden rounded-xl px-3 font-display font-bold uppercase shadow-elevated transition-[transform,filter] motion-safe:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 md:min-h-32 ${TONE[side]} ${className}`}
    >
      <span className="flex items-center gap-2 text-sm font-bold tracking-[0.3em]">
        <span aria-hidden="true">+1</span> Point
      </span>
      <span className="w-full truncate text-center text-2xl leading-tight tracking-wide sm:text-3xl md:text-4xl">{label || `Team ${side}`}</span>
    </button>
  );
}
