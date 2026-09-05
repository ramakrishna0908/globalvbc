// @ts-check
// GlobalVBC volleyball match engine — pure, dependency-free.
//
// The match is an append-only event log. `deriveState(format, events)` folds the
// log into a state object; `applyEvent(state, event)` is the hot-path incremental
// reducer used by the scorer UI. UNDO is itself an event, so the log stays
// auditable: `deriveState` first collects the set of undone seqs and skips them.
//
// This module is imported by BOTH the frontend (optimistic local state, offline)
// and the backend (authoritative validation + derived stats), so it must stay
// free of DOM / Node APIs.

/**
 * @typedef {'A'|'B'} Team
 *
 * @typedef {object} MatchFormat
 * @property {number} setsToWin          sets needed to win the match (2 = best of 3)
 * @property {number} setPoints          target points for regular sets
 * @property {number} decidingSetPoints  target points for the deciding set
 * @property {boolean} winByTwo          require a two-point margin
 * @property {number|null} pointCap      hard cap (e.g. 30); null = none
 * @property {number} timeoutsPerSet     timeouts allowed per team per set
 *
 * @typedef {object} Lineup
 * @property {Array<string|number>} starters  six player ids in rotation order (index 0 = position 1 / server)
 * @property {Array<string|number>} bench
 *
 * @typedef {object} MatchEvent
 * @property {number} [seq]
 * @property {string} [clientEventId]
 * @property {'MATCH_START'|'RALLY_WON'|'PLAYER_ACTION'|'TIMEOUT'|'SUBSTITUTION'|'SET_START'|'UNDO'|'MATCH_END'} type
 * @property {any} [payload]
 * @property {string|number} [ts]
 * @property {string|number} [createdBy]
 */

export const ACTION_TYPES = /** @type {const} */ ([
  'serve',
  'ace',
  'serve_error',
  'receive',
  'receive_positive',
  'receive_negative',
  'set',
  'assist',
  'attack',
  'kill',
  'attack_error',
  'block',
  'block_assist',
  'dig',
  'defensive_error',
]);

/** Actions that, when attached to a RALLY_WON, describe how the point was won. */
export const POINT_ACTIONS = /** @type {const} */ (['kill', 'ace', 'block']);

/** @type {Record<string, MatchFormat>} */
export const FORMAT_PRESETS = {
  best_of_1: { setsToWin: 1, setPoints: 25, decidingSetPoints: 25, winByTwo: true, pointCap: null, timeoutsPerSet: 2 },
  best_of_3: { setsToWin: 2, setPoints: 25, decidingSetPoints: 15, winByTwo: true, pointCap: null, timeoutsPerSet: 2 },
  best_of_5: { setsToWin: 3, setPoints: 25, decidingSetPoints: 15, winByTwo: true, pointCap: null, timeoutsPerSet: 2 },
};

export class EngineError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'EngineError';
  }
}

/**
 * Normalise a partial/loose format into a full MatchFormat.
 * @param {Partial<MatchFormat>|string|undefined} input
 * @returns {MatchFormat}
 */
export function normalizeFormat(input) {
  if (typeof input === 'string') {
    const preset = FORMAT_PRESETS[input];
    if (!preset) throw new EngineError(`Unknown format preset: ${input}`);
    return { ...preset };
  }
  const base = FORMAT_PRESETS.best_of_3;
  const f = { ...base, ...(input || {}) };
  f.setsToWin = clampInt(f.setsToWin, 1, 5);
  f.setPoints = clampInt(f.setPoints, 1, 99);
  f.decidingSetPoints = clampInt(f.decidingSetPoints ?? f.setPoints, 1, 99);
  f.winByTwo = Boolean(f.winByTwo);
  f.pointCap = f.pointCap == null || f.pointCap === 0 ? null : clampInt(f.pointCap, 1, 199);
  f.timeoutsPerSet = clampInt(f.timeoutsPerSet ?? 2, 0, 5);
  return f;
}

function clampInt(v, min, max) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/** @param {Team} t @returns {Team} */
export const otherTeam = (t) => (t === 'A' ? 'B' : 'A');

/**
 * @param {MatchFormat} format
 * @returns {MatchState}
 */
export function initialState(format) {
  return {
    format: normalizeFormat(format),
    status: 'pending',
    currentSet: 0,
    sets: [],
    setsWon: { A: 0, B: 0 },
    serving: null,
    firstServer: null,
    rotation: { A: [], B: [] },
    lineups: { A: { starters: [], bench: [] }, B: { starters: [], bench: [] } },
    actions: [],
    history: [],
    lastSeq: 0,
    winner: null,
    endReason: null,
  };
}

/**
 * @typedef {object} SetState
 * @property {number} number
 * @property {number} scoreA
 * @property {number} scoreB
 * @property {Team|null} winner
 * @property {Array<RallyRecord>} rallies
 * @property {{A:number,B:number}} timeouts
 * @property {Team|null} firstServer
 *
 * @typedef {object} RallyRecord
 * @property {number} seq
 * @property {Team} team
 * @property {number} scoreA
 * @property {number} scoreB
 * @property {string|null} actionType
 * @property {string|number|null} playerId
 * @property {Team} server
 * @property {string|number|null} serverPlayerId
 * @property {string|number|null} ts
 *
 * @typedef {object} MatchState
 * @property {MatchFormat} format
 * @property {'pending'|'live'|'set_complete'|'complete'} status
 * @property {number} currentSet
 * @property {SetState[]} sets
 * @property {{A:number,B:number}} setsWon
 * @property {Team|null} serving
 * @property {Team|null} firstServer
 * @property {{A:Array<string|number>,B:Array<string|number>}} rotation
 * @property {{A:Lineup,B:Lineup}} lineups
 * @property {Array<{seq:number, team:Team, playerId:string|number, actionType:string, setNumber:number, ts:any, fromRally:boolean}>} actions
 * @property {Array<{seq:number, type:string, team?:Team|null, summary:string, ts:any, undoable:boolean}>} history
 * @property {number} lastSeq
 * @property {Team|null} winner
 * @property {string|null} endReason
 */

function currentSet(state) {
  return state.sets[state.currentSet - 1];
}

/** Target points for a given set number under the format. */
export function targetPoints(format, setNumber) {
  const deciding = setNumber === format.setsToWin * 2 - 1;
  return deciding ? format.decidingSetPoints : format.setPoints;
}

/**
 * Is a set finished given its scores?
 * @returns {Team|null}
 */
export function setWinner(format, setNumber, scoreA, scoreB) {
  const target = targetPoints(format, setNumber);
  const hi = Math.max(scoreA, scoreB);
  const lo = Math.min(scoreA, scoreB);
  const leader = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : null;
  if (!leader) return null;
  if (format.pointCap && hi >= format.pointCap) return leader;
  if (hi < target) return null;
  if (format.winByTwo && hi - lo < 2) return null;
  return leader;
}

/** Set/match point indicator for the UI. @returns {{team:Team, matchPoint:boolean}|null} */
export function setPointInfo(state) {
  if (state.status !== 'live') return null;
  const set = currentSet(state);
  if (!set) return null;
  for (const team of /** @type {Team[]} */ (['A', 'B'])) {
    const next = team === 'A' ? [set.scoreA + 1, set.scoreB] : [set.scoreA, set.scoreB + 1];
    if (setWinner(state.format, set.number, next[0], next[1]) === team) {
      return { team, matchPoint: state.setsWon[team] + 1 >= state.format.setsToWin };
    }
  }
  return null;
}

function validateTeam(t) {
  if (t !== 'A' && t !== 'B') throw new EngineError(`Invalid team: ${t}`);
  return /** @type {Team} */ (t);
}

function rotate(list) {
  if (list.length < 2) return list.slice();
  return [...list.slice(1), list[0]];
}

/**
 * Validate an event against the current state. Returns an error message or null.
 * @param {MatchState} state
 * @param {MatchEvent} event
 * @returns {string|null}
 */
export function validateEvent(state, event) {
  if (!event || typeof event.type !== 'string') return 'Event must have a type';
  const p = event.payload || {};
  switch (event.type) {
    case 'MATCH_START':
      if (state.status !== 'pending') return 'Match already started';
      if (p.servingTeam && p.servingTeam !== 'A' && p.servingTeam !== 'B') return 'Invalid serving team';
      return null;
    case 'RALLY_WON':
      if (state.status !== 'live') return `Cannot score a rally while match is ${state.status}`;
      if (p.team !== 'A' && p.team !== 'B') return 'Rally must name the winning team';
      if (p.actionType && !ACTION_TYPES.includes(p.actionType)) return `Unknown action type: ${p.actionType}`;
      return null;
    case 'PLAYER_ACTION':
      if (state.status === 'pending' || state.status === 'complete') return `Cannot record actions while match is ${state.status}`;
      if (p.team !== 'A' && p.team !== 'B') return 'Action must name a team';
      if (p.playerId === undefined || p.playerId === null) return 'Action must name a player';
      if (!ACTION_TYPES.includes(p.actionType)) return `Unknown action type: ${p.actionType}`;
      return null;
    case 'TIMEOUT': {
      if (state.status !== 'live') return 'Timeouts only during a live set';
      if (p.team !== 'A' && p.team !== 'B') return 'Timeout must name a team';
      const set = currentSet(state);
      if (set.timeouts[p.team] >= state.format.timeoutsPerSet) return 'No timeouts remaining';
      return null;
    }
    case 'SUBSTITUTION':
      if (state.status !== 'live') return 'Substitutions only during a live set';
      if (p.team !== 'A' && p.team !== 'B') return 'Substitution must name a team';
      if (p.out == null || p.in == null) return 'Substitution needs out and in players';
      if (!state.rotation[p.team].some((id) => String(id) === String(p.out))) return 'Outgoing player is not on court';
      return null;
    case 'SET_START':
      if (state.status !== 'set_complete') return 'Set can only start after the previous set completes';
      return null;
    case 'MATCH_END':
      if (state.status === 'complete') return 'Match already complete';
      if (state.status === 'pending') return 'Match has not started';
      if (state.winner === null && p.winner !== 'A' && p.winner !== 'B') return 'Match is not decided; MATCH_END must name a winner (forfeit)';
      return null;
    case 'UNDO': {
      if (typeof p.targetSeq !== 'number') return 'UNDO must reference targetSeq';
      const target = state.history.find((h) => h.seq === p.targetSeq);
      if (!target) return 'Nothing to undo';
      if (!target.undoable) return `Cannot undo ${target.type}`;
      return null;
    }
    default:
      return `Unknown event type: ${event.type}`;
  }
}

/**
 * Incremental reducer. Throws EngineError on invalid events (except UNDO, which
 * requires the full log — use `deriveState`).
 * @param {MatchState} state
 * @param {MatchEvent} event
 * @returns {MatchState}
 */
export function applyEvent(state, event) {
  const err = validateEvent(state, event);
  if (err) throw new EngineError(err);
  if (event.type === 'UNDO') throw new EngineError('UNDO must be applied via deriveState');

  const seq = event.seq ?? state.lastSeq + 1;
  const ts = event.ts ?? null;
  const p = event.payload || {};
  /** @type {MatchState} */
  const next = {
    ...state,
    sets: state.sets.map((s) => ({ ...s, rallies: s.rallies, timeouts: { ...s.timeouts } })),
    setsWon: { ...state.setsWon },
    rotation: { A: state.rotation.A.slice(), B: state.rotation.B.slice() },
    actions: state.actions,
    history: state.history,
    lastSeq: Math.max(state.lastSeq, seq),
  };
  const pushHistory = (entry) => {
    next.history = [...next.history, { seq, ts, undoable: true, ...entry }];
  };

  switch (event.type) {
    case 'MATCH_START': {
      const lineups = p.lineups || state.lineups;
      next.lineups = {
        A: { starters: (lineups.A?.starters || []).slice(), bench: (lineups.A?.bench || []).slice() },
        B: { starters: (lineups.B?.starters || []).slice(), bench: (lineups.B?.bench || []).slice() },
      };
      const serving = /** @type {Team} */ (p.servingTeam || 'A');
      next.firstServer = serving;
      next.serving = serving;
      next.rotation = { A: next.lineups.A.starters.slice(), B: next.lineups.B.starters.slice() };
      next.currentSet = 1;
      next.sets = [newSet(1, serving)];
      next.status = 'live';
      pushHistory({ type: 'MATCH_START', team: null, summary: 'Match started', undoable: false });
      return next;
    }
    case 'RALLY_WON': {
      const team = validateTeam(p.team);
      const set = { ...currentSet(next) };
      const serverTeam = next.serving || team;
      const serverPlayerId = next.rotation[serverTeam][0] ?? null;
      if (next.serving !== team) {
        // side-out: winning team rotates and takes the serve
        next.rotation[team] = rotate(next.rotation[team]);
        next.serving = team;
      }
      if (team === 'A') set.scoreA += 1;
      else set.scoreB += 1;
      const actionType = POINT_ACTIONS.includes(p.actionType) || ACTION_TYPES.includes(p.actionType) ? p.actionType : null;
      const playerId = actionType && p.playerId != null ? p.playerId : null;
      set.rallies = [
        ...set.rallies,
        { seq, team, scoreA: set.scoreA, scoreB: set.scoreB, actionType, playerId, server: serverTeam, serverPlayerId, ts },
      ];
      if (actionType && playerId != null) {
        next.actions = [...next.actions, { seq, team, playerId, actionType, setNumber: set.number, ts, fromRally: true }];
      }
      const winner = setWinner(next.format, set.number, set.scoreA, set.scoreB);
      if (winner) {
        set.winner = winner;
        next.setsWon[winner] += 1;
        if (next.setsWon[winner] >= next.format.setsToWin) {
          next.status = 'complete';
          next.winner = winner;
          next.endReason = 'played';
        } else {
          next.status = 'set_complete';
        }
      }
      next.sets = next.sets.map((s) => (s.number === set.number ? set : s));
      pushHistory({
        type: 'RALLY_WON',
        team,
        summary: `Team ${team} +1 (${set.scoreA}–${set.scoreB})${actionType && playerId != null ? ` · ${actionType} #${playerId}` : ''}`,
      });
      return next;
    }
    case 'PLAYER_ACTION': {
      const team = validateTeam(p.team);
      const setNumber = next.currentSet || 1;
      next.actions = [...next.actions, { seq, team, playerId: p.playerId, actionType: p.actionType, setNumber, ts, fromRally: false }];
      pushHistory({ type: 'PLAYER_ACTION', team, summary: `${p.actionType} #${p.playerId}` });
      return next;
    }
    case 'TIMEOUT': {
      const team = validateTeam(p.team);
      const set = { ...currentSet(next), timeouts: { ...currentSet(next).timeouts } };
      set.timeouts[team] += 1;
      next.sets = next.sets.map((s) => (s.number === set.number ? set : s));
      pushHistory({ type: 'TIMEOUT', team, summary: `Timeout Team ${team}` });
      return next;
    }
    case 'SUBSTITUTION': {
      const team = validateTeam(p.team);
      next.rotation[team] = next.rotation[team].map((id) => (String(id) === String(p.out) ? p.in : id));
      next.lineups = {
        ...next.lineups,
        [team]: {
          starters: next.lineups[team].starters.map((id) => (String(id) === String(p.out) ? p.in : id)),
          bench: [...next.lineups[team].bench.filter((id) => String(id) !== String(p.in)), p.out],
        },
      };
      pushHistory({ type: 'SUBSTITUTION', team, summary: `Sub Team ${team}: #${p.out} → #${p.in}` });
      return next;
    }
    case 'SET_START': {
      const number = next.currentSet + 1;
      const prev = currentSet(next);
      const serving = /** @type {Team} */ (p.servingTeam || (prev?.firstServer ? otherTeam(prev.firstServer) : next.firstServer || 'A'));
      next.currentSet = number;
      next.sets = [...next.sets, newSet(number, serving)];
      next.serving = serving;
      next.rotation = {
        A: (p.rotations?.A || next.lineups.A.starters).slice(),
        B: (p.rotations?.B || next.lineups.B.starters).slice(),
      };
      next.status = 'live';
      pushHistory({ type: 'SET_START', team: null, summary: `Set ${number} started`, undoable: false });
      return next;
    }
    case 'MATCH_END': {
      if (next.winner === null) {
        next.winner = validateTeam(p.winner);
        next.endReason = p.reason || 'forfeit';
      } else {
        next.endReason = next.endReason || 'played';
      }
      next.status = 'complete';
      pushHistory({ type: 'MATCH_END', team: next.winner, summary: `Match ended (${next.endReason})`, undoable: false });
      return next;
    }
    default:
      throw new EngineError(`Unhandled event type ${event.type}`);
  }
}

function newSet(number, firstServer) {
  return { number, scoreA: 0, scoreB: 0, winner: null, rallies: [], timeouts: { A: 0, B: 0 }, firstServer };
}

/**
 * Which seqs are cancelled by UNDO events in the log.
 * @param {MatchEvent[]} events
 * @returns {Set<number>}
 */
export function undoneSeqs(events) {
  const undone = new Set();
  for (const e of events) {
    if (e.type === 'UNDO' && e.payload && typeof e.payload.targetSeq === 'number') undone.add(e.payload.targetSeq);
  }
  return undone;
}

/**
 * Fold a full event log into match state. Events must carry `seq` (assigned in
 * insertion order). Undone events (and the UNDO events themselves) are skipped.
 * Invalid events throw unless `{ lenient: true }`, in which case they are
 * skipped and collected in `state.skipped`.
 * @param {Partial<MatchFormat>|string} format
 * @param {MatchEvent[]} events
 * @param {{lenient?: boolean}} [opts]
 * @returns {MatchState & { skipped?: Array<{seq:number, error:string}> }}
 */
export function deriveState(format, events, opts = {}) {
  let state = initialState(normalizeFormat(format));
  const withSeq = events.map((e, i) => ({ ...e, seq: e.seq ?? i + 1 }));
  const undone = undoneSeqs(withSeq);
  const skipped = [];
  for (const e of withSeq) {
    if (e.type === 'UNDO') {
      state = { ...state, lastSeq: Math.max(state.lastSeq, e.seq) };
      continue;
    }
    if (undone.has(e.seq)) {
      state = { ...state, lastSeq: Math.max(state.lastSeq, e.seq) };
      continue;
    }
    try {
      state = applyEvent(state, e);
    } catch (err) {
      if (!opts.lenient) throw err;
      skipped.push({ seq: e.seq, error: err.message });
      state = { ...state, lastSeq: Math.max(state.lastSeq, e.seq) };
    }
  }
  return opts.lenient ? { ...state, skipped } : state;
}

/**
 * The most recent undoable event seq in the (already undo-filtered) log, or null.
 * @param {MatchEvent[]} events
 */
export function lastUndoableSeq(events) {
  const undone = undoneSeqs(events);
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    const seq = e.seq ?? i + 1;
    if (e.type === 'UNDO' || undone.has(seq)) continue;
    if (e.type === 'MATCH_START' || e.type === 'SET_START' || e.type === 'MATCH_END') continue;
    return seq;
  }
  return null;
}

/**
 * Compact summary used for list cards and live view.
 * @param {MatchState} state
 */
export function summarize(state) {
  const set = currentSet(state);
  return {
    status: state.status,
    currentSet: state.currentSet,
    scoreA: set?.scoreA ?? 0,
    scoreB: set?.scoreB ?? 0,
    setsA: state.setsWon.A,
    setsB: state.setsWon.B,
    serving: state.serving,
    winner: state.winner,
    sets: state.sets.map((s) => ({ number: s.number, scoreA: s.scoreA, scoreB: s.scoreB, winner: s.winner })),
  };
}
