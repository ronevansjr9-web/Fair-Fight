import { s as sql } from "./db-D7cnbd5l.js";
import "stripe";
const FAIR_FIGHT_PRICE_CENTS = 9900;
const FAIR_FIGHT_CURRENCY = "usd";
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
function isLocalhostHost(host) {
  return host === "localhost" || host.startsWith("localhost:") || host === "127.0.0.1" || host.startsWith("127.0.0.1:");
}
function hostFromRequest(request) {
  if (!request) return null;
  const raw = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!raw) return null;
  const host = raw.trim().toLowerCase();
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*(?::\d{1,5})?$/.test(host)) return null;
  return host;
}
function getPublicOrigin(env = process.env, request) {
  const reqHost = hostFromRequest(request);
  if (reqHost && !isLocalhostHost(reqHost)) {
    return `https://${reqHost}`;
  }
  const configured = env.PUBLIC_SITE_URL?.trim() || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "");
  if (configured) return configured.replace(/\/$/, "");
  if (env.NODE_ENV === "production") throw new Error("PUBLIC_SITE_URL (or VERCEL_URL) must be configured in production");
  return "http://localhost:3000";
}
function checkoutReturnUrls(env, opts) {
  const origin = getPublicOrigin(env, opts?.request);
  const caseId = opts?.caseId;
  const target = caseId ? "analysis" : "dashboard";
  const caseQuery = caseId ? `caseId=${encodeURIComponent(caseId)}&` : "";
  return {
    success_url: `${origin}/${target}?${caseQuery}checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/${target}?${caseQuery}checkout=cancelled`
  };
}
async function recordSuccessfulPayment(payment) {
  const query = sql();
  await query`
    INSERT INTO payments (checkout_session_id, payment_intent_id, user_id, case_id, amount_cents, currency, status)
    VALUES (${payment.checkoutSessionId}, ${payment.paymentIntentId ?? null}, ${payment.userId}, ${payment.caseId}, ${payment.amountCents}, ${payment.currency}, 'succeeded')
    ON CONFLICT (checkout_session_id) DO NOTHING
  `;
}
async function markPaymentRefunded(paymentIntentId) {
  const query = sql();
  await query`
    UPDATE payments SET status = 'refunded', updated_at = NOW()
    WHERE payment_intent_id = ${paymentIntentId} AND status = 'succeeded'
  `;
}
async function recordWebhookEvent(eventId, eventType) {
  const query = sql();
  const rows = await query`
    INSERT INTO webhook_events (event_id, event_type)
    VALUES (${eventId}, ${eventType})
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `;
  return rows.length > 0;
}
async function hasWebhookEvent(eventId) {
  const query = sql();
  const rows = await query`SELECT 1 FROM webhook_events WHERE event_id = ${eventId} LIMIT 1`;
  return rows.length > 0;
}
async function hasCaseEntitlement(userId, caseId) {
  const rows = await sql()`SELECT 1 FROM payments WHERE user_id=${userId} AND case_id=${caseId} AND status='succeeded' LIMIT 1`;
  return rows.length > 0;
}
function checkoutPolicy(opts) {
  if (!opts.configuredPriceId) return { ok: false, reason: "STRIPE_PRO_PRICE_ID is not configured" };
  if (opts.paymentStatus !== "paid") return { ok: false, reason: "session is not paid" };
  if (opts.mode && opts.mode !== "payment") return { ok: false, reason: "session is not a one-time payment" };
  if (opts.amountTotal !== FAIR_FIGHT_PRICE_CENTS) {
    return { ok: false, reason: `amount ${opts.amountTotal} does not match ${FAIR_FIGHT_PRICE_CENTS}` };
  }
  if (opts.currency !== FAIR_FIGHT_CURRENCY) {
    return { ok: false, reason: `currency ${opts.currency} is not ${FAIR_FIGHT_CURRENCY}` };
  }
  if (opts.lineItemPriceId !== opts.configuredPriceId) {
    return { ok: false, reason: "line item price does not match the configured Pro price" };
  }
  return { ok: true };
}
function paymentFromCheckoutSession(session) {
  const metadata = session.metadata ?? {};
  const userId = metadata.userId;
  const caseId = metadata.caseId;
  if (session.payment_status !== "paid" || !session.id || typeof userId !== "string" || typeof caseId !== "string" || !ID_PATTERN.test(userId) || !ID_PATTERN.test(caseId)) {
    return null;
  }
  return {
    checkoutSessionId: session.id,
    paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : void 0,
    userId,
    caseId,
    amountCents: session.amount_total ?? 0,
    currency: session.currency ?? "usd"
  };
}
async function isCaseOwner(userId, caseId) {
  if (!userId || !caseId || !/^[A-Za-z0-9_-]+$/.test(caseId)) return false;
  const owned = await sql()`SELECT 1 FROM cases WHERE id=${caseId} AND user_id=${userId} LIMIT 1`;
  return owned.length > 0;
}
async function hasOwnedCaseEntitlement(userId, caseId) {
  if (!userId || !caseId || !/^[A-Za-z0-9_-]+$/.test(caseId)) return false;
  return await isCaseOwner(userId, caseId) && await hasCaseEntitlement(userId, caseId);
}
export {
  FAIR_FIGHT_PRICE_CENTS as F,
  recordSuccessfulPayment as a,
  hasOwnedCaseEntitlement as b,
  checkoutPolicy as c,
  hasCaseEntitlement as d,
  checkoutReturnUrls as e,
  FAIR_FIGHT_CURRENCY as f,
  hasWebhookEvent as h,
  isCaseOwner as i,
  markPaymentRefunded as m,
  paymentFromCheckoutSession as p,
  recordWebhookEvent as r
};
