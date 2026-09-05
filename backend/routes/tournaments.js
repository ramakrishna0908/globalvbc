import { Router } from 'express';
import { requireAuth, optionalAuth, requireRole } from '../middleware/auth.js';
import {
  listTournaments,
  getTournament,
  createTournament,
  updateTournament,
  deleteTournament,
  addCourt,
  removeCourt,
  addDivision,
  registerTeam,
  updateRegistration,
  generateSchedule,
  getStandings,
  getBracket,
  publishResults,
  tournamentLeaders,
} from '../services/tournaments.js';

const router = Router();
const ctx = (req) => ({ userId: req.userId, role: req.userRole });

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    res.json({ tournaments: await listTournaments({ ...req.query, userId: req.userId }) });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole('organizer', 'coach', 'scorer'), async (req, res, next) => {
  try {
    res.status(201).json({ tournament: await createTournament(req.userId, req.body) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    res.json({ tournament: await getTournament(req.params.id, ctx(req)) });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    res.json({ tournament: await updateTournament(req.params.id, req.userId, req.userRole, req.body) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await deleteTournament(req.params.id, req.userId, req.userRole);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post('/:id/publish', requireAuth, async (req, res, next) => {
  try {
    res.json({ tournament: await updateTournament(req.params.id, req.userId, req.userRole, { status: 'published' }) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/results', requireAuth, async (req, res, next) => {
  try {
    res.json({ tournament: await publishResults(req.params.id, req.userId, req.userRole) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/courts', requireAuth, async (req, res, next) => {
  try {
    res.status(201).json({ tournament: await addCourt(req.params.id, req.userId, req.userRole, req.body) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/courts/:courtId', requireAuth, async (req, res, next) => {
  try {
    res.json({ tournament: await removeCourt(req.params.id, req.params.courtId, req.userId, req.userRole) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/divisions', requireAuth, async (req, res, next) => {
  try {
    res.status(201).json({ tournament: await addDivision(req.params.id, req.userId, req.userRole, req.body) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/divisions/:divisionId/generate', requireAuth, async (req, res, next) => {
  try {
    res.json(await generateSchedule(req.params.id, req.params.divisionId, req.userId, req.userRole, req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/register', requireAuth, async (req, res, next) => {
  try {
    res.status(201).json({ registration: await registerTeam(req.params.id, req.userId, req.userRole, req.body) });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/registrations/:regId', requireAuth, async (req, res, next) => {
  try {
    res.json({ registration: await updateRegistration(req.params.id, req.params.regId, req.userId, req.userRole, req.body) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/standings', optionalAuth, async (req, res, next) => {
  try {
    res.json({ standings: await getStandings(req.params.id, ctx(req)) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/bracket', optionalAuth, async (req, res, next) => {
  try {
    res.json({ bracket: await getBracket(req.params.id, ctx(req)) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/leaders', async (req, res, next) => {
  try {
    res.json({ leaders: await tournamentLeaders(req.params.id) });
  } catch (err) {
    next(err);
  }
});

export default router;
