import { describe, it, expect } from 'vitest';
import {
  deriveState,
  applyEvent,
  initialState,
  normalizeFormat,
  setWinner,
  setPointInfo,
  lastUndoableSeq,
  validateEvent,
  EngineError,
  FORMAT_PRESETS,
} from '../match.js';
import { deriveStats, leaders, teamTotals } from '../stats.js';

const A = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
const B = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'];
const start = (servingTeam = 'A') => ({
  type: 'MATCH_START',
  payload: { servingTeam, lineups: { A: { starters: A, bench: ['a7'] }, B: { starters: B, bench: [] } } },
});
const rally = (team, extra = {}) => ({ type: 'RALLY_WON', payload: { team, ...extra } });
const rallies = (team, n) => Array.from({ length: n }, () => rally(team));

describe('format normalisation', () => {
  it('applies presets and clamps custom values', () => {
    expect(normalizeFormat('best_of_5').setsToWin).toBe(3);
    const f = normalizeFormat({ setsToWin: 9, setPoints: 21, pointCap: 0, winByTwo: 1 });
    expect(f.setsToWin).toBe(5);
    expect(f.setPoints).toBe(21);
    expect(f.pointCap).toBeNull();
    expect(f.winByTwo).toBe(true);
    expect(f.decidingSetPoints).toBe(15); // deciding set keeps the preset default
  });
  it('rejects unknown presets', () => {
    expect(() => normalizeFormat('nope')).toThrow(EngineError);
  });
});

describe('set completion rules', () => {
  const f = FORMAT_PRESETS.best_of_3;
  it('needs 25 and win by two', () => {
    expect(setWinner(f, 1, 25, 23)).toBe('A');
    expect(setWinner(f, 1, 25, 24)).toBeNull();
    expect(setWinner(f, 1, 26, 24)).toBe('A');
    expect(setWinner(f, 1, 24, 26)).toBe('B');
    expect(setWinner(f, 1, 30, 29)).toBeNull();
  });
  it('uses deciding-set points in the last set', () => {
    expect(setWinner(f, 3, 15, 13)).toBe('A');
    expect(setWinner(f, 2, 15, 13)).toBeNull();
  });
  it('honours the point cap without win-by-two', () => {
    const capped = { ...f, pointCap: 30 };
    expect(setWinner(capped, 1, 30, 29)).toBe('A');
    expect(setWinner(capped, 1, 29, 28)).toBeNull();
  });
  it('allows win by one when winByTwo is off', () => {
    expect(setWinner({ ...f, winByTwo: false }, 1, 25, 24)).toBe('A');
  });
});

describe('deriveState', () => {
  it('scores rallies, tracks serving and rotation on side-out', () => {
    const s = deriveState('best_of_3', [start('A'), rally('A'), rally('B'), rally('B')]);
    expect(s.status).toBe('live');
    expect(s.sets[0].scoreA).toBe(1);
    expect(s.sets[0].scoreB).toBe(2);
    expect(s.serving).toBe('B');
    // A served, kept serve after point 1 (no rotation), B side-out → B rotates once
    expect(s.rotation.A).toEqual(A);
    expect(s.rotation.B).toEqual(['b2', 'b3', 'b4', 'b5', 'b6', 'b1']);
    expect(s.sets[0].rallies[0].serverPlayerId).toBe('a1');
  });

  it('completes a set at 25 with a two-point margin and waits for SET_START', () => {
    const events = [start('A'), ...rallies('A', 24), ...rallies('B', 24), rally('A'), rally('A')];
    const s = deriveState('best_of_3', events);
    expect(s.sets[0].winner).toBe('A');
    expect(s.sets[0].scoreA).toBe(26);
    expect(s.status).toBe('set_complete');
    expect(s.setsWon).toEqual({ A: 1, B: 0 });
    expect(validateEvent(s, rally('A'))).toMatch(/set_complete/);
    const s2 = deriveState('best_of_3', [...events, { type: 'SET_START', payload: {} }]);
    expect(s2.status).toBe('live');
    expect(s2.currentSet).toBe(2);
    expect(s2.serving).toBe('B'); // alternates first server
    expect(s2.rotation.A).toEqual(A); // reset from lineup
  });

  it('completes a best-of-3 match 2–0 and refuses further rallies', () => {
    const setA = [...rallies('A', 25)];
    const events = [start('A'), ...setA, { type: 'SET_START', payload: {} }, ...setA];
    const s = deriveState('best_of_3', events);
    expect(s.status).toBe('complete');
    expect(s.winner).toBe('A');
    expect(s.setsWon).toEqual({ A: 2, B: 0 });
    expect(() => deriveState('best_of_3', [...events, rally('B')])).toThrow(/complete/);
  });

  it('plays a deciding set to 15', () => {
    const events = [
      start('A'),
      ...rallies('A', 25),
      { type: 'SET_START', payload: {} },
      ...rallies('B', 25),
      { type: 'SET_START', payload: {} },
      ...rallies('B', 15),
    ];
    const s = deriveState('best_of_3', events);
    expect(s.currentSet).toBe(3);
    expect(s.status).toBe('complete');
    expect(s.winner).toBe('B');
  });

  it('records rally attribution and standalone player actions into stats', () => {
    const s = deriveState('best_of_3', [
      start('A'),
      rally('A', { actionType: 'kill', playerId: 'a3' }),
      { type: 'PLAYER_ACTION', payload: { team: 'B', playerId: 'b5', actionType: 'dig' } },
      { type: 'PLAYER_ACTION', payload: { team: 'A', playerId: 'a2', actionType: 'assist' } },
      rally('B', { actionType: 'ace', playerId: 'b1' }),
    ]);
    const boxes = deriveStats(s);
    const a3 = boxes.find((b) => b.playerId === 'a3');
    const b5 = boxes.find((b) => b.playerId === 'b5');
    const b1 = boxes.find((b) => b.playerId === 'b1');
    expect(a3.kills).toBe(1);
    expect(a3.attacks).toBe(1);
    expect(a3.points).toBe(1);
    expect(b5.digs).toBe(1);
    expect(b1.aces).toBe(1);
    expect(boxes.find((b) => b.playerId === 'a7')).toBeTruthy(); // bench seeded with zeros
    expect(leaders(boxes).topScorer.playerId).toBe('a3');
    expect(teamTotals(boxes, 'A').assists).toBe(1);
  });

  it('UNDO reverses score, server, rotation and stats', () => {
    const base = [start('A'), rally('B', { actionType: 'kill', playerId: 'b2' })];
    const before = deriveState('best_of_3', [start('A')]);
    const after = deriveState('best_of_3', [...base, { type: 'UNDO', payload: { targetSeq: 2 } }]);
    expect(after.sets[0].scoreB).toBe(0);
    expect(after.serving).toBe('A');
    expect(after.rotation.B).toEqual(before.rotation.B);
    expect(after.actions).toHaveLength(0);
    expect(after.lastSeq).toBe(3);
    expect(after.history).toHaveLength(1); // only MATCH_START
  });

  it('UNDO of the set-completing rally reopens the set', () => {
    const events = [start('A'), ...rallies('A', 25)];
    const done = deriveState('best_of_3', events);
    expect(done.status).toBe('set_complete');
    const reopened = deriveState('best_of_3', [...events, { type: 'UNDO', payload: { targetSeq: 26 } }]);
    expect(reopened.status).toBe('live');
    expect(reopened.sets[0].scoreA).toBe(24);
    expect(reopened.setsWon.A).toBe(0);
  });

  it('rejects undo when nothing is undoable and cannot undo MATCH_START', () => {
    const s = deriveState('best_of_3', [start('A')]);
    expect(validateEvent(s, { type: 'UNDO', payload: { targetSeq: 1 } })).toMatch(/Cannot undo/);
    expect(validateEvent(s, { type: 'UNDO', payload: { targetSeq: 99 } })).toMatch(/Nothing/);
    expect(lastUndoableSeq([{ seq: 1, ...start('A') }])).toBeNull();
    expect(lastUndoableSeq([{ seq: 1, ...start('A') }, { seq: 2, ...rally('A') }])).toBe(2);
    expect(
      lastUndoableSeq([{ seq: 1, ...start('A') }, { seq: 2, ...rally('A') }, { seq: 3, type: 'UNDO', payload: { targetSeq: 2 } }])
    ).toBeNull();
  });

  it('lenient mode skips invalid events instead of throwing', () => {
    const s = deriveState('best_of_3', [rally('A'), start('A'), rally('A')], { lenient: true });
    expect(s.skipped).toHaveLength(1);
    expect(s.sets[0].scoreA).toBe(1);
  });

  it('timeouts are limited per set and substitutions swap the rotation', () => {
    const s = deriveState('best_of_3', [
      start('A'),
      { type: 'TIMEOUT', payload: { team: 'A' } },
      { type: 'TIMEOUT', payload: { team: 'A' } },
      { type: 'SUBSTITUTION', payload: { team: 'A', out: 'a3', in: 'a7' } },
    ]);
    expect(s.sets[0].timeouts.A).toBe(2);
    expect(validateEvent(s, { type: 'TIMEOUT', payload: { team: 'A' } })).toMatch(/No timeouts/);
    expect(s.rotation.A[2]).toBe('a7');
    expect(s.lineups.A.bench).toContain('a3');
  });

  it('MATCH_END as forfeit needs a winner; after a decided match it just closes', () => {
    const live = deriveState('best_of_3', [start('A'), rally('A')]);
    expect(validateEvent(live, { type: 'MATCH_END', payload: {} })).toMatch(/winner/);
    const forfeited = applyEvent(live, { type: 'MATCH_END', payload: { winner: 'B', reason: 'forfeit' } });
    expect(forfeited.status).toBe('complete');
    expect(forfeited.winner).toBe('B');
    expect(forfeited.endReason).toBe('forfeit');
  });

  it('exposes set/match point information', () => {
    const s = deriveState('best_of_3', [start('A'), ...rallies('A', 24), ...rallies('B', 10)]);
    expect(setPointInfo(s)).toEqual({ team: 'A', matchPoint: false });
    const s2 = deriveState('best_of_3', [start('A'), ...rallies('A', 25), { type: 'SET_START', payload: {} }, ...rallies('A', 24)]);
    expect(setPointInfo(s2)).toEqual({ team: 'A', matchPoint: true });
    expect(setPointInfo(initialState(FORMAT_PRESETS.best_of_3))).toBeNull();
  });

  it('is deterministic: same log → same state', () => {
    const log = [start('B'), ...rallies('A', 5), ...rallies('B', 7), rally('A')];
    expect(deriveState('best_of_3', log)).toEqual(deriveState('best_of_3', log));
  });
});
