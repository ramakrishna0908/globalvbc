// Spectator polling hook: GET /matches/:id/live?after=lastSeq every few
// seconds, append new events, and fold them with the shared engine so the
// spectator's score always agrees with the scorer's.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { deriveState, summarize } from '@engine/match.js';
import { matchesApi } from '../api/endpoints.js';

/** A poll older than this (with nothing successful since) means "connection lost". */
export const STALE_AFTER_MS = 15000;

const TERMINAL = new Set(['submitted', 'cancelled']);

function mergeEvents(existing, incoming) {
  if (!incoming?.length) return existing;
  const seen = new Set(existing.map((e) => e.seq));
  const fresh = incoming.filter((e) => e.seq != null && !seen.has(e.seq));
  if (!fresh.length) return existing;
  return [...existing, ...fresh].sort((a, b) => a.seq - b.seq);
}

/**
 * @param {string|number} matchId
 * @param {{intervalMs?: number}} [opts]
 * @returns {{
 *   match: object|null, teams: object|null, lineups: object|null, events: Array,
 *   state: object|null, summary: object|null, lastSeq: number,
 *   status: 'loading'|'live'|'final'|'waiting'|'error', stale: boolean, error: any, refresh: () => Promise<void>
 * }}
 */
export function useLiveMatch(matchId, { intervalMs = 2500 } = {}) {
  const [data, setData] = useState({ match: null, teams: null, lineups: null, events: [], lastSeq: 0 });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [stale, setStale] = useState(false);

  const dataRef = useRef(data);
  const lastOkRef = useRef(0);
  const timerRef = useRef(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const commit = useCallback((next) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const poll = useCallback(
    async (after) => {
      if (!matchId || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const res = await matchesApi.live(matchId, after);
        if (!mountedRef.current) return;
        const prev = dataRef.current;
        const serverSeq = Number(res.lastSeq ?? res.match?.last_seq ?? 0);
        let events;
        if (after === 0) events = mergeEvents([], res.events || []);
        else if (serverSeq < prev.lastSeq) {
          // The log shrank (match reset by an organizer): refetch from scratch.
          inFlightRef.current = false;
          return poll(0);
        } else events = mergeEvents(prev.events, res.events || []);
        commit({
          match: res.match || prev.match,
          teams: res.teams || prev.teams,
          lineups: res.lineups || prev.lineups,
          events,
          lastSeq: Math.max(serverSeq, events.length ? events[events.length - 1].seq : 0),
        });
        lastOkRef.current = Date.now();
        setStale(false);
        setError(null);
        setLoaded(true);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err);
        if (lastOkRef.current && Date.now() - lastOkRef.current > STALE_AFTER_MS) setStale(true);
      } finally {
        inFlightRef.current = false;
      }
    },
    [matchId, commit]
  );

  const refresh = useCallback(() => poll(0), [poll]);

  const done = Boolean(data.match && TERMINAL.has(data.match.status));

  // ---- polling loop, paused while the tab is hidden and stopped once final
  useEffect(() => {
    mountedRef.current = true;
    const stop = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
    const start = () => {
      stop();
      if (done || (typeof document !== 'undefined' && document.hidden)) return;
      timerRef.current = setInterval(() => poll(dataRef.current.lastSeq), intervalMs);
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        poll(dataRef.current.lastSeq);
        start();
      }
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
    start();
    return () => {
      stop();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [poll, intervalMs, done]);

  // ---- initial load (and reload when the match id changes)
  useEffect(() => {
    mountedRef.current = true;
    commit({ match: null, teams: null, lineups: null, events: [], lastSeq: 0 });
    setLoaded(false);
    setError(null);
    setStale(false);
    lastOkRef.current = 0;
    poll(0);
    return () => {
      mountedRef.current = false;
    };
  }, [matchId, poll, commit]);

  const state = useMemo(() => {
    if (!data.match) return null;
    return deriveState(data.match.format || 'best_of_3', data.events, { lenient: true });
  }, [data.match, data.events]);
  const summary = useMemo(() => (state ? summarize(state) : null), [state]);

  let status = 'loading';
  if (!loaded && error) status = 'error';
  else if (loaded && data.match) {
    if (done || state?.status === 'complete') status = 'final';
    else if (!state || state.status === 'pending') status = 'waiting';
    else status = 'live';
  }

  return { match: data.match, teams: data.teams, lineups: data.lineups, events: data.events, state, summary, lastSeq: data.lastSeq, status, stale, error, refresh };
}

export default useLiveMatch;
