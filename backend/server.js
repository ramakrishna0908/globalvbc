import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import matchReportsRouter from './routes/matchReports.js';
import statsRouter from './routes/stats.js';
import badgesRouter from './routes/badges.js';
import leaderboardRouter from './routes/leaderboard.js';
import communitiesRouter from './routes/communities.js';
import matchesRouter from './routes/matches.js';
import teamsRouter from './routes/teams.js';
import tournamentsRouter from './routes/tournaments.js';
import playersRouter from './routes/players.js';
import adminRouter from './routes/admin.js';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(rateLimit({ windowMs: 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false }));
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/match-reports', matchReportsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/badges', badgesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/communities', communitiesRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/players', playersRouter);
app.use('/api/admin', adminRouter);

// Centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || (err.name === 'EngineError' ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Internal Server Error', ...(err.details ? { details: err.details } : {}) });
});

const PORT = process.env.PORT || 4000;
// Only run a long-lived listener for local/standalone Node. On Vercel the app is
// imported by the serverless function in /api and must not call listen().
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`GlobalVBC API on :${PORT}`));
}
