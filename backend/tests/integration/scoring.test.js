import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js';
import { pool } from '../../db.js';
import { resetDb, signup, makeTeam, ev, rally, rallies, fullMatchEvents } from '../helpers.js';

describe('scored matches', () => {
  let scorer, coach, other, A, B, match;

  beforeEach(async () => {
    await resetDb();
    scorer = await signup({ name: 'Sam Scorer', role: 'scorer' });
    coach = await signup({ name: 'Cara Coach', role: 'coach' });
    other = await signup({ name: 'Olly Other', role: 'scorer' });
    A = await makeTeam(coach, 'Tigers', 7);
    B = await makeTeam(coach, 'Sharks', 6);
    const res = await request(app).post('/api/matches').set(scorer.auth).send({ team_a_id: A.team.id, team_b_id: B.team.id, format: 'best_of_3' });
    expect(res.status).toBe(201);
    match = res.body.match;
  });
  afterAll(() => pool.end());

  const lineups = () => ({
    A: { starters: A.players.slice(0, 6).map((p) => p.user.id), bench: [A.players[6].user.id] },
    B: { starters: B.players.map((p) => p.user.id), bench: [] },
  });

  it('creates a scheduled match owned by the scorer with a normalised format', async () => {
    expect(match.status).toBe('scheduled');
    expect(match.scorer_id).toBe(scorer.user.id);
    expect(match.format.setsToWin).toBe(2);
    expect(match.teams.A.name).toBe('Tigers');
    const list = await request(app).get('/api/matches?scorer=me').set(scorer.auth);
    expect(list.body.matches.map((m) => m.id)).toContain(match.id);
    const otherList = await request(app).get('/api/matches?scorer=me').set(other.auth);
    expect(otherList.body.matches).toHaveLength(0);
  });

  it('rejects a team playing itself and unknown teams', async () => {
    const same = await request(app).post('/api/matches').set(scorer.auth).send({ team_a_id: A.team.id, team_b_id: A.team.id });
    expect(same.status).toBe(400);
    const missing = await request(app).post('/api/matches').set(scorer.auth).send({ team_a_id: A.team.id, team_b_id: 9999 });
    expect(missing.status).toBe(404);
  });

  it('sets lineups (validated) and starts the match with MATCH_START', async () => {
    const bad = await request(app).post(`/api/matches/${match.id}/lineups`).set(scorer.auth).send({ A: { starters: [] }, B: lineups().B });
    expect(bad.status).toBe(400);
    const ok = await request(app).post(`/api/matches/${match.id}/lineups`).set(scorer.auth).send(lineups());
    expect(ok.status).toBe(200);
    expect(ok.body.lineups.A.starters).toHaveLength(6);
    expect(ok.body.lineups.A.bench).toHaveLength(1);
    expect(ok.body.lineups.A.players[0].jersey_number).toBe(1);

    const forbidden = await request(app).post(`/api/matches/${match.id}/start`).set(other.auth).send({});
    expect(forbidden.status).toBe(403);

    const start = await request(app).post(`/api/matches/${match.id}/start`).set(scorer.auth).send({ servingTeam: 'B' });
    expect(start.status).toBe(200);
    expect(start.body.match.status).toBe('live');
    expect(start.body.match.state.serving).toBe('B');
    expect(start.body.match.state.rotation.A).toEqual(lineups().A.starters);
    expect(start.body.match.events[0].type).toBe('MATCH_START');
  });

  describe('event log', () => {
    beforeEach(async () => {
      await request(app).post(`/api/matches/${match.id}/lineups`).set(scorer.auth).send(lineups());
      await request(app).post(`/api/matches/${match.id}/start`).set(scorer.auth).send({});
    });

    it('appends rallies and actions, assigns seqs, and is idempotent on clientEventId', async () => {
      const batch = [rally('A', { actionType: 'kill', playerId: A.players[0].user.id }), ev('PLAYER_ACTION', { team: 'B', playerId: B.players[2].user.id, actionType: 'dig' }), rally('B')];
      const res = await request(app).post(`/api/matches/${match.id}/events`).set(scorer.auth).send({ events: batch });
      expect(res.status).toBe(200);
      expect(res.body.accepted.map((a) => a.seq)).toEqual([2, 3, 4]);
      expect(res.body.rejected).toHaveLength(0);
      expect(res.body.summary).toMatchObject({ scoreA: 1, scoreB: 1, serving: 'B' });

      // resend the same batch (offline retry) → same seqs, no double scoring
      const again = await request(app).post(`/api/matches/${match.id}/events`).set(scorer.auth).send({ events: batch });
      expect(again.body.accepted.every((a) => a.duplicate)).toBe(true);
      expect(again.body.summary).toMatchObject({ scoreA: 1, scoreB: 1 });

      const got = await request(app).get(`/api/matches/${match.id}`);
      expect(got.body.match.events).toHaveLength(4);
      expect(got.body.match.state.actions).toHaveLength(2);
      expect(got.body.match.last_seq).toBe(4);
    });

    it('rejects invalid events individually without losing valid ones', async () => {
      const res = await request(app)
        .post(`/api/matches/${match.id}/events`)
        .set(scorer.auth)
        .send({ events: [rally('A'), ev('RALLY_WON', { team: 'C' }), ev('SET_START'), { type: 'RALLY_WON', payload: { team: 'A' } }] });
      expect(res.status).toBe(200);
      expect(res.body.accepted).toHaveLength(1);
      expect(res.body.rejected).toHaveLength(3);
      const errors = res.body.rejected.map((r) => r.error).join(' | ');
      expect(errors).toMatch(/winning team/);
      expect(errors).toMatch(/previous set/);
      expect(errors).toMatch(/clientEventId/);
    });

    it('UNDO reverses the last rally on the server too', async () => {
      await request(app).post(`/api/matches/${match.id}/events`).set(scorer.auth).send({ events: [rally('A'), rally('A')] });
      const undo = await request(app).post(`/api/matches/${match.id}/events`).set(scorer.auth).send({ events: [ev('UNDO', { targetSeq: 3 })] });
      expect(undo.status).toBe(200);
      expect(undo.body.summary.scoreA).toBe(1);
      const bad = await request(app).post(`/api/matches/${match.id}/events`).set(scorer.auth).send({ events: [ev('UNDO', { targetSeq: 3 })] });
      expect(bad.body.rejected[0].error).toMatch(/Nothing to undo/);
    });

    it('forbids other scorers and serves the live diff to anonymous spectators', async () => {
      await request(app).post(`/api/matches/${match.id}/events`).set(scorer.auth).send({ events: rallies('A', 3) });
      const forbidden = await request(app).post(`/api/matches/${match.id}/events`).set(other.auth).send({ events: [rally('B')] });
      expect(forbidden.status).toBe(403);
      const anon = await request(app).post(`/api/matches/${match.id}/events`).send({ events: [rally('B')] });
      expect(anon.status).toBe(401);

      const live = await request(app).get(`/api/matches/${match.id}/live?after=2`);
      expect(live.status).toBe(200);
      expect(live.body.events.map((e) => e.seq)).toEqual([3, 4]);
      expect(live.body.lastSeq).toBe(4);
      expect(live.body.summary.scoreA).toBe(3);
      expect(live.body.teams.B.name).toBe('Sharks');
    });

    it('completes sets and the match, then blocks further scoring', async () => {
      const res = await request(app)
        .post(`/api/matches/${match.id}/events`)
        .set(scorer.auth)
        .send({ events: fullMatchEvents('B', { starterA: B.players[0].user.id, starterB: A.players[0].user.id }) });
      expect(res.body.rejected, JSON.stringify(res.body.rejected)).toHaveLength(0);
      expect(res.body.status).toBe('completed');
      expect(res.body.summary).toMatchObject({ setsA: 0, setsB: 2, winner: 'B' });
      const more = await request(app).post(`/api/matches/${match.id}/events`).set(scorer.auth).send({ events: [rally('A')] });
      expect(more.body.rejected[0].error).toMatch(/complete/);
    });
  });

  describe('submission', () => {
    beforeEach(async () => {
      await request(app).post(`/api/matches/${match.id}/lineups`).set(scorer.auth).send(lineups());
      await request(app).post(`/api/matches/${match.id}/start`).set(scorer.auth).send({});
    });

    it('refuses to submit an unfinished match with a clear error', async () => {
      await request(app).post(`/api/matches/${match.id}/events`).set(scorer.auth).send({ events: rallies('A', 5) });
      const res = await request(app).post(`/api/matches/${match.id}/submit`).set(scorer.auth).send({});
      expect(res.status).toBe(422);
      expect(res.body.details.errors[0]).toMatch(/not complete/);
    });

    it('writes stats, ratings (with reasons), badges and blocks double submission', async () => {
      const a1 = A.players[0].user.id;
      const b3 = B.players[2].user.id;
      await request(app).post(`/api/matches/${match.id}/events`).set(scorer.auth).send({ events: fullMatchEvents('A', { starterA: a1, starterB: b3 }) });

      const res = await request(app).post(`/api/matches/${match.id}/submit`).set(scorer.auth).send({});
      expect(res.status).toBe(200);
      expect(res.body.match.status).toBe('submitted');
      expect(res.body.match.winner_team_id).toBe(A.team.id);
      expect(res.body.match.sets_a).toBe(2);
      const star = res.body.stats.find((s) => s.playerId === a1);
      expect(star.kills).toBe(2);
      expect(star.aces).toBe(2);
      expect(star.points).toBe(4);
      const digger = res.body.stats.find((s) => s.playerId === b3);
      expect(digger.digs).toBe(2);
      const starRating = res.body.ratings.find((r) => r.playerId === a1);
      expect(starRating.delta).toBeGreaterThan(0);
      expect(starRating.reason).toMatch(/Won vs/);
      expect(res.body.ratings.find((r) => r.playerId === b3).delta).toBeLessThan(0);
      expect(res.body.newBadges[a1].map((b) => b.key)).toContain('scored_debut');

      // persisted
      const stats = await request(app).get(`/api/players/${a1}/stats`);
      expect(stats.body.career.matches).toBe(1);
      expect(stats.body.career.wins).toBe(1);
      expect(stats.body.career.kills).toBe(2);
      expect(stats.body.form).toEqual(['W']);
      expect(stats.body.skills.attack).toBeGreaterThan(0);
      const me = await request(app).get('/api/auth/me').set(A.players[0].auth);
      expect(me.body.user.elo).toBe(starRating.after);
      const events = await request(app).get(`/api/players/${a1}/rating-events`);
      expect(events.body.events[0].version).toBe('2.0.0');
      const box = await request(app).get(`/api/players/match/${match.id}/boxscore`);
      expect(box.body.boxscore).toHaveLength(13);

      const lb = await request(app).get('/api/players/leaderboard?metric=kills');
      expect(lb.body.entries[0].id).toBe(a1);
      const lbRating = await request(app).get('/api/players/leaderboard?metric=rating').set(A.players[0].auth);
      expect(lbRating.body.entries.find((e) => e.isYou).id).toBe(a1);

      const again = await request(app).post(`/api/matches/${match.id}/submit`).set(scorer.auth).send({});
      expect(again.status).toBe(409);

      const audit = await pool.query(`SELECT action FROM audit_log WHERE entity = 'match' AND entity_id = $1 ORDER BY id`, [String(match.id)]);
      expect(audit.rows.map((r) => r.action)).toEqual(expect.arrayContaining(['create', 'lineups', 'events', 'submit']));
    });

    it('surfaces warnings and requires confirmation instead of silently modifying data', async () => {
      // zero-point set for B → warning
      const events = [...rallies('A', 25), ev('SET_START'), ...rallies('A', 25)];
      await request(app).post(`/api/matches/${match.id}/events`).set(scorer.auth).send({ events });
      const res = await request(app).post(`/api/matches/${match.id}/submit`).set(scorer.auth).send({});
      expect(res.status).toBe(409);
      expect(res.body.details.needsConfirmation).toBe(true);
      expect(res.body.details.warnings.join(' ')).toMatch(/scored zero/);
      const ok = await request(app).post(`/api/matches/${match.id}/submit`).set(scorer.auth).send({ confirmWarnings: true });
      expect(ok.status).toBe(200);
      expect(ok.body.warnings.length).toBeGreaterThan(0);
    });
  });
});
