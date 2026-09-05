import { describe, it, expect } from 'vitest';
import { createLocal, appendLocal, mergeServerEvents, applySyncResult, orderedEvents, outboxBatch, pendingEvents, saveLocal, loadLocal, listLocalMatches } from './matchStore.js';
import { deriveState } from '@engine/match.js';

const start = { clientEventId: 's', type: 'MATCH_START', payload: { servingTeam: 'A', lineups: { A: { starters: [1, 2, 3, 4, 5, 6], bench: [] }, B: { starters: [7, 8, 9, 10, 11, 12], bench: [] } } }, clientTs: 't0' };
const rally = (id, team) => ({ clientEventId: id, type: 'RALLY_WON', payload: { team }, clientTs: 't' });

describe('matchStore', () => {
  it('keeps pending events after the server log and assigns provisional seqs', () => {
    let data = createLocal(1, { format: 'best_of_3' });
    data = mergeServerEvents(data, [{ ...start, seq: 1 }], 1);
    data = appendLocal(data, rally('r1', 'A'));
    data = appendLocal(data, rally('r2', 'B'));
    const ordered = orderedEvents(data);
    expect(ordered.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(ordered.map((e) => e.provisional)).toEqual([false, true, true]);
    expect(pendingEvents(data)).toHaveLength(2);
    expect(deriveState('best_of_3', ordered).sets[0]).toMatchObject({ scoreA: 1, scoreB: 1 });
  });

  it('resolves UNDO targets by clientEventId so a rejected event cannot shift the target', () => {
    let data = createLocal(1, { format: 'best_of_3' });
    data = mergeServerEvents(data, [{ ...start, seq: 1 }], 1);
    data = appendLocal(data, rally('r1', 'A'));
    data = appendLocal(data, rally('r2', 'A'));
    data = appendLocal(data, { clientEventId: 'u', type: 'UNDO', payload: { targetSeq: 3, targetClientEventId: 'r2' }, clientTs: 't' });
    // server rejects r1 → r2 becomes seq 2, the UNDO must now target 2
    data = applySyncResult(data, { accepted: [{ clientEventId: 'r2', seq: 2 }], rejected: [{ clientEventId: 'r1', error: 'nope' }] });
    const ordered = orderedEvents(data);
    expect(ordered.map((e) => [e.clientEventId, e.seq])).toEqual([
      ['s', 1],
      ['r2', 2],
      ['u', 3],
    ]);
    expect(ordered[2].payload.targetSeq).toBe(2);
    expect(outboxBatch(data)).toEqual([expect.objectContaining({ clientEventId: 'u', payload: expect.objectContaining({ targetSeq: 2 }) })]);
    expect(deriveState('best_of_3', ordered).sets[0].scoreA).toBe(0);
  });

  it('merges a partial server diff without dropping earlier synced events', () => {
    let data = createLocal(1, { format: 'best_of_3' });
    data = mergeServerEvents(data, [{ ...start, seq: 1 }, { ...rally('r1', 'A'), seq: 2 }], 2);
    data = appendLocal(data, rally('r2', 'B'));
    data = mergeServerEvents(data, [{ ...rally('r2', 'B'), seq: 3 }], 3);
    expect(data.events.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(pendingEvents(data)).toHaveLength(0);
    expect(data.serverSeq).toBe(3);
  });

  it('persists to and lists from storage', () => {
    const store = new Map();
    const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k), key: (i) => [...store.keys()][i], get length() { return store.size; } };
    let data = createLocal(42, { format: 'best_of_3', meta: { match: { id: 42 } } });
    data = appendLocal(data, start);
    expect(saveLocal(42, data, storage)).toBe(true);
    expect(loadLocal(42, storage).events).toHaveLength(1);
    expect(listLocalMatches(storage)).toEqual([expect.objectContaining({ matchId: '42', pending: 1 })]);
  });
});
