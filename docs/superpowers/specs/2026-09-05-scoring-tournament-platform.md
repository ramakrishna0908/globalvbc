# GlobalVBC — Scoring, Ratings & Tournament Platform

**Architecture + product spec** · 2026-09-05 · Status: approved for implementation

This spec extends the 2026-06-27 player-rating MVP into a full volleyball scoring,
player-action tracking, rating and tournament platform. The north-star workflow is:

> A scorer standing courtside scores a rally in one tap and records a player action in two,
> without looking away from the game, and never loses data when the network drops.

## 1. What exists today (preserved)

- `backend/` Express 4 + Postgres, JWT auth, self-reported `matches` (one row per player),
  ELO engine (`utils/elo.js`), badges, communities, leaderboard.
- `frontend/` React 18 + Vite + Tailwind v3, landing, auth, onboarding, player dashboard,
  public profile with QR share.
- 26 backend + 10 frontend vitest tests, all green.
- Single Vercel project: SPA + Express as one serverless function (`api/index.js`).

Everything above keeps working. The self-reported match flow is renamed to
**match reports** (`player_match_reports` table, `/api/match-reports`) so the word
"match" is free for the real scored-match domain.

## 2. Architectural decisions

| Decision | Choice | Why |
|---|---|---|
| Language | Plain ESM JavaScript + JSDoc (no TS migration) | Matches the codebase; no rewrite. "No type errors" is enforced by `tsc --checkJs` on the shared engine. |
| Scoring source of truth | **Append-only `match_events` log**, state derived by a pure reducer | Auditable, undoable, offline-syncable, replayable. |
| Shared engine | `shared/engine/` — pure JS imported by both frontend and backend | Same reducer computes optimistic state on the tablet and authoritative state on the server. No drift. |
| Offline | Local outbox in `localStorage` per match; events carry client UUIDs; server insert is idempotent | Scoring never blocks on the network. |
| Realtime | Sequence-based polling (`GET /live?after=seq`, 2–3 s) via a `useLiveMatch` transport hook | Vercel serverless has no WebSockets; polling of a tiny diff endpoint is reliable and cheap. Hook is the seam for SSE/WS later. |
| Ratings | Versioned, configurable rating engine (`shared/engine/rating.js`), writes `rating_events` with human-readable reasons | Explainable, testable, no hidden formulas. |
| Tournament formats | Format generators behind one interface (`shared/engine/formats/*`) | Round robin, pools, single/double elimination, pool+knockout without hard-coding one format. |
| Roles | `users.role` ∈ player/scorer/coach/organizer/admin; role-aware nav; `requireRole` middleware | Simple, sufficient for MVP. Organizers own tournaments; scorers are assigned per match. |

## 3. Domain model (new tables, migration 004+)

```
users(+role, +team_id?)                 teams(id, name, logo_url, coach_user_id, community_id, elo)
team_members(team_id, user_id, jersey_number, position, is_captain)
venues(id, name, city)                  courts(id, venue_id, name)
tournaments(id, name, slug, organizer_id, venue_id, status[draft|published|live|completed],
            starts_on, ends_on, format, settings jsonb: {setsToWin, setPoints, decidingSetPoints,
            winByTwo, pointCap})
divisions(id, tournament_id, name, format, settings jsonb)
tournament_registrations(id, tournament_id, division_id, team_id, status[pending|approved|rejected])
pools(id, division_id, name)  pool_teams(pool_id, team_id, seed)
matches(id, tournament_id?, division_id?, pool_id?, court_id?, team_a_id, team_b_id,
        scorer_id?, status[scheduled|live|completed|submitted|cancelled], format jsonb,
        scheduled_at, bracket_round?, bracket_slot?, winner_team_id?, sets_a, sets_b,
        submitted_at, state_snapshot jsonb, last_seq)
match_lineups(match_id, team_id, user_id, jersey_number, position, rotation_slot 1-6|bench)
match_events(id, match_id, seq, client_event_id UNIQUE(match_id,client_event_id), type,
             payload jsonb, created_by, created_at, undone BOOLEAN, undone_by_seq)
player_match_stats(match_id, user_id, team_id, points, kills, attack_errors, aces, serve_errors,
                   blocks, block_assists, digs, assists, receptions, reception_errors, defensive_errors,
                   rating_delta)
rating_events(id, user_id, match_id, version, rating_before, rating_after, delta, reason, factors jsonb)
audit_log(id, actor_id, entity, entity_id, action, before jsonb, after jsonb, reason, created_at)
notifications(id, user_id, type, payload jsonb, read_at)
```

Existing `badges`, `user_badges`, `rating_history`, `skill_stats`, `communities` stay.

## 4. Event model

Every scoring change is an event. Types:

| type | payload |
|---|---|
| `MATCH_START` | `{ servingTeam, lineups }` |
| `RALLY_WON` | `{ team, actionType?, playerId? }` |
| `PLAYER_ACTION` | `{ team, playerId, actionType, outcome? }` |
| `TIMEOUT` | `{ team }` |
| `SUBSTITUTION` | `{ team, out, in }` |
| `SET_START` | `{ servingTeam? }` |
| `UNDO` | `{ targetSeq }` |
| `MATCH_END` | `{}` |

Action types: `serve, ace, serve_error, receive, receive_positive, receive_negative, set, assist,
attack, kill, attack_error, block, block_assist, dig, defensive_error`.

`reduce(state, event)` in `shared/engine/match.js` is pure. `deriveState(format, events)` folds the
log. Undo is itself an event (`UNDO {targetSeq}`), so the log stays append-only and auditable;
reducer skips undone events. Set completion, win-by-two, point cap, rotation and server tracking
all live in the reducer. `deriveStats(events)` produces per-player box scores.

## 5. Offline + sync

- Local store: `gvbc-match:<id>` = `{ events[], outbox[] }`.
- Every event gets `clientEventId` (uuid) and `clientTs`.
- `useMatchSession` applies events locally first (<16 ms), then queues them.
- `syncOutbox` posts `POST /api/matches/:id/events` in order; server returns assigned `seq`.
  Duplicate `clientEventId` → 200 with the existing seq (idempotent).
- Connection banner: ONLINE / OFFLINE — SAVING LOCALLY / SYNCING….
- On reload, local events are replayed, then reconciled with the server log.

## 6. Rating engine v2

`shared/engine/rating.js` — version `2.0.0`, config object:

```
{ K: 32, marginWeight: 0.5, performanceWeight: 0.35, tournamentMultiplier: {friendly:0.8, local:1, regional:1.2},
  actionValues: { kill:1, ace:1.5, block:1.2, block_assist:0.6, dig:0.5, assist:0.4, receive_positive:0.3,
                  attack_error:-1, serve_error:-0.8, receive_negative:-0.5, defensive_error:-0.7 } }
```

Per player: `expected = logistic(playerElo, opponentTeamElo)`; `base = K * margin * (actual - expected)`;
`performance = clamp(-1,1, (actionScore - teamMedian) / spread) * performanceWeight * K`;
`delta = round((base + performance) * tournamentMultiplier)`. Each `rating_events` row stores
factors + a sentence ("Won vs stronger opponent (+9); above-team-average performance (+3)").

## 7. API surface (new)

```
POST   /api/auth/register            {role}      GET /api/auth/me
GET    /api/teams  POST /api/teams  GET/PATCH /api/teams/:id  POST /api/teams/:id/members  DELETE .../members/:userId
GET    /api/tournaments  POST  GET/PATCH /:id  POST /:id/publish
POST   /api/tournaments/:id/register      PATCH /api/tournaments/:id/registrations/:rid
POST   /api/tournaments/:id/divisions     POST /api/tournaments/:id/divisions/:did/generate
GET    /api/tournaments/:id/standings     GET /api/tournaments/:id/bracket
GET    /api/matches?scorer=me|tournament=  POST /api/matches (setup)  GET /api/matches/:id
POST   /api/matches/:id/lineups  POST /api/matches/:id/start
POST   /api/matches/:id/events   (batch, idempotent)  GET /api/matches/:id/events?after=seq
GET    /api/matches/:id/live     (state + recent rallies)
POST   /api/matches/:id/submit   (validate → stats → ratings → standings → badges)
GET    /api/players/:id/stats    GET /api/players/:id/matches
GET    /api/leaderboard?metric=rating|kills|aces|blocks|digs|assists&tournament=&team=&position=
GET    /api/admin/*              (users, audit log)
```

## 8. Screens

| Route | Persona | Layout |
|---|---|---|
| `/` | all | Landing: hero, value prop, how it works, rating explainer, live scoring preview, tournaments, profile, leaderboard, testimonials, CTA "Start Scoring" / "Explore Players" |
| `/register` `/login` | all | role picker |
| `/dashboard` | player | existing dashboard + real stats |
| `/p/:id` | public | profile with skills, badges, career stats, match + tournament history |
| `/score` | scorer | scorer dashboard: today's, assigned, active, recent |
| `/score/new` | scorer | match setup: tournament→court→teams→format→lineups→start |
| `/score/:id` | scorer | **live scoring control panel** (tablet-first) |
| `/live/:id` | spectator | live match view |
| `/tournaments`, `/tournaments/:id` | all | list + dashboard (standings, bracket, live) |
| `/tournaments/new`, `/tournaments/:id/manage` | organizer | create/edit, registrations, divisions, schedule, courts, scorers |
| `/teams`, `/teams/:id` | all/coach | team profile, roster, matches |
| `/leaderboard` | all | metric tabs + filters |
| `/admin` | admin | users, audit log |

## 9. Live scoring layout (tablet landscape)

```
┌ Tournament · Court 2 · Set 2 · LIVE · ● ONLINE ───────────────── Undo ┐
│  TEAM A                    12   :   10                    TEAM B      │
│  ● serving  rot 3          [sets 1–0]                  timeouts ●○    │
│ [ TEAM A POINT ]  (huge)                        [ TEAM B POINT ] (huge)│
│ ─ Who made the play? [Kill #7] [Block #4] [Ace #12] [Other] (optional)│
│ QUICK STATS  [DIG] [SET] [SPIKE] [BLOCK] [SERVE] [RECEIVE]            │
│  → tap action → lineup grid of 6 large player buttons → recorded ✓    │
│ Timeline: A 12–10 Kill #7 · B 11–10 · A 11–9 Dig #3 …                  │
└────────────────────────────────────────────────────────────────────────┘
```

Touch targets ≥ 44 px; point buttons ≥ 96 px tall. No dialogs in the rally loop. Undo is one tap.

## 10. Backlog

See GitHub issues (epics #11–#17). Implementation order: Foundation → Scorer → Tournament →
Player/Ratings → Live → Analytics → Quality, because reliable scoring is P0.
