import Stripe from "stripe";
import { sql } from "~/db";

export type PaymentRecord = {
  checkoutSessionId: string;
  paymentIntentId?: string;
  userId: string;
  caseId: string;
  amountCents: number;
  currency: string;
};

export function getPublicOrigin(env: Record<string, string | undefined> = process.env): string {
  const configured = env.PUBLIC_SITE_URL?.trim() || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "");
  if (configured) return configured.replace(/\/$/, "");
  if (env.NODE_ENV === "production") throw new Error("PUBLIC_SITE_URL (or VERCEL_URL) must be configured in production");
  return "http://localhost:3000";
}

export function checkoutReturnUrls(env?: Record<string, string | undefined>) {
  const origin = getPublicOrigin(env);
  return {
    success_url: `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard?checkout=cancelled`,
  };
}

export async function recordSuccessfulPayment(payment: PaymentRecord): Promise<void> {
  const query = sql();
  await query`
    INSERT INTO payments (checkout_session_id, payment_intent_id, user_id, case_id, amount_cents, currency, status)
    VALUES (${payment.checkoutSessionId}, ${payment.paymentIntentId ?? null}, ${payment.userId}, ${payment.caseId}, ${payment.amountCents}, ${payment.currency}, 'succeeded')
    ON CONFLICT (checkout_session_id) DO UPDATE SET payment_intent_id = EXCLUDED.payment_intent_id,
      amount_cents = EXCLUDED.amount_cents, currency = EXCLUDED.currency, status = 'succeeded'
  `;
}

export async function hasCaseEntitlement(userId: string, caseId: string): Promise<boolean> {
  const rows = await sql()`SELECT 1 FROM payments WHERE user_id=${userId} AND case_id=${caseId} AND status='succeeded' LIMIT 1`;
  return rows.length > 0;
}

export async function hasAnyEntitlement(userId: string): Promise<boolean> {
  const rows = await sql()`SELECT 1 FROM payments WHERE user_id=${userId} AND status='succeeded' LIMIT 1`;
  return rows.length > 0;
}

export function paymentFromCheckoutSession(session: Stripe.Checkout.Session): PaymentRecord | null {
  const metadata = session.metadata ?? {};
  if (session.payment_status !== "paid" || !session.id || !metadata.userId || !metadata.caseId) return null;
  return {
    checkoutSessionId: session.id,
    paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
    userId: metadata.userId,
    caseId: metadata.caseId,
    amountCents: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
  };
}
