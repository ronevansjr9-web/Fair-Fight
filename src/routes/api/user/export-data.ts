import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { getCurrentAuth } from "~/lib/auth";
import { collectUserExport } from "~/lib/dataProtection";
import { logDataExported } from "~/lib/audit";
/**
 * Self-serve portable export (Wave 5 — LIVE).
 *
 * Authenticated POST returning a JSON document with the signed-in user's
 * COMPLETE data set: cases, case_analyses, payments, calendar_events,
 * timeline_entries, evidence_files METADATA (filename/mime/size — the bytea
 * file contents are deliberately never read or exported), and the user's
 * audit_logs rows. Ownership is enforced on every query (direct user_id
 * filters, or JOINs on cases.user_id for case-owned children) inside
 * collectUserExport; the route is a thin auth-gate + response wrapper.
 *
 * Shape: { exportedAt, user: { clerkUserId }, data: { ...per-table arrays } }
 * plus a schemaVersion and honest notes explaining what is/isn't included.
 */
export async function POST({ request }: { request: Request }) {
  const auth = await getCurrentAuth(request);
  if (!auth.userId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Snapshot FIRST, audit log AFTER — the exported JSON is the state as of
    // the query and does not contain the DATA_EXPORTED row itself.
    const exportData = await collectUserExport(auth.userId);
    await logDataExported(auth.userId);
    return json(exportData);
  } catch (error) {
    console.error("Export API error:", error);
    return json({ error: "Export failed. No data was exported." }, { status: 500 });
  }
}

// Route registration — TanStack Start only mounts a server handler when the
// route file declares it via createFileRoute (the same live-verified pattern
// as /api/track and /api/stripe/webhook). The bare `POST` export above stays
// so unit tests can exercise the handler directly.
export const Route = createFileRoute("/api/user/export-data")({
  server: { handlers: { POST: ({ request }) => POST({ request }) } },
});