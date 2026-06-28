import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getLeaderboard } from '../services/leaderboard.js';

const router = Router();

// Public endpoint. If a valid token is present, "nearby" centers on that user.
function optionalUserId(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET).sub;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

router.get('/', async (req, res, next) => {
  try {
    const aroundUserId = req.query.nearby ? optionalUserId(req) : undefined;
    const result = await getLeaderboard({
      communityId: req.query.community ? Number(req.query.community) : undefined,
      window: req.query.window,
      aroundUserId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
