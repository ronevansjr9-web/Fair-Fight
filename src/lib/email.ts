/**
 * Email sending helper for Fair Fight.
 *
 * Currently logs to console and stores outgoing messages in the database
 * for audit purposes. In production, integrate with a transactional email
 * provider (SendGrid, Resend, AWS SES, etc.) by replacing sendEmail().
 */

import { sql } from "~/db";

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

/**
 * Send an email. Currently logs to console and stores in DB.
 * Replace with a real email provider (SendGrid / Resend / SES) in production.
 */
export async function sendEmail(msg: EmailMessage): Promise<{ success: boolean; error?: string }> {
  const { to, subject, body, html } = msg;

  try {
    // In production, replace this with a real email API call:
    //   const response = await fetch("https://api.sendgrid.com/v3/mail/send", { ... });
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
    console.log(`[EMAIL] Body: ${body.slice(0, 200)}...`);

    // Persist to DB for audit trail
    try {
      await sql()`
        INSERT INTO sent_emails (recipient, subject, body, html_body, sent_at)
        VALUES (${to}, ${subject}, ${body}, ${html || null}, NOW())
      `;
    } catch (dbError) {
      console.error("[EMAIL] Failed to log email to database:", dbError);
      // Non-fatal — email was "sent" (logged)
    }

    return { success: true };
  } catch (error) {
    console.error("[EMAIL] Send failed:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send a welcome email to a new user.
 */
export async function sendWelcomeEmail(
  to: string,
  firstName?: string
): Promise<{ success: boolean; error?: string }> {
  const name = firstName || "there";
  const subject = "Welcome to Fair Fight — Understand the Law";
  const body = `Hi ${name},

Welcome to Fair Fight, a legal-education workspace. We're here to help you understand your legal situation with plain-English explanations, case-law research, and tools to help you organize your own case.

Here's what's available to you:
• Free public education: browse plain-English guides at /learn and search public case law at /research — free for everyone, no purchase needed.
• Pro Case Analysis: an in-depth educational analysis of a single case, available as a one-time $99 purchase per case. There's no subscription, and there's no free tier of the paid case-analysis tool.

Remember: Fair Fight is for educational purposes only. We never provide legal advice, and we can't promise that any argument is guaranteed or best. Always consult a licensed attorney for your specific situation.

— The Fair Fight Team`;

  const html = `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
<h1 style="color:#0A2342">Welcome to Fair Fight ⚖️</h1>
<p>Hi ${name},</p>
<p>Welcome to <strong>Fair Fight</strong>, a legal-education workspace. We're here to help you understand your legal situation with plain-English explanations, case-law research, and tools to help you organize your own case.</p>
<p><strong>Here's what's available to you:</strong></p>
<ul>
<li><strong>Free public education:</strong> browse plain-English guides at <a href="/learn">/learn</a> and search public case law at <a href="/research">/research</a> — free for everyone, no purchase needed.</li>
<li><strong>Pro Case Analysis:</strong> an in-depth educational analysis of a single case, available as a one-time <strong>$99 purchase per case</strong>. There's no subscription, and there's no free tier of the paid case-analysis tool.</li>
</ul>
<p style="background:#f8f8f8;padding:12px;border-left:4px solid #C9A227;font-size:14px">
⚖️ Fair Fight is for educational purposes only. We never provide legal advice. Always consult a licensed attorney.
</p>
<p>— The Fair Fight Team</p>
</body></html>`;

  return sendEmail({ to, subject, body, html });
}

/**
 * Send a case-analysis-ready notification.
 */
export async function sendAnalysisReadyEmail(
  to: string,
  caseTitle: string,
  caseId: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Your case analysis for "${caseTitle}" is ready`;
  const body = `Your AI-powered educational case analysis for "${caseTitle}" is now available.

Log in to your Fair Fight dashboard to review:
• Plain-English summary of your legal situation
• Relevant statutes and case law explained
• Practical next steps
• Smart questions for your attorney

View here: /dashboard

⚖️ For educational purposes only. Not legal advice. Consult a licensed attorney.`;

  return sendEmail({ to, subject, body });
}

/**
 * Send a court-date reminder notification.
 */
export async function sendCourtDateReminderEmail(
  to: string,
  eventTitle: string,
  eventDate: string,
  caseTitle?: string
): Promise<{ success: boolean; error?: string }> {
  const caseInfo = caseTitle ? ` for case "${caseTitle}"` : "";
  const subject = `Reminder: ${eventTitle} on ${eventDate}`;
  const body = `This is a reminder about your upcoming event${caseInfo}:

${eventTitle}
Date: ${eventDate}

Log in to your Fair Fight dashboard to view your full calendar.

⚖️ For educational purposes only. Not legal advice. Consult a licensed attorney.`;

  return sendEmail({ to, subject, body });
}
