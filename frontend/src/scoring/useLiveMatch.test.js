import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../api/endpoints.js', () => ({ matchesApi: { live: vi.fn() } }));

import { matchesApi } from '../api/endpoints.js';
import { useLiveMatch, STALE_AFTER_MS } from './useLiveMatch.js';

const lineups = { A: { starters: [1, 2, 3, 4, 5, 6], bench: [] }, B: { starters: [7, 8, 9, 10, 11, 12], bench: [] } };
const start = { seq: 1, type: 'MATCH_START', payload: { servingTeam: 'A', lineups } };
const rally = (seq, team) => ({ seq, type: 'RALLY_WON', payload: { team } });
const match = { id: 5, status: 'live', format: 'best_of_3', tournament_name: 'City Open' };
const teams = { A: { id: 1, name: 'Aces' }, B: { id: 2, name: 'Blockers' } };

describe('useLiveMatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    matchesApi.live.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads with after=0, then polls with after=lastSeq and appends new events', async () => {
    matchesApi.live
      .mockResolvedValueOnce({ match, teams, lineups: {}, events: [start, rally(2, 'A')], lastSeq: 2 })
      .mockResolvedValueOnce({ match, teams, lineups: {}, events: [rally(2, 'A'), rally(3, 'B')], lastSeq: 3 })
      .mockResolvedValue({ match, teams, lineups: {}, events: [], lastSeq: 3 });

    const { result, unmount } = renderHook(() => useLiveMatch(5, { intervalMs: 2500 }));
    expect(result.current.status).toBe('loading');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(matchesApi.live).toHaveBeenNthCalledWith(1, 5, 0);
    expect(result.current.status).toBe('live');
    expect(result.current.lastSeq).toBe(2);
    expect(result.current.state.sets[0]).toMatchObject({ scoreA: 1, scoreB: 0 });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(matchesApi.live).toHaveBeenNthCalledWith(2, 5, 2);
    // seq 2 was sent twice by the server; it must not be double-counted
    expect(result.current.events.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(result.current.lastSeq).toBe(3);
    expect(result.current.state.sets[0]).toMatchObject({ scoreA: 1, scoreB: 1 });
    expect(result.current.summary).toMatchObject({ scoreA: 1, scoreB: 1, serving: 'B' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(matchesApi.live).toHaveBeenNthCalledWith(3, 5, 3);
    unmount();
  });

  it('reports waiting before MATCH_START, final once submitted, and stops polling', async () => {
    matchesApi.live.mockResolvedValueOnce({ match: { ...match, status: 'scheduled' }, teams, lineups: {}, events: [], lastSeq: 0 });
    const { result, unmount } = renderHook(() => useLiveMatch(5, { intervalMs: 1000 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.status).toBe('waiting');

    matchesApi.live.mockResolvedValue({ match: { ...match, status: 'submitted' }, teams, lineups: {}, events: [start, rally(2, 'A')], lastSeq: 2 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.status).toBe('final');
    const calls = matchesApi.live.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(matchesApi.live.mock.calls.length).toBe(calls);
    unmount();
  });

  it('flags stale after repeated failures older than the threshold', async () => {
    matchesApi.live.mockResolvedValueOnce({ match, teams, lineups: {}, events: [start], lastSeq: 1 });
    const { result, unmount } = renderHook(() => useLiveMatch(5, { intervalMs: 1000 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.stale).toBe(false);
    matchesApi.live.mockRejectedValue(new Error('Network Error'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(STALE_AFTER_MS + 2000);
    });
    expect(result.current.stale).toBe(true);
    expect(result.current.status).toBe('live'); // keeps the last known score
    unmount();
  });
});
