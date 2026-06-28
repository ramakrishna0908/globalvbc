# GlobalVBC — Volleyball Rating & Player Recognition Platform

Build your volleyball reputation. Track your games. Earn recognition.

A mobile-first web app for local volleyball players to track matches, earn ELO-based
ratings, unlock recognition badges, climb local leaderboards, and share a profile.
Experience blends **Strava** (progress), **LinkedIn** (identity), and **Chess.com**
(ratings). Branding is a hybrid of LocalSportsClub's warm gold/amber + an electric-blue
accent.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18, Vite, Tailwind v3, recharts, @tanstack/react-query, react-router |
| Backend  | Express 4, PostgreSQL (pg), JWT (bcrypt), helmet, express-rate-limit |
| Tests    | vitest (+ supertest, @testing-library/react) |

## Project layout

```
globalvbc/
  backend/    Express API + Postgres migrations + rating/badge engines
  frontend/   React SPA (landing, auth, onboarding, dashboard, public profile)
  docs/       design spec + implementation plan
```

## Prerequisites

- Node ≥ 20
- PostgreSQL (local or hosted)

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env          # set DATABASE_URL + JWT_SECRET
createdb globalvbc            # or use your hosted Postgres
npm install
npm run db:migrate            # create tables + seed badges/communities
npm run seed                  # optional: 12 demo players with match history
npm start                     # API on :4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                   # app on :5173 (proxies /api -> :4000)
```

Open http://localhost:5173. Demo logins (after `npm run seed`):
`sarah.spiker@globalvbc.demo` / `volleyball123`.

## Tests

```bash
cd backend  && npm test       # rating engine, badges, auth, profile, leaderboard
cd frontend && npm test       # component + landing smoke tests
```

## Rating model

- **ELO** starts at 1000 (K=32, scaled by score margin + opponent strength); drives the
  leaderboard and per-match `+/-` deltas.
- **Rating Score (0–10)** = `clamp(0, 10, (elo - 600) / 140)` — the display headline.

## API

`/api/auth` (register/login/me) · `/api/profile` (+ public `/:id`) · `/api/matches` ·
`/api/stats` · `/api/badges` · `/api/leaderboard` · `/api/communities`.

## Deploy

- **Frontend:** Vercel (`frontend/vercel.json` configures the Vite build + SPA rewrites).
  Set the API origin via a rewrite/proxy or `VITE`-style base if hosting the API separately.
- **Backend:** any Node host (Render, Railway, Fly, Vercel functions) with a Postgres
  add-on; set `DATABASE_URL` + `JWT_SECRET`, run `npm run db:migrate` on deploy.

## Roadmap

Organizer/league/tournament-admin tooling, payments, realtime, native apps.
See [docs/superpowers/specs](docs/superpowers/specs) and
[docs/superpowers/plans](docs/superpowers/plans).
