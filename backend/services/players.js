// Player statistics, match history and rating explanations from scored matches.
import { pool } from '../db.js';
import { HttpError } from '../utils/validation.js';
import { skillScores, STAT_COLUMNS } from '../../shared/engine/index.js';

const SUM_COLS = STAT_COLUMNS.map((c) => `COALESCE(SUM(s.${c}),0)::int AS ${c}`).join(', ');

export async function playerStats(userId) {
  const { rows: users } = await pool.query(
    'SELECT id, name, photo_url, position, elo, rating_score, role, jersey_number, community_id, created_at FROM users WHERE id = $1',
    [userId]
  );
  if (!users[0]) throw new HttpError(404, 'Player not found');
  const { rows: totals } = await pool.query(
    `SELECT COUNT(*)::int AS matches, COUNT(*) FILTER (WHERE s.won)::int AS wins, ${SUM_COLS}, COALESCE(SUM(s.rating_delta),0)::int AS rating_delta
     FROM player_match_stats s WHERE s.user_id = $1`,
    [userId]
  );
  const t = totals[0];
  const { rows: form } = await pool.query(
    `SELECT s.won, m.id AS match_id, m.completed_at FROM player_match_stats s JOIN matches m ON m.id = s.match_id
     WHERE s.user_id = $1 ORDER BY m.completed_at DESC NULLS LAST, m.id DESC LIMIT 10`,
    [userId]
  );
  const { rows: trend } = await pool.query(
    `SELECT rating_after AS elo, delta, created_at, match_id FROM rating_events WHERE user_id = $1 ORDER BY created_at ASC, id ASC`,
    [userId]
  );
  const { rows: teams } = await pool.query(
    `SELECT t.id, t.name, t.logo_url, tm.jersey_number, tm.position FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE tm.user_id = $1 ORDER BY t.name`,
    [userId]
  );
  const { rows: tournaments } = await pool.query(
    `SELECT tr.id, tr.name, tr.status, tr.starts_on, COUNT(*)::int AS matches, COUNT(*) FILTER (WHERE s.won)::int AS wins,
            SUM(s.points)::int AS points
     FROM player_match_stats s JOIN matches m ON m.id = s.match_id JOIN tournaments tr ON tr.id = m.tournament_id
     WHERE s.user_id = $1 GROUP BY tr.id, tr.name, tr.status, tr.starts_on ORDER BY tr.starts_on DESC NULLS LAST`,
    [userId]
  );
  const played = t.matches;
  return {
    player: users[0],
    career: {
      ...t,
      losses: played - t.wins,
      win_rate: played ? Math.round((t.wins / played) * 100) : 0,
      kill_pct: t.attacks ? Math.round((t.kills / t.attacks) * 100) : 0,
      hitting_efficiency: t.attacks ? Math.round(((t.kills - t.attack_errors) / t.attacks) * 1000) / 1000 : 0,
      per_match: played
        ? Object.fromEntries(['points', 'kills', 'aces', 'blocks', 'digs', 'assists', 'errors'].map((c) => [c, Math.round((t[c] / played) * 10) / 10]))
        : {},
    },
    skills: skillScores({ ...t, matches: played }),
    form: form.reverse().map((f) => (f.won ? 'W' : 'L')),
    ratingTrend: trend.map((r) => ({ elo: r.elo, delta: r.delta, date: r.created_at, match_id: r.match_id })),
    teams,
    tournaments,
  };
}

export async function playerMatches(userId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `SELECT m.id, m.status, m.completed_at, m.scheduled_at, m.sets_a, m.sets_b, m.points_a, m.points_b, m.winner_team_id,
            m.tournament_id, t.name AS tournament_name, ta.name AS team_a_name, tb.name AS team_b_name,
            s.side, s.won, s.points, s.kills, s.aces, s.blocks, s.digs, s.assists, s.errors, s.rating_delta, s.attacks, s.attack_errors
     FROM player_match_stats s JOIN matches m ON m.id = s.match_id
     LEFT JOIN tournaments t ON t.id = m.tournament_id
     LEFT JOIN teams ta ON ta.id = m.team_a_id LEFT JOIN teams tb ON tb.id = m.team_b_id
     WHERE s.user_id = $1 ORDER BY m.completed_at DESC NULLS LAST, m.id DESC LIMIT $2 OFFSET $3`,
    [userId, Math.min(Number(limit) || 20, 100), Number(offset) || 0]
  );
  return rows;
}

export async function playerRatingEvents(userId, { limit = 20 } = {}) {
  const { rows } = await pool.query(
    `SELECT r.*, ta.name AS team_a_name, tb.name AS team_b_name, m.sets_a, m.sets_b
     FROM rating_events r LEFT JOIN matches m ON m.id = r.match_id
     LEFT JOIN teams ta ON ta.id = m.team_a_id LEFT JOIN teams tb ON tb.id = m.team_b_id
     WHERE r.user_id = $1 ORDER BY r.created_at DESC, r.id DESC LIMIT $2`,
    [userId, Math.min(Number(limit) || 20, 100)]
  );
  return rows;
}

export async function teamStats(teamId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.photo_url, u.elo, u.rating_score, tm.jersey_number, COALESCE(tm.position, u.position) AS position,
            COUNT(s.match_id)::int AS matches, COUNT(*) FILTER (WHERE s.won)::int AS wins, ${SUM_COLS}, COALESCE(SUM(s.rating_delta),0)::int AS rating_delta
     FROM team_members tm JOIN users u ON u.id = tm.user_id
     LEFT JOIN player_match_stats s ON s.user_id = u.id AND s.team_id = tm.team_id
     WHERE tm.team_id = $1 GROUP BY u.id, u.name, u.photo_url, u.elo, u.rating_score, tm.jersey_number, tm.position, u.position
     ORDER BY points DESC, u.name`,
    [teamId]
  );
  const { rows: trend } = await pool.query(
    `SELECT m.id, m.completed_at, m.winner_team_id = $1 AS won, m.sets_a, m.sets_b, m.points_a, m.points_b, m.team_a_id,
            ta.name AS team_a_name, tb.name AS team_b_name, t.name AS tournament_name
     FROM matches m LEFT JOIN teams ta ON ta.id = m.team_a_id LEFT JOIN teams tb ON tb.id = m.team_b_id LEFT JOIN tournaments t ON t.id = m.tournament_id
     WHERE (m.team_a_id = $1 OR m.team_b_id = $1) AND m.status = 'submitted' ORDER BY m.completed_at DESC NULLS LAST, m.id DESC LIMIT 30`,
    [teamId]
  );
  return { players: rows.map((r) => ({ ...r, skills: skillScores({ ...r }) })), matches: trend };
}

export async function compareBoxes(matchId) {
  const { rows } = await pool.query(
    `SELECT s.*, u.name, u.photo_url, COALESCE(l.jersey_number, u.jersey_number) AS jersey_number
     FROM player_match_stats s JOIN users u ON u.id = s.user_id
     LEFT JOIN match_lineups l ON l.match_id = s.match_id AND l.user_id = s.user_id
     WHERE s.match_id = $1 ORDER BY s.side, s.points DESC`,
    [matchId]
  );
  return rows;
}

const METRICS = {
  rating: { col: 'u.elo', agg: false, label: 'Rating' },
  points: { col: 'points', label: 'Points' },
  kills: { col: 'kills', label: 'Kills' },
  aces: { col: 'aces', label: 'Aces' },
  blocks: { col: 'blocks', label: 'Blocks' },
  digs: { col: 'digs', label: 'Digs' },
  assists: { col: 'assists', label: 'Assists' },
  mvp: { col: 'mvp', label: 'MVP score' },
};
export const LEADERBOARD_METRICS = Object.keys(METRICS);

/**
 * Leaderboard v2 over scored-match stats (or rating). Filters: tournament,
 * team, position, community, season (YYYY), min matches.
 */
export async function leaderboard({ metric = 'rating', tournament, team, position, community, season, limit = 50, userId } = {}) {
  const m = METRICS[metric] || METRICS.rating;
  const params = [];
  const where = [];
  const push = (v) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (position) where.push(`u.position = ${push(position)}`);
  if (community) where.push(`u.community_id = ${push(Number(community))}`);
  if (metric === 'rating') {
    if (team) where.push(`EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id AND tm.team_id = ${push(Number(team))})`);
    if (tournament) where.push(`EXISTS (SELECT 1 FROM player_match_stats s JOIN matches mm ON mm.id = s.match_id WHERE s.user_id = u.id AND mm.tournament_id = ${push(Number(tournament))})`);
    params.push(Math.min(Number(limit) || 50, 200));
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.photo_url, u.position, u.elo, u.rating_score, u.elo AS value,
              (SELECT COUNT(*)::int FROM player_match_stats s WHERE s.user_id = u.id) AS matches,
              (SELECT t.name FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE tm.user_id = u.id ORDER BY tm.joined_at LIMIT 1) AS team_name
       FROM users u ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY u.elo DESC, u.id ASC LIMIT $${params.length}`,
      params
    );
    return decorate(rows, userId, m.label);
  }
  const mwhere = [];
  if (team) mwhere.push(`s.team_id = ${push(Number(team))}`);
  if (tournament) mwhere.push(`mm.tournament_id = ${push(Number(tournament))}`);
  if (season) mwhere.push(`EXTRACT(YEAR FROM mm.completed_at) = ${push(Number(season))}`);
  const valueExpr = metric === 'mvp' ? 'SUM(s.points) + SUM(s.digs) * 0.5 + SUM(s.assists) * 0.5 + SUM(s.blocks) * 0.5 - SUM(s.errors)' : `SUM(s.${m.col})`;
  params.push(Math.min(Number(limit) || 50, 200));
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.photo_url, u.position, u.elo, u.rating_score, COUNT(*)::int AS matches,
            ROUND(${valueExpr})::int AS value, SUM(s.points)::int AS points, SUM(s.kills)::int AS kills, SUM(s.aces)::int AS aces,
            SUM(s.blocks)::int AS blocks, SUM(s.digs)::int AS digs, SUM(s.assists)::int AS assists, SUM(s.errors)::int AS errors,
            (SELECT t.name FROM teams t WHERE t.id = MAX(s.team_id)) AS team_name
     FROM player_match_stats s JOIN users u ON u.id = s.user_id JOIN matches mm ON mm.id = s.match_id
     ${[...where, ...mwhere].length ? `WHERE ${[...where, ...mwhere].join(' AND ')}` : ''}
     GROUP BY u.id, u.name, u.photo_url, u.position, u.elo, u.rating_score
     HAVING ${valueExpr} > 0
     ORDER BY value DESC, matches ASC, u.id ASC LIMIT $${params.length}`,
    params
  );
  return decorate(rows, userId, m.label);
}

function decorate(rows, userId, label) {
  return {
    label,
    entries: rows.map((r, i) => ({ rank: i + 1, ...r, rating_score: Number(r.rating_score), isYou: userId ? Number(r.id) === Number(userId) : false })),
  };
}
