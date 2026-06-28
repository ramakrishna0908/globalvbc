import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js';
import { resetDb } from '../helpers.js';
import { pool } from '../../db.js';

async function newPlayer(email) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'spike123!', name: 'Dana Defense' });
  return res.body.token;
}
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const post = (t, body) => request(app).post('/api/matches').set(auth(t)).send(body);

const keys = (badges) => badges.map((b) => b.key);

describe('badges & stats', () => {
  beforeEach(resetDb);
  afterAll(() => pool.end());

  it('awards Rising Star on the first match', async () => {
    const t = await newPlayer('rs@vbc.test');
    const res = await post(t, { opponent_name: 'A', result: 'won', score_for: 21, score_against: 18 });
    expect(keys(res.body.newBadges)).toContain('rising_star');
  });

  it('awards Consistent Performer on a 3-win streak', async () => {
    const t = await newPlayer('cp@vbc.test');
    await post(t, { opponent_name: 'A', result: 'won', score_for: 21, score_against: 10 });
    await post(t, { opponent_name: 'B', result: 'won', score_for: 21, score_against: 12 });
    const third = await post(t, { opponent_name: 'C', result: 'won', score_for: 21, score_against: 9 });
    expect(keys(third.body.newBadges)).toContain('consistent_performer');
  });

  it('awards Tournament MVP when is_mvp is set', async () => {
    const t = await newPlayer('mvp@vbc.test');
    const res = await post(t, {
      opponent_name: 'A',
      result: 'won',
      score_for: 21,
      score_against: 14,
      is_mvp: true,
    });
    expect(keys(res.body.newBadges)).toContain('tournament_mvp');
  });

  it('does not award the same badge twice', async () => {
    const t = await newPlayer('dup@vbc.test');
    await post(t, { opponent_name: 'A', result: 'won', score_for: 21, score_against: 10 });
    const second = await post(t, { opponent_name: 'B', result: 'won', score_for: 21, score_against: 11 });
    expect(keys(second.body.newBadges)).not.toContain('rising_star');
  });

  it('GET /badges returns earned + locked with requirements', async () => {
    const t = await newPlayer('list@vbc.test');
    await post(t, { opponent_name: 'A', result: 'won', score_for: 21, score_against: 10 });
    const res = await request(app).get('/api/badges').set(auth(t));
    expect(res.status).toBe(200);
    expect(res.body.badges).toHaveLength(5);
    const rs = res.body.badges.find((b) => b.key === 'rising_star');
    expect(rs.earned).toBe(true);
    const fav = res.body.badges.find((b) => b.key === 'community_favorite');
    expect(fav.earned).toBe(false);
    expect(fav.requirement).toBeTruthy();
  });

  it('GET /stats returns metrics and trends', async () => {
    const t = await newPlayer('stats@vbc.test');
    await post(t, { opponent_name: 'A', result: 'won', score_for: 21, score_against: 10 });
    await post(t, { opponent_name: 'B', result: 'lost', score_for: 18, score_against: 21 });
    const res = await request(app).get('/api/stats').set(auth(t));
    expect(res.status).toBe(200);
    expect(res.body.metrics.matches_played).toBe(2);
    expect(res.body.metrics.win_rate).toBe(50);
    expect(res.body.ratingTrend).toHaveLength(2);
    expect(res.body.winRateTrend).toHaveLength(2);
    expect(res.body.monthlyMatches.length).toBeGreaterThanOrEqual(1);
  });
});
