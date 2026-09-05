import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { HttpError } from '../utils/validation.js';

export const ROLES = ['player', 'scorer', 'coach', 'organizer', 'admin'];

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
}

/**
 * Verifies the bearer token and loads the user's current role from the DB so a
 * role change takes effect immediately (the JWT role is only a hint).
 */
export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Missing or invalid Authorization header'));
  }
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new HttpError(401, 'Invalid or expired token'));
  }
  try {
    const { rows } = await query('SELECT id, role FROM users WHERE id = $1', [payload.sub]);
    if (!rows[0]) return next(new HttpError(401, 'Account no longer exists'));
    req.userId = rows[0].id;
    req.userRole = rows[0].role;
    next();
  } catch (err) {
    next(err);
  }
}

/** Optional auth: sets req.userId when a valid token is present, never fails. */
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query('SELECT id, role FROM users WHERE id = $1', [payload.sub]);
    if (rows[0]) {
      req.userId = rows[0].id;
      req.userRole = rows[0].role;
    }
  } catch {
    /* anonymous */
  }
  next();
}

/** Role gate. Admins pass every gate. Must run after requireAuth. */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.userRole) return next(new HttpError(401, 'Authentication required'));
    if (req.userRole === 'admin' || roles.includes(req.userRole)) return next();
    return next(new HttpError(403, `Requires role: ${roles.join(' or ')}`));
  };
}
