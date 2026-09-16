import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { c as createServerFn } from "../server.js";
import { g as getCurrentAuth } from "./auth-FTkvfrUA.js";
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
const getDashboardData_createServerFn_handler = createServerRpc({
  id: "c960787ec9a553a77dbdde3313b39cc569b31b3a3e3cbc4ea4944aa965eaaa9f",
  name: "getDashboardData",
  filename: "src/routes/dashboard.tsx"
}, (opts) => getDashboardData.__executeServer(opts));
const getDashboardData = createServerFn({
  method: "POST"
}).handler(getDashboardData_createServerFn_handler, async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return {
    ok: false,
    reason: "unauthorized"
  };
  try {
    const cases = await sql()`
      SELECT id, title, case_type, status, jurisdiction, created_at, updated_at
      FROM cases
      WHERE user_id = ${auth.userId}
      ORDER BY updated_at DESC
      LIMIT 20
    `;
    const stats = await sql()`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
      FROM cases
      WHERE user_id = ${auth.userId}
    `;
    let entitledCaseIds = [];
    try {
      const payments = await sql()`
        SELECT case_id FROM payments
        WHERE user_id = ${auth.userId} AND status = 'succeeded'
      `;
      entitledCaseIds = (payments ?? []).map((p) => String(p.case_id));
    } catch (error) {
      console.error("Entitlement lookup failed:", error);
    }
    return {
      ok: true,
      data: {
        cases: cases.map((c) => ({
          id: String(c.id),
          title: String(c.title),
          caseType: String(c.case_type),
          status: String(c.status),
          jurisdiction: String(c.jurisdiction),
          createdAt: String(c.created_at),
          updatedAt: String(c.updated_at)
        })),
        stats: {
          total: Number(stats[0]?.total || 0),
          active: Number(stats[0]?.active || 0),
          resolved: Number(stats[0]?.resolved || 0)
        },
        entitledCaseIds
      }
    };
  } catch {
    return {
      ok: false,
      reason: "unavailable"
    };
  }
});
export {
  getDashboardData_createServerFn_handler
};
