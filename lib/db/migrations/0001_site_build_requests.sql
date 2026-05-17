-- Idempotent migration that ensures the `site_build_requests` table matches
-- `lib/db/src/schema/site-build-requests.ts`.
--
-- Applied to the production database (DATABASE_URL_PROD) on 2026-05-17 as
-- part of task #5. Kept in the repo so the same DDL can be re-run safely
-- against any environment (dev, staging, prod) and so schema state is
-- auditable / replayable instead of living only as ad-hoc psql commands.
--
-- Why hand-written SQL instead of `drizzle-kit push --force`:
--   `drizzle-kit push` hangs on an interactive prompt asking whether the
--   `film_aspect_ratio` enum is new or a rename of `clip_type` (an unrelated
--   schema change). `--force` only auto-confirms data-loss prompts, not enum
--   rename disambiguation, so the push cannot complete non-interactively.
--   This file applies only the Build My Site columns and leaves the enum
--   reconciliation to a separate follow-up.

CREATE TABLE IF NOT EXISTS site_build_requests (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  tier text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  waitlist_position integer,
  has_github boolean NOT NULL DEFAULT false,
  github_username text,
  has_domain boolean NOT NULL DEFAULT false,
  domain text,
  repo_url text,
  hosting_url text,
  admin_notes text,
  notified_email boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE site_build_requests ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE site_build_requests ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE site_build_requests ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE site_build_requests ADD COLUMN IF NOT EXISTS waitlist_position integer;
ALTER TABLE site_build_requests ADD COLUMN IF NOT EXISTS has_github boolean NOT NULL DEFAULT false;
ALTER TABLE site_build_requests ADD COLUMN IF NOT EXISTS github_username text;
ALTER TABLE site_build_requests ADD COLUMN IF NOT EXISTS has_domain boolean NOT NULL DEFAULT false;
ALTER TABLE site_build_requests ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE site_build_requests ADD COLUMN IF NOT EXISTS repo_url text;
ALTER TABLE site_build_requests ADD COLUMN IF NOT EXISTS hosting_url text;
ALTER TABLE site_build_requests ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE site_build_requests ADD COLUMN IF NOT EXISTS notified_email boolean NOT NULL DEFAULT false;
ALTER TABLE site_build_requests ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE site_build_requests ADD COLUMN IF NOT EXISTS completed_at timestamptz;
