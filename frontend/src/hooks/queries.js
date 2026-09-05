import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  matchReportsApi,
  statsApi,
  badgesApi,
  leaderboardApi,
  communitiesApi,
  profileApi,
  matchesApi,
  teamsApi,
  tournamentsApi,
  playersApi,
  adminApi,
} from '../api/endpoints.js';

// ---- legacy player dashboard -------------------------------------------------
export function useMatches() {
  return useQuery({ queryKey: ['match-reports'], queryFn: () => matchReportsApi.list() });
}
export function useStats() {
  return useQuery({ queryKey: ['stats'], queryFn: () => statsApi.get() });
}
export function useBadges() {
  return useQuery({ queryKey: ['badges'], queryFn: () => badgesApi.list() });
}
export function useLeaderboard(params) {
  return useQuery({ queryKey: ['leaderboard', params], queryFn: () => leaderboardApi.get(params) });
}
export function useCommunities() {
  return useQuery({ queryKey: ['communities'], queryFn: () => communitiesApi.list() });
}
export function usePublicProfile(id) {
  return useQuery({ queryKey: ['publicProfile', id], queryFn: () => profileApi.public(id), enabled: Boolean(id) });
}
export function useRecordMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => matchReportsApi.create(body),
    onSuccess: () => {
      for (const key of ['match-reports', 'stats', 'badges', 'leaderboard']) qc.invalidateQueries({ queryKey: [key] });
    },
  });
}
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (body) => profileApi.update(body), onSuccess: () => qc.invalidateQueries({ queryKey: ['leaderboard'] }) });
}

// ---- scored matches ----------------------------------------------------------
export function useScoredMatches(params, opts = {}) {
  return useQuery({ queryKey: ['matches', params], queryFn: () => matchesApi.list(params), ...opts });
}
export function useScoredMatch(id, opts = {}) {
  return useQuery({ queryKey: ['match', String(id)], queryFn: () => matchesApi.get(id), enabled: Boolean(id), ...opts });
}
export function useBoxscore(id) {
  return useQuery({ queryKey: ['boxscore', String(id)], queryFn: () => matchesApi.boxscore(id), enabled: Boolean(id) });
}
export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys) => keys.forEach((k) => qc.invalidateQueries({ queryKey: Array.isArray(k) ? k : [k] }));
}

// ---- teams -------------------------------------------------------------------
export function useTeams(params) {
  return useQuery({ queryKey: ['teams', params], queryFn: () => teamsApi.list(params) });
}
export function useTeam(id) {
  return useQuery({ queryKey: ['team', String(id)], queryFn: () => teamsApi.get(id), enabled: Boolean(id) });
}
export function useTeamStats(id) {
  return useQuery({ queryKey: ['team-stats', String(id)], queryFn: () => teamsApi.stats(id), enabled: Boolean(id) });
}

// ---- tournaments -------------------------------------------------------------
export function useTournaments(params) {
  return useQuery({ queryKey: ['tournaments', params], queryFn: () => tournamentsApi.list(params) });
}
export function useTournament(id, opts = {}) {
  return useQuery({ queryKey: ['tournament', String(id)], queryFn: () => tournamentsApi.get(id), enabled: Boolean(id), ...opts });
}
export function useStandings(id, opts = {}) {
  return useQuery({ queryKey: ['standings', String(id)], queryFn: () => tournamentsApi.standings(id), enabled: Boolean(id), ...opts });
}
export function useBracket(id, opts = {}) {
  return useQuery({ queryKey: ['bracket', String(id)], queryFn: () => tournamentsApi.bracket(id), enabled: Boolean(id), ...opts });
}
export function useTournamentLeaders(id) {
  return useQuery({ queryKey: ['tournament-leaders', String(id)], queryFn: () => tournamentsApi.leaders(id), enabled: Boolean(id) });
}

// ---- players -----------------------------------------------------------------
export function usePlayerStats(id) {
  return useQuery({ queryKey: ['player-stats', String(id)], queryFn: () => playersApi.stats(id), enabled: Boolean(id) });
}
export function usePlayerMatches(id) {
  return useQuery({ queryKey: ['player-matches', String(id)], queryFn: () => playersApi.matches(id), enabled: Boolean(id) });
}
export function usePlayerRatingEvents(id) {
  return useQuery({ queryKey: ['player-rating-events', String(id)], queryFn: () => playersApi.ratingEvents(id), enabled: Boolean(id) });
}
export function usePlayerLeaderboard(params) {
  return useQuery({ queryKey: ['player-leaderboard', params], queryFn: () => playersApi.leaderboard(params) });
}
export function usePlayerSearch(q) {
  return useQuery({ queryKey: ['player-search', q], queryFn: () => playersApi.search(q), enabled: (q || '').length >= 2 });
}

// ---- admin -------------------------------------------------------------------
export function useAdminOverview() {
  return useQuery({ queryKey: ['admin-overview'], queryFn: () => adminApi.overview() });
}
export function useAdminUsers(q) {
  return useQuery({ queryKey: ['admin-users', q], queryFn: () => adminApi.users(q) });
}
export function useAdminMatches() {
  return useQuery({ queryKey: ['admin-matches'], queryFn: () => adminApi.matches() });
}
export function useAdminAudit(params) {
  return useQuery({ queryKey: ['admin-audit', params], queryFn: () => adminApi.audit(params) });
}
