// The scorer's session for one match: local-first event log, optimistic state
// via the shared engine, outbox sync with retry, and connection status.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { deriveState, validateEvent, lastUndoableSeq, summarize } from '@engine/match.js';
import { matchesApi } from '../api/endpoints.js';
import {
  uuid,
  loadLocal,
  saveLocal,
  createLocal,
  mergeServerEvents,
  applySyncResult,
  orderedEvents,
  outboxBatch,
  appendLocal,
  pendingEvents,
} from './matchStore.js';

const BACKOFF = [1000, 2000, 4000, 8000, 15000, 30000];

/**
 * @param {string|number} matchId
 * @returns {{
 *   match: object|null, state: object|null, summary: object|null, events: Array,
 *   connection: 'online'|'offline'|'syncing', pending: number, loading: boolean, error: string|null,
 *   dispatch: (type: string, payload?: object) => {ok: boolean, error?: string},
 *   undoLast: () => {ok: boolean, error?: string}, undoSeq: (seq:number) => {ok:boolean,error?:string},
 *   refresh: () => Promise<void>, syncNow: () => Promise<void>, canUndo: boolean, lastError: string|null
 * }}
 */
export function useMatchSession(matchId) {
  const [data, setData] = useState(() => (matchId ? loadLocal(matchId) : null));
  const [match, setMatch] = useState(() => data?.meta?.match || null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const dataRef = useRef(data);
  const syncingRef = useRef(false);
  const retryRef = useRef({ attempt: 0, timer: null });
  const mountedRef = useRef(true);

  const commit = useCallback((next) => {
    dataRef.current = next;
    setData(next);
    if (next) saveLocal(next.matchId, next);
  }, []);

  // ---- initial load: local cache first, then reconcile with the server
  const refresh = useCallback(async () => {
    if (!matchId) return;
    try {
      const m = await matchesApi.get(matchId);
      const base = dataRef.current || createLocal(matchId, { format: m.format });
      const merged = mergeServerEvents({ ...base, format: m.format, meta: { ...base.meta, match: stripMatch(m) } }, m.events || [], m.last_seq);
      commit(merged);
      setMatch(stripMatch(m));
      setOnline(true);
      setError(null);
    } catch (err) {
      if (!err.response) setOnline(false);
      if (!dataRef.current) setError(err.response?.data?.error || 'Could not load match');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [matchId, commit]);

  useEffect(() => {
    mountedRef.current = true;
    dataRef.current = matchId ? loadLocal(matchId) : null;
    setData(dataRef.current);
    setMatch(dataRef.current?.meta?.match || null);
    setLoading(!dataRef.current);
    refresh();
    return () => {
      mountedRef.current = false;
      clearTimeout(retryRef.current.timer);
    };
  }, [matchId, refresh]);

  // ---- connectivity
  useEffect(() => {
    const up = () => {
      setOnline(true);
      retryRef.current.attempt = 0;
      syncNow();
    };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- sync loop
  const syncNow = useCallback(async () => {
    const current = dataRef.current;
    if (!current || syncingRef.current) return;
    const batch = outboxBatch(current);
    if (!batch.length) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const res = await matchesApi.events(current.matchId, batch);
      const next = applySyncResult(dataRef.current, res);
      commit(next);
      if (res.rejected?.length) {
        setLastError(`${res.rejected.length} event(s) rejected by server: ${res.rejected[0].error}`);
      }
      setOnline(true);
      retryRef.current.attempt = 0;
      // anything still pending (appended during the request) → go again
      if (outboxBatch(dataRef.current).length) setTimeout(() => syncNow(), 50);
    } catch (err) {
      if (err.response && err.response.status < 500) {
        // Authoritative rejection of the whole batch (403/409…): keep local data, surface error.
        setLastError(err.response.data?.error || `Sync failed (${err.response.status})`);
        retryRef.current.attempt = 0;
      } else {
        setOnline(false);
        const attempt = retryRef.current.attempt;
        retryRef.current.attempt = Math.min(attempt + 1, BACKOFF.length - 1);
        clearTimeout(retryRef.current.timer);
        retryRef.current.timer = setTimeout(() => {
          if (mountedRef.current) syncNow();
        }, BACKOFF[attempt]);
      }
    } finally {
      syncingRef.current = false;
      if (mountedRef.current) setSyncing(false);
    }
  }, [commit]);

  // ---- derived state (pure reducer; memoised on the log)
  const ordered = useMemo(() => (data ? orderedEvents(data) : []), [data]);
  const state = useMemo(() => {
    if (!data?.format) return null;
    try {
      return deriveState(data.format, ordered, { lenient: true });
    } catch {
      return null;
    }
  }, [data?.format, ordered]);
  const summary = useMemo(() => (state ? summarize(state) : null), [state]);

  // ---- dispatch (optimistic: <16ms, never blocked by the network)
  const dispatch = useCallback(
    (type, payload = {}) => {
      const current = dataRef.current;
      if (!current || !state) return { ok: false, error: 'Match not loaded' };
      const event = { clientEventId: uuid(), type, payload, clientTs: new Date().toISOString() };
      const err = validateEvent(state, { ...event, seq: (current.serverSeq || 0) + ordered.filter((e) => e.provisional).length + 1 });
      if (err) {
        setLastError(err);
        return { ok: false, error: err };
      }
      commit(appendLocal(current, event));
      setLastError(null);
      if (online) setTimeout(() => syncNow(), 0);
      return { ok: true, event };
    },
    [state, ordered, commit, online, syncNow]
  );

  const undoSeq = useCallback(
    (targetSeq) => {
      const target = ordered.find((e) => e.seq === targetSeq);
      if (!target) return { ok: false, error: 'Nothing to undo' };
      return dispatch('UNDO', { targetSeq, targetClientEventId: target.clientEventId });
    },
    [ordered, dispatch]
  );

  const lastSeq = useMemo(() => lastUndoableSeq(ordered), [ordered]);
  const undoLast = useCallback(() => (lastSeq ? undoSeq(lastSeq) : { ok: false, error: 'Nothing to undo' }), [lastSeq, undoSeq]);

  const pending = data ? pendingEvents(data).length : 0;
  const connection = !online ? 'offline' : syncing || pending > 0 ? 'syncing' : 'online';

  return {
    match,
    state,
    summary,
    events: ordered,
    connection,
    online,
    pending,
    loading,
    error,
    lastError,
    clearLastError: () => setLastError(null),
    dispatch,
    undoLast,
    undoSeq,
    canUndo: lastSeq != null,
    refresh,
    syncNow,
  };
}

function stripMatch(m) {
  // eslint-disable-next-line no-unused-vars
  const { events, state, summary, ...rest } = m;
  return rest;
}
