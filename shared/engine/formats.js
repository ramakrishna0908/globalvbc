// @ts-check
// Tournament format engine — pure generators + standings.
//
// `generate({ format, teams, settings })` returns a list of match specs:
//   { key, stage: 'pool'|'bracket', pool?, round, slot, teamA?, teamB?,
//     sourceA?, sourceB?, bracket?: 'winners'|'losers'|'final' }
// A match spec with `sourceA`/`sourceB` is a placeholder whose teams are filled
// in later (`advance`) from the result of another match or a pool ranking.
//
// Formats: round_robin, pool_play, single_elimination, double_elimination,
// pool_knockout. Add a generator to FORMATS to support another.

/**
 * @typedef {object} MatchSpec
 * @property {string} key
 * @property {'pool'|'bracket'} stage
 * @property {string} [pool]
 * @property {number} round
 * @property {number} slot
 * @property {string|number|null} teamA
 * @property {string|number|null} teamB
 * @property {Source} [sourceA]
 * @property {Source} [sourceB]
 * @property {'winners'|'losers'|'final'} [bracket]
 * @property {boolean} [bye]
 *
 * @typedef {{type:'winner'|'loser', match:string}|{type:'pool', pool:string, rank:number}} Source
 */

/** Round robin pairings via the circle method. Returns rounds of [a,b] pairs. */
export function roundRobinRounds(teams) {
  const list = teams.slice();
  if (list.length % 2 === 1) list.push(null);
  const n = list.length;
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a != null && b != null) pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    list.splice(1, 0, /** @type {any} */ (list.pop()));
  }
  return rounds;
}

/**
 * @param {Array<string|number>} teams
 * @param {string} [pool]
 * @returns {MatchSpec[]}
 */
export function generateRoundRobin(teams, pool = 'A') {
  const out = [];
  roundRobinRounds(teams).forEach((pairs, r) => {
    pairs.forEach(([a, b], i) => {
      out.push({ key: `P${pool}-R${r + 1}-${i + 1}`, stage: 'pool', pool, round: r + 1, slot: i + 1, teamA: a, teamB: b });
    });
  });
  return out;
}

/** Snake-seed teams into `count` pools. */
export function snakePools(teams, count) {
  const pools = Array.from({ length: count }, () => []);
  let i = 0;
  let dir = 1;
  for (const t of teams) {
    pools[i].push(t);
    i += dir;
    if (i === count || i === -1) {
      dir = -dir;
      i += dir;
    }
  }
  return pools;
}

export const poolName = (i) => String.fromCharCode(65 + i);

/** @returns {MatchSpec[]} */
export function generatePoolPlay(teams, { pools = 2 } = {}) {
  const n = Math.max(1, Math.min(pools, teams.length));
  return snakePools(teams, n).flatMap((members, i) => generateRoundRobin(members, poolName(i)));
}

/** Standard bracket seeding order for a power-of-two size (1 v 16, 8 v 9 …). */
export function seedOrder(size) {
  let order = [1];
  while (order.length < size) {
    const next = [];
    const m = order.length * 2 + 1;
    for (const s of order) next.push(s, m - s);
    order = next;
  }
  return order;
}

/**
 * Single elimination with byes to the next power of two.
 * `teams` are ordered by seed (index 0 = top seed). Sources may be pool ranks
 * (pass objects `{type:'pool', pool, rank}`) instead of team ids.
 * @returns {MatchSpec[]}
 */
export function generateSingleElimination(teams, { keyPrefix = 'W' } = {}) {
  const n = teams.length;
  if (n < 2) return [];
  let size = 1;
  while (size < n) size *= 2;
  const order = seedOrder(size);
  const rounds = Math.log2(size);
  /** @type {MatchSpec[]} */
  const out = [];
  // Round 1
  /** @type {MatchSpec[]} */
  const r1 = [];
  for (let i = 0; i < size / 2; i++) {
    const sa = order[i * 2];
    const sb = order[i * 2 + 1];
    const a = sa <= n ? teams[sa - 1] : null;
    const b = sb <= n ? teams[sb - 1] : null;
    /** @type {MatchSpec} */
    const spec = { key: `${keyPrefix}-R1-${i + 1}`, stage: 'bracket', bracket: 'winners', round: 1, slot: i + 1, teamA: null, teamB: null };
    assignSide(spec, 'A', a);
    assignSide(spec, 'B', b);
    spec.bye = (a == null) !== (b == null);
    r1.push(spec);
  }
  out.push(...r1);
  let prev = r1;
  for (let r = 2; r <= rounds; r++) {
    /** @type {MatchSpec[]} */
    const cur = [];
    for (let i = 0; i < prev.length / 2; i++) {
      const left = prev[i * 2];
      const right = prev[i * 2 + 1];
      /** @type {MatchSpec} */
      const spec = {
        key: `${keyPrefix}-R${r}-${i + 1}`,
        stage: 'bracket',
        bracket: r === rounds ? 'final' : 'winners',
        round: r,
        slot: i + 1,
        teamA: null,
        teamB: null,
        sourceA: { type: 'winner', match: left.key },
        sourceB: { type: 'winner', match: right.key },
      };
      cur.push(spec);
    }
    out.push(...cur);
    prev = cur;
  }
  return resolveByes(out);
}

function assignSide(spec, side, value) {
  if (value == null) return;
  if (typeof value === 'object' && value.type) spec[`source${side}`] = value;
  else spec[`team${side}`] = value;
}

/** Byes in round 1 auto-advance the present team into round 2. */
function resolveByes(specs) {
  const byKey = new Map(specs.map((s) => [s.key, s]));
  for (const s of specs) {
    if (!s.bye) continue;
    const present = s.teamA ?? s.teamB ?? null;
    const presentSource = s.sourceA ?? s.sourceB ?? null;
    for (const t of specs) {
      for (const side of ['A', 'B']) {
        const src = t[`source${side}`];
        if (src && src.type === 'winner' && src.match === s.key) {
          if (present != null) {
            t[`team${side}`] = present;
            delete t[`source${side}`];
          } else if (presentSource) {
            t[`source${side}`] = presentSource;
          }
        }
      }
    }
    byKey.delete(s.key);
  }
  return specs.filter((s) => !s.bye);
}

/**
 * Double elimination: winners bracket + losers bracket + grand final.
 * Losers of winners round r drop into the losers bracket; the losers bracket
 * alternates "drop-in" rounds with "internal" rounds.
 * @returns {MatchSpec[]}
 */
export function generateDoubleElimination(teams) {
  const winners = generateSingleElimination(teams, { keyPrefix: 'W' });
  if (!winners.length) return [];
  const byRound = groupBy(winners, (m) => m.round);
  const wRounds = Math.max(...winners.map((m) => m.round));
  /** @type {MatchSpec[]} */
  const losers = [];
  let carry = []; // match keys whose winners feed the next losers round
  let lr = 0;
  for (let r = 1; r <= wRounds; r++) {
    const drops = (byRound.get(r) || []).map((m) => ({ type: 'loser', match: m.key }));
    if (r === 1) {
      lr += 1;
      const round = pairUp(drops, `L-R${lr}`, lr);
      losers.push(...round);
      carry = round.map((m) => ({ type: 'winner', match: m.key }));
      if (drops.length % 2 === 1) carry.push(drops[drops.length - 1]);
      continue;
    }
    // drop-in round: survivors vs new losers
    lr += 1;
    const merged = interleave(carry, drops);
    const round = pairUp(merged, `L-R${lr}`, lr);
    losers.push(...round);
    carry = round.map((m) => ({ type: 'winner', match: m.key }));
    if (merged.length % 2 === 1) carry.push(merged[merged.length - 1]);
    // internal round to halve survivors when more than one remains
    if (carry.length > 1) {
      lr += 1;
      const internal = pairUp(carry, `L-R${lr}`, lr);
      losers.push(...internal);
      carry = internal.map((m) => ({ type: 'winner', match: m.key }));
      if ((round.length + (merged.length % 2)) % 2 === 1) carry.push(carry.pop());
    }
  }
  const wFinal = winners.find((m) => m.bracket === 'final') || winners[winners.length - 1];
  /** @type {MatchSpec} */
  const grandFinal = {
    key: 'GF',
    stage: 'bracket',
    bracket: 'final',
    round: wRounds + 1,
    slot: 1,
    teamA: null,
    teamB: null,
    sourceA: { type: 'winner', match: wFinal.key },
    sourceB: carry[0] || { type: 'winner', match: losers[losers.length - 1]?.key },
  };
  for (const w of winners) if (w.bracket === 'final') w.bracket = 'winners';
  return [...winners, ...losers.map((m) => ({ ...m, bracket: /** @type {'losers'} */ ('losers') })), grandFinal];
}

/** @returns {MatchSpec[]} */
function pairUp(sources, prefix, round) {
  /** @type {MatchSpec[]} */
  const out = [];
  for (let i = 0; i + 1 < sources.length; i += 2) {
    out.push({ key: `${prefix}-${out.length + 1}`, stage: 'bracket', bracket: 'losers', round, slot: out.length + 1, teamA: null, teamB: null, sourceA: sources[i], sourceB: sources[i + 1] });
  }
  return out;
}

function interleave(a, b) {
  const out = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[b.length - 1 - i]); // reverse to avoid immediate rematches
  }
  return out;
}

function groupBy(list, fn) {
  const m = new Map();
  for (const x of list) {
    const k = fn(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

/**
 * Pool play followed by a knockout of the top `advance` teams per pool.
 * @returns {MatchSpec[]}
 */
export function generatePoolKnockout(teams, { pools = 2, advance = 2 } = {}) {
  const n = Math.max(1, Math.min(pools, teams.length));
  const pool = generatePoolPlay(teams, { pools: n });
  // Seed the bracket by rank then pool (A1, B1, …, A2, B2 …). With standard
  // 1-v-N seeding this yields cross-overs (A1 v B2, B1 v A2).
  const seeds = [];
  for (let rank = 1; rank <= advance; rank++) {
    for (let i = 0; i < n; i++) seeds.push({ type: 'pool', pool: poolName(i), rank });
  }
  const bracket = generateSingleElimination(seeds, { keyPrefix: 'K' });
  return [...pool, ...bracket];
}

export const FORMATS = {
  round_robin: (teams) => generateRoundRobin(teams),
  pool_play: (teams, s) => generatePoolPlay(teams, s),
  single_elimination: (teams) => generateSingleElimination(teams),
  double_elimination: (teams) => generateDoubleElimination(teams),
  pool_knockout: (teams, s) => generatePoolKnockout(teams, s),
};

export const FORMAT_LABELS = {
  round_robin: 'Round robin',
  pool_play: 'Pool play',
  single_elimination: 'Single elimination',
  double_elimination: 'Double elimination',
  pool_knockout: 'Pools + knockout',
};

/**
 * @param {{format:string, teams:Array<string|number>, settings?:object}} input
 * @returns {MatchSpec[]}
 */
export function generate({ format, teams, settings = {} }) {
  const gen = FORMATS[format];
  if (!gen) throw new Error(`Unknown tournament format: ${format}`);
  if (!teams || teams.length < 2) throw new Error('At least two teams are required');
  return gen(teams, settings);
}

/**
 * Standings for a set of completed matches.
 * @param {Array<string|number>} teams
 * @param {Array<{teamA:string|number, teamB:string|number, winner:string|number|null, setsA:number, setsB:number, pointsA:number, pointsB:number}>} results
 */
export function standings(teams, results) {
  const rows = new Map(
    teams.map((t) => [String(t), { teamId: t, played: 0, wins: 0, losses: 0, setsWon: 0, setsLost: 0, pointsFor: 0, pointsAgainst: 0 }])
  );
  const h2h = new Map();
  for (const r of results) {
    if (r.winner == null) continue;
    const a = rows.get(String(r.teamA));
    const b = rows.get(String(r.teamB));
    if (!a || !b) continue;
    a.played += 1;
    b.played += 1;
    a.setsWon += r.setsA;
    a.setsLost += r.setsB;
    b.setsWon += r.setsB;
    b.setsLost += r.setsA;
    a.pointsFor += r.pointsA;
    a.pointsAgainst += r.pointsB;
    b.pointsFor += r.pointsB;
    b.pointsAgainst += r.pointsA;
    const w = String(r.winner) === String(r.teamA) ? a : b;
    const l = w === a ? b : a;
    w.wins += 1;
    l.losses += 1;
    h2h.set(`${w.teamId}>${l.teamId}`, (h2h.get(`${w.teamId}>${l.teamId}`) || 0) + 1);
  }
  const ratio = (x, y) => (y === 0 ? (x === 0 ? 0 : Infinity) : x / y);
  const list = [...rows.values()].map((r) => ({
    ...r,
    setRatio: ratio(r.setsWon, r.setsLost),
    pointRatio: ratio(r.pointsFor, r.pointsAgainst),
  }));
  list.sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    if (y.setRatio !== x.setRatio) return y.setRatio - x.setRatio;
    if (y.pointRatio !== x.pointRatio) return y.pointRatio - x.pointRatio;
    const xy = h2h.get(`${x.teamId}>${y.teamId}`) || 0;
    const yx = h2h.get(`${y.teamId}>${x.teamId}`) || 0;
    if (xy !== yx) return yx - xy;
    return String(x.teamId).localeCompare(String(y.teamId));
  });
  return list.map((r, i) => ({ ...r, rank: i + 1 }));
}

/**
 * Fill placeholder sources from results and pool standings.
 * @param {MatchSpec[]} specs
 * @param {Map<string, {winner:string|number|null, loser:string|number|null}>} resultsByKey
 * @param {Map<string, Array<{teamId:string|number}>>} poolRankings   pool name → ranked rows (only when pool complete)
 * @returns {MatchSpec[]} specs with teams filled where determinable
 */
export function advance(specs, resultsByKey, poolRankings = new Map()) {
  const resolve = (src) => {
    if (!src) return null;
    if (src.type === 'pool') return poolRankings.get(src.pool)?.[src.rank - 1]?.teamId ?? null;
    const res = resultsByKey.get(src.match);
    if (!res) return null;
    return src.type === 'winner' ? res.winner : res.loser;
  };
  return specs.map((s) => ({
    ...s,
    teamA: s.teamA ?? resolve(s.sourceA),
    teamB: s.teamB ?? resolve(s.sourceB),
  }));
}
