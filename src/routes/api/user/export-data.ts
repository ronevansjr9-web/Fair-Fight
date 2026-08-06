import { json } from "@tanstack/react-start";
import { getCurrentAuth, getPrimaryEmail } from "~/lib/auth";
import { sql } from "~/db";
import { logDataExported } from "~/lib/audit";

export async function POST({ request }: { request: Request }) {
  const auth = await getCurrentAuth(request);
  if (!auth.userId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cases = await sql()`SELECT * FROM cases WHERE user_id = ${auth.userId}`;
    const auditLogs = await sql()`SELECT * FROM audit_logs WHERE user_id = ${auth.userId} ORDER BY created_at DESC LIMIT 1000`;
    const evidence = await sql()`SELECT * FROM evidence WHERE user_id = ${auth.userId}`;
    const timelineEvents = await sql()`SELECT * FROM timeline_events WHERE user_id = ${auth.userId}`;
    const calendarEvents = await sql()`SELECT * FROM calendar_events WHERE user_id = ${auth.userId}`;

    await logDataExported(auth.userId);

    const exportData = {
      userId: auth.userId,
      // AuthObject has no `user` property; resolve email via Clerk Backend API.
      // null (lookup failure) is explicit — never silently empty.
      email: await getPrimaryEmail(auth.userId),
      exportedAt: new Date().toISOString(),
      cases: cases.map((c: Record<string, unknown>) => ({
        id: c.id, title: c.title, caseType: c.case_type,
        status: c.status, jurisdiction: c.jurisdiction,
        description: c.description, createdAt: String(c.created_at), updatedAt: String(c.updated_at),
      })),
      evidence: evidence.map((e: Record<string, unknown>) => ({
        id: e.id, name: e.name, type: e.type,
        description: e.description, tags: e.tags, createdAt: String(e.created_at),
      })),
      timelineEvents: timelineEvents.map((t: Record<string, unknown>) => ({
        id: t.id, date: t.event_date, title: t.title,
        description: t.description, createdAt: String(t.created_at),
      })),
      calendarEvents: calendarEvents.map((c: Record<string, unknown>) => ({
        id: c.id, date: c.event_date, title: c.title,
        type: c.event_type, notes: c.notes, createdAt: String(c.created_at),
      })),
      auditLogs: auditLogs.map((l: Record<string, unknown>) => ({
        action: l.action, resource: l.resource, createdAt: String(l.created_at),
      })),
    };

    return json(exportData);
  } catch (error) {
    console.error("Export API error:", error);
    return json({ error: "Export failed" }, { status: 500 });
  }
}
