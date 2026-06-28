import { pool } from '../db.js';
import { STARTING_ELO } from '../utils/elo.js';

const WINDOW_DAYS = { week: 7, month: 30, all: 3650 };

/**
 * Build a community leaderboard ranked by current ELO, annotated with movement
 * and rating change over the requested window.
 *
 * @param {object} opts
 * @param {number} [opts.communityId]  filter to a community (omit = all players)
 * @param {string} [opts.window]       'week' | 'month' | 'all'
 * @param {number} [opts.aroundUserId] return only a ±2 slice centered on this user
 * @returns {Promise<{window:string, entries:Array}>}
 */
export async function getLeaderboard({ communityId, window = 'week', aroundUserId } = {}) {
  const days = WINDOW_DAYS[window] ?? WINDOW_DAYS.week;

  const params = [];
  let where = '';
  if (communityId) {
    params.push(communityId);
    where = `WHERE u.community_id = $${params.length}`;
  }

  const { rows: users } = await pool.query(
    `SELECT u.id, u.name, u.photo_url, u.position, u.elo, u.rating_score, u.community_id
     FROM users u ${where}
     ORDER BY u.elo DESC, u.id ASC`,
    params
  );

  // ELO as of the start of the window (last history snapshot before the cutoff).
  const cutoffParams = [`${days} days`];
  let cutoffWhere = '';
  if (communityId) {
    cutoffParams.push(communityId);
    cutoffWhere = `AND u.community_id = $${cutoffParams.length}`;
  }
  const { rows: pastRows } = await pool.query(
    `SELECT DISTINCT ON (rh.user_id) rh.user_id, rh.elo
     FROM rating_history rh
     JOIN users u ON u.id = rh.user_id
     WHERE rh.recorded_at <= now() - $1::interval ${cutoffWhere}
     ORDER BY rh.user_id, rh.recorded_at DESC`,
    cutoffParams
  );
  const pastElo = new Map(pastRows.map((r) => [r.user_id, r.elo]));

  // Past ranking: order the same user set by their past ELO.
  const pastRanking = [...users]
    .map((u) => ({ id: u.id, elo: pastElo.get(u.id) ?? STARTING_ELO }))
    .sort((a, b) => b.elo - a.elo || a.id - b.id);
  const pastRank = new Map(pastRanking.map((u, i) => [u.id, i + 1]));

  const entries = users.map((u, i) => {
    const rank = i + 1;
    const prevRank = pastRank.get(u.id) ?? rank;
    const delta = prevRank - rank; // positive = climbed
    const prevElo = pastElo.get(u.id) ?? STARTING_ELO;
    return {
      rank,
      userId: u.id,
      name: u.name,
      photo_url: u.photo_url,
      position: u.position,
      elo: u.elo,
      rating_score: Number(u.rating_score),
      movement: delta > 0 ? 'up' : delta < 0 ? 'down' : 'same',
      rankDelta: delta,
      weeklyProgress: u.elo - prevElo,
      isYou: aroundUserId ? u.id === Number(aroundUserId) : false,
    };
  });

  if (aroundUserId) {
    const idx = entries.findIndex((e) => e.userId === Number(aroundUserId));
    if (idx !== -1) {
      const start = Math.max(0, idx - 2);
      return { window, entries: entries.slice(start, idx + 3) };
    }
  }

  return { window, entries };
}
