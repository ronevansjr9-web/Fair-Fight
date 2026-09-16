-- First-party, PII-free error capture for the fully-operational mandate.
--
-- The last "operational" component: in-app error capture with NO external
-- service. Errors are reported to our own /api/errors endpoint (client-side
-- captures, source 'client') and to a direct DB insert from the server-side
-- reporter in src/lib/serverErrorReporter.ts (source 'server'). Append-only;
-- rows are never updated or deleted by app code, and nothing here is an
-- entitlement source.
--
-- Payload contract (mirrors src/routes/api/errors.ts and
-- src/lib/errorReporter.ts exactly):
--   - message    -> required, <= 500 chars
--   - stack      -> optional, <= 2000 chars
--   - url        -> optional path, starts with '/', <= 500 chars
--   - user_agent -> optional, <= 500 chars
--   - user_id    -> optional Clerk user id, <= 200 chars (null pre-auth)
--   - client_ts  -> optional client-clock error time (ISO); ingest time is
--                   always the server clock in `ts`
-- The schema CHECKs below are defense-in-depth mirrors of the server-side
-- validation caps, so even a direct writer cannot exceed the contract.
CREATE TABLE IF NOT EXISTS error_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'client',
  message TEXT NOT NULL,
  stack TEXT,
  url TEXT,
  user_agent TEXT,
  user_id TEXT,
  client_ts TIMESTAMPTZ,
  CONSTRAINT error_events_source_check CHECK (source IN ('client', 'server')),
  CONSTRAINT error_events_message_len_check CHECK (char_length(message) <= 500),
  CONSTRAINT error_events_stack_len_check CHECK (stack IS NULL OR char_length(stack) <= 2000),
  CONSTRAINT error_events_url_len_check CHECK (url IS NULL OR char_length(url) <= 500),
  CONSTRAINT error_events_user_agent_len_check CHECK (user_agent IS NULL OR char_length(user_agent) <= 500),
  CONSTRAINT error_events_user_id_len_check CHECK (user_id IS NULL OR char_length(user_id) <= 200)
);
-- Time-series triage ("what broke today") and per-source drill-down
-- ("client vs server failure mix this week").
CREATE INDEX IF NOT EXISTS error_events_ts_idx ON error_events(ts);
CREATE INDEX IF NOT EXISTS error_events_source_ts_idx ON error_events(source, ts);