import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { paymentFromCheckoutSession, recordSuccessfulPayment } from "~/lib/payment";
import Stripe from "stripe";
import { sql } from "~/db";
import { logPaymentCompleted } from "~/lib/audit";
import {
  RESTRICTED_FEATURES,
  TEMP_UNAVAILABLE_MESSAGE,
  TEMP_UNAVAILABLE_STATUS,
} from "~/lib/restrictedFeatures";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

async function handlePost(request: Request) {
  // P0 fail-closed gate: the webhook records the durable Pro entitlement, and
  // that path is not verified end-to-end yet. Reject every delivery with 503
  // `feature_restricted` (Stripe will retry) instead of writing entitlement
  // records that were never proven durable. This check stays FIRST: it runs
  // before signature verification, Stripe client construction, or any DB work.
  if (RESTRICTED_FEATURES.checkoutProActivation) {
    return json(
      { error: TEMP_UNAVAILABLE_MESSAGE, code: "feature_restricted" },
      { status: TEMP_UNAVAILABLE_STATUS },
    );
  }

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2025-03-31.basil",
  });

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    // Async variant: the sync `constructEvent` uses SubtleCryptoProvider which
    // throws in Bun ("cannot be used in a synchronous context").
    event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const caseId = session.metadata?.caseId;

        if (userId) {
          const payment = paymentFromCheckoutSession(session);
          if (!payment) break;
          await recordSuccessfulPayment(payment);
          await logPaymentCompleted(userId, caseId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Update subscription status
        if (subscription.status === "active") {
          const customer = await stripe.customers.retrieve(customerId);
          if (!("deleted" in customer)) {
            const userId = customer.metadata?.userId;
            if (userId) {
              await sql()`
                INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, created_at, updated_at)
                VALUES (${userId}, ${customerId}, ${subscription.id}, ${subscription.status}, NOW(), NOW())
                ON CONFLICT (stripe_subscription_id)
                DO UPDATE SET status = ${subscription.status}, updated_at = NOW()
              `;
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await sql()`
          UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
          WHERE stripe_subscription_id = ${subscription.id}
        `;
        break;
      }
    }

    return json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return json({ error: "Processing error" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/stripe/webhook")({
  server: { handlers: { POST: ({ request }) => handlePost(request) } },
});
