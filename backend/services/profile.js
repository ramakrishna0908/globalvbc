import { query } from '../db.js';
import { HttpError, POSITIONS } from '../utils/validation.js';
import { PUBLIC_FIELDS } from './auth.js';

// Public profile omits email (used by shareable card / leaderboard).
const SHARE_FIELDS =
  'id, name, photo_url, position, community_id, elo, rating_score, win_streak, profile_complete, created_at';

export async function getOwnProfile(userId) {
  const { rows } = await query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [userId]);
  if (!rows[0]) throw new HttpError(404, 'User not found');
  return rows[0];
}

async function enrich(profile) {
  // win rate + matches
  const { rows: mc } = await query(
    `SELECT COUNT(*)::int AS played,
            COUNT(*) FILTER (WHERE result = 'won')::int AS wins
     FROM matches WHERE user_id = $1`,
    [profile.id]
  );
  const played = mc[0]?.played ?? 0;
  const wins = mc[0]?.wins ?? 0;

  // local rank within community (or global if no community)
  const rankParams = [profile.elo];
  let rankWhere = 'elo > $1';
  if (profile.community_id) {
    rankParams.push(profile.community_id);
    rankWhere += ` AND community_id = $2`;
  }
  const { rows: rk } = await query(
    `SELECT COUNT(*)::int AS ahead FROM users WHERE ${rankWhere}`,
    rankParams
  );

  // earned badges
  const { rows: badges } = await query(
    `SELECT b.key, b.name, b.icon FROM user_badges ub
     JOIN badges b ON b.id = ub.badge_id
     WHERE ub.user_id = $1 ORDER BY ub.earned_at`,
    [profile.id]
  );

  return {
    ...profile,
    matches_played: played,
    win_rate: played ? Math.round((wins / played) * 100) : 0,
    rank: (rk[0]?.ahead ?? 0) + 1,
    badges,
  };
}

export async function getPublicProfile(id) {
  // 'sample' (or any non-numeric id) resolves to the top-rated player, so the
  // landing page's "View Sample Profile" always points at a rich profile.
  if (!/^\d+$/.test(String(id))) {
    const { rows } = await query(
      `SELECT ${SHARE_FIELDS} FROM users ORDER BY elo DESC, id ASC LIMIT 1`
    );
    if (!rows[0]) throw new HttpError(404, 'No profiles yet');
    return enrich(rows[0]);
  }
  const { rows } = await query(`SELECT ${SHARE_FIELDS} FROM users WHERE id = $1`, [id]);
  if (!rows[0]) throw new HttpError(404, 'Profile not found');
  return enrich(rows[0]);
}

export async function updateProfile(userId, body) {
  const allowed = ['name', 'photo_url', 'position', 'community_id'];
  const updates = [];
  const values = [];
  let i = 1;

  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (key === 'position' && body[key] !== null && !POSITIONS.includes(body[key])) {
        throw new HttpError(400, `Invalid position. Allowed: ${POSITIONS.join(', ')}`);
      }
      updates.push(`${key} = $${i++}`);
      values.push(body[key]);
    }
  }

  if (updates.length === 0) throw new HttpError(400, 'No valid fields to update');

  values.push(userId);
  await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`, values);

  // profile_complete = has photo + position
  await query(
    `UPDATE users
     SET profile_complete = (photo_url IS NOT NULL AND position IS NOT NULL)
     WHERE id = $1`,
    [userId]
  );

  return getOwnProfile(userId);
}
