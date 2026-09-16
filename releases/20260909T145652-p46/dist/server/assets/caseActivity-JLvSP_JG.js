import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { c as createServerFn } from "../server.js";
import { g as getCurrentAuth } from "./auth-ZI2Sw1yb.js";
import { s as sql } from "./db-D7cnbd5l.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "@neondatabase/serverless";
const idPattern = /^[A-Za-z0-9_-]{1,64}$/;
const requireCaseId = (value) => {
  if (!value || typeof value !== "object" || typeof value.caseId !== "string" || !idPattern.test(value.caseId)) throw new Error("A valid caseId is required");
  return {
    caseId: value.caseId
  };
};
async function owner() {
  const auth = await getCurrentAuth();
  if (!auth.userId) throw new Error("Sign in required");
  return auth.userId;
}
const listTimeline_createServerFn_handler = createServerRpc({
  id: "bcf15402b9e24b4cfc292986a53c02abe08f41b18261da33bd5b8ff2c0ba4f26",
  name: "listTimeline",
  filename: "src/lib/caseActivity.ts"
}, (opts) => listTimeline.__executeServer(opts));
const listTimeline = createServerFn({
  method: "POST"
}).validator(requireCaseId).handler(listTimeline_createServerFn_handler, async ({
  data
}) => {
  const userId = await owner();
  const rows = await sql()`SELECT t.id, t.event_date, t.title, t.description FROM timeline_entries t JOIN cases c ON c.id=t.case_id WHERE t.case_id=${data.caseId} AND c.user_id=${userId} ORDER BY t.event_date, t.created_at`;
  return rows.map((r) => ({
    id: String(r.id),
    date: String(r.event_date).slice(0, 10),
    title: String(r.title),
    description: String(r.description ?? "")
  }));
});
const addTimeline_createServerFn_handler = createServerRpc({
  id: "77861522bef388bdc47f8d15f450895521bdfc8308dd5974a9e26ffc2b4f7af3",
  name: "addTimeline",
  filename: "src/lib/caseActivity.ts"
}, (opts) => addTimeline.__executeServer(opts));
const addTimeline = createServerFn({
  method: "POST"
}).validator((v) => {
  const d = v;
  const x = requireCaseId(v);
  if (typeof d.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.date) || typeof d.title !== "string" || !d.title.trim()) throw new Error("Date and title are required");
  return {
    ...x,
    date: d.date,
    title: d.title.trim().slice(0, 500),
    description: typeof d.description === "string" ? d.description.slice(0, 5e3) : ""
  };
}).handler(addTimeline_createServerFn_handler, async ({
  data
}) => {
  const userId = await owner();
  const rows = await sql()`INSERT INTO timeline_entries (case_id,event_date,title,description) SELECT ${data.caseId},${data.date},${data.title},${data.description} WHERE EXISTS (SELECT 1 FROM cases WHERE id=${data.caseId} AND user_id=${userId}) RETURNING id,event_date,title,description`;
  if (!rows.length) throw new Error("Case not found");
  const r = rows[0];
  return {
    id: String(r.id),
    date: String(r.event_date).slice(0, 10),
    title: String(r.title),
    description: String(r.description ?? "")
  };
});
const deleteTimeline_createServerFn_handler = createServerRpc({
  id: "9dc09392b2ef2301c6d30d1c083d5dcf223ac6e763bfd5cf1607c97d8cfbc256",
  name: "deleteTimeline",
  filename: "src/lib/caseActivity.ts"
}, (opts) => deleteTimeline.__executeServer(opts));
const deleteTimeline = createServerFn({
  method: "POST"
}).validator((v) => {
  const d = v;
  const x = requireCaseId(v);
  if (typeof d.id !== "string" || !idPattern.test(d.id)) throw new Error("Invalid entry");
  return {
    ...x,
    id: d.id
  };
}).handler(deleteTimeline_createServerFn_handler, async ({
  data
}) => {
  const userId = await owner();
  const rows = await sql()`DELETE FROM timeline_entries t USING cases c WHERE t.id=${data.id} AND t.case_id=${data.caseId} AND c.id=t.case_id AND c.user_id=${userId} RETURNING t.id`;
  if (!rows.length) throw new Error("Entry not found");
  return {
    ok: true
  };
});
const listCalendar_createServerFn_handler = createServerRpc({
  id: "56aa66b715704aead08762c5a25b3ba064dfe38ce25f001ec44533f8b42cf276",
  name: "listCalendar",
  filename: "src/lib/caseActivity.ts"
}, (opts) => listCalendar.__executeServer(opts));
const listCalendar = createServerFn({
  method: "POST"
}).validator(requireCaseId).handler(listCalendar_createServerFn_handler, async ({
  data
}) => {
  const userId = await owner();
  const rows = await sql()`SELECT e.id,e.event_date,e.title,e.event_type,e.notes FROM calendar_events e JOIN cases c ON c.id=e.case_id WHERE e.case_id=${data.caseId} AND c.user_id=${userId} ORDER BY e.event_date,e.created_at`;
  return rows.map((r) => ({
    id: String(r.id),
    date: String(r.event_date).slice(0, 10),
    title: String(r.title),
    type: String(r.event_type),
    notes: String(r.notes ?? "")
  }));
});
const addCalendar_createServerFn_handler = createServerRpc({
  id: "45925df2d359dc67524556693fec8c4594464216176c1d9f75f0aa5a7fa8e11e",
  name: "addCalendar",
  filename: "src/lib/caseActivity.ts"
}, (opts) => addCalendar.__executeServer(opts));
const addCalendar = createServerFn({
  method: "POST"
}).validator((v) => {
  const d = v;
  const x = requireCaseId(v);
  if (typeof d.date !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(d.date) || typeof d.title !== "string" || !d.title.trim()) throw new Error("Date and title are required");
  const type = typeof d.type === "string" && ["hearing", "deadline", "filing", "meeting", "reminder", "other"].includes(d.type) ? d.type : "other";
  return {
    ...x,
    date: d.date,
    title: d.title.trim().slice(0, 500),
    type,
    notes: typeof d.notes === "string" ? d.notes.slice(0, 5e3) : ""
  };
}).handler(addCalendar_createServerFn_handler, async ({
  data
}) => {
  const userId = await owner();
  const rows = await sql()`INSERT INTO calendar_events (case_id,event_date,title,event_type,notes) SELECT ${data.caseId},${data.date},${data.title},${data.type},${data.notes} WHERE EXISTS (SELECT 1 FROM cases WHERE id=${data.caseId} AND user_id=${userId}) RETURNING id,event_date,title,event_type,notes`;
  if (!rows.length) throw new Error("Case not found");
  const r = rows[0];
  return {
    id: String(r.id),
    date: String(r.event_date).slice(0, 10),
    title: String(r.title),
    type: String(r.event_type),
    notes: String(r.notes ?? "")
  };
});
const deleteCalendar_createServerFn_handler = createServerRpc({
  id: "c975f2b9a7690ab684ac8ebffb7ade4ca84a921a28b74156428a59d315236b09",
  name: "deleteCalendar",
  filename: "src/lib/caseActivity.ts"
}, (opts) => deleteCalendar.__executeServer(opts));
const deleteCalendar = createServerFn({
  method: "POST"
}).validator((v) => {
  const d = v;
  const x = requireCaseId(v);
  if (typeof d.id !== "string" || !idPattern.test(d.id)) throw new Error("Invalid event");
  return {
    ...x,
    id: d.id
  };
}).handler(deleteCalendar_createServerFn_handler, async ({
  data
}) => {
  const userId = await owner();
  const rows = await sql()`DELETE FROM calendar_events e USING cases c WHERE e.id=${data.id} AND e.case_id=${data.caseId} AND c.id=e.case_id AND c.user_id=${userId} RETURNING e.id`;
  if (!rows.length) throw new Error("Event not found");
  return {
    ok: true
  };
});
export {
  addCalendar_createServerFn_handler,
  addTimeline_createServerFn_handler,
  deleteCalendar_createServerFn_handler,
  deleteTimeline_createServerFn_handler,
  listCalendar_createServerFn_handler,
  listTimeline_createServerFn_handler
};
