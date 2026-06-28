import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js';
import { resetDb } from '../helpers.js';
import { pool } from '../../db.js';

const creds = { email: 'sarah@vbc.test', password: 'spike123!', name: 'Sarah Setter' };

describe('auth', () => {
  beforeEach(resetDb);
  afterAll(() => pool.end());

  it('registers, logs in, and returns the current user', async () => {
    const reg = await request(app).post('/api/auth/register').send(creds);
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();
    expect(reg.body.user.email).toBe(creds.email);
    expect(reg.body.user.elo).toBe(1000);
    expect(reg.body.user.password_hash).toBeUndefined();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: creds.password });
    expect(login.status).toBe(200);
    const token = login.body.token;

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(creds.email);
  });

  it('rejects bad credentials with 401', async () => {
    await request(app).post('/api/auth/register').send(creds);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send(creds);
    const res = await request(app).post('/api/auth/register').send(creds);
    expect(res.status).toBe(409);
  });

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
