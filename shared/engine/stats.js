// @ts-check
// Statistics engine — derives per-player box scores from match state.
// Events are the source of truth; nothing here is stored by hand.

/**
 * @typedef {object} PlayerBox
 * @property {string|number} playerId
 * @property {'A'|'B'} team
 * @property {number} points        kills + aces + solo blocks
 * @property {number} kills
 * @property {number} attacks       attempts = attack + kill + attack_error
 * @property {number} attack_errors
 * @property {number} aces
 * @property {number} serves        attempts = serve + ace + serve_error
 * @property {number} serve_errors
 * @property {number} blocks
 * @property {number} block_assists
 * @property {number} digs
 * @property {number} assists
 * @property {number} sets
 * @property {number} receptions    receive + receive_positive + receive_negative
 * @property {number} receive_positive
 * @property {number} receive_negative
 * @property {number} defensive_errors
 * @property {number} errors        all error types
 */

export const STAT_COLUMNS = /** @type {const} */ ([
  'points',
  'kills',
  'attacks',
  'attack_errors',
  'aces',
  'serves',
  'serve_errors',
  'blocks',
  'block_assists',
  'digs',
  'assists',
  'sets',
  'receptions',
  'receive_positive',
  'receive_negative',
  'defensive_errors',
  'errors',
]);

/** @returns {PlayerBox} */
export function emptyBox(playerId, team) {
  /** @type {any} */
  const box = { playerId, team };
  for (const c of STAT_COLUMNS) box[c] = 0;
  return box;
}

/**
 * Apply one action to a box score (mutates).
 * @param {PlayerBox} box
 * @param {string} actionType
 */
export function tally(box, actionType) {
  switch (actionType) {
    case 'serve':
      box.serves += 1;
      break;
    case 'ace':
      box.serves += 1;
      box.aces += 1;
      box.points += 1;
      break;
    case 'serve_error':
      box.serves += 1;
      box.serve_errors += 1;
      box.errors += 1;
      break;
    case 'receive':
      box.receptions += 1;
      break;
    case 'receive_positive':
      box.receptions += 1;
      box.receive_positive += 1;
      break;
    case 'receive_negative':
      box.receptions += 1;
      box.receive_negative += 1;
      break;
    case 'set':
      box.sets += 1;
      break;
    case 'assist':
      box.sets += 1;
      box.assists += 1;
      break;
    case 'attack':
      box.attacks += 1;
      break;
    case 'kill':
      box.attacks += 1;
      box.kills += 1;
      box.points += 1;
      break;
    case 'attack_error':
      box.attacks += 1;
      box.attack_errors += 1;
      box.errors += 1;
      break;
    case 'block':
      box.blocks += 1;
      box.points += 1;
      break;
    case 'block_assist':
      box.block_assists += 1;
      break;
    case 'dig':
      box.digs += 1;
      break;
    case 'defensive_error':
      box.defensive_errors += 1;
      box.errors += 1;
      break;
    default:
      break;
  }
  return box;
}

/**
 * Per-player box scores for the whole match (or one set).
 * @param {import('./match.js').MatchState} state
 * @param {{setNumber?: number}} [opts]
 * @returns {PlayerBox[]}
 */
export function deriveStats(state, opts = {}) {
  /** @type {Map<string, PlayerBox>} */
  const boxes = new Map();
  const ensure = (playerId, team) => {
    const key = `${team}:${playerId}`;
    let box = boxes.get(key);
    if (!box) {
      box = emptyBox(playerId, team);
      boxes.set(key, box);
    }
    return box;
  };
  // Seed boxes with everyone in the lineups so zero rows exist for the summary.
  for (const team of /** @type {const} */ (['A', 'B'])) {
    for (const id of [...state.lineups[team].starters, ...state.lineups[team].bench]) ensure(id, team);
  }
  for (const a of state.actions) {
    if (opts.setNumber && a.setNumber !== opts.setNumber) continue;
    tally(ensure(a.playerId, a.team), a.actionType);
  }
  return [...boxes.values()];
}

/**
 * Sum boxes into a team line.
 * @param {PlayerBox[]} boxes
 * @param {'A'|'B'} team
 */
export function teamTotals(boxes, team) {
  const total = emptyBox('team', team);
  for (const b of boxes) {
    if (b.team !== team) continue;
    for (const c of STAT_COLUMNS) total[c] += b[c];
  }
  return total;
}

/**
 * Leaders for the set/match summary overlay.
 * @param {PlayerBox[]} boxes
 */
export function leaders(boxes) {
  const top = (col) => {
    let best = null;
    for (const b of boxes) if (b[col] > 0 && (!best || b[col] > best[col])) best = b;
    return best ? { playerId: best.playerId, team: best.team, value: best[col] } : null;
  };
  return {
    topScorer: top('points'),
    topAttacker: top('kills'),
    mostDigs: top('digs'),
    mostAssists: top('assists'),
    mostAces: top('aces'),
    mostBlocks: top('blocks'),
  };
}

/**
 * Efficiency-style 0–100 skill scores from career totals. Used for profile
 * skill bars and leaderboard "best X" metrics. Deterministic, explainable.
 * @param {Partial<PlayerBox> & {matches?: number}} t
 */
export function skillScores(t) {
  const pct = (num, den, floor = 0) => (den > 0 ? Math.max(0, Math.min(100, Math.round((num / den) * 100))) : floor);
  const perMatch = (n) => (t.matches ? n / t.matches : 0);
  const scale = (v, max) => Math.max(0, Math.min(100, Math.round((v / max) * 100)));
  const serves = t.serves || 0;
  const attacks = t.attacks || 0;
  const receptions = t.receptions || 0;
  return {
    serve: serves ? pct((t.aces || 0) * 3 + (serves - (t.serve_errors || 0) - (t.aces || 0)) * 0.8, serves) : 0,
    receive: receptions ? pct((t.receive_positive || 0) + ((receptions - (t.receive_positive || 0) - (t.receive_negative || 0)) * 0.6), receptions) : 0,
    set: scale(perMatch(t.assists || 0) * 2 + perMatch(t.sets || 0) * 0.5, 40),
    attack: attacks ? pct(((t.kills || 0) - (t.attack_errors || 0)) * 1.4, attacks) : 0,
    block: scale(perMatch(t.blocks || 0) * 1.5 + perMatch(t.block_assists || 0) * 0.6, 8),
    dig: scale(perMatch(t.digs || 0), 15),
    defense: scale(perMatch((t.digs || 0) + (t.blocks || 0) + (t.block_assists || 0) * 0.5 - (t.defensive_errors || 0) * 1.5), 20),
  };
}
