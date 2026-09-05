import { useRef } from 'react';

const TONE = {
  A: 'bg-team-a text-white hover:bg-team-a/90 active:bg-team-a/80 focus-visible:outline-team-a',
  B: 'bg-team-b text-brand-950 hover:bg-team-b/90 active:bg-team-b/80 focus-visible:outline-team-b',
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
      className={`flex min-h-[96px] w-full select-none flex-col items-center justify-center rounded-2xl font-display text-2xl font-black uppercase tracking-wide shadow-elevated transition-transform motion-safe:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 md:min-h-[128px] md:text-3xl ${TONE[side]} ${className}`}
    >
      <span className="text-sm font-semibold uppercase tracking-widest opacity-80">Point</span>
      <span className="truncate px-2">{label || `Team ${side}`}</span>
    </button>
  );
}
