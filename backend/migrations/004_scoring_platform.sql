-- GlobalVBC scoring, ratings & tournament platform (spec 2026-09-05 §3)

-- ---------------------------------------------------------------------------
-- 1. Legacy self-reported matches become "match reports"; "matches" is now the
--    real scored-match entity.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.player_match_reports') IS NULL AND to_regclass('public.matches') IS NOT NULL THEN
    ALTER TABLE matches RENAME TO player_match_reports;
    ALTER INDEX IF EXISTS idx_matches_user RENAME TO idx_player_match_reports_user;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Roles + password resets
-- ---------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player'
    CHECK (role IN ('player','scorer','coach','organizer','admin')),
  ADD COLUMN IF NOT EXISTS jersey_number INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS password_resets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. Teams
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  logo_url       TEXT,
  coach_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  community_id   INTEGER REFERENCES communities(id) ON DELETE SET NULL,
  elo            INTEGER NOT NULL DEFAULT 1000,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id        INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jersey_number  INTEGER,
  position       TEXT CHECK (position IN ('setter','libero','outside_hitter','middle_blocker','opposite')),
  is_captain     BOOLEAN NOT NULL DEFAULT false,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- ---------------------------------------------------------------------------
-- 4. Venues, courts, tournaments, divisions, registrations, pools
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venues (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  city        TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournaments (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  description    TEXT,
  organizer_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  venue_id       INTEGER REFERENCES venues(id) ON DELETE SET NULL,
  location       TEXT,
  level          TEXT NOT NULL DEFAULT 'local' CHECK (level IN ('friendly','local','regional','national')),
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','live','completed','cancelled')),
  starts_on      DATE,
  ends_on        DATE,
  registration_open BOOLEAN NOT NULL DEFAULT true,
  format         TEXT NOT NULL DEFAULT 'round_robin'
    CHECK (format IN ('round_robin','pool_play','single_elimination','double_elimination','pool_knockout','custom')),
  settings       JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {setsToWin, setPoints, decidingSetPoints, winByTwo, pointCap, pools, advance}
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status, starts_on);
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer ON tournaments(organizer_id);

CREATE TABLE IF NOT EXISTS courts (
  id             SERIAL PRIMARY KEY,
  tournament_id  INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (tournament_id, name)
);

CREATE TABLE IF NOT EXISTS divisions (
  id             SERIAL PRIMARY KEY,
  tournament_id  INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  format         TEXT NOT NULL DEFAULT 'round_robin'
    CHECK (format IN ('round_robin','pool_play','single_elimination','double_elimination','pool_knockout','custom')),
  settings       JSONB NOT NULL DEFAULT '{}'::jsonb,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','scheduled','live','completed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, name)
);

CREATE TABLE IF NOT EXISTS tournament_registrations (
  id             SERIAL PRIMARY KEY,
  tournament_id  INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  division_id    INTEGER REFERENCES divisions(id) ON DELETE SET NULL,
  team_id        INTEGER NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','withdrawn')),
  seed           INTEGER,
  requested_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, team_id)
);
CREATE INDEX IF NOT EXISTS idx_registrations_tournament ON tournament_registrations(tournament_id, status);

CREATE TABLE IF NOT EXISTS pools (
  id           SERIAL PRIMARY KEY,
  division_id  INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  UNIQUE (division_id, name)
);

CREATE TABLE IF NOT EXISTS pool_teams (
  pool_id  INTEGER NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  team_id  INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  seed     INTEGER,
  PRIMARY KEY (pool_id, team_id)
);

-- ---------------------------------------------------------------------------
-- 5. Matches, lineups, events (append-only), stats
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
  id              SERIAL PRIMARY KEY,
  tournament_id   INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  division_id     INTEGER REFERENCES divisions(id) ON DELETE SET NULL,
  pool_id         INTEGER REFERENCES pools(id) ON DELETE SET NULL,
  court_id        INTEGER REFERENCES courts(id) ON DELETE SET NULL,
  team_a_id       INTEGER REFERENCES teams(id) ON DELETE RESTRICT,
  team_b_id       INTEGER REFERENCES teams(id) ON DELETE RESTRICT,
  scorer_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','live','completed','submitted','cancelled')),
  format          JSONB NOT NULL DEFAULT '{}'::jsonb,
  level           TEXT NOT NULL DEFAULT 'local' CHECK (level IN ('friendly','local','regional','national')),
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  submitted_at    TIMESTAMPTZ,
  bracket_key     TEXT,          -- format-engine key (e.g. W-R2-1, PA-R3-2)
  bracket_stage   TEXT,          -- pool | bracket
  bracket_round   INTEGER,
  bracket_slot    INTEGER,
  bracket_type    TEXT,          -- winners | losers | final
  source_a        JSONB,         -- placeholder source for team A
  source_b        JSONB,
  winner_team_id  INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  sets_a          INTEGER NOT NULL DEFAULT 0,
  sets_b          INTEGER NOT NULL DEFAULT 0,
  points_a        INTEGER NOT NULL DEFAULT 0,
  points_b        INTEGER NOT NULL DEFAULT 0,
  state_snapshot  JSONB,
  last_seq        INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (team_a_id IS NULL OR team_b_id IS NULL OR team_a_id <> team_b_id)
);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id, division_id);
CREATE INDEX IF NOT EXISTS idx_matches_scorer ON matches(scorer_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_teams ON matches(team_a_id, team_b_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_bracket_key ON matches(tournament_id, division_id, bracket_key)
  WHERE bracket_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS match_lineups (
  match_id       INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id        INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  side           CHAR(1) NOT NULL CHECK (side IN ('A','B')),
  jersey_number  INTEGER,
  position       TEXT,
  rotation_slot  INTEGER CHECK (rotation_slot BETWEEN 1 AND 6),   -- NULL = bench
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS match_events (
  id               BIGSERIAL PRIMARY KEY,
  match_id         INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  seq              INTEGER NOT NULL,
  client_event_id  TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN
                     ('MATCH_START','RALLY_WON','PLAYER_ACTION','TIMEOUT','SUBSTITUTION','SET_START','UNDO','MATCH_END')),
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_ts        TIMESTAMPTZ,
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, seq),
  UNIQUE (match_id, client_event_id)
);
CREATE INDEX IF NOT EXISTS idx_match_events_match_seq ON match_events(match_id, seq);

CREATE TABLE IF NOT EXISTS player_match_stats (
  match_id          INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id           INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  side              CHAR(1) NOT NULL CHECK (side IN ('A','B')),
  won               BOOLEAN NOT NULL DEFAULT false,
  points            INTEGER NOT NULL DEFAULT 0,
  kills             INTEGER NOT NULL DEFAULT 0,
  attacks           INTEGER NOT NULL DEFAULT 0,
  attack_errors     INTEGER NOT NULL DEFAULT 0,
  aces              INTEGER NOT NULL DEFAULT 0,
  serves            INTEGER NOT NULL DEFAULT 0,
  serve_errors      INTEGER NOT NULL DEFAULT 0,
  blocks            INTEGER NOT NULL DEFAULT 0,
  block_assists     INTEGER NOT NULL DEFAULT 0,
  digs              INTEGER NOT NULL DEFAULT 0,
  assists           INTEGER NOT NULL DEFAULT 0,
  sets              INTEGER NOT NULL DEFAULT 0,
  receptions        INTEGER NOT NULL DEFAULT 0,
  receive_positive  INTEGER NOT NULL DEFAULT 0,
  receive_negative  INTEGER NOT NULL DEFAULT 0,
  defensive_errors  INTEGER NOT NULL DEFAULT 0,
  errors            INTEGER NOT NULL DEFAULT 0,
  rating_delta      INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_player_match_stats_user ON player_match_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_player_match_stats_team ON player_match_stats(team_id);

-- ---------------------------------------------------------------------------
-- 6. Ratings, audit, notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rating_events (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id       INTEGER REFERENCES matches(id) ON DELETE SET NULL,
  version        TEXT NOT NULL,
  rating_before  INTEGER NOT NULL,
  rating_after   INTEGER NOT NULL,
  delta          INTEGER NOT NULL,
  reason         TEXT NOT NULL,
  factors        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rating_events_user ON rating_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  action      TEXT NOT NULL,
  before      JSONB,
  after       JSONB,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

-- ---------------------------------------------------------------------------
-- 7. Scored-match badges
-- ---------------------------------------------------------------------------
INSERT INTO badges (key, name, description, icon, criteria_json) VALUES
  ('ace_machine',     'Ace Machine',     'Serve 10 aces in scored matches',        '🎯', '{"metric":"aces","gte":10}'),
  ('the_wall',        'The Wall',        'Record 25 blocks in scored matches',     '🧱', '{"metric":"blocks","gte":25}'),
  ('floor_general',   'Floor General',   'Dish out 50 assists in scored matches',  '🧠', '{"metric":"assists","gte":50}'),
  ('dig_master',      'Dig Master',      'Record 50 digs in scored matches',       '🛡️', '{"metric":"digs","gte":50}'),
  ('iron_player',     'Iron Player',     'Play 5 scored matches in one tournament','⚙️', '{"metric":"max_matches_in_tournament","gte":5}'),
  ('tournament_champ','Champion',        'Win a tournament',                       '🏆', '{"metric":"tournament_wins","gte":1}'),
  ('scored_debut',    'On the Board',    'Play your first officially scored match','📋', '{"metric":"scored_matches","gte":1}')
ON CONFLICT (key) DO NOTHING;
