import { pool } from '../db.js';
import { HttpError, requireFields, POSITIONS } from '../utils/validation.js';
import { audit } from './audit.js';

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function uniqueSlug(db, table, base) {
  let slug = base || 'item';
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { rowCount } = await db.query(`SELECT 1 FROM ${table} WHERE slug = $1`, [slug]);
    if (!rowCount) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}

const TEAM_SELECT = `
  SELECT t.*, u.name AS coach_name, c.name AS community_name,
    (SELECT COUNT(*)::int FROM team_members tm WHERE tm.team_id = t.id) AS member_count,
    (SELECT COUNT(*)::int FROM matches m WHERE (m.team_a_id = t.id OR m.team_b_id = t.id) AND m.status = 'submitted') AS played,
    (SELECT COUNT(*)::int FROM matches m WHERE m.winner_team_id = t.id AND m.status = 'submitted') AS wins
  FROM teams t
  LEFT JOIN users u ON u.id = t.coach_user_id
  LEFT JOIN communities c ON c.id = t.community_id`;

export async function listTeams({ q, community, mine, userId, limit = 100 } = {}) {
  const params = [];
  const where = [];
  if (q) {
    params.push(`%${q}%`);
    where.push(`t.name ILIKE $${params.length}`);
  }
  if (community) {
    params.push(Number(community));
    where.push(`t.community_id = $${params.length}`);
  }
  if (mine && userId) {
    params.push(userId);
    where.push(`(t.coach_user_id = $${params.length} OR t.created_by = $${params.length} OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.user_id = $${params.length}))`);
  }
  params.push(Math.min(Number(limit) || 100, 500));
  const { rows } = await pool.query(
    `${TEAM_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY t.elo DESC, t.name LIMIT $${params.length}`,
    params
  );
  return rows.map(withRecord);
}

function withRecord(t) {
  return { ...t, losses: (t.played || 0) - (t.wins || 0) };
}

export async function getTeam(id) {
  const { rows } = await pool.query(`${TEAM_SELECT} WHERE t.id = $1`, [id]);
  if (!rows[0]) throw new HttpError(404, 'Team not found');
  const { rows: members } = await pool.query(
    `SELECT u.id, u.name, u.photo_url, u.elo, u.rating_score, tm.jersey_number, COALESCE(tm.position, u.position) AS position, tm.is_captain,
            (SELECT COUNT(*)::int FROM player_match_stats s WHERE s.user_id = u.id) AS scored_matches
     FROM team_members tm JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = $1 ORDER BY tm.jersey_number NULLS LAST, u.name`,
    [id]
  );
  const { rows: tournaments } = await pool.query(
    `SELECT DISTINCT t.id, t.name, t.status, t.starts_on, r.status AS registration_status
     FROM tournament_registrations r JOIN tournaments t ON t.id = r.tournament_id
     WHERE r.team_id = $1 ORDER BY t.starts_on DESC NULLS LAST`,
    [id]
  );
  return { ...withRecord(rows[0]), members, tournaments };
}

export function canManageTeam(team, userId, role) {
  return role === 'admin' || Number(team.coach_user_id) === Number(userId) || Number(team.created_by) === Number(userId);
}

export async function createTeam(userId, body) {
  requireFields(body, ['name']);
  const slug = await uniqueSlug(pool, 'teams', slugify(body.name));
  const { rows } = await pool.query(
    `INSERT INTO teams (name, slug, logo_url, coach_user_id, created_by, community_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [body.name.trim(), slug, body.logo_url || null, body.coach_user_id || userId, userId, body.community_id || null]
  );
  await audit(pool, { actorId: userId, entity: 'team', entityId: rows[0].id, action: 'create', after: rows[0] });
  return getTeam(rows[0].id);
}

export async function updateTeam(id, userId, role, body) {
  const team = await getTeam(id);
  if (!canManageTeam(team, userId, role)) throw new HttpError(403, 'Only the coach can edit this team');
  const allowed = ['name', 'logo_url', 'coach_user_id', 'community_id'];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (body[key] === undefined) continue;
    values.push(body[key] === '' ? null : body[key]);
    updates.push(`${key} = $${values.length}`);
  }
  if (!updates.length) throw new HttpError(400, 'No valid fields to update');
  values.push(id);
  await pool.query(`UPDATE teams SET ${updates.join(', ')}, updated_at = now() WHERE id = $${values.length}`, values);
  await audit(pool, { actorId: userId, entity: 'team', entityId: id, action: 'update', before: team, after: body });
  return getTeam(id);
}

export async function addMember(id, userId, role, body) {
  const team = await getTeam(id);
  if (!canManageTeam(team, userId, role)) throw new HttpError(403, 'Only the coach can edit the roster');
  let memberId = body.user_id;
  if (!memberId && body.email) {
    const { rows } = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [body.email]);
    if (!rows[0]) throw new HttpError(404, 'No player with that email');
    memberId = rows[0].id;
  }
  if (!memberId) throw new HttpError(400, 'user_id or email is required');
  if (body.position && !POSITIONS.includes(body.position)) throw new HttpError(400, 'Invalid position');
  const { rows: exists } = await pool.query('SELECT id FROM users WHERE id = $1', [memberId]);
  if (!exists[0]) throw new HttpError(404, 'Player not found');
  await pool.query(
    `INSERT INTO team_members (team_id, user_id, jersey_number, position, is_captain)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (team_id, user_id) DO UPDATE SET jersey_number = EXCLUDED.jersey_number,
       position = COALESCE(EXCLUDED.position, team_members.position), is_captain = EXCLUDED.is_captain`,
    [id, memberId, body.jersey_number ?? null, body.position || null, Boolean(body.is_captain)]
  );
  await pool.query(
    `UPDATE teams SET elo = (SELECT ROUND(AVG(u.elo)) FROM team_members tm JOIN users u ON u.id = tm.user_id WHERE tm.team_id = $1) WHERE id = $1`,
    [id]
  );
  await audit(pool, { actorId: userId, entity: 'team', entityId: id, action: 'add_member', after: { user_id: memberId, ...body } });
  return getTeam(id);
}

export async function removeMember(id, userId, role, memberId) {
  const team = await getTeam(id);
  if (!canManageTeam(team, userId, role) && Number(memberId) !== Number(userId)) {
    throw new HttpError(403, 'Only the coach can edit the roster');
  }
  await pool.query('DELETE FROM team_members WHERE team_id = $1 AND user_id = $2', [id, memberId]);
  await audit(pool, { actorId: userId, entity: 'team', entityId: id, action: 'remove_member', before: { user_id: memberId } });
  return getTeam(id);
}

export async function searchPlayers(q, { limit = 20 } = {}) {
  const { rows } = await pool.query(
    `SELECT id, name, photo_url, position, elo, rating_score, jersey_number, role
     FROM users WHERE name ILIKE $1 OR email ILIKE $1 ORDER BY name LIMIT $2`,
    [`%${q || ''}%`, Math.min(Number(limit) || 20, 50)]
  );
  return rows;
}
