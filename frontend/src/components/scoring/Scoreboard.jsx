import { useEffect, useRef, useState } from 'react';
import { setPointInfo } from '@engine/match.js';
import Icon from '../ui/Icon.jsx';

const TEAM = {
  A: { text: 'text-team-a', bar: 'bg-team-a', dot: 'bg-team-a' },
  B: { text: 'text-team-b', bar: 'bg-team-b', dot: 'bg-team-b' },
};

function SetPips({ sets, side, setsToWin }) {
  return (
    <div className="flex gap-1.5" role="img" aria-label={`Sets won: ${sets}`}>
      {Array.from({ length: setsToWin }).map((_, i) => (
        <span key={i} className={`h-2 w-6 rounded-full ${i < sets ? TEAM[side].dot : 'bg-border-strong'}`} />
      ))}
    </div>
  );
}

/** Re-runs the pop animation whenever the score changes. */
function useScorePop(score) {
  const [pop, setPop] = useState(false);
  const prev = useRef(score);
  useEffect(() => {
    if (prev.current !== score) {
      prev.current = score;
      setPop(true);
      const t = setTimeout(() => setPop(false), 240);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [score]);
  return pop;
}

function TeamPanel({ side, name, score, sets, serving, setsToWin, compact, highlight }) {
  const tone = TEAM[side];
  const pop = useScorePop(score);
  return (
    <div className={`flex min-w-0 flex-1 flex-col items-center ${compact ? 'gap-1.5' : 'gap-2 md:gap-3'}`} data-testid={`team-${side}-panel`}>
      <div className={`h-1 w-full rounded-full ${tone.bar}`} aria-hidden="true" />
      <div className="flex min-w-0 max-w-full items-center gap-2 px-1">
        {serving ? <Icon name="ball" size={compact ? 16 : 20} className={tone.text} label={`${name} serving`} /> : <span className={compact ? 'w-4' : 'w-5'} aria-hidden="true" />}
        <span className={`truncate font-display font-bold uppercase tracking-wide ${compact ? 'text-base' : 'text-lg md:text-2xl'} ${tone.text}`}>{name}</span>
      </div>
      <div
        className={`num-display ${compact ? 'text-score-sm' : 'text-score'} ${highlight ? 'text-text-primary drop-shadow-[0_0_28px_rgb(var(--brand-400)/0.35)]' : 'text-text-primary'} ${pop ? 'motion-safe:animate-score-pop' : ''}`}
        aria-live="off"
        data-testid={`score-${side}`}
      >
        {score}
      </div>
      <SetPips sets={sets} side={side} setsToWin={setsToWin} />
    </div>
  );
}

/**
 * The dominant visual of the scoring and live screens: two huge score
 * numbers, team names, sets won, serving indicator and set/match-point badge.
 */
export default function Scoreboard({ state, teams, compact = false }) {
  if (!state) return null;
  const set = state.sets[state.currentSet - 1];
  const scoreA = set?.scoreA ?? 0;
  const scoreB = set?.scoreB ?? 0;
  const point = setPointInfo(state);
  const nameA = teams?.A?.name || 'Team A';
  const nameB = teams?.B?.name || 'Team B';
  const finished = state.sets.filter((s) => s.winner);
  return (
    <section aria-label="Scoreboard" className="relative">
      <div className="flex items-stretch justify-between gap-2 md:gap-6">
        <TeamPanel side="A" name={nameA} score={scoreA} sets={state.setsWon.A} serving={state.serving === 'A'} setsToWin={state.format.setsToWin} compact={compact} highlight={point?.team === 'A'} />
        <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 px-1 text-center">
          <span className="eyebrow">Set</span>
          <span className={`num-display ${compact ? 'text-2xl' : 'text-3xl md:text-4xl'} text-text-primary`}>{state.currentSet || '–'}</span>
          <span className="text-xs text-text-muted">of {state.format.setsToWin * 2 - 1}</span>
          {point ? (
            <span className={`mt-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-display text-2xs font-bold uppercase tracking-wider ${point.matchPoint ? 'bg-status-live text-white' : 'bg-brand-500 text-brand-950'}`} data-testid="point-badge">
              {point.matchPoint ? 'Match point' : 'Set point'} {point.team}
            </span>
          ) : null}
        </div>
        <TeamPanel side="B" name={nameB} score={scoreB} sets={state.setsWon.B} serving={state.serving === 'B'} setsToWin={state.format.setsToWin} compact={compact} highlight={point?.team === 'B'} />
      </div>
      {finished.length ? (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-xs" aria-label="Previous sets">
          {finished.map((s) => (
            <span key={s.number} className="inline-flex items-center gap-1.5 rounded-md bg-bg-elevated px-2 py-1 font-display font-semibold tabular-nums text-text-secondary">
              <span className="text-text-muted">S{s.number}</span>
              <span className={s.winner === 'A' ? 'text-text-primary' : ''}>{s.scoreA}</span>–<span className={s.winner === 'B' ? 'text-text-primary' : ''}>{s.scoreB}</span>
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
