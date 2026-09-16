import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { getCurrentAuth } from "~/lib/auth";
import { deleteAllUserData } from "~/lib/dataProtection";
import { logDataDeleted } from "~/lib/audit";
/**
 * Permanent self-serve deletion (Wave 5 — LIVE).
 *
 * Authenticated POST that deletes ALL of the signed-in user's rows in ONE
 * transaction: evidence_files (via the cases join), case_analyses,
 * calendar_events, timeline_entries, payments, cases, and the user's own
 * audit_logs rows. `deleteAllUserData` returns exact per-table counts of the
 * rows deleted; those counts are then written to the audit log as a
 * DATA_DELETED row AFTER the transaction commits, so the operational log
 * retains exactly one row for the deletion.
 *
 * Then the Clerk account is deleted best-effort via the Clerk Backend API.
 * If Clerk deletion fails, the data deletion is still successful and the
 * response reports { clerkAccountDeleted: false } — the UI copy states
 * exactly that.
 *
 * The request body must contain { confirm: "DELETE" } (exact, after trim) —
 * an explicit typed confirmation is required before anything is deleted.
 */
const REQUIRED_CONFIRMATION = "DELETE";

export async function POST({ request }: { request: Request }) {
  const auth = await getCurrentAuth(request);
  if (!auth.userId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  let confirm: unknown;
  try {
    confirm = ((await request.json()) as Record<string, unknown>)?.confirm;
  } catch {
    return json({ error: "Type DELETE to confirm permanent deletion." }, { status: 400 });
  }
  if (typeof confirm !== "string" || confirm.trim() !== REQUIRED_CONFIRMATION) {
    return json({ error: "Type DELETE to confirm permanent deletion." }, { status: 400 });
  }
  try {
    // ONE transaction: either everything commits or nothing does.
    const counts = await deleteAllUserData(auth.userId);
    // Audit AFTER the transaction so the DATA_DELETED operational row
    // survives the deletion of the user's own audit rows.
    await logDataDeleted(auth.userId, {
      tablesWithCounts: { ...counts },
    });
    // Best-effort Clerk account deletion — never blocks the data deletion.
    let clerkAccountDeleted = false;
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (secretKey) {
      try {
        const res = await fetch(
          `https://api.clerk.com/v1/users/${encodeURIComponent(auth.userId)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${secretKey}`,
              "Content-Type": "application/json",
            },
          },
        );
        // 404 means the account no longer exists — that counts as deleted.
        clerkAccountDeleted = res.status === 200 || res.status === 404;
      } catch (error) {
        console.error("Clerk account deletion error:", error);
        clerkAccountDeleted = false;
      }
    }
    return json({
      success: true,
      clerkAccountDeleted,
      deletedCounts: counts,
    });
  } catch (error) {
    console.error("Delete API error:", error);
    return json(
      { error: "Deletion failed. No data was changed." },
      { status: 500 },
    );
  }
}

// Route registration — TanStack Start only mounts a server handler when the
// route file declares it via createFileRoute (the same live-verified pattern
// as /api/track and /api/stripe/webhook). The bare `POST` export above stays
// so unit tests can exercise the handler directly.
export const Route = createFileRoute("/api/user/delete-data")({
  server: { handlers: { POST: ({ request }) => POST({ request }) } },
});