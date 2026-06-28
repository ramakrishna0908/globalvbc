import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listBadges } from '../services/badgeEngine.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json({ badges: await listBadges(req.userId) });
  } catch (err) {
    next(err);
  }
});

export default router;
