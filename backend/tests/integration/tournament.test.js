// End-to-end workflow (spec §40): organizer creates tournament → teams register →
// schedule → scorer scores → submit → ratings/leaderboard/standings update →
// spectator sees results.
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js';
import { pool } from '../../db.js';
import { resetDb, signup, makeTeam, fullMatchEvents } from '../helpers.js';

describe('tournament workflow', () => {
  let organizer, scorer, coach, player, teams;

  beforeEach(async () => {
    await resetDb();
    organizer = await signup({ name: 'Ola Organizer', role: 'organizer' });
    scorer = await signup({ name: 'Sam Scorer', role: 'scorer' });
    coach = await signup({ name: 'Cara Coach', role: 'coach' });
    player = await signup({ name: 'Pat Player', role: 'player' });
    teams = [];
    for (const name of ['Aces', 'Blockers', 'Crushers', 'Diggers']) teams.push(await makeTeam(coach, name, 6));
  });
  afterAll(() => pool.end());

  it('runs the full workflow from creation to published standings and leaders', async () => {
    // 1. organizer creates a tournament (players cannot)
    const denied = await request(app).post('/api/tournaments').set(player.auth).send({ name: 'Nope' });
    expect(denied.status).toBe(403);
    const created = await request(app)
      .post('/api/tournaments')
      .set(organizer.auth)
      .send({ name: 'Summer Slam', starts_on: '2026-09-12', courts: 2, format: 'round_robin', level: 'regional', city: 'Austin', venue_name: 'Rec Center', setPoints: 21 });
    expect(created.status).toBe(201);
    const t = created.body.tournament;
    expect(t.status).toBe('draft');
    expect(t.courts).toHaveLength(2);
    expect(t.divisions).toHaveLength(1);
    expect(t.settings.setPoints).toBe(21);
    expect(t.venue_name).toBe('Rec Center');

    // drafts are hidden from the public list
    const publicList = await request(app).get('/api/tournaments');
    expect(publicList.body.tournaments).toHaveLength(0);
    const hidden = await request(app).get(`/api/tournaments/${t.id}`);
    expect(hidden.status).toBe(404);

    // 2. publish; teams register (coach → pending; organizer approves)
    const published = await request(app).post(`/api/tournaments/${t.id}/publish`).set(organizer.auth);
    expect(published.body.tournament.status).toBe('published');
    for (const { team } of teams) {
      const reg = await request(app).post(`/api/tournaments/${t.id}/register`).set(coach.auth).send({ team_id: team.id });
      expect(reg.status).toBe(201);
      expect(reg.body.registration.status).toBe('pending');
    }
    const stranger = await request(app).post(`/api/tournaments/${t.id}/register`).set(player.auth).send({ team_id: teams[0].team.id });
    expect(stranger.status).toBe(403);

    let detail = await request(app).get(`/api/tournaments/${t.id}`).set(organizer.auth);
    expect(detail.body.tournament.pending_count).toBe(4);
    for (const reg of detail.body.tournament.registrations) {
      const res = await request(app).patch(`/api/tournaments/${t.id}/registrations/${reg.id}`).set(organizer.auth).send({ status: 'approved' });
      expect(res.status).toBe(200);
    }
    const coachApprove = await request(app).patch(`/api/tournaments/${t.id}/registrations/${detail.body.tournament.registrations[0].id}`).set(coach.auth).send({ status: 'approved' });
    expect(coachApprove.status).toBe(403);

    // 3. generate the schedule (round robin of 4 → 6 matches over 2 courts)
    const divisionId = detail.body.tournament.divisions[0].id;
    const gen = await request(app).post(`/api/tournaments/${t.id}/divisions/${divisionId}/generate`).set(organizer.auth).send({});
    expect(gen.status).toBe(200);
    expect(gen.body.matches).toBe(6);
    const sched = await request(app).get(`/api/matches?tournament=${t.id}`);
    expect(sched.body.matches).toHaveLength(6);
    expect(new Set(sched.body.matches.map((m) => m.court_name))).toEqual(new Set(['Court 1', 'Court 2']));
    expect(sched.body.matches.every((m) => m.scheduled_at)).toBe(true);
    expect(sched.body.matches[0].format.setPoints).toBe(21);

    // 4. assign a scorer to the first match; the scorer sees it on their dashboard
    const first = sched.body.matches[0];
    const assign = await request(app).patch(`/api/matches/${first.id}`).set(organizer.auth).send({ scorer_id: scorer.user.id });
    expect(assign.status).toBe(200);
    const mine = await request(app).get('/api/matches?scorer=me').set(scorer.auth);
    expect(mine.body.matches.map((m) => m.id)).toEqual([first.id]);

    // 5–8. scorer sets lineups, starts, scores a full match, submits
    const teamOf = (id) => teams.find((x) => x.team.id === id);
    const tA = teamOf(first.team_a_id);
    const tB = teamOf(first.team_b_id);
    await request(app)
      .post(`/api/matches/${first.id}/lineups`)
      .set(scorer.auth)
      .send({ A: { starters: tA.players.map((p) => p.user.id), bench: [] }, B: { starters: tB.players.map((p) => p.user.id), bench: [] } });
    const start = await request(app).post(`/api/matches/${first.id}/start`).set(scorer.auth).send({});
    expect(start.body.match.status).toBe('live');
    const live = await request(app).get(`/api/tournaments/${t.id}`);
    expect(live.body.tournament.live_count).toBe(1);

    const scoreRes = await request(app)
      .post(`/api/matches/${first.id}/events`)
      .set(scorer.auth)
      .send({ events: fullMatchEvents('A', { starterA: tA.players[0].user.id, starterB: tB.players[0].user.id, setPoints: 21 }) });
    expect(scoreRes.body.rejected).toHaveLength(0);
    expect(scoreRes.body.status).toBe('completed');
    expect(scoreRes.body.summary.sets[0].scoreA).toBe(21); // tournament setting (21) applied to the match format

    const submit = await request(app).post(`/api/matches/${first.id}/submit`).set(scorer.auth).send({});
    expect(submit.status).toBe(200);
    expect(submit.body.ratings.find((r) => r.playerId === tA.players[0].user.id).reason).toMatch(/regional/);

    // 9–11. standings, leaderboard and tournament status update
    const standings = await request(app).get(`/api/tournaments/${t.id}/standings`);
    expect(standings.status).toBe(200);
    const rows = standings.body.standings[0].groups[0].rows;
    expect(rows[0].team.id).toBe(tA.team.id);
    expect(rows[0]).toMatchObject({ wins: 1, played: 1, setsWon: 2 });
    expect(standings.body.standings[0].groups[0].played).toBe(1);
    expect(standings.body.standings[0].groups[0].total).toBe(6);

    const lb = await request(app).get(`/api/players/leaderboard?metric=points&tournament=${t.id}`);
    expect(lb.body.entries[0].id).toBe(tA.players[0].user.id);
    const leaders = await request(app).get(`/api/tournaments/${t.id}/leaders`);
    expect(leaders.body.leaders.kills[0].id).toBe(tA.players[0].user.id);
    expect(leaders.body.leaders.mvp[0].team_name).toBe(tA.team.name);

    const after = await request(app).get(`/api/tournaments/${t.id}`);
    expect(after.body.tournament.status).toBe('live');
    expect(after.body.tournament.completed_count).toBe(1);

    // 12. spectator sees the final result on the live endpoint + team page
    const spectator = await request(app).get(`/api/matches/${first.id}/live`);
    expect(spectator.body.match.status).toBe('submitted');
    expect(spectator.body.summary.winner).toBe('A');
    const teamPage = await request(app).get(`/api/teams/${tA.team.id}`);
    expect(teamPage.body.team.wins).toBe(1);
    expect(teamPage.body.team.tournaments[0].name).toBe('Summer Slam');
    const teamStats = await request(app).get(`/api/teams/${tA.team.id}/stats`);
    expect(teamStats.body.players[0].kills).toBe(2);

    // organizer publishes results → completed
    const results = await request(app).post(`/api/tournaments/${t.id}/results`).set(organizer.auth);
    expect(results.body.tournament.status).toBe('completed');

    // schedule is now locked
    const regen = await request(app).post(`/api/tournaments/${t.id}/divisions/${divisionId}/generate`).set(organizer.auth).send({});
    expect(regen.status).toBe(409);
  });

  it('advances a single-elimination bracket automatically', async () => {
    const created = await request(app).post('/api/tournaments').set(organizer.auth).send({ name: 'Cup', format: 'single_elimination', courts: 1 });
    const t = created.body.tournament;
    for (const { team } of teams) await request(app).post(`/api/tournaments/${t.id}/register`).set(organizer.auth).send({ team_id: team.id });
    const gen = await request(app).post(`/api/tournaments/${t.id}/divisions/${t.divisions[0].id}/generate`).set(organizer.auth).send({});
    expect(gen.body.matches).toBe(3);
    let bracket = await request(app).get(`/api/tournaments/${t.id}/bracket`).set(organizer.auth);
    const semis = bracket.body.bracket[0].matches.filter((m) => m.bracket_round === 1);
    const final = bracket.body.bracket[0].matches.find((m) => m.bracket_type === 'final');
    expect(semis).toHaveLength(2);
    expect(final.team_a_id).toBeNull();

    const teamOf = (id) => teams.find((x) => x.team.id === id);
    for (const semi of semis) {
      const tA = teamOf(semi.team_a_id);
      const tB = teamOf(semi.team_b_id);
      await request(app)
        .post(`/api/matches/${semi.id}/lineups`)
        .set(organizer.auth)
        .send({ A: { starters: tA.players.map((p) => p.user.id), bench: [] }, B: { starters: tB.players.map((p) => p.user.id), bench: [] } });
      await request(app).post(`/api/matches/${semi.id}/start`).set(organizer.auth).send({});
      await request(app)
        .post(`/api/matches/${semi.id}/events`)
        .set(organizer.auth)
        .send({ events: fullMatchEvents('B', { starterA: tB.players[0].user.id, starterB: tA.players[0].user.id }) });
      const sub = await request(app).post(`/api/matches/${semi.id}/submit`).set(organizer.auth).send({});
      expect(sub.status).toBe(200);
    }
    bracket = await request(app).get(`/api/tournaments/${t.id}/bracket`).set(organizer.auth);
    const filledFinal = bracket.body.bracket[0].matches.find((m) => m.bracket_type === 'final');
    expect(filledFinal.team_a_id).toBe(semis[0].team_b_id);
    expect(filledFinal.team_b_id).toBe(semis[1].team_b_id);
  });

  it('supports password reset and role-aware profile updates', async () => {
    const forgot = await request(app).post('/api/auth/forgot').send({ email: player.user.email });
    expect(forgot.status).toBe(200);
    expect(forgot.body.devResetToken).toBeTruthy();
    const reset = await request(app).post('/api/auth/reset').send({ token: forgot.body.devResetToken, password: 'newpassword1' });
    expect(reset.status).toBe(200);
    const login = await request(app).post('/api/auth/login').send({ email: player.user.email, password: 'newpassword1' });
    expect(login.status).toBe(200);
    const reuse = await request(app).post('/api/auth/reset').send({ token: forgot.body.devResetToken, password: 'another123' });
    expect(reuse.status).toBe(400);

    const roleUp = await request(app).patch('/api/profile').set(player.auth).send({ role: 'scorer' });
    expect(roleUp.body.profile.role).toBe('scorer');
    const adminUp = await request(app).patch('/api/profile').set(player.auth).send({ role: 'admin' });
    expect(adminUp.status).toBe(400);
    const adminRoute = await request(app).get('/api/admin/overview').set(player.auth);
    expect(adminRoute.status).toBe(403);
    await pool.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [player.user.id]);
    const adminOk = await request(app).get('/api/admin/overview').set(player.auth);
    expect(adminOk.status).toBe(200);
    expect(adminOk.body.teams).toBe(4);
    const auditLog = await request(app).get('/api/admin/audit?entity=team').set(player.auth);
    expect(auditLog.body.entries.length).toBeGreaterThan(0);
  });
});
