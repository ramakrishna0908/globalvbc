import { describe, it, expect } from 'vitest';
import { generate, standings, advance, seedOrder, snakePools, roundRobinRounds } from '../formats.js';

const teams = (n) => Array.from({ length: n }, (_, i) => `t${i + 1}`);

const countAppearances = (specs) => {
  const c = new Map();
  for (const s of specs) for (const t of [s.teamA, s.teamB]) if (t != null) c.set(t, (c.get(t) || 0) + 1);
  return c;
};

describe('round robin', () => {
  it('every team plays every other exactly once (even and odd counts)', () => {
    for (const n of [2, 4, 5, 7]) {
      const specs = generate({ format: 'round_robin', teams: teams(n) });
      expect(specs).toHaveLength((n * (n - 1)) / 2);
      for (const [, count] of countAppearances(specs)) expect(count).toBe(n - 1);
      const pairs = new Set(specs.map((s) => [s.teamA, s.teamB].sort().join('-')));
      expect(pairs.size).toBe(specs.length);
    }
  });
  it('no team plays twice in one round', () => {
    for (const round of roundRobinRounds(teams(6))) {
      const seen = new Set(round.flat());
      expect(seen.size).toBe(6);
    }
  });
});

describe('pool play', () => {
  it('snake seeds into pools and generates per-pool round robins', () => {
    expect(snakePools(teams(8), 3)).toEqual([
      ['t1', 't6', 't7'],
      ['t2', 't5', 't8'],
      ['t3', 't4'],
    ]);
    const specs = generate({ format: 'pool_play', teams: teams(13), settings: { pools: 4 } });
    const pools = new Set(specs.map((s) => s.pool));
    expect(pools.size).toBe(4);
    expect(specs.every((s) => s.stage === 'pool')).toBe(true);
  });
});

describe('single elimination', () => {
  it('seeds 1v16-style and adds byes for non powers of two', () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    const specs = generate({ format: 'single_elimination', teams: teams(6) });
    // 8-slot bracket: 2 byes removed → 2 R1 matches + 2 semis + 1 final
    expect(specs.filter((s) => s.round === 1)).toHaveLength(2);
    expect(specs.filter((s) => s.round === 2)).toHaveLength(2);
    expect(specs.filter((s) => s.bracket === 'final')).toHaveLength(1);
    const semis = specs.filter((s) => s.round === 2);
    // top seeds advanced directly into the semis via bye
    expect(semis.flatMap((s) => [s.teamA, s.teamB])).toEqual(expect.arrayContaining(['t1', 't2']));
    expect(specs).toHaveLength(5);
  });
  it('handles two teams as a single final', () => {
    const specs = generate({ format: 'single_elimination', teams: teams(2) });
    expect(specs).toHaveLength(1);
    expect(specs[0].teamA).toBe('t1');
    expect(specs[0].teamB).toBe('t2');
  });
  it('advances winners into placeholder matches', () => {
    const specs = generate({ format: 'single_elimination', teams: teams(4) });
    const results = new Map([
      ['W-R1-1', { winner: 't1', loser: 't4' }],
      ['W-R1-2', { winner: 't3', loser: 't2' }],
    ]);
    const filled = advance(specs, results);
    const final = filled.find((s) => s.round === 2);
    expect([final.teamA, final.teamB]).toEqual(['t1', 't3']);
  });
});

describe('double elimination', () => {
  it('builds winners, losers and a grand final where every loss drops once', () => {
    const specs = generate({ format: 'double_elimination', teams: teams(8) });
    const winners = specs.filter((s) => s.bracket === 'winners');
    const losers = specs.filter((s) => s.bracket === 'losers');
    const finals = specs.filter((s) => s.bracket === 'final');
    expect(winners).toHaveLength(7);
    expect(losers).toHaveLength(6);
    expect(finals).toHaveLength(1);
    expect(finals[0].key).toBe('GF');
    // every winners-bracket loss feeds exactly one losers-bracket slot
    const dropIns = losers.flatMap((m) => [m.sourceA, m.sourceB]).filter((s) => s?.type === 'loser');
    expect(new Set(dropIns.map((s) => s.match)).size).toBe(7);
  });
});

describe('pool + knockout', () => {
  it('creates pools and a bracket seeded from pool ranks, then resolves from standings', () => {
    const specs = generate({ format: 'pool_knockout', teams: teams(8), settings: { pools: 2, advance: 2 } });
    const pool = specs.filter((s) => s.stage === 'pool');
    const bracket = specs.filter((s) => s.stage === 'bracket');
    expect(pool).toHaveLength(12);
    expect(bracket).toHaveLength(3);
    const semi = bracket.find((s) => s.round === 1);
    expect(semi.sourceA).toEqual({ type: 'pool', pool: 'A', rank: 1 });
    const rankings = new Map([
      ['A', [{ teamId: 't1' }, { teamId: 't4' }]],
      ['B', [{ teamId: 't2' }, { teamId: 't3' }]],
    ]);
    const filled = advance(specs, new Map(), rankings);
    const semis = filled.filter((s) => s.stage === 'bracket' && s.round === 1);
    expect(semis.map((s) => [s.teamA, s.teamB])).toEqual([
      ['t1', 't3'],
      ['t2', 't4'],
    ]);
  });
});

describe('standings', () => {
  it('ranks by wins, then set ratio, point ratio, head-to-head', () => {
    const rows = standings(['x', 'y', 'z'], [
      { teamA: 'x', teamB: 'y', winner: 'x', setsA: 2, setsB: 0, pointsA: 50, pointsB: 30 },
      { teamA: 'y', teamB: 'z', winner: 'y', setsA: 2, setsB: 1, pointsA: 60, pointsB: 55 },
      { teamA: 'z', teamB: 'x', winner: 'z', setsA: 2, setsB: 1, pointsA: 62, pointsB: 60 },
    ]);
    expect(rows.map((r) => r.teamId)).toEqual(['x', 'z', 'y']); // 1–1 each; set ratio decides
    expect(rows[0]).toMatchObject({ rank: 1, wins: 1, losses: 1, setsWon: 3, setsLost: 2 });
  });
  it('ignores unfinished matches', () => {
    const rows = standings(['x', 'y'], [{ teamA: 'x', teamB: 'y', winner: null, setsA: 1, setsB: 0, pointsA: 25, pointsB: 20 }]);
    expect(rows[0].played).toBe(0);
  });
});
