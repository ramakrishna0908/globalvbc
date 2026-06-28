import { Router } from 'express';
import { listCommunities } from '../services/communities.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    res.json({ communities: await listCommunities() });
  } catch (err) {
    next(err);
  }
});

export default router;
