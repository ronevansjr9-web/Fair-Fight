import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { c as createServerFn } from "../server.js";
import { g as getCurrentAuth } from "./auth-Ds7eJc8W.js";
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
function s(v) {
  return v == null ? "" : String(v);
}
function n(v) {
  return v == null ? 0 : Number(v);
}
async function listUserPayments(userId) {
  try {
    const rows = await sql()`SELECT id,case_id,amount_cents,currency,status,created_at FROM payments WHERE user_id=${userId} ORDER BY created_at DESC`;
    return rows.map((p) => ({
      id: s(p.id),
      caseId: s(p.case_id),
      amountCents: n(p.amount_cents),
      currency: s(p.currency),
      status: s(p.status),
      createdAt: s(p.created_at)
    }));
  } catch (error) {
    console.error("[DATAPROTECT] Failed to list payments:", error);
    return [];
  }
}
const getProfileData_createServerFn_handler = createServerRpc({
  id: "b2906cd4df1b598a24f03442f38f3bfc72ecd9110c99d7761f9c0352c7ff6124",
  name: "getProfileData",
  filename: "src/routes/profile.tsx"
}, (opts) => getProfileData.__executeServer(opts));
const getProfileData = createServerFn({
  method: "GET"
}).handler(getProfileData_createServerFn_handler, async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return {
    unavailable: false,
    pro: false
  };
  return {
    unavailable: false,
    pro: false
  };
});
const getPaymentHistory_createServerFn_handler = createServerRpc({
  id: "4f6bcfea931059717cf568dcfc92c9a796645cfde2fb650bd2ab94c211eb9d9f",
  name: "getPaymentHistory",
  filename: "src/routes/profile.tsx"
}, (opts) => getPaymentHistory.__executeServer(opts));
const getPaymentHistory = createServerFn({
  method: "POST"
}).handler(getPaymentHistory_createServerFn_handler, async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return {
    payments: []
  };
  const payments = await listUserPayments(auth.userId);
  return {
    payments
  };
});
export {
  getPaymentHistory_createServerFn_handler,
  getProfileData_createServerFn_handler
};
