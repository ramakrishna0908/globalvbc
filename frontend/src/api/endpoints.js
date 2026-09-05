import { api } from './client.js';

const data = (r) => r.data;

export const authApi = {
  register: (body) => api.post('/auth/register', body).then(data),
  login: (body) => api.post('/auth/login', body).then(data),
  me: () => api.get('/auth/me').then((r) => r.data.user),
  forgot: (email) => api.post('/auth/forgot', { email }).then(data),
  reset: (body) => api.post('/auth/reset', body).then(data),
};

export const profileApi = {
  get: () => api.get('/profile').then((r) => r.data.profile),
  update: (body) => api.patch('/profile', body).then((r) => r.data.profile),
  public: (id) => api.get(`/profile/${id}`).then((r) => r.data.profile),
};

/** Legacy self-reported match results (player dashboard "Record Match"). */
export const matchReportsApi = {
  list: (params) => api.get('/match-reports', { params }).then((r) => r.data.matches),
  create: (body) => api.post('/match-reports', body).then(data),
};
export const matchesApi_legacy = matchReportsApi;

export const statsApi = { get: () => api.get('/stats').then(data) };
export const badgesApi = { list: () => api.get('/badges').then((r) => r.data.badges) };
export const leaderboardApi = { get: (params) => api.get('/leaderboard', { params }).then(data) };
export const communitiesApi = { list: () => api.get('/communities').then((r) => r.data.communities) };

/** Scored matches (event-sourced). */
export const matchesApi = {
  list: (params) => api.get('/matches', { params }).then((r) => r.data.matches),
  get: (id) => api.get(`/matches/${id}`).then((r) => r.data.match),
  create: (body) => api.post('/matches', body).then((r) => r.data.match),
  update: (id, body) => api.patch(`/matches/${id}`, body).then((r) => r.data.match),
  lineups: (id, body) => api.post(`/matches/${id}/lineups`, body).then((r) => r.data.lineups),
  start: (id, body) => api.post(`/matches/${id}/start`, body).then((r) => r.data.match),
  events: (id, events) => api.post(`/matches/${id}/events`, { events }).then(data),
  eventsAfter: (id, after) => api.get(`/matches/${id}/events`, { params: { after } }).then((r) => r.data.events),
  live: (id, after = 0) => api.get(`/matches/${id}/live`, { params: { after } }).then(data),
  submit: (id, body) => api.post(`/matches/${id}/submit`, body || {}).then(data),
  boxscore: (id) => api.get(`/players/match/${id}/boxscore`).then((r) => r.data.boxscore),
};

export const teamsApi = {
  list: (params) => api.get('/teams', { params }).then((r) => r.data.teams),
  get: (id) => api.get(`/teams/${id}`).then((r) => r.data.team),
  stats: (id) => api.get(`/teams/${id}/stats`).then(data),
  create: (body) => api.post('/teams', body).then((r) => r.data.team),
  update: (id, body) => api.patch(`/teams/${id}`, body).then((r) => r.data.team),
  addMember: (id, body) => api.post(`/teams/${id}/members`, body).then((r) => r.data.team),
  removeMember: (id, userId) => api.delete(`/teams/${id}/members/${userId}`).then((r) => r.data.team),
};

export const tournamentsApi = {
  list: (params) => api.get('/tournaments', { params }).then((r) => r.data.tournaments),
  get: (id) => api.get(`/tournaments/${id}`).then((r) => r.data.tournament),
  create: (body) => api.post('/tournaments', body).then((r) => r.data.tournament),
  update: (id, body) => api.patch(`/tournaments/${id}`, body).then((r) => r.data.tournament),
  remove: (id) => api.delete(`/tournaments/${id}`),
  publish: (id) => api.post(`/tournaments/${id}/publish`).then((r) => r.data.tournament),
  publishResults: (id) => api.post(`/tournaments/${id}/results`).then((r) => r.data.tournament),
  addCourt: (id, body) => api.post(`/tournaments/${id}/courts`, body || {}).then((r) => r.data.tournament),
  removeCourt: (id, courtId) => api.delete(`/tournaments/${id}/courts/${courtId}`).then((r) => r.data.tournament),
  addDivision: (id, body) => api.post(`/tournaments/${id}/divisions`, body).then((r) => r.data.tournament),
  generate: (id, divisionId, body) => api.post(`/tournaments/${id}/divisions/${divisionId}/generate`, body || {}).then(data),
  register: (id, body) => api.post(`/tournaments/${id}/register`, body).then((r) => r.data.registration),
  updateRegistration: (id, regId, body) => api.patch(`/tournaments/${id}/registrations/${regId}`, body).then((r) => r.data.registration),
  standings: (id) => api.get(`/tournaments/${id}/standings`).then((r) => r.data.standings),
  bracket: (id) => api.get(`/tournaments/${id}/bracket`).then((r) => r.data.bracket),
  leaders: (id) => api.get(`/tournaments/${id}/leaders`).then((r) => r.data.leaders),
};

export const playersApi = {
  search: (q) => api.get('/players/search', { params: { q } }).then((r) => r.data.players),
  stats: (id) => api.get(`/players/${id}/stats`).then(data),
  matches: (id, params) => api.get(`/players/${id}/matches`, { params }).then((r) => r.data.matches),
  ratingEvents: (id, params) => api.get(`/players/${id}/rating-events`, { params }).then((r) => r.data.events),
  leaderboard: (params) => api.get('/players/leaderboard', { params }).then(data),
};

export const adminApi = {
  overview: () => api.get('/admin/overview').then(data),
  users: (q) => api.get('/admin/users', { params: { q } }).then((r) => r.data.users),
  setRole: (id, role, reason) => api.patch(`/admin/users/${id}`, { role, reason }).then((r) => r.data.user),
  matches: () => api.get('/admin/matches').then((r) => r.data.matches),
  audit: (params) => api.get('/admin/audit', { params }).then((r) => r.data.entries),
};
