-- Base `cases` table. This was the missing visible base schema on master:
-- timeline_entries, calendar_events, and payments all reference cases.id, but
-- no migration created the table. Runs inside the locked, transactional
-- migration runner (src/lib/migrate.ts) — never request-time DDL.
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  case_type TEXT NOT NULL DEFAULT 'Civil',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
  jurisdiction TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cases_user_updated_idx ON cases(user_id, updated_at DESC);
