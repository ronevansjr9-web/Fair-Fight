import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || "price_1TwAck86HQsHVK1c3G8RT8Sk";
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.PUBLIC_SITE_URL || "http://localhost:3000";

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

export async function createCheckoutSession(
  userId: string,
  email: string,
  caseId?: string
): Promise<{ url: string } | { error: string }> {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price: STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        ...(caseId ? { caseId } : {}),
      },
      success_url: `${BASE_URL}/dashboard?checkout=success`,
      cancel_url: `${BASE_URL}/?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return { url: session.url || `${BASE_URL}/dashboard` };
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return { error: "Failed to create checkout session" };
  }
}

export async function createCustomerPortalSession(
  customerId: string
): Promise<{ url: string } | { error: string }> {
  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${BASE_URL}/dashboard`,
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
