import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import {
  createMatch,
  listMatches,
  getMatch,
  setLineups,
  startMatch,
  appendEvents,
  getEventsAfter,
  getLive,
  submitMatch,
  updateMatch,
} from '../services/matches.js';

const router = Router();

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const matches = await listMatches({ ...req.query, userId: req.userId });
    res.json({ matches });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    res.status(201).json({ match: await createMatch(req.userId, req.userRole, req.body) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    res.json({ match: await getMatch(req.params.id) });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    res.json({ match: await updateMatch(req.params.id, req.userId, req.userRole, req.body) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/lineups', requireAuth, async (req, res, next) => {
  try {
    res.json({ lineups: await setLineups(req.params.id, req.userId, req.userRole, req.body) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/start', requireAuth, async (req, res, next) => {
  try {
    res.json({ match: await startMatch(req.params.id, req.userId, req.userRole, req.body) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/events', requireAuth, async (req, res, next) => {
  try {
    const events = Array.isArray(req.body) ? req.body : req.body.events;
    res.json(await appendEvents(req.params.id, req.userId, req.userRole, events));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/events', optionalAuth, async (req, res, next) => {
  try {
    res.json({ events: await getEventsAfter(req.params.id, req.query.after) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/live', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await getLive(req.params.id, req.query.after));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/submit', requireAuth, async (req, res, next) => {
  try {
    res.json(await submitMatch(req.params.id, req.userId, req.userRole, { confirmWarnings: Boolean(req.body?.confirmWarnings) }));
  } catch (err) {
    next(err);
  }
});

export default router;
