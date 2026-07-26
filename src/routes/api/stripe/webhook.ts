import { json } from "@tanstack/react-start";
import Stripe from "stripe";
import { sql } from "~/db";
import { logPaymentCompleted } from "~/lib/audit";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST({ request }: { request: Request }) {
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
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
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
          // Record the payment in the database
          await sql()`
            INSERT INTO payments (user_id, stripe_session_id, amount, status, case_id, created_at)
            VALUES (${userId}, ${session.id}, ${session.amount_total || 0}, 'completed', ${caseId || null}, NOW())
            ON CONFLICT (stripe_session_id) DO NOTHING
          `;

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
