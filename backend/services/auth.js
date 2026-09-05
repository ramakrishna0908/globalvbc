import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { query } from '../db.js';
import { HttpError, isEmail } from '../utils/validation.js';
import { ratingScore } from '../utils/elo.js';

const PUBLIC_FIELDS =
  'id, email, name, photo_url, position, community_id, elo, rating_score, win_streak, profile_complete, role, jersey_number, created_at';

export const ROLES = ['player', 'scorer', 'coach', 'organizer', 'admin'];
/** Roles a user may pick for themselves (admin is granted by an admin). */
export const SELF_SERVICE_ROLES = ['player', 'scorer', 'coach', 'organizer'];

export async function register({ email, password, name, role = 'player' }) {
  if (!isEmail(email)) throw new HttpError(400, 'Invalid email');
  if (!SELF_SERVICE_ROLES.includes(role)) throw new HttpError(400, `Invalid role. Allowed: ${SELF_SERVICE_ROLES.join(', ')}`);
  if (!password || password.length < 8)
    throw new HttpError(400, 'Password must be at least 8 characters');
  if (!name) throw new HttpError(400, 'Name is required');

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount > 0) throw new HttpError(409, 'Email already registered');

  const hash = await bcrypt.hash(password, 10);
  const startScore = ratingScore(1000);
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, name, rating_score, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PUBLIC_FIELDS}`,
    [email.toLowerCase(), hash, name, startScore, role]
  );
  // initialize empty skill stats row
  await query('INSERT INTO skill_stats (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [
    rows[0].id,
  ]);
  return rows[0];
}

export async function verifyCredentials({ email, password }) {
  const { rows } = await query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
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

/**
 * Password reset. No email provider is configured yet, so the token is only
 * ever revealed when EXPOSE_RESET_TOKENS=true is set explicitly (automated
 * tests, local development). It is never logged.
 */
export async function requestPasswordReset(email) {
  const { rows } = await query('SELECT id FROM users WHERE lower(email) = lower($1)', [email || '']);
  if (!rows[0]) return { ok: true }; // do not leak account existence
  const raw = crypto.randomBytes(24).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  await query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 hour')`,
    [rows[0].id, hash]
  );
  const expose = process.env.EXPOSE_RESET_TOKENS === 'true' && process.env.NODE_ENV !== 'production';
  return expose ? { ok: true, devResetToken: raw } : { ok: true };
}

export async function resetPassword({ token, password }) {
  if (!token) throw new HttpError(400, 'Missing token');
  if (!password || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  const hash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const { rows } = await query(
    `SELECT id, user_id FROM password_resets
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [hash]
  );
  if (!rows[0]) throw new HttpError(400, 'Reset link is invalid or has expired');
  const passwordHash = await bcrypt.hash(password, 10);
  await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, rows[0].user_id]);
  await query('UPDATE password_resets SET used_at = now() WHERE id = $1', [rows[0].id]);
  return getById(rows[0].user_id);
}

export function sanitize(user) {
  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...rest } = user;
  return rest;
}

export { PUBLIC_FIELDS };
