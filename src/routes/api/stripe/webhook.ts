import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import Stripe from "stripe";
import {
  recordSuccessfulPayment,
  recordWebhookEvent,
  hasWebhookEvent,
  markPaymentRefunded,
} from "~/lib/payment";
import { isCaseOwner } from "~/lib/argumentAccess";
import { processCheckoutCompleted, processRefundEvent } from "~/lib/webhookProcessor";
import {
  RESTRICTED_FEATURES,
  TEMP_UNAVAILABLE_MESSAGE,
  TEMP_UNAVAILABLE_STATUS,
} from "~/lib/restrictedFeatures";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || "";

async function handlePost(request: Request) {
  // P0 fail-closed gate: the webhook records the durable Pro entitlement, and
  // that path is not yet verified against the real Stripe endpoint and real
  // database (no DATABASE_URL in the build sandbox; migrations not applied).
  // Reject every delivery with 503 `feature_restricted` (Stripe will retry)
  // instead of writing entitlement records that were never proven durable.
  // This check stays FIRST: it runs before signature verification, Stripe
  // client construction, or any DB work. The full processing path lives in
  // src/lib/webhookProcessor.ts and is covered by unit tests; clearing this
  // gate is the LAST step of a controlled deploy after real verification
  // (see src/lib/restrictedFeatures.ts).
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

  const deps = {
    isCaseOwner,
    payment: {
      recordSuccessfulPayment,
      recordWebhookEvent,
      hasWebhookEvent,
      markPaymentRefunded,
    },
    stripe: {
      async retrieveCheckoutLineItemPriceId(sessionId: string): Promise<string | null> {
        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["line_items"],
          });
          return session.line_items?.data?.[0]?.price?.id ?? null;
        } catch (error) {
          console.error("Webhook line-item retrieval failed:", error);
          return null;
        }
      },
    },
    env: { STRIPE_PRO_PRICE_ID },
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const outcome = await processCheckoutCompleted(event, deps);
        if (!outcome.recorded) {
          // Rejected but handled (replay, wrong product, unowned case, ...).
          // Returning 200 tells Stripe the delivery was consumed; nothing was
          // written. Log for observability.
          console.warn(`Webhook ${event.id} not recorded: ${outcome.skippedReason ?? "unknown"}`);
        }
        break;
      }

      case "charge.refunded":
      case "charge.refund.updated": {
        await processRefundEvent(event, deps);
        break;
      }

      default:
        // Unknown/irrelevant event types are acknowledged but ignored.
        break;
    }

    return json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Non-2xx so Stripe redelivers; the event-id ledger makes the retry a no-op
    // once the interrupted work completes.
    return json({ error: "Processing error" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/stripe/webhook")({
  server: { handlers: { POST: ({ request }) => handlePost(request) } },
});
