import { json } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { sendEmail } from "~/lib/email";
import { checkRateLimit } from "~/lib/rate-limit";

/**
 * POST /api/send-email
 *
 * Accepts: { to: string, subject: string, body: string, html?: string }
 * Sends an email via the email helper.
 * Requires authentication. Rate-limited.
 */
export async function POST({ request }: { request: Request }) {
  // Auth check
  const auth = await getAuth();
  if (!auth.userId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  const rateLimitResponse = await checkRateLimit("general", auth.userId);
  if (rateLimitResponse) {
    return json({ error: rateLimitResponse.error }, { status: 429 });
  }

  // Parse request body
  let body: { to?: string; subject?: string; body?: string; html?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate
  if (!body.to || !body.subject || !body.body) {
    return json(
      { error: "Missing required fields: to, subject, body" },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to)) {
    return json({ error: "Invalid email address" }, { status: 400 });
  }

  // Send
  const result = await sendEmail({
    to: body.to,
    subject: body.subject,
    body: body.body,
    html: body.html,
  });

  if (!result.success) {
    return json({ error: result.error || "Failed to send email" }, { status: 500 });
  }

  return json({ success: true, message: "Email sent" });
}
