import Stripe from "stripe";
import { recordSuccessfulPayment, paymentFromCheckoutSession } from "~/lib/payment";

export async function POST({ request }: { request: Request }) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) return new Response("Webhook is not configured", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  try {
    const stripe = new Stripe(secret, { apiVersion: "2025-03-31.basil" });
    const event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const payment = paymentFromCheckoutSession(event.data.object as Stripe.Checkout.Session);
      if (payment) await recordSuccessfulPayment(payment);
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return new Response("Invalid webhook", { status: 400 });
  }
}
