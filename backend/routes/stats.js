import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getStats } from '../services/skillStats.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json(await getStats(req.userId));
  } catch (err) {
    next(err);
  }
});

export default router;
