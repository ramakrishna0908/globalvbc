// Scored-match service — the append-only event log is the source of truth.
// State is derived with the shared engine (same code the scorer UI runs).
import { pool } from '../db.js';
import { HttpError, requireFields } from '../utils/validation.js';
import { audit } from './audit.js';
import { advanceAfterMatch } from './brackets.js';
import { evaluateBadges } from './badgeEngine.js';
import {
  deriveState,
  applyEvent,
  validateEvent,
  normalizeFormat,
  summarize,
  deriveStats,
  ratePlayers,
  displayScore,
  RATING_VERSION,
  STAT_COLUMNS,
} from '../../shared/engine/index.js';

const TEAM_FIELDS = 'id, name, slug, logo_url, elo';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------
export function canScore(match, userId, role) {
  if (role === 'admin') return true;
  if (match.scorer_id && Number(match.scorer_id) === Number(userId)) return true;
  if (match.created_by && Number(match.created_by) === Number(userId) && !match.scorer_id) return true;
  if (match.organizer_id && Number(match.organizer_id) === Number(userId)) return true;
  return false;
}

async function loadMatchRow(db, id, { lock = false } = {}) {
  const { rows } = await db.query(
    `SELECT m.*, t.organizer_id, t.name AS tournament_name, t.level AS tournament_level, t.status AS tournament_status,
            c.name AS court_name, d.name AS division_name
     FROM matches m
     LEFT JOIN tournaments t ON t.id = m.tournament_id
     LEFT JOIN courts c ON c.id = m.court_id
     LEFT JOIN divisions d ON d.id = m.division_id
     WHERE m.id = $1 ${lock ? 'FOR UPDATE OF m' : ''}`,
    [id]
  );
  if (!rows[0]) throw new HttpError(404, 'Match not found');
  return rows[0];
}

async function loadTeams(db, match) {
  const ids = [match.team_a_id, match.team_b_id].filter(Boolean);
  if (!ids.length) return { A: null, B: null };
  const { rows } = await db.query(`SELECT ${TEAM_FIELDS} FROM teams WHERE id = ANY($1::int[])`, [ids]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return { A: byId.get(match.team_a_id) || null, B: byId.get(match.team_b_id) || null };
}

async function loadLineups(db, matchId) {
  const { rows } = await db.query(
    `SELECT l.side, l.user_id, l.team_id, l.rotation_slot, l.position,
            COALESCE(l.jersey_number, tm.jersey_number, u.jersey_number) AS jersey_number,
            u.name, u.photo_url, u.elo
     FROM match_lineups l
     JOIN users u ON u.id = l.user_id
     LEFT JOIN team_members tm ON tm.team_id = l.team_id AND tm.user_id = l.user_id
     WHERE l.match_id = $1
     ORDER BY l.side, l.rotation_slot NULLS LAST, u.name`,
    [matchId]
  );
  const out = { A: { starters: [], bench: [], players: [] }, B: { starters: [], bench: [], players: [] } };
  for (const r of rows) {
    const side = out[r.side];
    side.players.push({
      id: r.user_id,
      name: r.name,
      photo_url: r.photo_url,
      jersey_number: r.jersey_number,
      position: r.position,
      rotation_slot: r.rotation_slot,
      elo: r.elo,
    });
    if (r.rotation_slot) side.starters.push(r.user_id);
    else side.bench.push(r.user_id);
  }
  return out;
}

async function loadEvents(db, matchId, after = 0) {
  const { rows } = await db.query(
    `SELECT seq, client_event_id, type, payload, client_ts, created_by, created_at
     FROM match_events WHERE match_id = $1 AND seq > $2 ORDER BY seq`,
    [matchId, after]
  );
  return rows.map(rowToEvent);
}

function rowToEvent(r) {
  return {
    seq: r.seq,
    clientEventId: r.client_event_id,
    type: r.type,
    payload: r.payload || {},
    ts: r.client_ts || r.created_at,
    createdBy: r.created_by,
  };
}

// ---------------------------------------------------------------------------
// Create / list / get
// ---------------------------------------------------------------------------
export async function createMatch(userId, role, body) {
  requireFields(body, ['team_a_id', 'team_b_id']);
  const teamA = num(body.team_a_id);
  const teamB = num(body.team_b_id);
  if (!teamA || !teamB) throw new HttpError(400, 'team_a_id and team_b_id must be numbers');
  if (teamA === teamB) throw new HttpError(400, 'A team cannot play itself');

  let format;
  try {
    format = normalizeFormat(body.format || 'best_of_3');
  } catch (err) {
    throw new HttpError(400, err.message);
  }

  let level = body.level || 'local';
  let tournament = null;
  if (body.tournament_id) {
    const { rows } = await pool.query('SELECT id, organizer_id, level, settings, status FROM tournaments WHERE id = $1', [body.tournament_id]);
    tournament = rows[0];
    if (!tournament) throw new HttpError(404, 'Tournament not found');
    level = tournament.level;
    if (!body.format && tournament.settings && Object.keys(tournament.settings).length) {
      format = normalizeFormat(tournament.settings);
    }
  }
  if (body.court_id) {
    const { rows } = await pool.query('SELECT id FROM courts WHERE id = $1', [body.court_id]);
    if (!rows[0]) throw new HttpError(404, 'Court not found');
  }
  const { rows: teamRows } = await pool.query('SELECT id FROM teams WHERE id = ANY($1::int[])', [[teamA, teamB]]);
  if (teamRows.length !== 2) throw new HttpError(404, 'One or both teams not found');

  const scorerId = body.scorer_id ? num(body.scorer_id) : role === 'scorer' ? userId : null;

  const { rows } = await pool.query(
    `INSERT INTO matches (tournament_id, division_id, court_id, team_a_id, team_b_id, scorer_id, created_by,
                          format, level, scheduled_at, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      body.tournament_id || null,
      body.division_id || null,
      body.court_id || null,
      teamA,
      teamB,
      scorerId,
      userId,
      JSON.stringify(format),
      level,
      body.scheduled_at || null,
      body.notes || null,
    ]
  );
  await audit(pool, { actorId: userId, entity: 'match', entityId: rows[0].id, action: 'create', after: rows[0] });
  return getMatch(rows[0].id);
}

export async function listMatches({ scorer, tournament, division, team, player, status, limit = 50, offset = 0, userId } = {}) {
  const params = [];
  const where = [];
  if (player) {
    // matches involving any team the player belongs to (or is in a lineup for)
    params.push(num(player));
    where.push(`(EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = $${params.length} AND tm.team_id IN (m.team_a_id, m.team_b_id))
      OR EXISTS (SELECT 1 FROM match_lineups l WHERE l.match_id = m.id AND l.user_id = $${params.length}))`);
  }
  if (scorer === 'me' && userId) {
    params.push(userId);
    where.push(`(m.scorer_id = $${params.length} OR (m.scorer_id IS NULL AND m.created_by = $${params.length}))`);
  } else if (scorer && scorer !== 'me') {
    params.push(num(scorer));
    where.push(`m.scorer_id = $${params.length}`);
  }
  if (tournament) {
    params.push(num(tournament));
    where.push(`m.tournament_id = $${params.length}`);
  }
  if (division) {
    params.push(num(division));
    where.push(`m.division_id = $${params.length}`);
  }
  if (team) {
    params.push(num(team));
    where.push(`(m.team_a_id = $${params.length} OR m.team_b_id = $${params.length})`);
  }
  if (status) {
    const statuses = String(status).split(',');
    params.push(statuses);
    where.push(`m.status = ANY($${params.length}::text[])`);
  }
  params.push(Math.min(Number(limit) || 50, 200), Number(offset) || 0);
  const { rows } = await pool.query(
    `SELECT m.id, m.status, m.scheduled_at, m.started_at, m.completed_at, m.submitted_at, m.tournament_id, m.division_id,
            m.court_id, m.scorer_id, m.created_by, m.team_a_id, m.team_b_id, m.sets_a, m.sets_b, m.points_a, m.points_b, m.winner_team_id,
            m.state_snapshot, m.last_seq, m.format, m.level, m.bracket_key, m.bracket_stage, m.bracket_round, m.bracket_type,
            m.pool_id, p.name AS pool_name,
            t.name AS tournament_name, c.name AS court_name, d.name AS division_name,
            ta.name AS team_a_name, ta.logo_url AS team_a_logo, tb.name AS team_b_name, tb.logo_url AS team_b_logo,
            s.name AS scorer_name
     FROM matches m
     LEFT JOIN tournaments t ON t.id = m.tournament_id
     LEFT JOIN courts c ON c.id = m.court_id
     LEFT JOIN divisions d ON d.id = m.division_id
     LEFT JOIN pools p ON p.id = m.pool_id
     LEFT JOIN teams ta ON ta.id = m.team_a_id
     LEFT JOIN teams tb ON tb.id = m.team_b_id
     LEFT JOIN users s ON s.id = m.scorer_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY CASE m.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END,
              m.scheduled_at NULLS LAST, m.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

export async function getMatch(id, { includeEvents = true } = {}) {
  const match = await loadMatchRow(pool, id);
  const [teams, lineups, events] = await Promise.all([
    loadTeams(pool, match),
    loadLineups(pool, id),
    includeEvents ? loadEvents(pool, id) : Promise.resolve([]),
  ]);
  const state = deriveState(match.format, events, { lenient: true });
  return {
    ...match,
    teams,
    lineups,
    events,
    state,
    summary: summarize(state),
  };
}

// ---------------------------------------------------------------------------
// Lineups + start
// ---------------------------------------------------------------------------
export async function setLineups(id, userId, role, body) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const match = await loadMatchRow(client, id, { lock: true });
    if (!canScore(match, userId, role)) throw new HttpError(403, 'Not allowed to edit this match');
    if (match.status === 'submitted' || match.status === 'cancelled') throw new HttpError(409, `Match is ${match.status}`);
    const before = await loadLineups(client, id);
    await client.query('DELETE FROM match_lineups WHERE match_id = $1', [id]);
    for (const side of ['A', 'B']) {
      const team = body[side];
      if (!team) throw new HttpError(400, `Missing lineup for team ${side}`);
      const teamId = side === 'A' ? match.team_a_id : match.team_b_id;
      const starters = (team.starters || []).map(num).filter(Boolean);
      const bench = (team.bench || []).map(num).filter(Boolean);
      if (new Set([...starters, ...bench]).size !== starters.length + bench.length) {
        throw new HttpError(400, `Duplicate player in team ${side} lineup`);
      }
      if (starters.length > 6) throw new HttpError(400, `Team ${side} cannot have more than 6 starters`);
      if (starters.length === 0) throw new HttpError(400, `Team ${side} needs at least one starter`);
      const all = [...starters, ...bench];
      const { rows } = await client.query('SELECT id FROM users WHERE id = ANY($1::int[])', [all]);
      if (rows.length !== all.length) throw new HttpError(400, `Unknown player in team ${side} lineup`);
      const { rows: tm } = await client.query('SELECT user_id, jersey_number, position FROM team_members WHERE team_id = $1', [teamId]);
      const member = new Map(tm.map((m) => [m.user_id, m]));
      for (let i = 0; i < starters.length; i++) {
        const m = member.get(starters[i]);
        await client.query(
          `INSERT INTO match_lineups (match_id, team_id, user_id, side, jersey_number, position, rotation_slot)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [id, teamId, starters[i], side, m?.jersey_number ?? null, m?.position ?? null, i + 1]
        );
      }
      for (const uid of bench) {
        const m = member.get(uid);
        await client.query(
          `INSERT INTO match_lineups (match_id, team_id, user_id, side, jersey_number, position, rotation_slot)
           VALUES ($1,$2,$3,$4,$5,$6,NULL)`,
          [id, teamId, uid, side, m?.jersey_number ?? null, m?.position ?? null]
        );
      }
    }
    await client.query('UPDATE matches SET updated_at = now() WHERE id = $1', [id]);
    const after = await loadLineups(client, id);
    await audit(client, { actorId: userId, entity: 'match', entityId: id, action: 'lineups', before, after });
    await client.query('COMMIT');
    return after;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function startMatch(id, userId, role, body = {}) {
  const lineups = await loadLineups(pool, id);
  const servingTeam = body.servingTeam === 'B' ? 'B' : 'A';
  const event = {
    clientEventId: body.clientEventId || `start-${id}-${Date.now()}`,
    type: 'MATCH_START',
    payload: {
      servingTeam,
      lineups: { A: { starters: lineups.A.starters, bench: lineups.A.bench }, B: { starters: lineups.B.starters, bench: lineups.B.bench } },
    },
    clientTs: body.clientTs || new Date().toISOString(),
  };
  const result = await appendEvents(id, userId, role, [event]);
  if (result.rejected.length) throw new HttpError(409, result.rejected[0].error);
  return getMatch(id);
}

// ---------------------------------------------------------------------------
// Event log (idempotent, validated, ordered)
// ---------------------------------------------------------------------------
/**
 * Append a batch of events. Duplicate clientEventIds are acknowledged with
 * their existing seq (never double-scored). Invalid events are rejected
 * individually; the rest of the batch still commits.
 */
export async function appendEvents(id, userId, role, events) {
  if (!Array.isArray(events) || events.length === 0) throw new HttpError(400, 'events must be a non-empty array');
  if (events.length > 500) throw new HttpError(400, 'Batch too large (max 500)');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const match = await loadMatchRow(client, id, { lock: true });
    if (!canScore(match, userId, role)) throw new HttpError(403, 'Not allowed to score this match');
    if (match.status === 'submitted') throw new HttpError(409, 'Match already submitted');
    if (match.status === 'cancelled') throw new HttpError(409, 'Match is cancelled');

    const existing = await loadEvents(client, id);
    const byClientId = new Map(existing.map((e) => [e.clientEventId, e.seq]));
    let state = deriveState(match.format, existing, { lenient: true });
    let log = existing.slice();
    let lastSeq = existing.length ? existing[existing.length - 1].seq : 0;

    const accepted = [];
    const rejected = [];
    const ordered = events.map((e, i) => ({ e, i })).sort((x, y) => {
      const tx = Date.parse(x.e.clientTs || x.e.ts || '') || 0;
      const ty = Date.parse(y.e.clientTs || y.e.ts || '') || 0;
      return tx - ty || x.i - y.i;
    });

    for (const { e } of ordered) {
      const clientEventId = String(e.clientEventId || '');
      if (!clientEventId) {
        rejected.push({ clientEventId: null, error: 'clientEventId is required' });
        continue;
      }
      if (byClientId.has(clientEventId)) {
        accepted.push({ clientEventId, seq: byClientId.get(clientEventId), duplicate: true });
        continue;
      }
      const event = { type: e.type, payload: e.payload || {}, ts: e.clientTs || e.ts || null };
      if (event.type === 'MATCH_START' && (!event.payload.lineups || !event.payload.lineups.A)) {
        const lineups = await loadLineups(client, id);
        event.payload = {
          ...event.payload,
          lineups: { A: { starters: lineups.A.starters, bench: lineups.A.bench }, B: { starters: lineups.B.starters, bench: lineups.B.bench } },
        };
      }
      const err = validateEvent(state, event);
      if (err) {
        rejected.push({ clientEventId, error: err });
        continue;
      }
      const seq = lastSeq + 1;
      const withSeq = { ...event, seq, clientEventId };
      if (event.type === 'UNDO') {
        log = [...log, withSeq];
        state = deriveState(match.format, log, { lenient: true });
      } else {
        try {
          state = applyEvent(state, withSeq);
          log = [...log, withSeq];
        } catch (applyErr) {
          rejected.push({ clientEventId, error: applyErr.message });
          continue;
        }
      }
      lastSeq = seq;
      await client.query(
        `INSERT INTO match_events (match_id, seq, client_event_id, type, payload, client_ts, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, seq, clientEventId, event.type, JSON.stringify(event.payload), event.ts, userId]
      );
      byClientId.set(clientEventId, seq);
      accepted.push({ clientEventId, seq, duplicate: false });
      if (event.type === 'MATCH_START' && !(await client.query('SELECT 1 FROM match_lineups WHERE match_id = $1 LIMIT 1', [id])).rowCount) {
        await persistLineupsFromPayload(client, match, event.payload.lineups);
      }
    }

    const summary = summarize(state);
    const status = state.status === 'complete' ? 'completed' : state.status === 'pending' ? match.status : 'live';
    const pointsA = state.sets.reduce((s, x) => s + x.scoreA, 0);
    const pointsB = state.sets.reduce((s, x) => s + x.scoreB, 0);
    await client.query(
      `UPDATE matches SET state_snapshot = $1, last_seq = $2, sets_a = $3, sets_b = $4, points_a = $5, points_b = $6,
        status = $7,
        started_at = COALESCE(started_at, CASE WHEN $7 IN ('live','completed') THEN now() END),
        completed_at = CASE WHEN $7 = 'completed' THEN COALESCE(completed_at, now()) ELSE NULL END,
        updated_at = now()
       WHERE id = $8`,
      [JSON.stringify(summary), lastSeq, state.setsWon.A, state.setsWon.B, pointsA, pointsB, status, id]
    );
    if (accepted.some((a) => !a.duplicate)) {
      await audit(client, {
        actorId: userId,
        entity: 'match',
        entityId: id,
        action: 'events',
        after: { accepted: accepted.filter((a) => !a.duplicate).map((a) => a.seq), rejected },
      });
    }
    await client.query('COMMIT');
    return { accepted, rejected, lastSeq, summary, status };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function persistLineupsFromPayload(client, match, lineups) {
  if (!lineups) return;
  for (const side of ['A', 'B']) {
    const teamId = side === 'A' ? match.team_a_id : match.team_b_id;
    const starters = (lineups[side]?.starters || []).map(num).filter(Boolean);
    const bench = (lineups[side]?.bench || []).map(num).filter(Boolean);
    for (let i = 0; i < starters.length; i++) {
      await client.query(
        `INSERT INTO match_lineups (match_id, team_id, user_id, side, rotation_slot) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (match_id, user_id) DO NOTHING`,
        [match.id, teamId, starters[i], side, i + 1]
      );
    }
    for (const uid of bench) {
      await client.query(
        `INSERT INTO match_lineups (match_id, team_id, user_id, side, rotation_slot) VALUES ($1,$2,$3,$4,NULL)
         ON CONFLICT (match_id, user_id) DO NOTHING`,
        [match.id, teamId, uid, side]
      );
    }
  }
}

export async function getEventsAfter(id, after = 0) {
  await loadMatchRow(pool, id);
  return loadEvents(pool, id, Number(after) || 0);
}

/** Spectator diff endpoint: everything a live view needs, from `after` seq. */
export async function getLive(id, after = 0) {
  const match = await loadMatchRow(pool, id);
  const [teams, lineups, events] = await Promise.all([loadTeams(pool, match), loadLineups(pool, id), loadEvents(pool, id, Number(after) || 0)]);
  return {
    match: {
      id: match.id,
      status: match.status,
      format: match.format,
      tournament_id: match.tournament_id,
      tournament_name: match.tournament_name,
      court_name: match.court_name,
      division_name: match.division_name,
      scheduled_at: match.scheduled_at,
      started_at: match.started_at,
      completed_at: match.completed_at,
      last_seq: match.last_seq,
      updated_at: match.updated_at,
    },
    teams,
    lineups,
    events,
    lastSeq: match.last_seq,
    summary: match.state_snapshot,
  };
}

// ---------------------------------------------------------------------------
// Validation + submission pipeline
// ---------------------------------------------------------------------------
export function validateForSubmission(match, state, lineups, events) {
  const errors = [];
  const warnings = [];
  if (state.status !== 'complete') errors.push(`Match is not complete (status: ${state.status})`);
  if (!state.winner) errors.push('No winning team');
  if (state.setsWon.A === state.setsWon.B) errors.push('Sets are tied');
  if (!lineups.A.players.length || !lineups.B.players.length) errors.push('Both teams need a lineup');
  if (lineups.A.starters.length < 6 || lineups.B.starters.length < 6) warnings.push('A team played short-handed (fewer than 6 starters)');
  const seqs = events.map((e) => e.seq);
  if (new Set(seqs).size !== seqs.length) errors.push('Duplicate event sequence numbers');
  for (let i = 1; i < seqs.length; i++) if (seqs[i] !== seqs[i - 1] + 1) errors.push('Event sequence has gaps');
  state.sets.forEach((s, i) => {
    if (s.number !== i + 1) errors.push('Invalid set sequence');
    if (s.winner && (s.scoreA === 0 || s.scoreB === 0)) warnings.push(`Set ${s.number} ended ${s.scoreA}–${s.scoreB}; one team scored zero`);
    if (!s.winner) errors.push(`Set ${s.number} has no winner`);
  });
  if (state.skipped?.length) warnings.push(`${state.skipped.length} invalid event(s) were ignored`);
  if (state.endReason && state.endReason !== 'played') warnings.push(`Match ended by ${state.endReason}`);
  if (state.actions.length === 0) warnings.push('No player actions were recorded — statistics will be empty');
  return { errors, warnings };
}

export async function submitMatch(id, userId, role, { confirmWarnings = false } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const match = await loadMatchRow(client, id, { lock: true });
    if (!canScore(match, userId, role)) throw new HttpError(403, 'Not allowed to submit this match');
    if (match.status === 'submitted') throw new HttpError(409, 'Match already submitted');
    const events = await loadEvents(client, id);
    const lineups = await loadLineups(client, id);
    const state = deriveState(match.format, events, { lenient: true });
    const { errors, warnings } = validateForSubmission(match, state, lineups, events);
    if (errors.length) {
      const e = new HttpError(422, errors[0]);
      e.details = { errors, warnings };
      throw e;
    }
    if (warnings.length && !confirmWarnings) {
      const e = new HttpError(409, 'Review warnings before submitting');
      e.details = { errors: [], warnings, needsConfirmation: true };
      throw e;
    }

    // --- stats from events
    const boxes = deriveStats(state).map((b) => ({ ...b, playerId: num(b.playerId) })).filter((b) => b.playerId);
    const winner = state.winner;
    const pointsA = state.sets.reduce((s, x) => s + x.scoreA, 0);
    const pointsB = state.sets.reduce((s, x) => s + x.scoreB, 0);

    // --- ratings
    const playerIds = [...lineups.A.players, ...lineups.B.players].map((p) => p.id);
    const { rows: users } = await client.query('SELECT id, elo FROM users WHERE id = ANY($1::int[]) FOR UPDATE', [playerIds]);
    const eloById = new Map(users.map((u) => [u.id, u.elo]));
    const ratingInput = {
      players: {
        A: lineups.A.players.map((p) => ({ playerId: p.id, rating: eloById.get(p.id) ?? 1000 })),
        B: lineups.B.players.map((p) => ({ playerId: p.id, rating: eloById.get(p.id) ?? 1000 })),
      },
      winner,
      sets: { A: state.setsWon.A, B: state.setsWon.B },
      points: { A: pointsA, B: pointsB },
      boxes,
      level: match.level || 'local',
    };
    const ratings = ratePlayers(ratingInput);
    const ratingByPlayer = new Map(ratings.map((r) => [num(r.playerId), r]));

    // --- persist stats
    await client.query('DELETE FROM player_match_stats WHERE match_id = $1', [id]);
    const boxByPlayer = new Map(boxes.map((b) => [b.playerId, b]));
    for (const side of ['A', 'B']) {
      const teamId = side === 'A' ? match.team_a_id : match.team_b_id;
      for (const p of lineups[side].players) {
        const box = boxByPlayer.get(p.id) || {};
        const r = ratingByPlayer.get(p.id);
        const cols = STAT_COLUMNS.map((c) => box[c] || 0);
        await client.query(
          `INSERT INTO player_match_stats (match_id, user_id, team_id, side, won, ${STAT_COLUMNS.join(', ')}, rating_delta)
           VALUES ($1,$2,$3,$4,$5, ${STAT_COLUMNS.map((_, i) => `$${i + 6}`).join(', ')}, $${STAT_COLUMNS.length + 6})`,
          [id, p.id, teamId, side, winner === side, ...cols, r?.delta ?? 0]
        );
      }
    }

    // --- persist ratings
    for (const r of ratings) {
      const uid = num(r.playerId);
      await client.query(
        `INSERT INTO rating_events (user_id, match_id, version, rating_before, rating_after, delta, reason, factors)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uid, id, RATING_VERSION, r.before, r.after, r.delta, r.reason, JSON.stringify(r.factors)]
      );
      await client.query('UPDATE users SET elo = $1, rating_score = $2, updated_at = now() WHERE id = $3', [r.after, displayScore(r.after), uid]);
      await client.query('INSERT INTO rating_history (user_id, elo, rating_score) VALUES ($1, $2, $3)', [uid, r.after, displayScore(r.after)]);
    }
    // team ratings = mean of member ratings
    for (const teamId of [match.team_a_id, match.team_b_id]) {
      await client.query(
        `UPDATE teams SET elo = COALESCE((SELECT ROUND(AVG(u.elo)) FROM team_members tm JOIN users u ON u.id = tm.user_id WHERE tm.team_id = $1), elo),
                          updated_at = now() WHERE id = $1`,
        [teamId]
      );
    }

    // --- close the match
    const winnerTeamId = winner === 'A' ? match.team_a_id : match.team_b_id;
    const { rows: updated } = await client.query(
      `UPDATE matches SET status = 'submitted', winner_team_id = $1, sets_a = $2, sets_b = $3, points_a = $4, points_b = $5,
        state_snapshot = $6, submitted_at = now(), completed_at = COALESCE(completed_at, now()), updated_at = now()
       WHERE id = $7 RETURNING *`,
      [winnerTeamId, state.setsWon.A, state.setsWon.B, pointsA, pointsB, JSON.stringify(summarize(state)), id]
    );

    // --- tournament progression
    let progression = null;
    if (match.tournament_id && match.division_id) {
      progression = await advanceAfterMatch(client, updated[0]);
    }

    // --- badges
    const newBadges = {};
    for (const uid of playerIds) {
      const earned = await evaluateBadges(client, uid);
      if (earned.length) newBadges[uid] = earned;
    }

    await audit(client, {
      actorId: userId,
      entity: 'match',
      entityId: id,
      action: 'submit',
      before: { status: match.status },
      after: { status: 'submitted', winner_team_id: winnerTeamId, sets: [state.setsWon.A, state.setsWon.B], warningsConfirmed: warnings },
    });
    await client.query('COMMIT');
    return {
      match: updated[0],
      warnings,
      stats: boxes,
      ratings: ratings.map((r) => ({ ...r, playerId: num(r.playerId) })),
      newBadges,
      progression,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateMatch(id, userId, role, body) {
  const match = await loadMatchRow(pool, id);
  const isOrganizer = match.organizer_id && Number(match.organizer_id) === Number(userId);
  if (!(role === 'admin' || isOrganizer || Number(match.created_by) === Number(userId))) {
    throw new HttpError(403, 'Not allowed to edit this match');
  }
  const allowed = ['scorer_id', 'court_id', 'scheduled_at', 'status', 'notes', 'team_a_id', 'team_b_id'];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (body[key] === undefined) continue;
    if (key === 'status' && !['scheduled', 'cancelled'].includes(body[key])) throw new HttpError(400, 'Status can only be set to scheduled or cancelled here');
    if ((key === 'team_a_id' || key === 'team_b_id') && match.status !== 'scheduled') throw new HttpError(409, 'Teams can only change before the match starts');
    if (key === 'scheduled_at' && match.status === 'live') throw new HttpError(409, 'Cannot reschedule a live match');
    values.push(body[key] === '' ? null : body[key]);
    updates.push(`${key} = $${values.length}`);
  }
  if (!updates.length) throw new HttpError(400, 'No valid fields to update');
  values.push(id);
  const { rows } = await pool.query(`UPDATE matches SET ${updates.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`, values);
  await audit(pool, { actorId: userId, entity: 'match', entityId: id, action: 'update', before: match, after: rows[0] });
  return getMatch(id, { includeEvents: false });
}
