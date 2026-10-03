CREATE TABLE IF NOT EXISTS segev_sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS segev_workspaces (
  user_id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS segev_sessions_expires_idx ON segev_sessions (expires_at);
CREATE TABLE IF NOT EXISTS segev_login_attempts (
  email text PRIMARY KEY,
  failures integer NOT NULL DEFAULT 0,
  first_failure timestamptz NOT NULL DEFAULT now()
);
