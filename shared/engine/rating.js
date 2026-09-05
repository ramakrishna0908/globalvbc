// @ts-check
// Rating engine v2 — explainable, versioned, configurable.
//
// A player's rating moves after every submitted match based on:
//   1. match result vs. expected result (ELO logistic on player vs opponent-team rating)
//   2. score margin (sets + points)
//   3. individual performance relative to their own team (from the box score)
//   4. tournament level multiplier
// Every delta is returned with its factors and a human-readable reason so the
// UI can show "742 → 751 · +9 · Won vs stronger opponent; strong performance".

export const RATING_VERSION = '2.0.0';

/** @typedef {typeof DEFAULT_CONFIG} RatingConfig */
export const DEFAULT_CONFIG = {
  K: 32,
  /** how much a lopsided set/point margin amplifies the base delta (0..1) */
  marginWeight: 0.5,
  /** share of K available to individual performance (+/-) */
  performanceWeight: 0.35,
  /** multiplier by tournament level */
  levelMultiplier: { friendly: 0.8, local: 1.0, regional: 1.2, national: 1.4 },
  /** contribution of each box-score column to a player's performance score */
  actionValues: {
    kills: 1.0,
    aces: 1.5,
    blocks: 1.2,
    block_assists: 0.6,
    digs: 0.5,
    assists: 0.4,
    receive_positive: 0.3,
    attack_errors: -1.0,
    serve_errors: -0.8,
    receive_negative: -0.5,
    defensive_errors: -0.7,
  },
  /** players with fewer than this many actions get no performance adjustment */
  minActionsForPerformance: 3,
  floor: 100,
};

/** Standard ELO expectation. */
export function expected(rating, opponentRating) {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

/**
 * Score-margin multiplier in [1, 1 + marginWeight].
 * @param {{setsFor:number, setsAgainst:number, pointsFor:number, pointsAgainst:number}} m
 */
export function marginFactor(m, cfg = DEFAULT_CONFIG) {
  const setTotal = m.setsFor + m.setsAgainst || 1;
  const pointTotal = m.pointsFor + m.pointsAgainst || 1;
  const setPart = Math.abs(m.setsFor - m.setsAgainst) / setTotal;
  const pointPart = Math.abs(m.pointsFor - m.pointsAgainst) / pointTotal;
  return 1 + cfg.marginWeight * (0.5 * setPart + 0.5 * pointPart);
}

/**
 * Raw performance score for a box score.
 * @param {Record<string, number>} box
 */
export function actionScore(box, cfg = DEFAULT_CONFIG) {
  let s = 0;
  for (const [k, v] of Object.entries(cfg.actionValues)) s += (box[k] || 0) * v;
  return s;
}

function actionCount(box) {
  return (box.attacks || 0) + (box.serves || 0) + (box.receptions || 0) + (box.sets || 0) + (box.digs || 0) + (box.blocks || 0) + (box.block_assists || 0) + (box.defensive_errors || 0);
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Compute rating deltas for every player on both teams.
 *
 * @param {object} input
 * @param {{ A: Array<{playerId:string|number, rating:number}>, B: Array<{playerId:string|number, rating:number}> }} input.players
 * @param {'A'|'B'} input.winner
 * @param {{A:number,B:number}} input.sets
 * @param {{A:number,B:number}} input.points
 * @param {Array<Record<string, any>>} input.boxes   per-player box scores (playerId, team, kills…)
 * @param {string} [input.level]                       friendly | local | regional | national
 * @param {Partial<RatingConfig>} [config]
 * @returns {Array<{playerId:string|number, team:'A'|'B', before:number, after:number, delta:number, reason:string, factors:object}>}
 */
export function ratePlayers(input, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config, actionValues: { ...DEFAULT_CONFIG.actionValues, ...(config.actionValues || {}) } };
  const teamRating = (team) => {
    const rs = input.players[team].map((p) => p.rating);
    return rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 1000;
  };
  const ratings = { A: teamRating('A'), B: teamRating('B') };
  const level = input.level || 'local';
  const levelMult = cfg.levelMultiplier[level] ?? 1;
  const boxByKey = new Map(input.boxes.map((b) => [`${b.team}:${b.playerId}`, b]));

  const out = [];
  for (const team of /** @type {const} */ (['A', 'B'])) {
    const opp = team === 'A' ? 'B' : 'A';
    const won = input.winner === team;
    const margin = marginFactor(
      { setsFor: input.sets[team], setsAgainst: input.sets[opp], pointsFor: input.points[team], pointsAgainst: input.points[opp] },
      cfg
    );
    const scores = input.players[team].map((p) => {
      const box = boxByKey.get(`${team}:${p.playerId}`) || {};
      return { p, box, score: actionScore(box, cfg), count: actionCount(box) };
    });
    const eligible = scores.filter((s) => s.count >= cfg.minActionsForPerformance).map((s) => s.score);
    const med = median(eligible);
    const spread = Math.max(2, ...eligible.map((s) => Math.abs(s - med)));

    for (const { p, box, score, count } of scores) {
      const exp = expected(p.rating, ratings[opp]);
      const base = cfg.K * margin * ((won ? 1 : 0) - exp);
      let perf = 0;
      if (count >= cfg.minActionsForPerformance) {
        const rel = Math.max(-1, Math.min(1, (score - med) / spread));
        perf = rel * cfg.performanceWeight * cfg.K;
      }
      const delta = Math.round((base + perf) * levelMult);
      const after = Math.max(cfg.floor, p.rating + delta);
      out.push({
        playerId: p.playerId,
        team,
        before: p.rating,
        after,
        delta: after - p.rating,
        reason: explain({ won, exp, base, perf, level, levelMult, count }),
        factors: {
          version: RATING_VERSION,
          expected: round(exp, 3),
          opponentTeamRating: Math.round(ratings[opp]),
          margin: round(margin, 3),
          base: round(base, 2),
          performance: round(perf, 2),
          actionScore: round(score, 2),
          teamMedianActionScore: round(med, 2),
          level,
          levelMultiplier: levelMult,
        },
      });
    }
  }
  return out;
}

function round(n, d) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function explain({ won, exp, base, perf, level, levelMult, count }) {
  const parts = [];
  const strength = exp < 0.4 ? 'stronger' : exp > 0.6 ? 'weaker' : 'evenly matched';
  parts.push(`${won ? 'Won' : 'Lost'} vs ${strength} opponent (${signed(Math.round(base))})`);
  if (count > 0 && Math.abs(perf) >= 0.5) {
    parts.push(`${perf > 0 ? 'above' : 'below'}-team-average performance (${signed(Math.round(perf))})`);
  } else if (count === 0) {
    parts.push('no recorded actions');
  }
  if (levelMult !== 1) parts.push(`${level} tournament ×${levelMult}`);
  return parts.join('; ');
}

function signed(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

/** 0–10 display score used across the product (kept from v1). */
export function displayScore(rating) {
  const raw = (rating - 600) / 140;
  return Math.round(Math.max(0, Math.min(10, raw)) * 10) / 10;
}
