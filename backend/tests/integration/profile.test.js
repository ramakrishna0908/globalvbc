import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js';
import { resetDb } from '../helpers.js';
import { pool } from '../../db.js';

async function newPlayer() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: `p${Math.floor(performance.now() * 1000)}@vbc.test`, password: 'spike123!', name: 'Mike Middle' });
  return { token: res.body.token, user: res.body.user };
}

describe('profile', () => {
  beforeEach(resetDb);
  afterAll(() => pool.end());

  it('updates profile and flips profile_complete when photo + position present', async () => {
    const { token, user } = await newPlayer();
    expect(user.profile_complete).toBe(false);

    const res = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ photo_url: 'https://img/x.png', position: 'middle_blocker' });

    expect(res.status).toBe(200);
    expect(res.body.profile.position).toBe('middle_blocker');
    expect(res.body.profile.profile_complete).toBe(true);
  });

  it('rejects an invalid position', async () => {
    const { token } = await newPlayer();
    const res = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ position: 'goalkeeper' });
    expect(res.status).toBe(400);
  });

  it('public profile omits email', async () => {
    const { user } = await newPlayer();
    const res = await request(app).get(`/api/profile/${user.id}`);
    expect(res.status).toBe(200);
    expect(res.body.profile.name).toBe('Mike Middle');
    expect(res.body.profile.email).toBeUndefined();
  });
});
