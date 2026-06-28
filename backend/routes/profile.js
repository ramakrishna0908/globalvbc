import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getOwnProfile, getPublicProfile, updateProfile } from '../services/profile.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json({ profile: await getOwnProfile(req.userId) });
  } catch (err) {
    next(err);
  }
});

router.patch('/', requireAuth, async (req, res, next) => {
  try {
    res.json({ profile: await updateProfile(req.userId, req.body) });
  } catch (err) {
    next(err);
  }
});

// Public — must come after '/' routes; matches numeric/string ids.
router.get('/:id', async (req, res, next) => {
  try {
    res.json({ profile: await getPublicProfile(req.params.id) });
  } catch (err) {
    next(err);
  }
});

export default router;
