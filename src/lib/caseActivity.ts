import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";

let schemaReady: Promise<void> | undefined;
async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const query = sql();
      await query`CREATE TABLE IF NOT EXISTS timeline_entries (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE, event_date DATE NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
      await query`CREATE INDEX IF NOT EXISTS timeline_entries_case_date_idx ON timeline_entries(case_id,event_date,created_at)`;
      await query`CREATE TABLE IF NOT EXISTS calendar_events (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE, event_date DATE NOT NULL, title TEXT NOT NULL, event_type TEXT NOT NULL DEFAULT 'other', notes TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
      await query`CREATE INDEX IF NOT EXISTS calendar_events_case_date_idx ON calendar_events(case_id,event_date,created_at)`;
    })().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

const idPattern = /^[A-Za-z0-9_-]{1,64}$/;
const requireCaseId = (value: unknown) => {
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as { caseId?: unknown }).caseId !== "string" ||
    !idPattern.test((value as { caseId: string }).caseId)
  )
    throw new Error("A valid caseId is required");
  return { caseId: (value as { caseId: string }).caseId };
};
async function owner() {
  const { getAuth } = await import("@clerk/tanstack-start/server");
  const auth = await getAuth();
  if (!auth.userId) throw new Error("Sign in required");
  return auth.userId;
}

export const listTimeline = createServerFn({ method: "GET" })
  .validator(requireCaseId)
  .handler(async ({ data }) => {
    const userId = await owner();
    await ensureSchema();
    const rows =
      await sql()`SELECT t.id, t.event_date, t.title, t.description FROM timeline_entries t JOIN cases c ON c.id=t.case_id WHERE t.case_id=${data.caseId} AND c.user_id=${userId} ORDER BY t.event_date, t.created_at`;
    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      date: String(r.event_date).slice(0, 10),
      title: String(r.title),
      description: String(r.description ?? ""),
    }));
  });
export const addTimeline = createServerFn({ method: "POST" })
  .validator((v: unknown) => {
    const d = v as Record<string, unknown>;
    const x = requireCaseId(v);
    if (
      typeof d.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ||
      typeof d.title !== "string" ||
      !d.title.trim()
    )
      throw new Error("Date and title are required");
    return {
      ...x,
      date: d.date,
      title: d.title.trim().slice(0, 500),
      description:
        typeof d.description === "string" ? d.description.slice(0, 5000) : "",
    };
  })
  .handler(async ({ data }) => {
    const userId = await owner();
    await ensureSchema();
    const rows =
      await sql()`INSERT INTO timeline_entries (case_id,event_date,title,description) SELECT ${data.caseId},${data.date},${data.title},${data.description} WHERE EXISTS (SELECT 1 FROM cases WHERE id=${data.caseId} AND user_id=${userId}) RETURNING id,event_date,title,description`;
    if (!rows.length) throw new Error("Case not found");
    const r = rows[0] as Record<string, unknown>;
    return {
      id: String(r.id),
      date: String(r.event_date).slice(0, 10),
      title: String(r.title),
      description: String(r.description ?? ""),
    };
  });
export const deleteTimeline = createServerFn({ method: "POST" })
  .validator((v: unknown) => {
    const d = v as Record<string, unknown>;
    const x = requireCaseId(v);
    if (typeof d.id !== "string" || !idPattern.test(d.id))
      throw new Error("Invalid entry");
    return { ...x, id: d.id };
  })
  .handler(async ({ data }) => {
    const userId = await owner();
    const rows =
      await sql()`DELETE FROM timeline_entries t USING cases c WHERE t.id=${data.id} AND t.case_id=${data.caseId} AND c.id=t.case_id AND c.user_id=${userId} RETURNING t.id`;
    if (!rows.length) throw new Error("Entry not found");
    return { ok: true };
  });

export const listCalendar = createServerFn({ method: "GET" })
  .validator(requireCaseId)
  .handler(async ({ data }) => {
    const userId = await owner();
    const rows =
      await sql()`SELECT e.id,e.event_date,e.title,e.event_type,e.notes FROM calendar_events e JOIN cases c ON c.id=e.case_id WHERE e.case_id=${data.caseId} AND c.user_id=${userId} ORDER BY e.event_date,e.created_at`;
    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      date: String(r.event_date).slice(0, 10),
      title: String(r.title),
      type: String(r.event_type),
      notes: String(r.notes ?? ""),
    }));
  });
export const addCalendar = createServerFn({ method: "POST" })
  .validator((v: unknown) => {
    const d = v as Record<string, unknown>;
    const x = requireCaseId(v);
    if (
      typeof d.date !== "string" ||
      !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(d.date) ||
      typeof d.title !== "string" ||
      !d.title.trim()
    )
      throw new Error("Date and title are required");
    const type =
      typeof d.type === "string" &&
      [
        "hearing",
        "deadline",
        "filing",
        "meeting",
        "reminder",
        "other",
      ].includes(d.type)
        ? d.type
        : "other";
    return {
      ...x,
      date: d.date,
      title: d.title.trim().slice(0, 500),
      type,
      notes: typeof d.notes === "string" ? d.notes.slice(0, 5000) : "",
    };
  })
  .handler(async ({ data }) => {
    const userId = await owner();
    const rows =
      await sql()`INSERT INTO calendar_events (case_id,event_date,title,event_type,notes) SELECT ${data.caseId},${data.date},${data.title},${data.type},${data.notes} WHERE EXISTS (SELECT 1 FROM cases WHERE id=${data.caseId} AND user_id=${userId}) RETURNING id,event_date,title,event_type,notes`;
    if (!rows.length) throw new Error("Case not found");
    const r = rows[0] as Record<string, unknown>;
    return {
      id: String(r.id),
      date: String(r.event_date).slice(0, 10),
      title: String(r.title),
      type: String(r.event_type),
      notes: String(r.notes ?? ""),
    };
  });
export const deleteCalendar = createServerFn({ method: "POST" })
  .validator((v: unknown) => {
    const d = v as Record<string, unknown>;
    const x = requireCaseId(v);
    if (typeof d.id !== "string" || !idPattern.test(d.id))
      throw new Error("Invalid event");
    return { ...x, id: d.id };
  })
  .handler(async ({ data }) => {
    const userId = await owner();
    const rows =
      await sql()`DELETE FROM calendar_events e USING cases c WHERE e.id=${data.id} AND e.case_id=${data.caseId} AND c.id=e.case_id AND c.user_id=${userId} RETURNING e.id`;
    if (!rows.length) throw new Error("Event not found");
    return { ok: true };
  });
