import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { HttpError, isEmail } from '../utils/validation.js';
import { ratingScore } from '../utils/elo.js';

const PUBLIC_FIELDS =
  'id, email, name, photo_url, position, community_id, elo, rating_score, win_streak, profile_complete, created_at';

export async function register({ email, password, name }) {
  if (!isEmail(email)) throw new HttpError(400, 'Invalid email');
  if (!password || password.length < 8)
    throw new HttpError(400, 'Password must be at least 8 characters');
  if (!name) throw new HttpError(400, 'Name is required');

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount > 0) throw new HttpError(409, 'Email already registered');

  const hash = await bcrypt.hash(password, 10);
  const startScore = ratingScore(1000);
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, name, rating_score)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_FIELDS}`,
    [email, hash, name, startScore]
  );
  // initialize empty skill stats row
  await query('INSERT INTO skill_stats (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [
    rows[0].id,
  ]);
  return rows[0];
}

export async function verifyCredentials({ email, password }) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) throw new HttpError(401, 'Invalid credentials');
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new HttpError(401, 'Invalid credentials');
  return sanitize(user);
}

export async function getById(id) {
  const { rows } = await query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [id]);
  if (!rows[0]) throw new HttpError(404, 'User not found');
  return rows[0];
}

export function sanitize(user) {
  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...rest } = user;
  return rest;
}

export { PUBLIC_FIELDS };
