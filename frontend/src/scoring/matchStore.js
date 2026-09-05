// Offline-first local store for a match's event log.
//
// Shape persisted under `gvbc-match:<id>`:
//   { matchId, format, meta, events: [{clientEventId, type, payload, clientTs, seq?}], serverSeq, savedAt }
// Events with a `seq` have been accepted by the server; events without one are
// pending in the outbox. Ordering for state derivation is: server events by
// seq, then pending events in local insertion order with provisional seqs.

const PREFIX = 'gvbc-match:';

export function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function storageKey(matchId) {
  return `${PREFIX}${matchId}`;
}

export function loadLocal(matchId, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(storageKey(matchId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocal(matchId, data, storage = globalThis.localStorage) {
  try {
    storage?.setItem(storageKey(matchId), JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export function clearLocal(matchId, storage = globalThis.localStorage) {
  try {
    storage?.removeItem(storageKey(matchId));
  } catch {
    /* ignore */
  }
}

/** All locally cached match ids (for the scorer dashboard "unsynced" badge). */
export function listLocalMatches(storage = globalThis.localStorage) {
  const out = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(PREFIX)) {
        const data = loadLocal(key.slice(PREFIX.length), storage);
        if (data) out.push({ matchId: key.slice(PREFIX.length), pending: pendingEvents(data).length, savedAt: data.savedAt, meta: data.meta });
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

export function createLocal(matchId, { format, meta = {}, events = [], serverSeq = 0 } = {}) {
  return { matchId: String(matchId), format, meta, events, serverSeq };
}

export function pendingEvents(data) {
  return (data?.events || []).filter((e) => e.seq == null);
}

/**
 * Merge authoritative server events into the local log.
 * - Server events replace local ones with the same clientEventId (assigning seq).
 * - Local pending events not known to the server stay pending, after the server log.
 */
export function mergeServerEvents(data, serverEvents, serverLastSeq) {
  const byClientId = new Map();
  for (const e of data.events) if (e.clientEventId) byClientId.set(e.clientEventId, e);
  const server = [...serverEvents].sort((a, b) => a.seq - b.seq).map((e) => ({
    clientEventId: e.clientEventId,
    type: e.type,
    payload: e.payload || {},
    clientTs: e.ts || e.clientTs || null,
    seq: e.seq,
  }));
  const known = new Set(server.map((e) => e.clientEventId));
  // keep already-synced local events the server did not resend (partial diff)
  const syncedLocal = data.events.filter((e) => e.seq != null && !known.has(e.clientEventId));
  const merged = [...syncedLocal, ...server].sort((a, b) => a.seq - b.seq);
  const pending = data.events.filter((e) => e.seq == null && !known.has(e.clientEventId));
  const last = Math.max(serverLastSeq || 0, ...merged.map((e) => e.seq), 0);
  return { ...data, events: [...merged, ...pending], serverSeq: last };
}

/** Apply the server's response to a sync batch. */
export function applySyncResult(data, { accepted = [], rejected = [] }) {
  const seqByClient = new Map(accepted.map((a) => [a.clientEventId, a.seq]));
  const rejectedIds = new Set(rejected.map((r) => r.clientEventId));
  const events = data.events
    .filter((e) => !rejectedIds.has(e.clientEventId))
    .map((e) => (seqByClient.has(e.clientEventId) ? { ...e, seq: seqByClient.get(e.clientEventId) } : e));
  events.sort((a, b) => {
    if (a.seq != null && b.seq != null) return a.seq - b.seq;
    if (a.seq != null) return -1;
    if (b.seq != null) return 1;
    return 0;
  });
  const serverSeq = Math.max(data.serverSeq || 0, ...events.filter((e) => e.seq != null).map((e) => e.seq), 0);
  return { ...data, events, serverSeq };
}

/**
 * Ordered events with provisional seqs for pending ones, ready for
 * `deriveState`. Also rewrites UNDO targets that reference a clientEventId.
 */
export function orderedEvents(data) {
  let next = (data.serverSeq || 0) + 1;
  const seqByClient = new Map();
  const out = [];
  for (const e of data.events) {
    const seq = e.seq != null ? e.seq : next++;
    if (e.clientEventId) seqByClient.set(e.clientEventId, seq);
    let payload = e.payload || {};
    if (e.type === 'UNDO' && payload.targetClientEventId && seqByClient.has(payload.targetClientEventId)) {
      payload = { ...payload, targetSeq: seqByClient.get(payload.targetClientEventId) };
    }
    out.push({ ...e, seq, payload, provisional: e.seq == null });
  }
  return out;
}

/** Batch to send: pending events with UNDO targets resolved to server seqs when known. */
export function outboxBatch(data) {
  const ordered = orderedEvents(data);
  return ordered.filter((e) => e.provisional).map(({ provisional, seq, ...e }) => e); // eslint-disable-line no-unused-vars
}

export function appendLocal(data, event) {
  return { ...data, events: [...data.events, event] };
}
