import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import matchesRouter from './routes/matches.js';
import statsRouter from './routes/stats.js';
import badgesRouter from './routes/badges.js';
import leaderboardRouter from './routes/leaderboard.js';
import communitiesRouter from './routes/communities.js';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false })
);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/badges', badgesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/communities', communitiesRouter);

// Centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`GlobalVBC API on :${PORT}`));
}
