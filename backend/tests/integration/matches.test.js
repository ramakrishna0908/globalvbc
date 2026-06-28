import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js';
import { resetDb } from '../helpers.js';
import { pool } from '../../db.js';

async function newPlayer(email) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'spike123!', name: 'Olivia Outside' });
  return res.body.token;
}

function post(token, body) {
  return request(app).post('/api/matches').set('Authorization', `Bearer ${token}`).send(body);
}

describe('matches', () => {
  beforeEach(resetDb);
  afterAll(() => pool.end());

  it('records a win, raises rating, returns a positive delta', async () => {
    const token = await newPlayer('win@vbc.test');
    const res = await post(token, {
      opponent_name: 'Tigers',
      result: 'won',
      score_for: 21,
      score_against: 18,
    });
    expect(res.status).toBe(201);
    expect(res.body.ratingDelta).toBeGreaterThan(0);
    expect(res.body.match.elo_after).toBeGreaterThan(res.body.match.elo_before);
    expect(res.body.winStreak).toBe(1);
    expect(Array.isArray(res.body.newBadges)).toBe(true);
  });

  it('a loss lowers rating and resets the win streak', async () => {
    const token = await newPlayer('streak@vbc.test');
    await post(token, { opponent_name: 'A', result: 'won', score_for: 21, score_against: 10 });
    const second = await post(token, {
      opponent_name: 'Eagles',
      result: 'lost',
      score_for: 19,
      score_against: 21,
    });
    expect(second.body.ratingDelta).toBeLessThan(0);
    expect(second.body.winStreak).toBe(0);
  });

  it('lists matches newest-first', async () => {
    const token = await newPlayer('list@vbc.test');
    await post(token, { opponent_name: 'A', result: 'won', score_for: 21, score_against: 12 });
    await post(token, { opponent_name: 'B', result: 'lost', score_for: 15, score_against: 21 });
    const res = await request(app).get('/api/matches').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.matches).toHaveLength(2);
  });

  it('rejects an invalid result', async () => {
    const token = await newPlayer('bad@vbc.test');
    const res = await post(token, {
      opponent_name: 'X',
      result: 'tie',
      score_for: 21,
      score_against: 21,
    });
    expect(res.status).toBe(400);
  });
});
