import { pool } from '../db.js';
import { HttpError, requireFields } from '../utils/validation.js';
import { nextElo, ratingScore } from '../utils/elo.js';
import { evaluateBadges } from './badgeEngine.js';

/**
 * Record a match and apply rating changes atomically.
 * Returns { match, ratingDelta, ratingScoreAfter, newBadges }.
 */
export async function recordMatch(userId, body) {
  requireFields(body, ['opponent_name', 'result', 'score_for', 'score_against']);
  if (!['won', 'lost'].includes(body.result)) {
    throw new HttpError(400, "result must be 'won' or 'lost'");
  }
  const scoreFor = Number(body.score_for);
  const scoreAgainst = Number(body.score_against);
  if (!Number.isFinite(scoreFor) || !Number.isFinite(scoreAgainst)) {
    throw new HttpError(400, 'scores must be numbers');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: userRows } = await client.query(
      'SELECT id, elo, win_streak FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    const user = userRows[0];
    if (!user) throw new HttpError(404, 'User not found');

    const eloBefore = user.elo;
    const eloAfter = nextElo(eloBefore, {
      opponentElo: body.opponent_elo ?? eloBefore,
      result: body.result,
      scoreFor,
      scoreAgainst,
    });
    const eloDelta = eloAfter - eloBefore;
    const scoreAfter = ratingScore(eloAfter);
    const isWin = body.result === 'won';
    const isMvp = Boolean(body.is_mvp);
    const newStreak = isWin ? user.win_streak + 1 : 0;

    const { rows: matchRows } = await client.query(
      `INSERT INTO matches
        (user_id, opponent_name, result, score_for, score_against, played_at,
         elo_before, elo_after, elo_delta, is_mvp)
       VALUES ($1,$2,$3,$4,$5, COALESCE($6, CURRENT_DATE), $7,$8,$9,$10)
       RETURNING *`,
      [
        userId,
        body.opponent_name,
        body.result,
        scoreFor,
        scoreAgainst,
        body.played_at ?? null,
        eloBefore,
        eloAfter,
        eloDelta,
        isMvp,
      ]
    );

    await client.query(
      'UPDATE users SET elo = $1, rating_score = $2, win_streak = $3 WHERE id = $4',
      [eloAfter, scoreAfter, newStreak, userId]
    );

    await client.query(
      'INSERT INTO rating_history (user_id, elo, rating_score) VALUES ($1, $2, $3)',
      [userId, eloAfter, scoreAfter]
    );

    if (isMvp) {
      await client.query(
        `UPDATE skill_stats SET mvp_count = mvp_count + 1, updated_at = now() WHERE user_id = $1`,
        [userId]
      );
    }

    const newBadges = await evaluateBadges(client, userId);

    await client.query('COMMIT');
    return {
      match: matchRows[0],
      ratingDelta: eloDelta,
      ratingScoreAfter: scoreAfter,
      winStreak: newStreak,
      newBadges,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listMatches(userId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `SELECT * FROM matches WHERE user_id = $1
     ORDER BY played_at DESC, id DESC
     LIMIT $2 OFFSET $3`,
    [userId, Math.min(Number(limit) || 20, 100), Number(offset) || 0]
  );
  return rows;
}
