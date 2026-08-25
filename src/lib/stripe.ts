import Stripe from "stripe";
import { getRequest } from "@tanstack/react-start/server";
import { checkoutReturnUrls, FAIR_FIGHT_CURRENCY, FAIR_FIGHT_PRICE_CENTS, hasCaseEntitlement } from "~/lib/payment";
import { isCaseOwner } from "~/lib/argumentAccess";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || "";


let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-03-31.basil",
    });
  }
  return _stripe;
}

/**
 * The current request, or undefined when none is in flight (e.g. direct unit
 * tests that invoke server functions outside the request lifecycle). Used to
 * build same-origin checkout return URLs. getRequest() throws when there is no
 * AsyncLocalStorage request context, so we fail soft to env-based fallback.
 */
function currentRequest(): Request | undefined {
  try {
    return getRequest();
  } catch {
    return undefined;
  }
}

/**
 * Server-side product validation: the configured Stripe price must be the
 * Fair Fight Pro Case Analysis one-time $99.00 USD product. Returns an error
 * string when the price is missing or does not match; null when valid.
 */
export async function validateConfiguredProPrice(): Promise<string | null> {
  if (!STRIPE_PRO_PRICE_ID) return "STRIPE_PRO_PRICE_ID environment variable is not configured";
  try {
    const price = await getStripe().prices.retrieve(STRIPE_PRO_PRICE_ID);
    if (price.type !== "one_time") return "Configured price is not a one-time purchase";
    if (price.unit_amount !== FAIR_FIGHT_PRICE_CENTS) return "Configured price is not the $99 USD Pro price";
    if (price.currency !== FAIR_FIGHT_CURRENCY) return "Configured price is not USD";
    return null;
  } catch (error) {
    console.error("Stripe price validation failed:", error);
    return "Failed to validate the configured Stripe price";
  }
}

/**
 * The un-gated core of checkout: ownership verification, configured-price
 * validation, and session creation with exact server-derived metadata.
 * Exported separately so the full decision tree is unit-testable with mocks
 * without tripping the fail-closed gate.
 */
export async function createCheckoutSessionCore(
  userId: string,
  caseId: string
): Promise<{ url: string } | { error: string }> {
  if (!userId || !caseId || !/^[A-Za-z0-9_-]{1,64}$/.test(caseId)) {
    return { error: "Select a valid case before purchasing Pro." };
  }

  // Exact ownership: a user may only buy analysis for their OWN case. The
  // server derives the userId from the Clerk session and verifies the case
  // belongs to them before any Stripe session is created.
  let owned = false;
  try {
    owned = await isCaseOwner(userId, caseId);
  } catch {
    owned = false;
  }
  if (!owned) return { error: "Case not found or not owned by you." };

  // Duplicate-checkout protection: this exact case is already paid and validly
  // entitled, so the checkout entry point must not create another $99 session.
  // Access is granted once by the webhook (first write wins on replay), and a
  // second session for the same already-entitled case could lead to a second
  // successful charge. We still reach the entitlement check BEFORE any Stripe
  // call so an already-unlocked case never opens a redundant checkout.
  let alreadyEntitled = false;
  try {
    alreadyEntitled = await hasCaseEntitlement(userId, caseId);
  } catch {
    // On a lookup failure we fail SAFE (do not open a redundant checkout that
    // could double-charge): treat as entitled and refuse rather than risk a
    // duplicate for a case we cannot confirm is unpaid.
    alreadyEntitled = true;
  }
  if (alreadyEntitled) {
    return { error: "Pro Case Analysis is already unlocked for this case. Open it from your dashboard." };
  }

  const priceError = await validateConfiguredProPrice();
  if (priceError) return { error: priceError };

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      // userId is ALWAYS server-derived (never read from the client). caseId
      // is validated and ownership-checked above.
      metadata: {
        userId,
        caseId,
      },
      ...checkoutReturnUrls(undefined, { request: currentRequest(), caseId }),
      allow_promotion_codes: false,
      billing_address_collection: "auto",
    });

    return { url: session.url || checkoutReturnUrls(undefined, { request: currentRequest(), caseId }).success_url };
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return { error: "Failed to create checkout session" };
  }
}

export async function createCheckoutSession(
  userId: string,
  caseId: string
): Promise<{ url: string } | { error: string }> {
  // Checkout is OPEN for live $99 payments (owner-approved controlled launch):
  // this delegates directly to the tested core (ownership check, price
  // validation, exact server-derived metadata). Entitlement is granted only by
  // the paid, verified checkout.session.completed webhook (see webhook.ts).
  return createCheckoutSessionCore(userId, caseId);
}

export async function createCustomerPortalSession(
  customerId: string
): Promise<{ url: string } | { error: string }> {
  // Billing/portal is open alongside the live-checkout launch.
  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${checkoutReturnUrls(undefined, { request: currentRequest() }).success_url.split("?")[0]}`,
    });

    return { url: session.url };
  } catch (error) {
    console.error("Stripe portal error:", error);
    return { error: "Failed to create portal session" };
  }
}

export async function getSubscriptionStatus(
  userId: string
): Promise<{ active: boolean; customerId?: string; caseId?: string }> {
  try {
    const stripe = getStripe();
    const customers = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return { active: false };
    }

    const customer = customers.data[0];
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });

    return {
      active: subscriptions.data.length > 0,
      customerId: customer.id,
    };
  } catch (error) {
    console.error("Stripe subscription check error:", error);
    return { active: false };
  }
}

export async function getStripeCustomerId(userId: string): Promise<string | null> {
  try {
    const stripe = getStripe();
    const customers = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1,
    });
    return customers.data[0]?.id || null;
  } catch {
    return null;
  }
}
