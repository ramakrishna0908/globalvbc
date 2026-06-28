# GlobalVBC MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack, mobile-first volleyball rating & recognition MVP (landing page, auth, onboarding, dashboard, rating engine, badges, leaderboard, shareable profile).

**Architecture:** Monorepo mirroring LocalSportsClub: `frontend/` (React 18 + Vite + Tailwind + recharts + react-query + react-router) talks to `backend/` (Express + PostgreSQL + JWT) over REST. ELO-based rating engine with a derived 0–10 score; badge rules engine evaluated after each match.

**Tech Stack:** React 18, Vite, Tailwind v3, recharts, @tanstack/react-query, react-router-dom, axios, vitest (frontend); Express 4, pg (PostgreSQL), jsonwebtoken, bcrypt, helmet, cors, express-rate-limit, pino, vitest (backend).

## Global Constraints

- Node ≥ 20. Package manager: npm.
- Branding is **hybrid**: gold/amber brand ramp reserved for ratings & badges; electric-blue accent (`--accent-500 = 37 99 235`) for primary CTAs/progress; purple tertiary. Fonts: Playfair Display (display), Source Sans 3 (body), IBM Plex Mono (mono). Dark mode default, light via `.light` root.
- All colors via CSS variables consumed by Tailwind as `rgb(var(--token) / <alpha-value>)`.
- Mobile-first responsive; WCAG AA contrast.
- ELO starts at 1000, K=32; Rating Score = `clamp(0,10,(elo-600)/140)`.
- Backend: JWT in `Authorization: Bearer`, bcrypt password hashing. Public read endpoints: `GET /profile/:id`, `GET /leaderboard`.
- TDD: every code task is failing-test → implement → pass → commit. Frequent commits.
- Match copy from the spec verbatim for headlines/empty states.

## File Structure

```
globalvbc/
  frontend/
    index.html
    package.json  vite.config.js  tailwind.config.js  postcss.config.js
    src/
      main.jsx  App.jsx  index.css
      api/        axios client + endpoint modules (auth, matches, stats, badges, leaderboard, profile)
      components/ Button, Card, StatCard, RankPill, RatingBadge, ProgressBar,
                  BadgeChip, Avatar, ChartCard, EmptyState, AppHeader, ThemeToggle, QRCode (+ co-located tests)
      context/    AuthContext, ThemeContext
      hooks/      useAuth, useTheme, query hooks
      pages/      Landing, Login, Register, Onboarding, Dashboard, PublicProfile, NotFound
      data/       mock seed for previews/empty-state demos
      lib/        rating display helpers, formatters
      test/       setup
  backend/
    package.json  server.js  db.js  migrate.js
    migrations/   NNN_*.sql
    routes/       auth, profile, matches, stats, badges, leaderboard, communities, games
    services/     ratingEngine, badgeEngine, skillStats, leaderboard
    middleware/   auth (JWT), error handler
    utils/        elo, validation
    tests/        unit (ratingEngine, badgeEngine), integration (matches flow)
    seed.js
  docs/superpowers/{specs,plans}/
  vercel.json
```

Build order: **A → (B,C) → (D,E) → F/G/H → I → J.**

---

## Epic A — Foundation & Design System

**Goal:** Monorepo scaffold + hybrid design tokens + base component library + app shell with routing and theme toggle. After this epic, `npm run dev` in both apps runs; a styled component gallery / app shell renders in light & dark.

### Task A1: Monorepo + backend scaffold

**Files:**
- Create: `backend/package.json`, `backend/server.js`, `backend/db.js`, `backend/.env.example`, `backend/.gitignore`
- Create: `.gitignore` (root), `README.md` (root, update)

**Interfaces:**
- Produces: Express app on `PORT` (default 4000) with `GET /api/health` → `{ ok: true }`. `db.js` exports `pool` (pg Pool) + `query(text, params)`.

- [ ] **Step 1: Write the failing test** — `backend/tests/unit/health.test.js`
```js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js';

describe('health', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Create `backend/package.json`** with deps (express, pg, jsonwebtoken, bcrypt, cors, helmet, express-rate-limit, dotenv, pino) and devDeps (vitest, supertest); scripts: `dev`, `start`, `test`, `db:migrate`, `seed`. Run `npm install`.

- [ ] **Step 3: Run test to verify it fails** — `cd backend && npx vitest run tests/unit/health.test.js` → FAIL (cannot import server).

- [ ] **Step 4: Implement `backend/server.js`**
```js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

export const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`API on :${PORT}`));
}
```
And `backend/db.js`:
```js
import pg from 'pg';
const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const query = (text, params) => pool.query(text, params);
```

- [ ] **Step 5: Run test to verify it passes** → PASS.

- [ ] **Step 6: Commit** — `git add backend .gitignore README.md && git commit -m "feat(backend): scaffold Express app with health check"`

### Task A2: Database schema migrations

**Files:**
- Create: `backend/migrate.js`, `backend/migrations/001_init.sql`

**Interfaces:**
- Produces: tables `communities, users, matches, rating_history, badges, user_badges, skill_stats` per spec §6. `node migrate.js` applies pending SQL files idempotently (tracked in a `_migrations` table).

- [ ] **Step 1:** Write `backend/migrations/001_init.sql` creating all tables from spec §6 with the exact columns, FKs, and the `position` CHECK constraint and `UNIQUE(user_id, badge_id)`.
- [ ] **Step 2:** Implement `migrate.js`: read `migrations/*.sql` sorted, skip those already in `_migrations`, run each in a transaction, record filename.
- [ ] **Step 3:** Run `node migrate.js` against a local/Supabase Postgres → verify tables exist (`\dt`). (If no DB available locally, document `DATABASE_URL` in `.env.example` and defer live run to Epic J.)
- [ ] **Step 4: Commit** — `git commit -m "feat(backend): initial DB schema + migration runner"`

### Task A3: Frontend scaffold + Tailwind hybrid tokens

**Files:**
- Create: `frontend/package.json`, `frontend/vite.config.js`, `frontend/index.html`, `frontend/tailwind.config.js`, `frontend/postcss.config.js`, `frontend/src/main.jsx`, `frontend/src/App.jsx`, `frontend/src/index.css`

**Interfaces:**
- Produces: Vite dev server; Tailwind configured with `brand`, `accent`, `violet`, `surface`, `bg-*`, `text-*`, `border-*`, `status-*` colors + `display/body/mono` fonts. `index.css` defines `:root` (dark) and `.light` token blocks.

- [ ] **Step 1:** Create `package.json` (react, react-dom, react-router-dom, @tanstack/react-query, axios, recharts; dev: vite, @vitejs/plugin-react, tailwindcss, postcss, autoprefixer, vitest, @testing-library/react, jsdom). `npm install`.
- [ ] **Step 2:** Create `tailwind.config.js` extending colors from CSS vars (copy LSC pattern + add `accent` and `violet`) and the three font families.
- [ ] **Step 3:** Create `index.css` with `@tailwind` directives, Google Fonts import, `:root` dark tokens + `.light` tokens (brand/surface/accent ramps from spec §4), base `body` styles.
- [ ] **Step 4:** Create `index.html` (fonts preconnect, root div), `main.jsx` (mount App with QueryClientProvider + BrowserRouter), `App.jsx` (placeholder route rendering a token swatch + a heading in Playfair).
- [ ] **Step 5:** Run `npm run dev`, confirm page renders with gold heading + blue button swatch. 
- [ ] **Step 6: Commit** — `git commit -m "feat(frontend): scaffold Vite app with hybrid design tokens"`

### Task A4: Theme context + ThemeToggle (light/dark)

**Files:**
- Create: `frontend/src/context/ThemeContext.jsx`, `frontend/src/components/ThemeToggle.jsx`, `frontend/src/components/ThemeToggle.test.jsx`

**Interfaces:**
- Produces: `ThemeProvider`, `useTheme()` → `{ theme, toggle }`; toggles `.light` class on `document.documentElement`; persists to `localStorage`.

- [ ] **Step 1: Failing test** — render `ThemeToggle` in provider, click, assert `documentElement.classList` toggles `light` and `localStorage` updates.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement ThemeContext (default dark) + ThemeToggle button (sun/moon).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(frontend): theme context + toggle"`

### Task A5: Base component library

**Files:**
- Create: `frontend/src/components/{Button,Card,StatCard,RankPill,RatingBadge,ProgressBar,BadgeChip,Avatar,EmptyState,ChartCard}.jsx` + co-located `Button.test.jsx`, `StatCard.test.jsx`, `EmptyState.test.jsx`

**Interfaces:**
- Produces (props each later epic relies on):
  - `Button({ variant='primary'|'secondary'|'ghost', size, ...})` — primary = accent-blue bg.
  - `Card({ className, children })` — `bg-bg-card` rounded elevated.
  - `StatCard({ label, value, sublabel, accent='gold'|'blue', icon })`.
  - `RankPill({ rank, movement })` — movement = `up|down|same`.
  - `RatingBadge({ score })` — gold pill showing 0–10.
  - `ProgressBar({ value, max=100, accent })`.
  - `BadgeChip({ name, icon, earned, requirement })` — locked = grayscale + requirement tooltip.
  - `Avatar({ src, name, size })` — initials fallback.
  - `EmptyState({ icon, headline, copy, ctaLabel, onCta })`.
  - `ChartCard({ title, children })` — wraps recharts ResponsiveContainer.

- [ ] **Step 1: Failing tests** — Button renders variant classes; StatCard shows label+value; EmptyState shows headline+copy+CTA and fires `onCta`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement all components (Tailwind tokens only; gold for RatingBadge/RankPill/badges, blue for Button primary/ProgressBar default).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(frontend): base component library"`

### Task A6: App shell, routing, API client

**Files:**
- Create: `frontend/src/api/client.js`, `frontend/src/components/AppHeader.jsx`, `frontend/src/pages/NotFound.jsx`; Modify: `frontend/src/App.jsx`

**Interfaces:**
- Produces: `api` (axios instance, baseURL `/api`, attaches JWT from localStorage). Routes: `/` Landing (stub), `/login`, `/register`, `/onboarding`, `/dashboard`, `/p/:id` PublicProfile (stub), `*` NotFound. `AppHeader` with logo + ThemeToggle.

- [ ] **Step 1:** Implement `api/client.js` (axios + request interceptor for token).
- [ ] **Step 2:** Implement `AppHeader`, `NotFound`, wire all routes in `App.jsx` with stub pages.
- [ ] **Step 3:** Run `npm run dev`, navigate routes, confirm shell + theme toggle work.
- [ ] **Step 4: Commit** — `git commit -m "feat(frontend): app shell, routing, api client"`

---

## Epics B–J — Task blocks (each becomes a GitHub issue)

Each block below is detailed enough to file as an issue and to expand into bite-sized TDD steps at execution time. Every task follows the same cycle: **failing test → implement → pass → commit**, under the Global Constraints.

### Epic B — Backend Auth & Profile

- **B1 Auth service + routes:** `POST /api/auth/register` (bcrypt hash, create user with elo=1000, profile_complete=false), `POST /api/auth/login` (verify, return JWT), `GET /api/auth/me`. Files: `routes/auth.js`, `services/auth.js`, `middleware/auth.js`, `utils/validation.js`, `tests/unit/auth.test.js`. Acceptance: register→login→/me round-trips; bad creds → 401; duplicate email → 409.
- **B2 Profile routes:** `GET /api/profile` (self), `PATCH /api/profile` (name, photo_url, position, community_id → sets profile_complete when photo+position present), `GET /api/profile/:id` (public subset). Files: `routes/profile.js`, `services/profile.js`, tests. Acceptance: PATCH updates + flips profile_complete; public route omits email.

### Epic C — Backend Matches & Rating Engine

- **C1 ELO util (pure):** `utils/elo.js` → `nextElo(elo, opponentElo=elo, result, marginFactor)`, `ratingScore(elo)`. Unit-tested table (win raises, loss lowers, margin scales, score clamps 0–10). 
- **C2 Rating/match service + routes:** `POST /api/matches` (compute elo_before/after/delta via C1, update user elo+rating_score+win_streak, append rating_history, return `{ match, ratingDelta, newBadges:[] }`), `GET /api/matches` (paginated, newest first). Files: `services/ratingEngine.js`, `routes/matches.js`, `tests/integration/matches.test.js`. Acceptance: first match sets initial rating; deltas match ELO math; streak resets on loss.

### Epic D — Backend Recognition & Skill Stats

- **D1 Skill stats service:** `services/skillStats.js` aggregates per-user serving/passing/attack/defense/consistency (from match inputs/derived) + mvp_count; `GET /api/stats` returns stats + trends (rating trend from rating_history, win-rate trend, monthly matches). Tests for aggregation.
- **D2 Badge rules engine:** `services/badgeEngine.js` evaluates `badges.criteria_json` after each match (hook into C2), inserts `user_badges`, returns newly earned. Seed 5 badges (Rising Star, Top Server, Consistent Performer, Community Favorite, Tournament MVP) with criteria. `GET /api/badges` → earned + locked + requirements. Tests: each badge triggers on its criteria; no double-award (unique constraint).

### Epic E — Backend Leaderboard & Communities

- **E1 Communities:** `GET /api/communities`; seed a few. `routes/communities.js`.
- **E2 Leaderboard:** `GET /api/leaderboard?community=&window=week` → ranked by elo within community with `movement` (compare to rating_history ~7 days ago) and weekly progress; supports a "nearby me" slice (±2 around the authed user). Files: `services/leaderboard.js`, `routes/leaderboard.js`, tests. Acceptance: correct ordering, movement up/down/same, nearby slice centers on user.

### Epic F — Landing Page

- **F1 Landing page:** `pages/Landing.jsx` + section components (`HeroVisual`, `SocialProof`, `HowItWorks`, `FeatureGrid`, `DashboardPreview`, `FinalCTA`, `Footer`) under `components/landing/`. All 8 spec sections with exact copy ("Build Your Volleyball Reputation.", CTAs "Join as Player"/"View Sample Profile"), responsive, hybrid branding, recharts mini progress graph in hero/preview. Smoke test: renders headline + both CTAs; CTA routes to `/register` and `/p/sample`. Acceptance: mobile + desktop layouts; AA contrast.

### Epic G — Onboarding Flow

- **G1 Onboarding wizard:** `pages/Onboarding.jsx` + step components: (1) Create profile, (2) Select position (Setter/Libero/Outside Hitter/Middle Blocker/Opposite), (3) Add first match, (4) Receive initial rating (animated reveal), (5) Explore rankings, (6) Share profile. Persists via profile + matches APIs; progress indicator. Acceptance: completing the flow creates a profile + first match and lands on dashboard with a real rating.

### Epic H — Player Dashboard

- **H1 Dashboard header + summary cards:** `pages/Dashboard.jsx`, header (photo, name, rating, local rank, position, Share/Edit buttons), 6 StatCards (Rating, Local Rank, Matches, Win Rate, Win Streak, Badges). Query hooks via react-query.
- **H2 Performance section:** rating trend + win-rate trend (recharts), monthly matches bar, improvement indicator ("Rating 8.3 ↑ +0.4 this month", "You're only 3 wins away from reaching the Top 10").
- **H3 Match history + skill stats:** match cards (opponent, result, score, date, ±rating); skill-stat progress bars + MVP count.
- **H4 Recognition center + leaderboard widget + upcoming games:** earned/locked badges with requirements; nearby leaderboard with movement; upcoming games list with empty state ("No upcoming games. Join a local match." / Find a Match).
- **H5 Empty states:** No Matches, Incomplete Profile, No Badges per spec copy, wired to CTAs. 
- Acceptance: dashboard conveys rating/progress/next milestone within ~10s; all empty states reachable.

### Epic I — Shareable Profile + QR

- **I1 Public profile + QR:** `pages/PublicProfile.jsx` (route `/p/:id`) rendering the shareable card (photo, rating, rank, position, win rate, badges, QR to the profile URL, share button using Web Share API w/ clipboard fallback). Lightweight QR via a small lib or generated SVG. Acceptance: unauthenticated load works; QR encodes the profile URL; share copies link.

### Epic J — Cross-cutting

- **J1 Seed data:** `backend/seed.js` — communities, demo players with matches/ratings/badges so leaderboard + sample profile (`/p/sample`) look real.
- **J2 Responsive + a11y pass:** audit breakpoints, focus states, aria labels, contrast.
- **J3 Deploy config:** `vercel.json` (frontend) + backend deploy notes; env documentation; `npm run build` green.
- **J4 README:** setup, env, run, deploy.

---

## Self-Review

- **Spec coverage:** Landing (F), auth (B1), onboarding (G), dashboard incl. all sections + empty states (H), rating engine (C), badges + skill stats (D), leaderboard + communities (E), shareable profile + QR (I), branding/responsive/a11y/deploy/seed (A3/J). All spec §8 screens mapped. ✓
- **Placeholders:** Epic A fully specified with code; B–J are intentionally task-level blocks (expanded to bite-sized steps at execution per subagent-driven-development) — acceptable given multi-subsystem scope. Live DB run deferred to J where noted.
- **Type consistency:** `nextElo`/`ratingScore` (C1) consumed by ratingEngine (C2); `newBadges` returned by C2 produced by badgeEngine (D2); component props in A5 reused by F–I. ✓
