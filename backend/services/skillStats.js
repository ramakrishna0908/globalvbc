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
  const { rows: matches } = await db.query('SELECT * FROM player_match_reports WHERE user_id = $1', [userId]);
  return { matches, winStreak: u[0]?.win_streak ?? 0, mvpCount: s[0]?.mvp_count ?? 0 };
}

/**
 * Career totals from officially scored matches (player_match_stats). These feed
 * the scored-match badges (aces, blocks, assists, digs, tournament wins…).
 */
export async function scoredMetrics(client, userId) {
  const db = client || pool;
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS scored_matches,
            COUNT(*) FILTER (WHERE won)::int AS scored_wins,
            COALESCE(SUM(points),0)::int AS points, COALESCE(SUM(kills),0)::int AS kills,
            COALESCE(SUM(aces),0)::int AS aces, COALESCE(SUM(blocks),0)::int AS blocks,
            COALESCE(SUM(block_assists),0)::int AS block_assists, COALESCE(SUM(digs),0)::int AS digs,
            COALESCE(SUM(assists),0)::int AS assists, COALESCE(SUM(errors),0)::int AS errors
     FROM player_match_stats WHERE user_id = $1`,
    [userId]
  );
  const { rows: perT } = await db.query(
    `SELECT COALESCE(MAX(c),0)::int AS max_matches_in_tournament FROM (
       SELECT COUNT(*) AS c FROM player_match_stats pms JOIN matches m ON m.id = pms.match_id
       WHERE pms.user_id = $1 AND m.tournament_id IS NOT NULL GROUP BY m.tournament_id) x`,
    [userId]
  );
  const { rows: champs } = await db.query(
    `SELECT COUNT(DISTINCT m.tournament_id)::int AS tournament_wins
     FROM matches m JOIN match_lineups l ON l.match_id = m.id
     WHERE l.user_id = $1 AND m.status = 'submitted' AND m.bracket_type = 'final'
       AND m.winner_team_id = l.team_id`,
    [userId]
  );
  return { ...rows[0], ...perT[0], ...champs[0] };
}

/** Metrics for the badge engine, computed on the in-transaction client. */
export async function metricsForUser(client, userId) {
  const ctx = await loadContext(client, userId);
  const scored = await scoredMetrics(client, userId);
  return { ...computeMetrics(ctx.matches, ctx), ...scored };
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
