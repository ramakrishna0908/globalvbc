import { Router } from 'express';
import { register, verifyCredentials, getById } from '../services/auth.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { requireFields } from '../utils/validation.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    requireFields(req.body, ['email', 'password', 'name']);
    const user = await register(req.body);
    res.status(201).json({ user, token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    requireFields(req.body, ['email', 'password']);
    const user = await verifyCredentials(req.body);
    res.json({ user, token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json({ user: await getById(req.userId) });
  } catch (err) {
    next(err);
  }
});

export default router;
