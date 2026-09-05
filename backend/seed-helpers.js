// Deterministic helpers for seed.js: a PRNG, name generation and a rally
// simulator that produces *valid* event batches by driving the shared match
// engine (deriveState/applyEvent/setWinner) — never hand-rolled set logic.
import { applyEvent, setWinner, targetPoints, otherTeam } from '../shared/engine/index.js';

// ---------------------------------------------------------------------------
// PRNG + picking utilities (Park–Miller minimal standard, like the old seed)
// ---------------------------------------------------------------------------
export function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

export function weightedPick(rand, items, weightOf) {
  if (!items.length) return null;
  const total = items.reduce((s, x) => s + weightOf(x), 0);
  let r = rand() * total;
  for (const x of items) {
    r -= weightOf(x);
    if (r <= 0) return x;
  }
  return items[items.length - 1];
}

export function shuffle(rand, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------
const FIRST = [
  'Alex', 'Bianca', 'Carlos', 'Dana', 'Eli', 'Fiona', 'Gabe', 'Hannah', 'Ivan', 'Jade', 'Kai', 'Lena', 'Marco', 'Nina', 'Omar', 'Priya',
  'Quinn', 'Rosa', 'Sam', 'Tara', 'Uma', 'Victor', 'Wren', 'Ximena', 'Yusuf', 'Zoe', 'Aiden', 'Brooke', 'Caleb', 'Delia', 'Ethan', 'Freya',
  'Grant', 'Hazel', 'Isaac', 'Jules', 'Kenji', 'Leah', 'Mateo', 'Nora', 'Owen', 'Paige', 'Rafael', 'Sienna', 'Tomas', 'Valerie', 'Wes', 'Yara',
];
const LAST = [
  'Alvarez', 'Bennett', 'Chen', 'Dawson', 'Eriksen', 'Flores', 'Garcia', 'Hoffman', 'Ibarra', 'Jensen', 'Kowalski', 'Lindqvist', 'Moreno', 'Nakamura',
  'Okafor', 'Patel', 'Quintero', 'Reyes', 'Silva', 'Tanaka', 'Underwood', 'Vasquez', 'Walsh', 'Xu', 'Young', 'Zimmerman', 'Brooks', 'Castillo',
  'Delgado', 'Foster', 'Gallagher', 'Haddad', 'Iverson', 'Jain', 'Keller', 'Lopez', 'Mahoney', 'Novak', 'Ortiz', 'Park', 'Russo', 'Schmidt',
];

/** Returns a generator of unique realistic names (deterministic per rand). */
export function nameFactory(rand) {
  const used = new Set();
  return () => {
    for (let i = 0; i < 500; i++) {
      const name = `${pick(rand, FIRST)} ${pick(rand, LAST)}`;
      if (used.has(name)) continue;
      used.add(name);
      return name;
    }
    throw new Error('Ran out of unique names');
  };
}

export const emailFor = (name) => `${name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@globalvbc.demo`;
export const avatarFor = (name) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

/** Local-date YYYY-MM-DD for `days` from now. */
export function localDate(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// Event factory: unique clientEventIds + monotonic timestamps per match
// ---------------------------------------------------------------------------
export class EventFactory {
  constructor(prefix, startMs) {
    this.prefix = prefix;
    this.n = 0;
    this.ts = startMs;
  }
  next(type, payload = {}, gapMs = 3000) {
    this.n += 1;
    this.ts += gapMs;
    return { clientEventId: `${this.prefix}-${this.n}`, type, payload, clientTs: new Date(this.ts).toISOString() };
  }
}

// ---------------------------------------------------------------------------
// Set plan: which team wins each set and the final scoreline (always a valid
// terminal score under the format: target–(≤target-2) or deuce N–(N-2)).
// ---------------------------------------------------------------------------
export function planSets(rand, format, winner, { dropSet = false } = {}) {
  const loser = otherTeam(winner);
  const total = format.setsToWin + (dropSet ? 1 : 0);
  const droppedIndex = dropSet ? Math.floor(rand() * (total - 1)) : -1; // never the deciding set
  const plan = [];
  for (let n = 1; n <= total; n++) {
    const setWinnerTeam = n - 1 === droppedIndex ? loser : winner;
    const target = targetPoints(format, n);
    const deuce = rand() < 0.15;
    let scoreW;
    let scoreL;
    if (deuce) {
      scoreW = target + 1 + (rand() < 0.3 ? 1 : 0) + (rand() < 0.1 ? 1 : 0);
      scoreL = scoreW - 2;
    } else {
      const spread = target >= 21 ? 11 : 7; // 25-pt sets: loser 12–23; 15-pt: 6–13
      scoreW = target;
      scoreL = target - 2 - Math.floor(rand() * spread);
    }
    if (setWinner(format, n, setWinnerTeam === 'A' ? scoreW : scoreL, setWinnerTeam === 'A' ? scoreL : scoreW) !== setWinnerTeam) {
      throw new Error(`Invalid set plan ${scoreW}-${scoreL} for set ${n}`);
    }
    plan.push({ winner: setWinnerTeam, scoreW, scoreL });
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Rally simulator
// ---------------------------------------------------------------------------
const HITTERS = ['outside_hitter', 'opposite', 'middle_blocker'];

/**
 * Simulate rallies from `state` (a live engine state, i.e. after MATCH_START)
 * following `plan` until the match completes or `stopAt` is reached.
 *
 * @param {object} args
 * @param {object} args.state      engine MatchState (status 'live')
 * @param {() => number} args.rand
 * @param {{A: Array<{id:number, position:string|null, talent:number}>, B: Array<...>}} args.rosters
 * @param {Array<{winner:'A'|'B', scoreW:number, scoreL:number}>} args.plan
 * @param {EventFactory} args.factory
 * @param {{set:number, rallies:number}} [args.stopAt]   stop mid-set (for a live demo match)
 * @returns {{events: object[], state: object}}
 */
export function simulateMatch({ state, rand, rosters, plan, factory, stopAt = null }) {
  const events = [];
  let st = state;
  const byId = { A: new Map(rosters.A.map((p) => [String(p.id), p])), B: new Map(rosters.B.map((p) => [String(p.id), p])) };
  const onCourt = (side) => st.rotation[side].map((id) => byId[side].get(String(id))).filter(Boolean);
  const push = (type, payload = {}, gapMs = 3000) => {
    const e = factory.next(type, payload, gapMs);
    st = applyEvent(st, e); // throws on anything the server would reject
    events.push(e);
  };
  const action = (side, player, actionType) => push('PLAYER_ACTION', { team: side, playerId: player.id, actionType }, 2000 + Math.floor(rand() * 3000));
  // Talented players make the plays; weaker ones make the errors (inverse weight).
  const pickPos = (side, prefs, { inverse = false } = {}) => {
    const court = onCourt(side);
    const weight = (p) => (inverse ? 1 / p.talent : p.talent);
    for (const positions of prefs) {
      const c = court.filter((p) => positions.includes(p.position));
      if (c.length) return weightedPick(rand, c, weight);
    }
    return weightedPick(rand, court, weight);
  };
  const hitter = (side) => pickPos(side, [HITTERS]);
  const erringHitter = (side) => pickPos(side, [HITTERS], { inverse: true });
  const middle = (side) => pickPos(side, [['middle_blocker'], HITTERS]);
  const setter = (side) => pickPos(side, [['setter']]);
  // Back-court defence is shared: libero takes the bulk, outside hitters the rest.
  const defender = (side, { inverse = false } = {}) => {
    const court = onCourt(side);
    const backRow = court.filter((p) => p.position === 'libero' || p.position === 'outside_hitter');
    const pool = backRow.length ? backRow : court;
    const weight = (p) => (p.position === 'libero' ? 3 : 1) * (inverse ? 1 / p.talent : p.talent);
    return weightedPick(rand, pool, weight);
  };
  const serverOf = (side) => byId[side].get(String(st.rotation[side][0])) || onCourt(side)[0];

  let ralliesInSet = 0;
  const timeoutsTaken = new Map(); // `${set}:${team}` -> count (mirror of engine state, cheap lookup)

  function rally(t) {
    const o = otherTeam(t);
    const serving = st.serving;
    const server = serverOf(serving);
    const r = rand();
    if (serving === t) {
      // serving team wins the point
      if (r < 0.18) {
        action(o, defender(o, { inverse: true }), 'receive_negative');
        push('RALLY_WON', { team: t, actionType: 'ace', playerId: server.id }, 8000);
      } else if (r < 0.6) {
        action(serving, server, 'serve');
        action(o, defender(o), rand() < 0.6 ? 'receive' : 'receive_positive');
        if (rand() < 0.5) action(o, hitter(o), 'attack');
        if (rand() < 0.7) action(t, defender(t), 'dig');
        action(t, setter(t), 'assist');
        push('RALLY_WON', { team: t, actionType: 'kill', playerId: hitter(t).id }, 6000);
      } else if (r < 0.78) {
        action(serving, server, 'serve');
        action(o, defender(o), 'receive');
        action(o, setter(o), 'assist');
        action(o, hitter(o), 'attack');
        push('RALLY_WON', { team: t, actionType: 'block', playerId: middle(t).id }, 6000);
      } else {
        action(serving, server, 'serve');
        if (rand() < 0.5) action(o, defender(o), 'receive');
        if (rand() < 0.7) action(o, erringHitter(o), 'attack_error');
        else action(o, defender(o, { inverse: true }), 'defensive_error');
        push('RALLY_WON', { team: t }, 6000);
      }
    } else {
      // receiving team wins the point (side-out)
      if (r < 0.55) {
        action(serving, server, 'serve');
        action(t, defender(t), rand() < 0.5 ? 'receive_positive' : 'receive');
        if (rand() < 0.3) {
          action(t, hitter(t), 'attack');
          action(o, defender(o), 'dig');
          action(o, setter(o), 'assist');
          action(o, hitter(o), 'attack');
          action(t, defender(t), 'dig');
        }
        action(t, setter(t), 'assist');
        push('RALLY_WON', { team: t, actionType: 'kill', playerId: hitter(t).id }, 6000);
      } else if (r < 0.68) {
        action(serving, server, 'serve');
        action(t, defender(t), 'receive');
        action(t, hitter(t), 'attack');
        action(o, defender(o), 'dig');
        action(o, hitter(o), 'attack');
        push('RALLY_WON', { team: t, actionType: 'block', playerId: middle(t).id }, 6000);
      } else if (r < 0.85) {
        action(serving, server, 'serve_error');
        push('RALLY_WON', { team: t }, 5000);
      } else {
        action(serving, server, 'serve');
        action(t, defender(t), 'receive');
        action(t, setter(t), 'assist');
        action(t, hitter(t), 'attack');
        action(o, defender(o), 'dig');
        action(o, erringHitter(o), 'attack_error');
        push('RALLY_WON', { team: t }, 6000);
      }
    }
  }

  while (st.status !== 'complete') {
    if (st.status === 'set_complete') {
      push('SET_START', {}, 180000);
      ralliesInSet = 0;
      continue;
    }
    const set = st.sets[st.currentSet - 1];
    const target = plan[st.currentSet - 1];
    if (!target) throw new Error(`No plan for set ${st.currentSet}`);
    const w = target.winner;
    const l = otherTeam(w);
    const ws = w === 'A' ? set.scoreA : set.scoreB;
    const ls = l === 'A' ? set.scoreA : set.scoreB;

    let team;
    if (ls >= target.scoreL) team = w;
    else if (ws >= target.scoreW - 1) team = l;
    else team = rand() < 0.55 ? w : l;

    // Never let a rally end the set anywhere but at the planned score (deuce
    // guard): ask the engine whether the increment would decide the set.
    const wouldEnd = (side) => setWinner(st.format, set.number, set.scoreA + (side === 'A' ? 1 : 0), set.scoreB + (side === 'B' ? 1 : 0));
    const isFinal = ws + 1 === target.scoreW && ls === target.scoreL;
    if (team === w && wouldEnd(w) && !isFinal) team = l;
    else if (team === l && wouldEnd(l)) team = w;

    // Occasional timeout by the trailing team when the set is slipping away.
    const trailing = set.scoreA > set.scoreB ? 'B' : 'A';
    const margin = Math.abs(set.scoreA - set.scoreB);
    const key = `${set.number}:${trailing}`;
    if (margin >= 4 && Math.max(set.scoreA, set.scoreB) >= 12 && (timeoutsTaken.get(key) || 0) < st.format.timeoutsPerSet && rand() < 0.12) {
      push('TIMEOUT', { team: trailing }, 60000);
      timeoutsTaken.set(key, (timeoutsTaken.get(key) || 0) + 1);
    }

    rally(team);
    ralliesInSet += 1;
    if (stopAt && st.currentSet === stopAt.set && ralliesInSet >= stopAt.rallies) break;
  }
  return { events, state: st };
}
