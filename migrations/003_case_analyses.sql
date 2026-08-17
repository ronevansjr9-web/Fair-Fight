-- Durable, single-analysis-per-case workspace for the paid Pro Case Analysis
-- feature. One row per case (UNIQUE(case_id)): generating again overwrites the
-- same row, so refresh/reopen always shows the latest saved analysis.
--
-- All columns are user/model plain text except sources, which is a JSONB array
-- of { title, url, type } objects. The model's output is never rendered as
-- HTML — the client renders these fields as text only.
CREATE TABLE IF NOT EXISTS case_analyses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  case_id TEXT NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  facts TEXT NOT NULL DEFAULT '',
  jurisdiction TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  possible_issues TEXT NOT NULL DEFAULT '',
  candidate_arguments TEXT NOT NULL DEFAULT '',
  counterarguments TEXT NOT NULL DEFAULT '',
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS case_analyses_user_case_idx ON case_analyses(user_id, case_id);
