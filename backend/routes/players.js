import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { playerStats, playerMatches, playerRatingEvents, compareBoxes, leaderboard, LEADERBOARD_METRICS } from '../services/players.js';
import { searchPlayers } from '../services/teams.js';

const router = Router();

router.get('/search', async (req, res, next) => {
  try {
    res.json({ players: await searchPlayers(req.query.q, { limit: req.query.limit }) });
  } catch (err) {
    next(err);
  }
});

router.get('/leaderboard', optionalAuth, async (req, res, next) => {
  try {
    res.json({ metrics: LEADERBOARD_METRICS, ...(await leaderboard({ ...req.query, userId: req.userId })) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/stats', async (req, res, next) => {
  try {
    res.json(await playerStats(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/matches', async (req, res, next) => {
  try {
    res.json({ matches: await playerMatches(req.params.id, req.query) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/rating-events', async (req, res, next) => {
  try {
    res.json({ events: await playerRatingEvents(req.params.id, req.query) });
  } catch (err) {
    next(err);
  }
});

router.get('/match/:matchId/boxscore', async (req, res, next) => {
  try {
    res.json({ boxscore: await compareBoxes(req.params.matchId) });
  } catch (err) {
    next(err);
  }
});

export default router;
