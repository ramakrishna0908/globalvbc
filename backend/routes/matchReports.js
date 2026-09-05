import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { recordMatch, listMatches } from '../services/ratingEngine.js';

const router = Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const result = await recordMatch(req.userId, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const matches = await listMatches(req.userId, {
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ matches });
  } catch (err) {
    next(err);
  }
});

export default router;
