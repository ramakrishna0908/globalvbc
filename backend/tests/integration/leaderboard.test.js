import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js';
import { resetDb } from '../helpers.js';
import { pool } from '../../db.js';

const auth = (t) => ({ Authorization: `Bearer ${t}` });

async function player(email, name) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'spike123!', name });
  return { token: res.body.token, id: res.body.user.id };
}
async function setCommunity(token, communityId) {
  await request(app).patch('/api/profile').set(auth(token)).send({ community_id: communityId });
}
async function play(token, result, sf, sa) {
  await request(app)
    .post('/api/matches')
    .set(auth(token))
    .send({ opponent_name: 'X', result, score_for: sf, score_against: sa });
}

describe('communities & leaderboard', () => {
  beforeEach(resetDb);
  afterAll(() => pool.end());

  it('lists seeded communities', async () => {
    const res = await request(app).get('/api/communities');
    expect(res.status).toBe(200);
    expect(res.body.communities.length).toBeGreaterThanOrEqual(3);
  });

  it('ranks players by elo within a community', async () => {
    const a = await player('a@vbc.test', 'Alpha');
    const b = await player('b@vbc.test', 'Bravo');
    await setCommunity(a.token, 1);
    await setCommunity(b.token, 1);
    await play(a.token, 'won', 25, 5); // Alpha climbs high
    await play(b.token, 'lost', 10, 25); // Bravo drops

    const res = await request(app).get('/api/leaderboard?community=1');
    expect(res.status).toBe(200);
    expect(res.body.entries[0].name).toBe('Alpha');
    expect(res.body.entries[0].rank).toBe(1);
    expect(res.body.entries[1].name).toBe('Bravo');
  });

  it('nearby slice centers on the authed user and flags isYou', async () => {
    const players = [];
    for (let i = 0; i < 5; i++) {
      const p = await player(`n${i}@vbc.test`, `Player${i}`);
      await setCommunity(p.token, 2);
      // staggered wins so elo differs
      await play(p.token, 'won', 21, 21 - i);
      players.push(p);
    }
    const me = players[2];
    const res = await request(app).get('/api/leaderboard?community=2&nearby=1').set(auth(me.token));
    expect(res.status).toBe(200);
    const you = res.body.entries.find((e) => e.isYou);
    expect(you).toBeTruthy();
    expect(you.userId).toBe(me.id);
    expect(res.body.entries.length).toBeLessThanOrEqual(5);
  });
});
