-- First-party, privacy-respecting route-visit + funnel-event logging.
--
-- Append-only traffic/conversion measurement for the public site. Session
-- identity is a random id kept in the visitor's sessionStorage for the life of
-- the tab (no cookies); UTM attribution comes from query params persisted to
-- sessionStorage. Rows are never updated or deleted — this table is analytics
-- material only, never an entitlement source, and nothing here affects the
-- Stripe/payment core.
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  route TEXT NOT NULL,
  ref TEXT,
  utm JSONB,
  session_id TEXT,
  ev TEXT
);
-- Time-series lookups ("what happened today") and per-route conversion
-- questions ("which /learn guides pull people in, and where do they drop off").
CREATE INDEX IF NOT EXISTS analytics_events_ts_idx ON analytics_events(ts);
CREATE INDEX IF NOT EXISTS analytics_events_route_ts_idx ON analytics_events(route, ts);