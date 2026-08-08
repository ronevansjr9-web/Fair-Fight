-- Transaction is owned by scripts/migrate.sh.
-- Durable per-case timeline and calendar records. Run against the same database as cases.
CREATE TABLE IF NOT EXISTS timeline_entries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS timeline_entries_case_date_idx ON timeline_entries(case_id,event_date,created_at);
CREATE TABLE IF NOT EXISTS calendar_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'other',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS calendar_events_case_date_idx ON calendar_events(case_id,event_date,created_at);
