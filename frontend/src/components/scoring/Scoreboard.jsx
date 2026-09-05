import { setPointInfo } from '@engine/match.js';

const TEAM_TONE = {
  A: { text: 'text-team-a', ring: 'ring-team-a', bg: 'bg-team-a/15', dot: 'bg-team-a' },
  B: { text: 'text-team-b', ring: 'ring-team-b', bg: 'bg-team-b/15', dot: 'bg-team-b' },
};

function SetPips({ sets, side, setsToWin }) {
  return (
    <div className="flex gap-1.5" aria-label={`Sets won: ${sets}`}>
      {Array.from({ length: setsToWin }).map((_, i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < sets ? TEAM_TONE[side].dot : 'bg-border-strong'}`} />
      ))}
    </div>
  );
}

function TeamPanel({ side, name, score, sets, serving, setsToWin, compact, highlight }) {
  const tone = TEAM_TONE[side];
  return (
    <div className={`flex min-w-0 flex-1 flex-col items-center ${compact ? 'gap-1' : 'gap-2'}`} data-testid={`team-${side}-panel`}>
      <div className="flex min-w-0 items-center gap-2">
        {serving ? <span className={`text-base ${tone.text}`} aria-label={`${name} serving`} title="Serving">🏐</span> : <span className="w-4" />}
        <span className={`truncate font-display font-bold ${compact ? 'text-base' : 'text-lg md:text-2xl'} ${tone.text}`}>{name}</span>
      </div>
      <div
        className={`font-display font-black tabular-nums leading-none transition-transform motion-safe:duration-150 ${compact ? 'text-5xl' : 'text-score'} ${highlight ? 'text-text-primary drop-shadow-[0_0_24px_rgba(255,255,255,0.25)]' : 'text-text-primary'}`}
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
 * The dominant visual of the scoring screen: two huge score numbers,
 * team names, sets won, serving indicator and set/match-point badge.
 */
export default function Scoreboard({ state, teams, compact = false }) {
  if (!state) return null;
  const set = state.sets[state.currentSet - 1];
  const scoreA = set?.scoreA ?? 0;
  const scoreB = set?.scoreB ?? 0;
  const point = setPointInfo(state);
  const nameA = teams?.A?.name || 'Team A';
  const nameB = teams?.B?.name || 'Team B';
  return (
    <section aria-label="Scoreboard" className="relative">
      <div className="flex items-stretch justify-between gap-2 md:gap-6">
        <TeamPanel side="A" name={nameA} score={scoreA} sets={state.setsWon.A} serving={state.serving === 'A'} setsToWin={state.format.setsToWin} compact={compact} highlight={point?.team === 'A'} />
        <div className="flex flex-col items-center justify-center gap-1 px-1 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">Set</span>
          <span className="font-display text-2xl font-bold text-text-primary md:text-3xl">{state.currentSet || '–'}</span>
          <span className="text-xs text-text-muted">of {state.format.setsToWin * 2 - 1}</span>
          {point ? (
            <span
              className={`mt-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${point.matchPoint ? 'bg-status-danger text-white' : 'bg-status-warning text-brand-950'}`}
              data-testid="point-badge"
            >
              {point.matchPoint ? 'Match point' : 'Set point'} {point.team}
            </span>
          ) : null}
        </div>
        <TeamPanel side="B" name={nameB} score={scoreB} sets={state.setsWon.B} serving={state.serving === 'B'} setsToWin={state.format.setsToWin} compact={compact} highlight={point?.team === 'B'} />
      </div>
      {state.sets.length > 1 ? (
        <div className="mt-2 flex justify-center gap-2 text-xs text-text-muted" aria-label="Previous sets">
          {state.sets
            .filter((s) => s.winner)
            .map((s) => (
              <span key={s.number} className="rounded-md bg-bg-elevated px-2 py-0.5 tabular-nums">
                S{s.number} {s.scoreA}–{s.scoreB}
              </span>
            ))}
        </div>
      ) : null}
    </section>
  );
}
