# GlobalVBC — Volleyball Rating & Player Recognition Platform

**Design spec** · 2026-06-27 · Status: approved for planning

## 1. Product summary

A mobile-first web app that lets local volleyball players build a reputation:
track matches, earn ratings/rankings, unlock recognition badges, and showcase a
shareable profile. Experience blends **Strava** (progress), **LinkedIn** (player
identity), and **Chess.com** (ratings & rankings).

**North-star UX:** a player understands their rating, recent progress, and next
milestone within 10 seconds of opening the dashboard.

**Value prop:** "Build your volleyball reputation. Track your games. Earn recognition."

## 2. Scope (MVP)

Full-stack MVP delivered as a monorepo, mirroring the LocalSportsClub project
conventions. In scope:

- Landing page (conversion-focused, 8 sections)
- Auth (email/password, JWT)
- Onboarding (6 steps)
- Player dashboard (identity + performance hub)
- Match recording + ELO/0–10 rating engine
- Recognition badges + skill stats
- Leaderboard scoped to a local community
- Shareable profile card with QR
- Empty states throughout
- Responsive (mobile-first) + light/dark mode + accessibility
- Seed data + Vercel deploy config

Out of scope (future): organizer/league/tournament-admin tooling, payments,
realtime, native apps, social graph/follows.

## 3. Tech stack (mirrors LocalSportsClub)

```
globalvbc/
  frontend/   React 18 + Vite + Tailwind v3 + recharts + @tanstack/react-query
              + react-router-dom + axios + vitest
  backend/    Express 4 + PostgreSQL (pg) + JWT (jsonwebtoken) + bcrypt
              + helmet + cors + express-rate-limit + pino + vitest
  docs/       spec + plan
```

- Frontend talks to backend over a REST API (axios + react-query).
- Auth: JWT in Authorization header; bcrypt-hashed passwords.
- DB migrations: plain SQL files run by a small migrate runner (LSC pattern).

## 4. Branding — Hybrid

Foundation reuses LocalSportsClub tokens (gold/amber brand ramp, warm cream
surfaces, light + dark mode) with an **electric-blue accent** layered in.

### Color tokens (CSS variables, `rgb(r g b)` triplets, consumed by Tailwind)

Brand (gold/amber — reserved for **ratings & badges**):
```
--brand-50  253 248 239   --brand-300 232 192 106   --brand-600 160 112 26
--brand-100 249 237 207   --brand-400 212 162 62    --brand-700 128 88 24
--brand-200 242 216 158   --brand-500 192 138 34    --brand-900 58 40 16
```

Accent (electric blue — **primary CTAs, progress, energy**):
```
--accent-400 96 165 250   --accent-500 37 99 235   --accent-600 29 78 216
```

Tertiary (purple — sparingly, for variety in charts/badges):
```
--violet-500 139 92 246
```

Surfaces, text, borders, status: reuse the LSC ramp (`surface-0..900`,
`bg-page/card/surface/elevated`, `text-primary/secondary/muted/inverse`,
`border-default/strong`, `status-success/warning/active`). Dark mode is the
default theme; light mode via `.light` root override (LSC pattern).

### Typography
- Display: `Playfair Display`, Georgia, serif
- Body: `Source Sans 3`, Helvetica Neue, sans-serif
- Mono: `IBM Plex Mono`, Consolas, monospace

### UI principles
Mobile-first, large type, clean spacing, premium card-based layout, friendly
gamification, strong hierarchy, WCAG AA contrast, fast scanning.

## 5. Rating model

Two linked metrics (mirrors LSC's ELO + UTR pairing):

- **ELO points** — internal, starts at **1000**. Updates per match via standard
  ELO (K-factor 32, scaled by score margin). Drives the leaderboard and the
  per-match `+12 / −5` deltas shown on match cards.
- **Rating Score (0–10)** — display headline (e.g. `8.3`). Derived from ELO by a
  normalization: `clamp(0, 10, (elo - 600) / 140)` (≈ 1000 ELO → 2.9, 1800 ELO →
  8.6). Tunable; documented in code.

**Skill stats** (0–100 each, aggregated from match inputs): serving, passing,
attack efficiency, defense, consistency; plus **MVP count** (integer).

A new player with no matches has no rating until their first match is recorded
(empty state drives onboarding).

## 6. Data model (PostgreSQL)

- **communities** `id, name, slug, city, created_at`
- **users** `id, email, password_hash, name, photo_url, position
  (setter|libero|outside_hitter|middle_blocker|opposite), community_id,
  elo (default 1000), rating_score, win_streak, profile_complete, created_at`
- **matches** `id, user_id, opponent_name, result (won|lost), score_for,
  score_against, played_at, elo_before, elo_after, elo_delta, is_mvp, created_at`
- **rating_history** `id, user_id, elo, rating_score, recorded_at`
- **badges** `id, key, name, description, icon, criteria_json`
- **user_badges** `id, user_id, badge_id, earned_at` (unique user+badge)
- **skill_stats** `user_id (pk), serving, passing, attack, defense, consistency,
  mvp_count, updated_at`

Derived (queries, not tables): leaderboard (rank by elo within community,
movement vs last week), win rate, monthly matches.

## 7. API surface (REST, `/api`)

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET/PATCH /profile` · `GET /profile/:id` (public, for shareable card)
- `GET/POST /matches` · per-match returns rating delta + any newly earned badges
- `GET /stats` (skill stats + trends: rating trend, win-rate trend, monthly matches)
- `GET /badges` (all, with earned/locked + requirements) 
- `GET /leaderboard?community=…&window=week` (nearby positions + movement)
- `GET /communities`
- `GET /games/upcoming` (stub list; empty-state friendly for MVP)

All mutating routes require JWT. Public profile + leaderboard read endpoints are
unauthenticated.

## 8. Screens & components

### Landing page (8 sections)
Nav (Logo, Features, Rankings, How It Works, Sign In, **Join as Player**) ·
Hero (headline "Build Your Volleyball Reputation.", primary **Join as Player**,
secondary **View Sample Profile**, hero visual = profile card w/ rating, rank
badge, match history, badges, progress graph) · Social proof (players joined,
matches tracked, communities + testimonials) · How It Works (5-step horizontal
timeline) · Features (6 cards) · Dashboard preview ("Your Volleyball Identity":
8.3 rating, #14 rank, 48 matches, 68% win rate, badges, graph) · Final CTA ·
Footer (About, Contact, Privacy, Terms, social).

### Onboarding (6 steps)
Create profile → Select position → Add first match → Receive initial rating →
Explore rankings → Share profile.

### Player dashboard
- **Header:** photo, name, rating, local rank, position, **Share Profile**, **Edit Profile**
- **6 summary cards:** Rating Score · Local Rank · Matches Played · Win Rate ·
  Current Win Streak · Badges Earned
- **Performance:** rating trend chart, win-rate trend, monthly matches,
  improvement indicator ("Rating 8.3 ↑ +0.4 this month", "3 wins from Top 10")
- **Match history:** opponent, result, score, date, rating ±
- **Skill stats:** serving/passing/attack/defense/consistency progress + MVP count
- **Recognition center:** earned + locked badges with unlock requirements
- **Leaderboard widget:** nearby positions, rating, movement, weekly progress
- **Shareable profile card:** photo, rating, rank, position, win rate, badges, QR, share
- **Upcoming games:** matches/events/activity; empty → "No upcoming games. Join a
  local match." CTA **Find a Match**

### Empty states
No matches → "No Matches Yet" / Record First Match · Incomplete profile →
"Complete Your Volleyball Profile" / Complete Profile · No badges → "Recognition
Starts Here" / View Badge Guide.

### Badges (initial set)
Rising Star · Top Server · Consistent Performer · Community Favorite ·
Tournament MVP. Each has `criteria_json` evaluated by the rules engine after each
match.

### Shared component library
Button (primary/secondary/ghost), Card, StatCard, RankPill, RatingBadge,
ProgressBar, BadgeChip (earned/locked), Avatar, ChartCard (recharts wrappers),
EmptyState, AppNav/Header, ThemeToggle, QRCode.

## 9. Work decomposition → GitHub issues

One issue per task. Build order: A → (B,C) → (D,E) → F/G/H → I → J.

- **A — Foundation & Design System:** monorepo scaffold, Tailwind hybrid
  tokens/fonts, base component library, app shell + routing + theme toggle.
- **B — Backend Auth & Profile:** register/login (JWT), profile CRUD, position,
  photo, profile-complete flag.
- **C — Backend Matches & Rating Engine:** match CRUD, ELO + 0–10 calc, rating
  history, win streak.
- **D — Backend Recognition & Skill Stats:** badge rules engine, skill-stat
  aggregation, earned-on-match hook.
- **E — Backend Leaderboard & Communities:** community model, ranked leaderboard
  + weekly movement.
- **F — Landing Page:** all 8 sections, responsive, conversion-focused.
- **G — Onboarding Flow:** 6 steps wired to API.
- **H — Player Dashboard:** header, 6 cards, performance charts, match history,
  skill stats, recognition center, leaderboard widget, upcoming games, empty states.
- **I — Shareable Profile + QR:** public profile route + card + QR + share.
- **J — Cross-cutting:** responsive/mobile QA, accessibility, Vercel deploy
  config, seed data, README.

## 10. Success criteria

- A new user can register → onboard → record a match → see a rating and rank →
  share their profile, end to end.
- Dashboard communicates rating, recent progress, and next milestone within ~10s.
- Hybrid branding renders consistently in light and dark mode at AA contrast.
- Backend has unit tests for the rating engine and badge rules; frontend has
  smoke tests for key screens.
- App builds and deploys (Vercel) from the repo.
