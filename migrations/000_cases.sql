-- Canonical case workspace schema. This migration is intentionally safe to rerun.
-- Compatibility: if a legacy `cases` table already exists, CREATE TABLE IF NOT EXISTS
-- preserves it; the application requires the columns selected/inserted below and an
-- id-compatible primary key for the foreign-key joins in 001_case_activity.sql.
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  case_type TEXT NOT NULL DEFAULT 'Civil',
  status TEXT NOT NULL DEFAULT 'active',
  jurisdiction TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cases_status_check CHECK (status IN ('active', 'resolved', 'closed'))
);

-- Supports authenticated dashboard listing and per-user case ownership checks.
CREATE INDEX IF NOT EXISTS cases_user_updated_idx ON cases(user_id, updated_at DESC);

-- Payments deliberately keeps case_id as application-level data until its own
-- entitlement migration is reconciled; no unrelated tables or foreign keys belong here.
