import { describe, it, expect } from 'vitest';
import { ratePlayers, expected, marginFactor, displayScore, DEFAULT_CONFIG, RATING_VERSION } from '../rating.js';

const team = (prefix, rating) => Array.from({ length: 6 }, (_, i) => ({ playerId: `${prefix}${i + 1}`, rating }));
const box = (playerId, team, extra) => ({ playerId, team, kills: 0, attacks: 0, serves: 0, receptions: 0, sets: 0, digs: 0, blocks: 0, block_assists: 0, defensive_errors: 0, ...extra });

describe('rating engine v2', () => {
  it('exports a version and a pinned default config', () => {
    expect(RATING_VERSION).toBe('2.0.0');
    expect(DEFAULT_CONFIG.K).toBe(32);
  });

  it('even teams: winners gain, losers lose the same amount without actions', () => {
    const res = ratePlayers({
      players: { A: team('a', 1000), B: team('b', 1000) },
      winner: 'A',
      sets: { A: 2, B: 0 },
      points: { A: 50, B: 30 },
      boxes: [],
    });
    const a = res.filter((r) => r.team === 'A');
    const b = res.filter((r) => r.team === 'B');
    expect(a.every((r) => r.delta > 0)).toBe(true);
    expect(b.every((r) => r.delta < 0)).toBe(true);
    expect(a[0].delta).toBe(-b[0].delta);
    expect(a[0].reason).toMatch(/Won vs evenly matched opponent/);
    expect(a[0].factors.version).toBe('2.0.0');
  });

  it('an upset moves ratings more than an expected win', () => {
    const upset = ratePlayers({ players: { A: team('a', 900), B: team('b', 1200) }, winner: 'A', sets: { A: 2, B: 1 }, points: { A: 60, B: 58 }, boxes: [] });
    const expectedWin = ratePlayers({ players: { A: team('a', 1200), B: team('b', 900) }, winner: 'A', sets: { A: 2, B: 1 }, points: { A: 60, B: 58 }, boxes: [] });
    expect(upset[0].delta).toBeGreaterThan(expectedWin[0].delta);
    expect(upset[0].reason).toMatch(/stronger/);
    expect(expectedWin[0].reason).toMatch(/weaker/);
  });

  it('rewards above-team-average performance and penalises errors, within bounds', () => {
    const boxes = [
      box('a1', 'A', { kills: 12, attacks: 20, digs: 5 }),
      box('a2', 'A', { attack_errors: 6, attacks: 8, serve_errors: 3, serves: 5 }),
      box('a3', 'A', { kills: 3, attacks: 6, digs: 2 }),
      box('a4', 'A', { kills: 3, attacks: 6, digs: 2 }),
    ];
    const res = ratePlayers({ players: { A: team('a', 1000), B: team('b', 1000) }, winner: 'A', sets: { A: 2, B: 0 }, points: { A: 50, B: 40 }, boxes });
    const star = res.find((r) => r.playerId === 'a1');
    const errorProne = res.find((r) => r.playerId === 'a2');
    const noActions = res.find((r) => r.playerId === 'a5');
    expect(star.delta).toBeGreaterThan(noActions.delta);
    expect(errorProne.delta).toBeLessThan(noActions.delta);
    expect(star.reason).toMatch(/above-team-average/);
    expect(noActions.reason).toMatch(/no recorded actions/);
    const maxPerf = DEFAULT_CONFIG.performanceWeight * DEFAULT_CONFIG.K;
    expect(Math.abs(star.factors.performance)).toBeLessThanOrEqual(maxPerf + 0.01);
  });

  it('applies the tournament level multiplier and the rating floor', () => {
    const local = ratePlayers({ players: { A: team('a', 1000), B: team('b', 1000) }, winner: 'A', sets: { A: 2, B: 0 }, points: { A: 50, B: 30 }, boxes: [] });
    const regional = ratePlayers({ players: { A: team('a', 1000), B: team('b', 1000) }, winner: 'A', sets: { A: 2, B: 0 }, points: { A: 50, B: 30 }, boxes: [], level: 'regional' });
    expect(regional[0].delta).toBeGreaterThan(local[0].delta);
    expect(regional[0].reason).toMatch(/regional/);
    const floored = ratePlayers({ players: { A: team('a', 1000), B: team('b', 110) }, winner: 'A', sets: { A: 2, B: 0 }, points: { A: 50, B: 10 }, boxes: [] }, { K: 3200 });
    expect(floored.find((r) => r.team === 'B').after).toBe(DEFAULT_CONFIG.floor);
  });

  it('helpers', () => {
    expect(expected(1000, 1000)).toBe(0.5);
    expect(marginFactor({ setsFor: 2, setsAgainst: 0, pointsFor: 50, pointsAgainst: 0 })).toBeCloseTo(1.5);
    expect(marginFactor({ setsFor: 2, setsAgainst: 1, pointsFor: 60, pointsAgainst: 60 })).toBeCloseTo(1 + 0.5 * (0.5 * (1 / 3)));
    expect(displayScore(1000)).toBe(2.9);
    expect(displayScore(2000)).toBe(10);
  });
});
