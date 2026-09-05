// Creates or repairs the platform superadmin account.
//
//   SUPERADMIN_PASSWORD=… npm run admin          (from backend/)
//
// Idempotent: upserts by email, always forces role=admin. Without
// SUPERADMIN_PASSWORD a strong random password is generated and printed once.
// Used by `npm run seed` too, so re-seeding never removes the superadmin.
import 'dotenv/config';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool, query } from '../db.js';
import { ratingScore } from '../utils/elo.js';

export const SUPERADMIN = {
  name: process.env.SUPERADMIN_NAME || 'vbcsupport',
  email: (process.env.SUPERADMIN_EMAIL || 'vbcsupport@globalvbc.app').toLowerCase(),
};

export function generatePassword() {
  // 20 chars from an unambiguous alphabet — printable, copy-paste safe.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%*';
  const bytes = crypto.randomBytes(20);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}

/**
 * @param {{password?: string, resetPassword?: boolean}} [opts]
 * @returns {Promise<{id:number, email:string, created:boolean, password:string|null}>}
 */
export async function ensureSuperadmin({ password, resetPassword = false } = {}) {
  const { rows } = await query('SELECT id, role FROM users WHERE lower(email) = $1', [SUPERADMIN.email]);
  if (rows[0]) {
    const updates = ["role = 'admin'", 'name = $2', 'updated_at = now()'];
    const params = [rows[0].id, SUPERADMIN.name];
    let newPassword = null;
    if (resetPassword) {
      newPassword = password || generatePassword();
      params.push(await bcrypt.hash(newPassword, 10));
      updates.push(`password_hash = $${params.length}`);
    }
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $1`, params);
    return { id: rows[0].id, email: SUPERADMIN.email, created: false, password: newPassword };
  }
  const newPassword = password || generatePassword();
  const hash = await bcrypt.hash(newPassword, 10);
  const { rows: created } = await query(
    `INSERT INTO users (email, password_hash, name, rating_score, role, profile_complete)
     VALUES ($1, $2, $3, $4, 'admin', true) RETURNING id`,
    [SUPERADMIN.email, hash, SUPERADMIN.name, ratingScore(1000)]
  );
  await query('INSERT INTO skill_stats (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [created[0].id]);
  return { id: created[0].id, email: SUPERADMIN.email, created: true, password: newPassword };
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  ensureSuperadmin({ password: process.env.SUPERADMIN_PASSWORD, resetPassword: process.argv.includes('--reset-password') })
    .then((r) => {
      console.log(`superadmin ${r.created ? 'created' : 'verified'}: ${r.email} (#${r.id}, role admin)`);
      if (r.password) console.log(`password: ${r.password}`);
      else console.log('password unchanged (use --reset-password to rotate)');
      return pool.end();
    })
    .catch((err) => {
      console.error('create-admin failed:', err.message);
      process.exit(1);
    });
}
