import { describe, it, expect } from 'vitest';
import { nextElo, ratingScore, expectedScore, STARTING_ELO } from '../../utils/elo.js';

describe('elo', () => {
  it('a win raises elo, a loss lowers it', () => {
    const win = nextElo(STARTING_ELO, { result: 'won', scoreFor: 21, scoreAgainst: 18 });
    const loss = nextElo(STARTING_ELO, { result: 'lost', scoreFor: 18, scoreAgainst: 21 });
    expect(win).toBeGreaterThan(STARTING_ELO);
    expect(loss).toBeLessThan(STARTING_ELO);
  });

  it('blowout win moves elo more than a close win', () => {
    const close = nextElo(STARTING_ELO, { result: 'won', scoreFor: 25, scoreAgainst: 23 });
    const blowout = nextElo(STARTING_ELO, { result: 'won', scoreFor: 25, scoreAgainst: 5 });
    expect(blowout - STARTING_ELO).toBeGreaterThan(close - STARTING_ELO);
  });

  it('beating a stronger opponent gains more than beating a weaker one', () => {
    const vsStronger = nextElo(1000, { opponentElo: 1400, result: 'won', scoreFor: 21, scoreAgainst: 19 });
    const vsWeaker = nextElo(1000, { opponentElo: 600, result: 'won', scoreFor: 21, scoreAgainst: 19 });
    expect(vsStronger - 1000).toBeGreaterThan(vsWeaker - 1000);
  });

  it('expectedScore is 0.5 for equal ratings', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 5);
  });

  it('ratingScore normalizes and clamps to 0–10', () => {
    expect(ratingScore(1000)).toBeCloseTo(2.9, 1);
    expect(ratingScore(1800)).toBeCloseTo(8.6, 1);
    expect(ratingScore(100)).toBe(0);
    expect(ratingScore(9999)).toBe(10);
  });
});
