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
const ADMIN_IDS = (process.env.ADMIN_CLERK_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
const getAdminStats_createServerFn_handler = createServerRpc({
  id: "15cd0173a0b5b91e1bd987c0c05c3bbd4b0b6dca270202967a21d28f2ce87afc",
  name: "getAdminStats",
  filename: "src/routes/admin.tsx"
}, (opts) => getAdminStats.__executeServer(opts));
const getAdminStats = createServerFn({
  method: "GET"
}).handler(getAdminStats_createServerFn_handler, async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return {
    authorized: false
  };
  if (!ADMIN_IDS.includes(auth.userId)) return {
    authorized: false
  };
  try {
    const userCount = await sql()`SELECT COUNT(*) as count FROM users`;
    const caseCount = await sql()`SELECT COUNT(*) as count FROM cases`;
    const recentUsers = await sql()`SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 10`;
    const recentAnalyses = await sql()`
      SELECT user_id, action, created_at FROM audit_logs 
      WHERE action = 'AI_ANALYSIS_GENERATED' 
      ORDER BY created_at DESC LIMIT 10
    `;
    return {
      authorized: true,
      users: Number(userCount[0]?.count || 0),
      cases: Number(caseCount[0]?.count || 0),
      recentUsers: recentUsers.map((r) => ({
        id: String(r.id),
        email: String(r.email),
        createdAt: String(r.created_at)
      })),
      recentAnalyses: recentAnalyses.map((r) => ({
        userId: String(r.user_id),
        createdAt: String(r.created_at)
      }))
    };
  } catch {
    return {
      authorized: true,
      users: 0,
      cases: 0,
      recentUsers: [],
      recentAnalyses: []
    };
  }
});
export {
  getAdminStats_createServerFn_handler
};
