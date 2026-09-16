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
const CASE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const getCase_createServerFn_handler = createServerRpc({
  id: "a994618c0c3bbdf912135a73d411252e34c8e198c9ffd91d022348a6aab38da3",
  name: "getCase",
  filename: "src/routes/cases/$caseId.tsx"
}, (opts) => getCase.__executeServer(opts));
const getCase = createServerFn({
  method: "POST"
}).validator((data) => {
  const d = data;
  if (typeof d.caseId !== "string" || !CASE_ID_PATTERN.test(d.caseId)) {
    throw new Error("Invalid case id");
  }
  return {
    caseId: d.caseId
  };
}).handler(getCase_createServerFn_handler, async ({
  data
}) => {
  try {
    const auth = await getCurrentAuth();
    if (!auth.userId) return {
      ok: false,
      reason: "unauthorized"
    };
    try {
      const rows = await sql()`
          SELECT id, title, case_type, status, jurisdiction, description, created_at, updated_at
          FROM cases
          WHERE id = ${data.caseId} AND user_id = ${auth.userId}
          LIMIT 1
        `;
      if (!rows || rows.length === 0) return {
        ok: false,
        reason: "not_found"
      };
      const c = rows[0];
      return {
        ok: true,
        case: {
          id: String(c.id),
          title: String(c.title),
          caseType: String(c.case_type),
          status: String(c.status),
          jurisdiction: String(c.jurisdiction),
          description: String(c.description),
          createdAt: String(c.created_at),
          updatedAt: String(c.updated_at)
        }
      };
    } catch (error) {
      console.error("Case load error:", error);
      return {
        ok: false,
        reason: "unavailable"
      };
    }
  } catch {
    return {
      ok: false,
      reason: "unauthorized"
    };
  }
});
export {
  getCase_createServerFn_handler
};
