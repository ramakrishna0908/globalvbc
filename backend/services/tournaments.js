// Tournament management: CRUD, registration workflow, divisions, courts,
// schedule generation via the shared format engine, standings and brackets.
import { pool } from '../db.js';
import { HttpError, requireFields } from '../utils/validation.js';
import { audit } from './audit.js';
import { slugify, uniqueSlug } from './teams.js';
import { poolStandings, advanceDivision, divisionChampion } from './brackets.js';
import { generate, normalizeFormat, FORMATS } from '../../shared/engine/index.js';

const STATUS_FLOW = { draft: ['published', 'cancelled'], published: ['live', 'completed', 'cancelled', 'draft'], live: ['completed', 'cancelled'], completed: [], cancelled: ['draft'] };

const T_SELECT = `
  SELECT t.*, u.name AS organizer_name, v.name AS venue_name, v.city AS venue_city,
    (SELECT COUNT(*)::int FROM tournament_registrations r WHERE r.tournament_id = t.id AND r.status = 'approved') AS team_count,
    (SELECT COUNT(*)::int FROM tournament_registrations r WHERE r.tournament_id = t.id AND r.status = 'pending') AS pending_count,
    (SELECT COUNT(*)::int FROM courts c WHERE c.tournament_id = t.id) AS court_count,
    (SELECT COUNT(*)::int FROM matches m WHERE m.tournament_id = t.id) AS match_count,
    (SELECT COUNT(*)::int FROM matches m WHERE m.tournament_id = t.id AND m.status = 'live') AS live_count,
    (SELECT COUNT(*)::int FROM matches m WHERE m.tournament_id = t.id AND m.status = 'submitted') AS completed_count
  FROM tournaments t
  LEFT JOIN users u ON u.id = t.organizer_id
  LEFT JOIN venues v ON v.id = t.venue_id`;

export function canManage(t, userId, role) {
  return role === 'admin' || Number(t.organizer_id) === Number(userId);
}

export async function listTournaments({ status, mine, userId, limit = 100 } = {}) {
  const params = [];
  const where = [];
  if (status) {
    params.push(String(status).split(','));
    where.push(`t.status = ANY($${params.length}::text[])`);
  } else if (!(mine && userId)) {
    where.push(`t.status <> 'draft'`);
  }
  if (mine && userId) {
    params.push(userId);
    where.push(`t.organizer_id = $${params.length}`);
  }
  params.push(Math.min(Number(limit) || 100, 500));
  const { rows } = await pool.query(
    `${T_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY CASE t.status WHEN 'live' THEN 0 WHEN 'published' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END, t.starts_on DESC NULLS LAST, t.id DESC
     LIMIT $${params.length}`,
    params
  );
  return rows;
}

export async function getTournament(id, { userId, role } = {}) {
  const { rows } = await pool.query(`${T_SELECT} WHERE t.id = $1 OR t.slug = $2`, [/^\d+$/.test(String(id)) ? Number(id) : -1, String(id)]);
  const t = rows[0];
  if (!t) throw new HttpError(404, 'Tournament not found');
  if (t.status === 'draft' && !canManage(t, userId, role)) throw new HttpError(404, 'Tournament not found');
  const [courts, divisions, registrations] = await Promise.all([
    pool.query('SELECT * FROM courts WHERE tournament_id = $1 ORDER BY sort_order, name', [t.id]),
    pool.query(
      `SELECT d.*, (SELECT COUNT(*)::int FROM matches m WHERE m.division_id = d.id) AS match_count,
              (SELECT COUNT(*)::int FROM tournament_registrations r WHERE r.division_id = d.id AND r.status='approved') AS team_count
       FROM divisions d WHERE d.tournament_id = $1 ORDER BY d.id`,
      [t.id]
    ),
    pool.query(
      `SELECT r.*, tm.name AS team_name, tm.logo_url AS team_logo, tm.elo AS team_elo, d.name AS division_name,
              (SELECT COUNT(*)::int FROM team_members x WHERE x.team_id = tm.id) AS member_count
       FROM tournament_registrations r JOIN teams tm ON tm.id = r.team_id
       LEFT JOIN divisions d ON d.id = r.division_id
       WHERE r.tournament_id = $1 ORDER BY r.status, r.seed NULLS LAST, tm.name`,
      [t.id]
    ),
  ]);
  return { ...t, courts: courts.rows, divisions: divisions.rows, registrations: registrations.rows, canManage: canManage(t, userId, role) };
}

function scoringSettings(body) {
  const s = body.settings || {};
  const format = normalizeFormat({
    setsToWin: s.setsToWin ?? body.setsToWin ?? 2,
    setPoints: s.setPoints ?? body.setPoints ?? 25,
    decidingSetPoints: s.decidingSetPoints ?? body.decidingSetPoints ?? 15,
    winByTwo: s.winByTwo ?? body.winByTwo ?? true,
    pointCap: s.pointCap ?? body.pointCap ?? null,
    timeoutsPerSet: s.timeoutsPerSet ?? body.timeoutsPerSet ?? 2,
  });
  return { ...format, pools: Number(s.pools ?? body.pools ?? 2), advance: Number(s.advance ?? body.advance ?? 2) };
}

export async function createTournament(userId, body) {
  requireFields(body, ['name']);
  const format = body.format || 'round_robin';
  if (!FORMATS[format] && format !== 'custom') throw new HttpError(400, 'Unknown format');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let venueId = body.venue_id || null;
    if (!venueId && body.venue_name) {
      const { rows } = await client.query('INSERT INTO venues (name, city, address) VALUES ($1,$2,$3) RETURNING id', [body.venue_name, body.city || null, body.address || null]);
      venueId = rows[0].id;
    }
    const slug = await uniqueSlug(client, 'tournaments', slugify(body.name));
    const { rows } = await client.query(
      `INSERT INTO tournaments (name, slug, description, organizer_id, venue_id, location, level, starts_on, ends_on, format, settings, registration_open)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        body.name.trim(),
        slug,
        body.description || null,
        userId,
        venueId,
        body.location || body.city || null,
        body.level || 'local',
        body.starts_on || null,
        body.ends_on || body.starts_on || null,
        format,
        JSON.stringify(scoringSettings(body)),
        body.registration_open ?? true,
      ]
    );
    const t = rows[0];
    const courts = Math.max(0, Math.min(Number(body.courts ?? 2), 20));
    for (let i = 1; i <= courts; i++) {
      await client.query('INSERT INTO courts (tournament_id, name, sort_order) VALUES ($1,$2,$3)', [t.id, `Court ${i}`, i]);
    }
    // Every tournament has at least one division so scheduling always has a target.
    await client.query('INSERT INTO divisions (tournament_id, name, format, settings) VALUES ($1,$2,$3,$4)', [t.id, body.division_name || 'Open', format, t.settings]);
    await audit(client, { actorId: userId, entity: 'tournament', entityId: t.id, action: 'create', after: t });
    await client.query('COMMIT');
    return getTournament(t.id, { userId, role: 'organizer' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateTournament(id, userId, role, body) {
  const t = await getTournament(id, { userId, role });
  if (!canManage(t, userId, role)) throw new HttpError(403, 'Only the organizer can edit this tournament');
  const allowed = ['name', 'description', 'location', 'level', 'starts_on', 'ends_on', 'format', 'registration_open', 'venue_id'];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (body[key] === undefined) continue;
    values.push(body[key] === '' ? null : body[key]);
    updates.push(`${key} = $${values.length}`);
  }
  if (body.settings || body.setPoints || body.setsToWin) {
    values.push(JSON.stringify({ ...t.settings, ...scoringSettings({ ...t.settings, ...body, settings: { ...t.settings, ...(body.settings || {}) } }) }));
    updates.push(`settings = $${values.length}`);
  }
  if (body.status) {
    if (!STATUS_FLOW[t.status]?.includes(body.status)) throw new HttpError(409, `Cannot move tournament from ${t.status} to ${body.status}`);
    values.push(body.status);
    updates.push(`status = $${values.length}`);
  }
  if (!updates.length) throw new HttpError(400, 'No valid fields to update');
  values.push(t.id);
  await pool.query(`UPDATE tournaments SET ${updates.join(', ')}, updated_at = now() WHERE id = $${values.length}`, values);
  await audit(pool, { actorId: userId, entity: 'tournament', entityId: t.id, action: body.status ? `status:${body.status}` : 'update', before: t, after: body });
  return getTournament(t.id, { userId, role });
}

export async function deleteTournament(id, userId, role) {
  const t = await getTournament(id, { userId, role });
  if (!canManage(t, userId, role)) throw new HttpError(403, 'Only the organizer can delete this tournament');
  if (t.match_count > 0 && t.completed_count > 0) throw new HttpError(409, 'Tournament has submitted matches and cannot be deleted');
  await pool.query('DELETE FROM tournaments WHERE id = $1', [t.id]);
  await audit(pool, { actorId: userId, entity: 'tournament', entityId: t.id, action: 'delete', before: t });
}

// ---------------------------------------------------------------------------
// Courts, divisions
// ---------------------------------------------------------------------------
export async function addCourt(id, userId, role, body) {
  const t = await getTournament(id, { userId, role });
  if (!canManage(t, userId, role)) throw new HttpError(403, 'Only the organizer can manage courts');
  const name = body.name || `Court ${t.courts.length + 1}`;
  await pool.query('INSERT INTO courts (tournament_id, name, sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [t.id, name, t.courts.length + 1]);
  return getTournament(t.id, { userId, role });
}

export async function removeCourt(id, courtId, userId, role) {
  const t = await getTournament(id, { userId, role });
  if (!canManage(t, userId, role)) throw new HttpError(403, 'Only the organizer can manage courts');
  await pool.query('DELETE FROM courts WHERE id = $1 AND tournament_id = $2', [courtId, t.id]);
  return getTournament(t.id, { userId, role });
}

export async function addDivision(id, userId, role, body) {
  const t = await getTournament(id, { userId, role });
  if (!canManage(t, userId, role)) throw new HttpError(403, 'Only the organizer can manage divisions');
  requireFields(body, ['name']);
  const format = body.format || t.format;
  const settings = body.settings ? { ...t.settings, ...body.settings } : t.settings;
  const { rows } = await pool.query(
    'INSERT INTO divisions (tournament_id, name, format, settings) VALUES ($1,$2,$3,$4) RETURNING *',
    [t.id, body.name, format, JSON.stringify(settings)]
  );
  await audit(pool, { actorId: userId, entity: 'division', entityId: rows[0].id, action: 'create', after: rows[0] });
  return getTournament(t.id, { userId, role });
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------
export async function registerTeam(id, userId, role, body) {
  requireFields(body, ['team_id']);
  const t = await getTournament(id, { userId, role });
  if (t.status === 'draft' && !canManage(t, userId, role)) throw new HttpError(404, 'Tournament not found');
  if (!t.registration_open && !canManage(t, userId, role)) throw new HttpError(409, 'Registration is closed');
  const { rows: teams } = await pool.query('SELECT * FROM teams WHERE id = $1', [body.team_id]);
  const team = teams[0];
  if (!team) throw new HttpError(404, 'Team not found');
  const isCoach = Number(team.coach_user_id) === Number(userId) || Number(team.created_by) === Number(userId);
  if (!isCoach && !canManage(t, userId, role)) throw new HttpError(403, 'Only the team coach can register this team');
  const divisionId = body.division_id || t.divisions[0]?.id || null;
  const status = canManage(t, userId, role) ? 'approved' : 'pending';
  const { rows } = await pool.query(
    `INSERT INTO tournament_registrations (tournament_id, division_id, team_id, status, requested_by)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (tournament_id, team_id) DO UPDATE SET status = CASE WHEN tournament_registrations.status = 'withdrawn' THEN EXCLUDED.status ELSE tournament_registrations.status END,
       division_id = COALESCE(EXCLUDED.division_id, tournament_registrations.division_id), updated_at = now()
     RETURNING *`,
    [t.id, divisionId, team.id, status, userId]
  );
  await audit(pool, { actorId: userId, entity: 'registration', entityId: rows[0].id, action: 'register', after: rows[0] });
  return rows[0];
}

export async function updateRegistration(id, regId, userId, role, body) {
  const t = await getTournament(id, { userId, role });
  const { rows } = await pool.query('SELECT * FROM tournament_registrations WHERE id = $1 AND tournament_id = $2', [regId, t.id]);
  const reg = rows[0];
  if (!reg) throw new HttpError(404, 'Registration not found');
  const manager = canManage(t, userId, role);
  if (!manager) {
    // A coach may withdraw their own team
    const { rows: teams } = await pool.query('SELECT coach_user_id, created_by FROM teams WHERE id = $1', [reg.team_id]);
    const own = teams[0] && (Number(teams[0].coach_user_id) === Number(userId) || Number(teams[0].created_by) === Number(userId));
    if (!own || body.status !== 'withdrawn') throw new HttpError(403, 'Only the organizer can update registrations');
  }
  const updates = [];
  const values = [];
  if (body.status) {
    if (!['pending', 'approved', 'rejected', 'withdrawn'].includes(body.status)) throw new HttpError(400, 'Invalid status');
    values.push(body.status);
    updates.push(`status = $${values.length}`);
  }
  if (body.division_id !== undefined) {
    values.push(body.division_id || null);
    updates.push(`division_id = $${values.length}`);
  }
  if (body.seed !== undefined) {
    values.push(body.seed === null || body.seed === '' ? null : Number(body.seed));
    updates.push(`seed = $${values.length}`);
  }
  if (!updates.length) throw new HttpError(400, 'Nothing to update');
  values.push(reg.id);
  const { rows: out } = await pool.query(`UPDATE tournament_registrations SET ${updates.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`, values);
  await audit(pool, { actorId: userId, entity: 'registration', entityId: reg.id, action: 'update', before: reg, after: out[0] });
  return out[0];
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------
/**
 * Generate the division's matches from approved registrations using the shared
 * format engine, assign courts round-robin and time slots sequentially.
 */
export async function generateSchedule(id, divisionId, userId, role, body = {}) {
  const t = await getTournament(id, { userId, role });
  if (!canManage(t, userId, role)) throw new HttpError(403, 'Only the organizer can generate a schedule');
  const division = t.divisions.find((d) => Number(d.id) === Number(divisionId));
  if (!division) throw new HttpError(404, 'Division not found');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existing } = await client.query(`SELECT COUNT(*)::int AS n FROM matches WHERE division_id = $1 AND status <> 'scheduled'`, [division.id]);
    if (existing[0].n > 0) throw new HttpError(409, 'Matches in this division have already started; schedule is locked');
    await client.query('DELETE FROM matches WHERE division_id = $1', [division.id]);
    await client.query('DELETE FROM pools WHERE division_id = $1', [division.id]);

    const { rows: regs } = await client.query(
      `SELECT r.team_id, r.seed, tm.elo FROM tournament_registrations r JOIN teams tm ON tm.id = r.team_id
       WHERE r.tournament_id = $1 AND r.status = 'approved' AND (r.division_id = $2 OR r.division_id IS NULL)
       ORDER BY r.seed NULLS LAST, tm.elo DESC, r.team_id`,
      [t.id, division.id]
    );
    const teams = regs.map((r) => r.team_id);
    if (teams.length < 2) throw new HttpError(422, 'At least two approved teams are required');
    await client.query(`UPDATE tournament_registrations SET division_id = $1 WHERE tournament_id = $2 AND division_id IS NULL AND status = 'approved'`, [division.id, t.id]);

    const format = body.format || division.format;
    const settings = { ...t.settings, ...(division.settings || {}), ...(body.settings || {}) };
    let specs;
    try {
      specs = generate({ format, teams, settings: { pools: Number(settings.pools || 2), advance: Number(settings.advance || 2) } });
    } catch (err) {
      throw new HttpError(400, err.message);
    }
    // pools
    const poolIds = new Map();
    for (const spec of specs) {
      if (spec.stage !== 'pool' || poolIds.has(spec.pool)) continue;
      const { rows } = await client.query('INSERT INTO pools (division_id, name) VALUES ($1,$2) RETURNING id', [division.id, spec.pool]);
      poolIds.set(spec.pool, rows[0].id);
    }
    for (const [name, pid] of poolIds) {
      const members = new Set();
      for (const s of specs) if (s.pool === name) [s.teamA, s.teamB].forEach((x) => x != null && members.add(x));
      let seed = 1;
      for (const teamId of members) await client.query('INSERT INTO pool_teams (pool_id, team_id, seed) VALUES ($1,$2,$3)', [pid, teamId, seed++]);
    }
    // matches with courts + time slots
    const courts = t.courts;
    const slotMinutes = Number(body.slotMinutes || settings.slotMinutes || 60);
    let startAt = body.starts_at ? new Date(body.starts_at) : t.starts_on ? new Date(t.starts_on) : null;
    if (startAt && Number.isNaN(startAt.getTime())) startAt = null;
    if (startAt && !body.starts_at) startAt.setHours(9, 0, 0, 0);
    const matchFormat = normalizeFormat(settings);
    let i = 0;
    const created = [];
    const ordered = [...specs].sort((a, b) => (a.stage === b.stage ? a.round - b.round || a.slot - b.slot : a.stage === 'pool' ? -1 : 1));
    for (const spec of ordered) {
      const court = courts.length ? courts[i % courts.length] : null;
      const slot = courts.length ? Math.floor(i / courts.length) : i;
      const scheduledAt = startAt ? new Date(startAt.getTime() + slot * slotMinutes * 60000) : null;
      const { rows } = await client.query(
        `INSERT INTO matches (tournament_id, division_id, pool_id, court_id, team_a_id, team_b_id, created_by, format, level, scheduled_at,
                              bracket_key, bracket_stage, bracket_round, bracket_slot, bracket_type, source_a, source_b)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
        [
          t.id,
          division.id,
          spec.pool ? poolIds.get(spec.pool) : null,
          court?.id || null,
          spec.teamA ?? null,
          spec.teamB ?? null,
          userId,
          JSON.stringify(matchFormat),
          t.level,
          scheduledAt,
          spec.key,
          spec.stage,
          spec.round,
          spec.slot,
          spec.bracket || null,
          spec.sourceA ? JSON.stringify(spec.sourceA) : null,
          spec.sourceB ? JSON.stringify(spec.sourceB) : null,
        ]
      );
      created.push(rows[0].id);
      i += 1;
    }
    await client.query(`UPDATE divisions SET status = 'scheduled', format = $1 WHERE id = $2`, [format, division.id]);
    await audit(client, { actorId: userId, entity: 'division', entityId: division.id, action: 'generate_schedule', after: { format, matches: created.length } });
    await client.query('COMMIT');
    return { division_id: division.id, format, matches: created.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getStandings(id, { userId, role } = {}) {
  const t = await getTournament(id, { userId, role });
  const out = [];
  for (const d of t.divisions) {
    const { rows: pools } = await pool.query('SELECT id, name FROM pools WHERE division_id = $1 ORDER BY name', [d.id]);
    const groups = [];
    if (pools.length) {
      for (const p of pools) groups.push({ pool: p.name, ...(await poolStandings(pool, d.id, p.id)) });
    } else {
      groups.push({ pool: null, ...(await poolStandings(pool, d.id, null)) });
    }
    const teamIds = [...new Set(groups.flatMap((g) => g.teams))];
    const { rows: teams } = teamIds.length
      ? await pool.query('SELECT id, name, logo_url, elo FROM teams WHERE id = ANY($1::int[])', [teamIds])
      : { rows: [] };
    const byId = new Map(teams.map((x) => [x.id, x]));
    out.push({
      division: { id: d.id, name: d.name, format: d.format, status: d.status },
      champion: (await divisionChampion(pool, d.id)) || null,
      groups: groups.map((g) => ({ ...g, rows: g.rows.map((r) => ({ ...r, team: byId.get(r.teamId) || null })) })),
    });
  }
  return out;
}

export async function getBracket(id, { userId, role } = {}) {
  const t = await getTournament(id, { userId, role });
  const { rows } = await pool.query(
    `SELECT m.id, m.division_id, m.bracket_key, m.bracket_stage, m.bracket_round, m.bracket_slot, m.bracket_type, m.status,
            m.team_a_id, m.team_b_id, m.winner_team_id, m.sets_a, m.sets_b, m.scheduled_at, m.court_id, m.source_a, m.source_b,
            ta.name AS team_a_name, tb.name AS team_b_name, c.name AS court_name, m.state_snapshot
     FROM matches m LEFT JOIN teams ta ON ta.id = m.team_a_id LEFT JOIN teams tb ON tb.id = m.team_b_id LEFT JOIN courts c ON c.id = m.court_id
     WHERE m.tournament_id = $1 AND m.bracket_stage = 'bracket' ORDER BY m.division_id, m.bracket_round, m.bracket_slot`,
    [t.id]
  );
  return t.divisions.map((d) => ({ division: { id: d.id, name: d.name }, matches: rows.filter((m) => m.division_id === d.id) }));
}

export async function publishResults(id, userId, role) {
  const t = await getTournament(id, { userId, role });
  if (!canManage(t, userId, role)) throw new HttpError(403, 'Only the organizer can publish results');
  for (const d of t.divisions) await advanceDivision(pool, d.id);
  await pool.query(`UPDATE tournaments SET status = 'completed', updated_at = now() WHERE id = $1`, [t.id]);
  await audit(pool, { actorId: userId, entity: 'tournament', entityId: t.id, action: 'publish_results' });
  return getTournament(t.id, { userId, role });
}

export async function tournamentLeaders(id) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.photo_url, tm.name AS team_name,
            SUM(s.points)::int AS points, SUM(s.kills)::int AS kills, SUM(s.aces)::int AS aces, SUM(s.blocks)::int AS blocks,
            SUM(s.digs)::int AS digs, SUM(s.assists)::int AS assists, SUM(s.errors)::int AS errors, COUNT(*)::int AS matches,
            SUM(s.rating_delta)::int AS rating_delta
     FROM player_match_stats s JOIN matches m ON m.id = s.match_id JOIN users u ON u.id = s.user_id LEFT JOIN teams tm ON tm.id = s.team_id
     WHERE m.tournament_id = $1 GROUP BY u.id, u.name, u.photo_url, tm.name`,
    [id]
  );
  const top = (col) => [...rows].sort((a, b) => b[col] - a[col]).filter((r) => r[col] > 0).slice(0, 5);
  const mvp = [...rows].sort((a, b) => b.points + b.digs * 0.5 + b.assists * 0.5 - b.errors - (a.points + a.digs * 0.5 + a.assists * 0.5 - a.errors)).slice(0, 5);
  return { points: top('points'), kills: top('kills'), aces: top('aces'), blocks: top('blocks'), digs: top('digs'), assists: top('assists'), mvp };
}
