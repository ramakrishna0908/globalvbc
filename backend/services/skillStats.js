import { pool } from '../db.js';

const CAP = 25; // nominal points to win a set, used to normalize 0–100 skill scores

function clampPct(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function avg(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Single source of truth for derived player metrics. Used by both the /stats
 * endpoint and the badge engine so a badge can never disagree with the dashboard.
 *
 * @param {Array} matches  rows from `matches` (any order)
 * @param {object} ctx     { winStreak, mvpCount }
 */
export function computeMetrics(matches, { winStreak = 0, mvpCount = 0 } = {}) {
  const played = matches.length;
  const wins = matches.filter((m) => m.result === 'won').length;
  const losses = played - wins;
  const winRate = played ? wins / played : 0;

  const forAvg = avg(matches.map((m) => Number(m.score_for)));
  const againstAvg = avg(matches.map((m) => Number(m.score_against)));
  const marginAvg = avg(matches.map((m) => Number(m.score_for) - Number(m.score_against)));

  // 0–100 skill proxies derived deterministically from match data.
  const serving = clampPct((forAvg / CAP) * 100);
  const attack = clampPct((forAvg / CAP) * 95 + marginAvg);
  const defense = clampPct(((CAP - againstAvg) / CAP) * 100);
  const passing = clampPct((serving + defense) / 2);
  const consistency = clampPct(winRate * 100);

  return {
    matches_played: played,
    wins,
    losses,
    win_rate: Math.round(winRate * 100), // percent
    win_streak: winStreak,
    mvp_count: mvpCount,
    serving,
    passing,
    attack,
    defense,
    consistency,
  };
}

async function loadContext(client, userId) {
  const db = client || pool;
  const { rows: u } = await db.query('SELECT win_streak FROM users WHERE id = $1', [userId]);
  const { rows: s } = await db.query('SELECT mvp_count FROM skill_stats WHERE user_id = $1', [
    userId,
  ]);
  const { rows: matches } = await db.query('SELECT * FROM matches WHERE user_id = $1', [userId]);
  return { matches, winStreak: u[0]?.win_streak ?? 0, mvpCount: s[0]?.mvp_count ?? 0 };
}

/** Metrics for the badge engine, computed on the in-transaction client. */
export async function metricsForUser(client, userId) {
  const ctx = await loadContext(client, userId);
  return computeMetrics(ctx.matches, ctx);
}

/** Full /stats payload: skill metrics + trend series. */
export async function getStats(userId) {
  const ctx = await loadContext(null, userId);
  const metrics = computeMetrics(ctx.matches, ctx);

  const { rows: rating } = await pool.query(
    `SELECT elo, rating_score, recorded_at
     FROM rating_history WHERE user_id = $1
     ORDER BY recorded_at ASC, id ASC`,
    [userId]
  );

  const ratingTrend = rating.map((r) => ({
    date: r.recorded_at,
    rating: Number(r.rating_score),
    elo: r.elo,
  }));

  // Win-rate trend: cumulative win rate after each chronological match.
  const ordered = [...ctx.matches].sort(
    (a, b) => new Date(a.played_at) - new Date(b.played_at) || a.id - b.id
  );
  let cw = 0;
  const winRateTrend = ordered.map((m, i) => {
    if (m.result === 'won') cw += 1;
    return { index: i + 1, winRate: Math.round((cw / (i + 1)) * 100) };
  });

  // Monthly matches played.
  const monthly = {};
  for (const m of ctx.matches) {
    const key = String(m.played_at).slice(0, 7); // YYYY-MM
    monthly[key] = (monthly[key] || 0) + 1;
  }
  const monthlyMatches = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  return { metrics, ratingTrend, winRateTrend, monthlyMatches };
}
