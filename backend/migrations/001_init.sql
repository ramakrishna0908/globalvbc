-- GlobalVBC initial schema

CREATE TABLE IF NOT EXISTS communities (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  city        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  email            TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  name             TEXT NOT NULL,
  photo_url        TEXT,
  position         TEXT CHECK (position IN (
                     'setter','libero','outside_hitter','middle_blocker','opposite')),
  community_id     INTEGER REFERENCES communities(id) ON DELETE SET NULL,
  elo              INTEGER NOT NULL DEFAULT 1000,
  rating_score     NUMERIC(4,1) NOT NULL DEFAULT 0,
  win_streak       INTEGER NOT NULL DEFAULT 0,
  profile_complete BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matches (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_name TEXT NOT NULL,
  result        TEXT NOT NULL CHECK (result IN ('won','lost')),
  score_for     INTEGER NOT NULL,
  score_against INTEGER NOT NULL,
  played_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  elo_before    INTEGER NOT NULL,
  elo_after     INTEGER NOT NULL,
  elo_delta     INTEGER NOT NULL,
  is_mvp        BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_id, played_at DESC);

CREATE TABLE IF NOT EXISTS rating_history (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  elo          INTEGER NOT NULL,
  rating_score NUMERIC(4,1) NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rating_history_user ON rating_history(user_id, recorded_at);

CREATE TABLE IF NOT EXISTS badges (
  id           SERIAL PRIMARY KEY,
  key          TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL,
  icon         TEXT,
  criteria_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS user_badges (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id  INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS skill_stats (
  user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  serving     INTEGER NOT NULL DEFAULT 0,
  passing     INTEGER NOT NULL DEFAULT 0,
  attack      INTEGER NOT NULL DEFAULT 0,
  defense     INTEGER NOT NULL DEFAULT 0,
  consistency INTEGER NOT NULL DEFAULT 0,
  mvp_count   INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
