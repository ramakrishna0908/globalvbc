import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { pool } from '../db.js';
import { HttpError } from '../utils/validation.js';
import { ROLES } from '../services/auth.js';
import { audit, listAudit } from '../services/audit.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/overview', async (_req, res, next) => {
  try {
    const q = async (sql) => (await pool.query(sql)).rows[0].n;
    res.json({
      users: await q('SELECT COUNT(*)::int AS n FROM users'),
      teams: await q('SELECT COUNT(*)::int AS n FROM teams'),
      tournaments: await q('SELECT COUNT(*)::int AS n FROM tournaments'),
      matches: await q('SELECT COUNT(*)::int AS n FROM matches'),
      liveMatches: await q(`SELECT COUNT(*)::int AS n FROM matches WHERE status = 'live'`),
      submittedMatches: await q(`SELECT COUNT(*)::int AS n FROM matches WHERE status = 'submitted'`),
      ratingEvents: await q('SELECT COUNT(*)::int AS n FROM rating_events'),
      auditEntries: await q('SELECT COUNT(*)::int AS n FROM audit_log'),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const { rows } = await pool.query(
      `SELECT id, email, name, role, elo, rating_score, position, created_at FROM users
       WHERE name ILIKE $1 OR email ILIKE $1 ORDER BY created_at DESC LIMIT 200`,
      [q]
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!ROLES.includes(role)) throw new HttpError(400, `Invalid role. Allowed: ${ROLES.join(', ')}`);
    const { rows: before } = await pool.query('SELECT id, role FROM users WHERE id = $1', [req.params.id]);
    if (!before[0]) throw new HttpError(404, 'User not found');
    const { rows } = await pool.query('UPDATE users SET role = $1, updated_at = now() WHERE id = $2 RETURNING id, email, name, role', [role, req.params.id]);
    await audit(pool, { actorId: req.userId, entity: 'user', entityId: req.params.id, action: 'role', before: before[0], after: rows[0], reason: req.body.reason || null });
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/matches', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.status, m.scheduled_at, m.submitted_at, m.sets_a, m.sets_b, t.name AS tournament_name,
              ta.name AS team_a_name, tb.name AS team_b_name, s.name AS scorer_name, m.last_seq
       FROM matches m LEFT JOIN tournaments t ON t.id = m.tournament_id LEFT JOIN teams ta ON ta.id = m.team_a_id
       LEFT JOIN teams tb ON tb.id = m.team_b_id LEFT JOIN users s ON s.id = m.scorer_id
       ORDER BY m.updated_at DESC LIMIT 200`
    );
    res.json({ matches: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/audit', async (req, res, next) => {
  try {
    res.json({ entries: await listAudit(pool, req.query) });
  } catch (err) {
    next(err);
  }
});

export default router;
