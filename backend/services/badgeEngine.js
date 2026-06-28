// Badge rules engine.
// Evaluates each badge's criteria_json ({ metric, gte }) against the player's
// current computed metrics, inside the match transaction so awards are atomic.
import { pool } from '../db.js';
import { metricsForUser } from './skillStats.js';

function meetsCriteria(metrics, criteria) {
  if (!criteria || criteria.metric === undefined) return false;
  const value = metrics[criteria.metric];
  if (typeof value !== 'number') return false;
  if (criteria.gte !== undefined) return value >= criteria.gte;
  return false;
}

/**
 * Evaluate and award any newly-earned badges for a user.
 * @param {import('pg').PoolClient|null} client  in-transaction client (or null for pool)
 * @returns {Promise<Array<{key:string,name:string,icon:string}>>}
 */
export async function evaluateBadges(client, userId) {
  const db = client || pool;
  const metrics = await metricsForUser(db, userId);

  const { rows: badges } = await db.query('SELECT * FROM badges');
  const { rows: earnedRows } = await db.query(
    'SELECT badge_id FROM user_badges WHERE user_id = $1',
    [userId]
  );
  const earned = new Set(earnedRows.map((r) => r.badge_id));

  const newBadges = [];
  for (const badge of badges) {
    if (earned.has(badge.id)) continue;
    const criteria =
      typeof badge.criteria_json === 'string'
        ? JSON.parse(badge.criteria_json)
        : badge.criteria_json;
    if (meetsCriteria(metrics, criteria)) {
      await db.query(
        'INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, badge.id]
      );
      newBadges.push({ key: badge.key, name: badge.name, icon: badge.icon });
    }
  }
  return newBadges;
}

/** All badges with earned/locked status + unlock requirement text. */
export async function listBadges(userId) {
  const { rows: badges } = await pool.query('SELECT * FROM badges ORDER BY id');
  const { rows: earnedRows } = await pool.query(
    'SELECT badge_id, earned_at FROM user_badges WHERE user_id = $1',
    [userId]
  );
  const earnedMap = new Map(earnedRows.map((r) => [r.badge_id, r.earned_at]));

  return badges.map((b) => ({
    key: b.key,
    name: b.name,
    description: b.description,
    icon: b.icon,
    earned: earnedMap.has(b.id),
    earned_at: earnedMap.get(b.id) || null,
    requirement: b.description,
  }));
}
