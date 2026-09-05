// Tournament progression: after a match is submitted, fill placeholder matches
// (bracket winners/losers, pool ranks) and roll up division/tournament status.
import { advance, standings } from '../../shared/engine/index.js';

/** Standings rows for one pool (or the whole division when poolId is null). */
export async function poolStandings(db, divisionId, poolId = null) {
  const teamRows = poolId
    ? await db.query('SELECT team_id FROM pool_teams WHERE pool_id = $1 ORDER BY seed NULLS LAST, team_id', [poolId])
    : await db.query(
        `SELECT team_id FROM tournament_registrations r
         WHERE r.division_id = $1 AND r.status = 'approved' ORDER BY r.seed NULLS LAST, r.team_id`,
        [divisionId]
      );
  const teams = teamRows.rows.map((r) => r.team_id);
  const { rows: matches } = await db.query(
    `SELECT team_a_id, team_b_id, winner_team_id, sets_a, sets_b, points_a, points_b, status
     FROM matches WHERE division_id = $1 ${poolId ? 'AND pool_id = $2' : "AND bracket_stage = 'pool'"}`,
    poolId ? [divisionId, poolId] : [divisionId]
  );
  const results = matches.map((m) => ({
    teamA: m.team_a_id,
    teamB: m.team_b_id,
    winner: m.status === 'submitted' ? m.winner_team_id : null,
    setsA: m.sets_a,
    setsB: m.sets_b,
    pointsA: m.points_a,
    pointsB: m.points_b,
  }));
  const complete = matches.length > 0 && matches.every((m) => m.status === 'submitted' || m.status === 'cancelled');
  return { teams, rows: standings(teams, results), complete, played: matches.filter((m) => m.status === 'submitted').length, total: matches.length };
}

/**
 * Fill teams into placeholder matches of a division from results + pool
 * standings. Returns the list of matches that were updated.
 */
export async function advanceDivision(db, divisionId) {
  const { rows: matches } = await db.query(
    `SELECT id, bracket_key, bracket_stage, bracket_round, bracket_slot, bracket_type, pool_id, team_a_id, team_b_id,
            source_a, source_b, winner_team_id, status
     FROM matches WHERE division_id = $1 AND bracket_key IS NOT NULL`,
    [divisionId]
  );
  if (!matches.length) return [];
  const resultsByKey = new Map();
  for (const m of matches) {
    if (m.status === 'submitted' && m.winner_team_id) {
      const loser = m.winner_team_id === m.team_a_id ? m.team_b_id : m.team_a_id;
      resultsByKey.set(m.bracket_key, { winner: m.winner_team_id, loser });
    }
  }
  const { rows: pools } = await db.query('SELECT id, name FROM pools WHERE division_id = $1', [divisionId]);
  const poolRankings = new Map();
  for (const p of pools) {
    const s = await poolStandings(db, divisionId, p.id);
    if (s.complete) poolRankings.set(p.name, s.rows);
  }
  const specs = matches.map((m) => ({
    key: m.bracket_key,
    stage: m.bracket_stage,
    round: m.bracket_round,
    slot: m.bracket_slot,
    teamA: m.team_a_id,
    teamB: m.team_b_id,
    sourceA: m.source_a || undefined,
    sourceB: m.source_b || undefined,
    id: m.id,
  }));
  const filled = advance(specs, resultsByKey, poolRankings);
  const updated = [];
  for (let i = 0; i < specs.length; i++) {
    const before = specs[i];
    const after = filled[i];
    if (before.teamA === after.teamA && before.teamB === after.teamB) continue;
    if (after.teamA != null && after.teamB != null && after.teamA === after.teamB) continue;
    await db.query('UPDATE matches SET team_a_id = $1, team_b_id = $2, updated_at = now() WHERE id = $3 AND status = $4', [
      after.teamA,
      after.teamB,
      before.id,
      'scheduled',
    ]);
    updated.push({ id: before.id, key: before.key, teamA: after.teamA, teamB: after.teamB });
  }
  return updated;
}

/** Called inside the submit transaction. */
export async function advanceAfterMatch(db, match) {
  const updated = await advanceDivision(db, match.division_id);
  // Division complete when every match is submitted/cancelled and has teams.
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status IN ('submitted','cancelled'))::int AS done
     FROM matches WHERE division_id = $1`,
    [match.division_id]
  );
  const divisionComplete = rows[0].total > 0 && rows[0].done === rows[0].total;
  await db.query(`UPDATE divisions SET status = $1 WHERE id = $2`, [divisionComplete ? 'completed' : 'live', match.division_id]);
  // Tournament goes live on first submitted match; organizer publishes final results explicitly.
  await db.query(`UPDATE tournaments SET status = 'live', updated_at = now() WHERE id = $1 AND status = 'published'`, [match.tournament_id]);
  return { updated, divisionComplete };
}

/** Champion of a division (winner of the final, or #1 of the round robin). */
export async function divisionChampion(db, divisionId) {
  const { rows: finals } = await db.query(
    `SELECT winner_team_id FROM matches WHERE division_id = $1 AND status = 'submitted' AND bracket_type = 'final'
     ORDER BY bracket_round DESC LIMIT 1`,
    [divisionId]
  );
  if (finals[0]?.winner_team_id) return finals[0].winner_team_id;
  const s = await poolStandings(db, divisionId, null);
  return s.complete && s.rows[0] ? s.rows[0].teamId : null;
}
