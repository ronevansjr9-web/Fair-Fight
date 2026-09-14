-- Durable audit log for user-triggered security/legal events.
--
-- Written ONLY by src/lib/audit.ts (logAuditEvent and friends) on every AI
-- generation, document generation, login, etc. The table exists because the
-- ledger already shipped callers that insert into it; without this migration
-- those inserts silently failed (the write is best-effort and swallowed by
-- design — but it must LAND in a real table).
--
-- Column contract mirrors lib/audit.ts exactly:
--   - user_id    -> AuditLog.userId            (Clerk user id)
--   - action     -> AuditLog.action            (AI_ANALYSIS_GENERATED, ...)
--   - resource   -> AuditLog.resource          (source/doc type/case id)
--   - details    -> AuditLog.details, written as JSON.stringify(...) and read
--                  back with JSON.parse(...) in getAuditLogs — so it is TEXT,
--                  not JSONB (JSONB would be double-parsed by getAuditLogs and
--                  silently break it).
--   - ip_address -> AuditLog.ip (nullable)
--   - created_at -> server clock at write time
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL DEFAULT '',
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- getAuditLogs: WHERE user_id = $ ORDER BY created_at DESC LIMIT $.
CREATE INDEX IF NOT EXISTS audit_logs_user_created_idx ON audit_logs(user_id, created_at DESC);
-- Admin/reporting: "recent AI generations" style queries by action.
CREATE INDEX IF NOT EXISTS audit_logs_action_created_idx ON audit_logs(action, created_at DESC);