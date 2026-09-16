import { c as createSsrRpc } from "./router-CPaV_2AK.js";
import { c as createServerFn } from "../server.js";
const idPattern = /^[A-Za-z0-9_-]{1,64}$/;
const requireCaseId = (value) => {
  if (!value || typeof value !== "object" || typeof value.caseId !== "string" || !idPattern.test(value.caseId)) throw new Error("A valid caseId is required");
  return {
    caseId: value.caseId
  };
};
const listTimeline = createServerFn({
  method: "POST"
}).validator(requireCaseId).handler(createSsrRpc("bcf15402b9e24b4cfc292986a53c02abe08f41b18261da33bd5b8ff2c0ba4f26"));
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
}).handler(createSsrRpc("77861522bef388bdc47f8d15f450895521bdfc8308dd5974a9e26ffc2b4f7af3"));
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
}).handler(createSsrRpc("9dc09392b2ef2301c6d30d1c083d5dcf223ac6e763bfd5cf1607c97d8cfbc256"));
const listCalendar = createServerFn({
  method: "POST"
}).validator(requireCaseId).handler(createSsrRpc("56aa66b715704aead08762c5a25b3ba064dfe38ce25f001ec44533f8b42cf276"));
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
}).handler(createSsrRpc("45925df2d359dc67524556693fec8c4594464216176c1d9f75f0aa5a7fa8e11e"));
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
}).handler(createSsrRpc("c975f2b9a7690ab684ac8ebffb7ade4ca84a921a28b74156428a59d315236b09"));
export {
  addTimeline as a,
  listCalendar as b,
  addCalendar as c,
  deleteTimeline as d,
  deleteCalendar as e,
  listTimeline as l
};
