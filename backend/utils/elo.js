// GlobalVBC rating engine — ELO points + derived 0–10 Rating Score.
//
// ELO starts at 1000, K-factor 32, scaled by score margin so blowouts move the
// needle more than nail-biters. Rating Score normalizes ELO to a 0–10 display
// scale: ratingScore(elo) = clamp(0, 10, (elo - 600) / 140).

export const STARTING_ELO = 1000;
export const K_FACTOR = 32;

/**
 * Expected score for player A vs player B (standard ELO logistic).
 */
export function expectedScore(elo, opponentElo) {
  return 1 / (1 + 10 ** ((opponentElo - elo) / 400));
}

/**
 * Margin multiplier — a 25–10 win counts more than 25–23.
 * Returns a factor in roughly [1.0, 1.5] based on point differential.
 */
export function marginFactor(scoreFor, scoreAgainst) {
  const diff = Math.abs(scoreFor - scoreAgainst);
  const total = scoreFor + scoreAgainst || 1;
  return 1 + Math.min(0.5, diff / total);
}

/**
 * Compute the next ELO after a match.
 * @param {number} elo            current rating
 * @param {object} opts
 * @param {number} [opts.opponentElo]  defaults to even (same elo)
 * @param {'won'|'lost'} opts.result
 * @param {number} [opts.scoreFor]
 * @param {number} [opts.scoreAgainst]
 * @returns {number} integer next elo
 */
export function nextElo(elo, { opponentElo = elo, result, scoreFor = 0, scoreAgainst = 0 } = {}) {
  const actual = result === 'won' ? 1 : 0;
  const expected = expectedScore(elo, opponentElo);
  const margin = marginFactor(scoreFor, scoreAgainst);
  const delta = Math.round(K_FACTOR * margin * (actual - expected));
  return Math.max(0, elo + delta);
}

/**
 * Normalize ELO to a 0–10 display Rating Score (one decimal).
 */
export function ratingScore(elo) {
  const raw = (elo - 600) / 140;
  const clamped = Math.max(0, Math.min(10, raw));
  return Math.round(clamped * 10) / 10;
}
