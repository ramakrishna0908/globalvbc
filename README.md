# GlobalVBC — Volleyball Scoring, Ratings & Tournament Platform

Score any volleyball match rally-by-rally in one tap, track every player action in two,
and turn results into explainable ratings, leaderboards, standings and brackets.

The scorer experience is the heart of the product: a **real-time control panel** that
keeps working when the gym Wi-Fi drops, never loses an event, and needs no typing.

## Personas

| Persona | Home | What they get |
|---|---|---|
| Scorer | `/score` | Assigned/active matches → one-screen setup → live scoring (points, quick stats, undo, sets, submit) |
| Organizer | `/tournaments?mine=1` | Create/publish tournaments, approve registrations, divisions, generate schedules, courts, scorer assignment, standings, brackets, results |
| Coach | `/teams?mine=1` | Teams, rosters, registration, team analytics |
| Player | `/dashboard`, `/p/:id` | Rating + reasons, skills, form, career stats, match/tournament history, badges, shareable profile |
| Spectator | `/live/:id`, `/tournaments/:id`, `/leaderboard` | Live scores (2–3 s), standings, brackets, leaders |
| Admin | `/admin` | Users/roles, matches, full audit log |

## Stack

| Layer | Tech |
|---|---|
| Shared engine | `shared/engine` — pure JS (JSDoc-typed, `tsc --checkJs`): match reducer, stats, rating v2, tournament formats |
| Frontend | React 18, Vite, Tailwind v3, react-router v6, @tanstack/react-query, recharts, vitest + Testing Library |
| Backend | Express 4, PostgreSQL (pg), JWT + bcrypt, helmet, rate-limit, vitest + supertest |
| Deploy | Single Vercel project: SPA + Express as one serverless function (`api/index.js`) |

## Architecture in one paragraph

Every scoring change is an **append-only event** (`MATCH_START`, `RALLY_WON`, `PLAYER_ACTION`,
`TIMEOUT`, `SUBSTITUTION`, `SET_START`, `UNDO`, `MATCH_END`). The tablet applies events to a local
log first (<16 ms) with the shared reducer, persists them in `localStorage`, and syncs an outbox
with idempotent client ids and backoff. The server re-derives state with the *same* reducer,
rejects impossible events, and on submit turns the log into box scores, versioned rating events
(with human-readable reasons), team ratings, standings/bracket advancement, badges and an audit
trail. Spectators poll a tiny diff endpoint (`/live?after=seq`) and fold events locally.
Full spec: [docs/superpowers/specs/2026-09-05-scoring-tournament-platform.md](docs/superpowers/specs/2026-09-05-scoring-tournament-platform.md).

```
globalvbc/
  shared/engine/   match.js (reducer) · stats.js · rating.js · formats.js · __tests__/
  backend/         routes/ services/ migrations/ tests/ (Express + Postgres)
  frontend/        src/pages (scorer/, tournaments/, teams/, …) · components (scoring/, tournament/, ui/) · scoring/ (matchStore, useMatchSession, useLiveMatch)
  api/index.js     Vercel serverless entrypoint
  docs/            specs + plans
```

## Setup

Prerequisites: Node ≥ 20, PostgreSQL.

```bash
# backend
cd backend
cp .env.example .env            # DATABASE_URL, JWT_SECRET
createdb globalvbc
npm install
npm run db:migrate              # tables + reference data (idempotent)
npm run seed                    # demo world: accounts, teams, tournaments, scored matches, a live match
npm run dev                     # API on :4000

# frontend (second terminal)
cd frontend
npm install
npm run dev                     # app on :5173 (proxies /api → :4000)
```

Demo accounts after `npm run seed` (password `volleyball123`):
`ola.organizer@globalvbc.demo` (organizer) · `sam.scorer@globalvbc.demo` / `jess.scorer@globalvbc.demo` (scorers) ·
`cara.coach@globalvbc.demo` (coach) · `admin@globalvbc.demo` (admin) · `sarah.spiker@globalvbc.demo` (player).

## Tests

```bash
npm test                        # root: engine unit tests + backend integration + frontend component tests
npm run typecheck               # JSDoc type check of the shared engine
cd backend  && npm test         # needs TEST_DATABASE_URL (default postgresql://localhost/globalvbc_test) migrated: DATABASE_URL=… node migrate.js
cd frontend && npm test
```

Scorer usability tests (`frontend/src/pages/scorer/LiveScoring.test.jsx`) assert the spec targets:
point ≤ 1 tap, dig/spike ≤ 2 taps, correction ≤ 1 tap, offline scoring loses nothing and syncs
exactly once, set and match completion + validated submission. The backend suite includes the
full organizer → registration → schedule → scorer → submit → ratings/standings → spectator workflow.

## Rating model (v2)

Per player, per submitted match: `K · margin · (result − expected)` where `expected` is the ELO
logistic of the player vs the opponent team's mean rating, plus a bounded performance term from
the player's box score relative to their own team, times a tournament-level multiplier. Every
change is stored in `rating_events` with its factors and a sentence such as
*"Won vs stronger opponent (+9); above-team-average performance (+3)"*. Config and version live in
`shared/engine/rating.js`. The 0–10 display score is `clamp(0,10,(elo−600)/140)`.

## API

`/api/auth` (register w/ role, login, me, forgot, reset) · `/api/profile` · `/api/matches`
(create, lineups, start, **events** [idempotent batch], events?after, **live**, submit, patch) ·
`/api/tournaments` (CRUD, publish, results, courts, divisions, generate, register, registrations,
standings, bracket, leaders) · `/api/teams` (CRUD, members, stats) · `/api/players` (search, stats,
matches, rating-events, leaderboard, match/:id/boxscore) · `/api/admin` (overview, users, matches,
audit) · legacy `/api/match-reports`, `/api/stats`, `/api/badges`, `/api/leaderboard`, `/api/communities`.

## Deploy (Vercel, single project)

`vercel.json` builds the SPA (`frontend/dist`) and rewrites `/api/*` to the Express function.
Set `DATABASE_URL` (+ `DB_SSL_NO_VERIFY=true` for custom-CA poolers) and `JWT_SECRET`, run
`npm run db:migrate` against the production database once per release.
