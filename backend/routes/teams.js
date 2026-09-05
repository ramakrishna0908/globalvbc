import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { listTeams, getTeam, createTeam, updateTeam, addMember, removeMember } from '../services/teams.js';
import { teamStats } from '../services/players.js';

const router = Router();

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    res.json({ teams: await listTeams({ ...req.query, userId: req.userId }) });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    res.status(201).json({ team: await createTeam(req.userId, req.body) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    res.json({ team: await getTeam(req.params.id) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/stats', async (req, res, next) => {
  try {
    res.json(await teamStats(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    res.json({ team: await updateTeam(req.params.id, req.userId, req.userRole, req.body) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/members', requireAuth, async (req, res, next) => {
  try {
    res.status(201).json({ team: await addMember(req.params.id, req.userId, req.userRole, req.body) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/members/:userId', requireAuth, async (req, res, next) => {
  try {
    res.json({ team: await removeMember(req.params.id, req.userId, req.userRole, req.params.userId) });
  } catch (err) {
    next(err);
  }
});

export default router;
