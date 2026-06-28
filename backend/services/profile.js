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

export async function getPublicProfile(id) {
  const { rows } = await query(`SELECT ${SHARE_FIELDS} FROM users WHERE id = $1`, [id]);
  if (!rows[0]) throw new HttpError(404, 'Profile not found');
  return rows[0];
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
