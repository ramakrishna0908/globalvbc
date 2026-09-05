import request from 'supertest';
import { query } from '../db.js';
import { app } from '../server.js';

export async function resetDb() {
  // Truncate user-generated data only; keep seeded reference data
  // (communities, badges) so FKs and badge rules stay intact across tests.
  await query(
    'TRUNCATE notifications, audit_log, rating_events, player_match_stats, match_events, match_lineups, matches, pool_teams, pools, tournament_registrations, divisions, courts, tournaments, venues, team_members, teams, password_resets, user_badges, rating_history, player_match_reports, skill_stats, users RESTART IDENTITY CASCADE'
  );
}

let counter = 0;

/** Register a user with a role; returns { token, user, auth } */
export async function signup({ name, role = 'player', email } = {}) {
  counter += 1;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: email || `user${counter}@vbc.test`, password: 'volleyball123', name: name || `User ${counter}`, role });
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token, user: res.body.user, auth: { Authorization: `Bearer ${res.body.token}` } };
}

export const as = (token) => ({ Authorization: `Bearer ${token}` });

/** Create a team with `size` players (returns { team, players }) */
export async function makeTeam(coach, name, size = 6) {
  const created = await request(app).post('/api/teams').set(coach.auth).send({ name });
  if (created.status !== 201) throw new Error(`team failed: ${JSON.stringify(created.body)}`);
  const team = created.body.team;
  const players = [];
  for (let i = 0; i < size; i++) {
    const p = await signup({ name: `${name} P${i + 1}` });
    await request(app).post(`/api/teams/${team.id}/members`).set(coach.auth).send({ user_id: p.user.id, jersey_number: i + 1 });
    players.push(p);
  }
  return { team, players };
}

let evt = 0;
export const ev = (type, payload = {}) => ({ clientEventId: `c-${++evt}-${Math.random().toString(36).slice(2, 8)}`, type, payload, clientTs: new Date().toISOString() });
export const rally = (team, extra = {}) => ev('RALLY_WON', { team, ...extra });
export const rallies = (team, n) => Array.from({ length: n }, () => rally(team));

/**
 * Score a full best-of-3 2–0 for team `winner` (setPoints–10 each set) with a
 * kill + ace for `starterA` (on the winning side) and two digs for `starterB`.
 */
export function fullMatchEvents(winner = 'A', { starterA, starterB, setPoints = 25 } = {}) {
  const loser = winner === 'A' ? 'B' : 'A';
  const setEvents = () => [
    rally(winner, { actionType: 'kill', playerId: starterA }),
    ev('PLAYER_ACTION', { team: loser, playerId: starterB, actionType: 'dig' }),
    ...rallies(winner, setPoints - 5),
    ...rallies(loser, 10),
    rally(winner, { actionType: 'ace', playerId: starterA }),
    ...rallies(winner, 3),
  ];
  return [...setEvents(), ev('SET_START'), ...setEvents()];
}
