-- Webhook event idempotency ledger. Stripe redelivers events with the same
-- event id when a handler returns non-2xx or times out; a unique event_id
-- primary key makes replays a no-op instead of double-recording entitlements.
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
