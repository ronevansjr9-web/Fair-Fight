import Stripe from "stripe";
import { checkoutReturnUrls, FAIR_FIGHT_CURRENCY, FAIR_FIGHT_PRICE_CENTS } from "~/lib/payment";
import { isCaseOwner } from "~/lib/argumentAccess";
import {
  RESTRICTED_FEATURES,
  TEMP_UNAVAILABLE_MESSAGE,
} from "~/lib/restrictedFeatures";

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
      ...checkoutReturnUrls(),
      allow_promotion_codes: false,
      billing_address_collection: "auto",
    });

    return { url: session.url || checkoutReturnUrls().success_url };
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return { error: "Failed to create checkout session" };
  }
}

export async function createCheckoutSession(
  userId: string,
  caseId: string
): Promise<{ url: string } | { error: string }> {
  // P0 fail-closed gate: Pro activation is not yet verified end-to-end
  // (real Stripe webhook + real database verification are blocked). The
  // complete, unit-tested path is implemented behind this gate; clearing it
  // is the LAST step of a controlled deploy (see lib/restrictedFeatures.ts).
  if (RESTRICTED_FEATURES.checkoutProActivation) {
    return { error: TEMP_UNAVAILABLE_MESSAGE };
  }
  return createCheckoutSessionCore(userId, caseId);
}

export async function createCustomerPortalSession(
  customerId: string
): Promise<{ url: string } | { error: string }> {
  // P0 fail-closed gate: billing/portal is part of the unverified paid flow.
  if (RESTRICTED_FEATURES.checkoutProActivation) {
    return { error: TEMP_UNAVAILABLE_MESSAGE };
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${checkoutReturnUrls().success_url.split("?")[0]}`,
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
