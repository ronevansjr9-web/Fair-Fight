-- Evidence files: per-case uploaded documents for the case workspace.
--
-- Wave 4 (2026-08): the evidence manager is rebuilt as a REAL, durable,
-- per-case surface. Files are stored as bytea in the same Neon database
-- (no new providers, no new secrets). Evidence is part of the case workspace
-- — available to the signed-in OWNER of the case, with the same ownership
-- model as timeline_entries / calendar_events: every query joins cases on
-- user_id. It is NOT gated behind the $99 paid AI-tool entitlement (that gate
-- is for AI tools only).
--
-- Column contract mirrors src/lib/evidence.ts exactly:
--   - id        -> uuid PK (gen_random_uuid)
--   - case_id   -> TEXT REFERENCES cases(id)  (cases.id is TEXT — gen_random_uuid()::text —
--                  so the FK column must be TEXT, not uuid, for the reference to typecheck)
--   - user_id   -> owner's Clerk user id (denormalized for the list/delete
--                  ownership joins, matching timeline_entries/calendar_events)
--   - filename  -> client filename, sanitized server-side
--   - mime_type -> one of the allowed types enforced by CHECK + server code
--   - size_bytes-> decoded byte length, enforced <= 10 MB by CHECK + server code
--   - data      -> bytea, written with decode($base64,'base64'), read with
--                  encode(data,'base64')
--   - created_at-> server clock at write time
--
-- Runs inside the locked, transactional migration runner
-- (src/lib/migrate.ts) — never request-time DDL.
CREATE TABLE IF NOT EXISTS evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain')),
  size_bytes INT NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 10485760),
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- List + per-case workspace queries: WHERE case_id = $ ORDER BY created_at DESC.
CREATE INDEX IF NOT EXISTS evidence_files_case_created_idx ON evidence_files(case_id, created_at DESC);
-- Ownership/admin queries by user.
CREATE INDEX IF NOT EXISTS evidence_files_user_idx ON evidence_files(user_id);