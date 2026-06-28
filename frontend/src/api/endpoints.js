import { api } from './client.js';

export const authApi = {
  register: (body) => api.post('/auth/register', body).then((r) => r.data),
  login: (body) => api.post('/auth/login', body).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data.user),
};

export const profileApi = {
  get: () => api.get('/profile').then((r) => r.data.profile),
  update: (body) => api.patch('/profile', body).then((r) => r.data.profile),
  public: (id) => api.get(`/profile/${id}`).then((r) => r.data.profile),
};

export const matchesApi = {
  list: (params) => api.get('/matches', { params }).then((r) => r.data.matches),
  create: (body) => api.post('/matches', body).then((r) => r.data),
};

export const statsApi = {
  get: () => api.get('/stats').then((r) => r.data),
};

export const badgesApi = {
  list: () => api.get('/badges').then((r) => r.data.badges),
};

export const leaderboardApi = {
  get: (params) => api.get('/leaderboard', { params }).then((r) => r.data),
};

export const communitiesApi = {
  list: () => api.get('/communities').then((r) => r.data.communities),
};
