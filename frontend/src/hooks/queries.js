import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchesApi, statsApi, badgesApi, leaderboardApi, communitiesApi, profileApi } from '../api/endpoints.js';

export function useMatches() {
  return useQuery({ queryKey: ['matches'], queryFn: () => matchesApi.list() });
}

export function useStats() {
  return useQuery({ queryKey: ['stats'], queryFn: () => statsApi.get() });
}

export function useBadges() {
  return useQuery({ queryKey: ['badges'], queryFn: () => badgesApi.list() });
}

export function useLeaderboard(params) {
  return useQuery({
    queryKey: ['leaderboard', params],
    queryFn: () => leaderboardApi.get(params),
  });
}

export function useCommunities() {
  return useQuery({ queryKey: ['communities'], queryFn: () => communitiesApi.list() });
}

export function usePublicProfile(id) {
  return useQuery({
    queryKey: ['publicProfile', id],
    queryFn: () => profileApi.public(id),
    enabled: Boolean(id),
  });
}

export function useRecordMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => matchesApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matches'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['badges'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => profileApi.update(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaderboard'] }),
  });
}
