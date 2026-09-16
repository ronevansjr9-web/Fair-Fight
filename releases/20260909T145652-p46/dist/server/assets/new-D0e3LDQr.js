import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { c as createServerFn } from "../server.js";
import { g as getCurrentAuth } from "./auth-ZI2Sw1yb.js";
import { s as sanitizeInput } from "./sanitize-CTUyMlso.js";
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
async function logAuditEvent(log) {
  try {
    await sql()`
      INSERT INTO audit_logs (user_id, action, resource, details, ip_address, created_at)
      VALUES (${log.userId}, ${log.action}, ${log.resource}, ${log.details ? JSON.stringify(log.details) : null}, ${log.ip || null}, NOW())
    `;
  } catch (error) {
    console.error("Audit log error:", error);
  }
}
async function logCaseCreated(userId, caseId) {
  await logAuditEvent({
    userId,
    action: "CASE_CREATED",
    resource: caseId,
    details: { caseId }
  });
}
function parseCreateCaseInput(data) {
  const d = data ?? {};
  if (typeof d.title !== "string" || !d.title.trim()) {
    throw new Error("Case title is required");
  }
  return {
    title: d.title,
    caseType: d.caseType || "Civil",
    jurisdiction: d.jurisdiction || "",
    description: d.description || ""
  };
}
const createCase_createServerFn_handler = createServerRpc({
  id: "7463bc5ff3d0d99c2f78a632dbcad1cc33759becdeebc6f266360bc101379952",
  name: "createCase",
  filename: "src/routes/cases/new.tsx"
}, (opts) => createCase.__executeServer(opts));
const createCase = createServerFn({
  method: "POST"
}).handler(createCase_createServerFn_handler, async ({
  data
}) => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return {
    error: "Sign in required"
  };
  let input;
  try {
    input = parseCreateCaseInput(data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid case data"
    };
  }
  const sanitized = {
    title: sanitizeInput(input.title),
    caseType: sanitizeInput(input.caseType),
    jurisdiction: sanitizeInput(input.jurisdiction),
    description: sanitizeInput(input.description)
  };
  try {
    const result = await sql()`
        INSERT INTO cases (user_id, title, case_type, status, jurisdiction, description, created_at, updated_at)
        VALUES (${auth.userId}, ${sanitized.title}, ${sanitized.caseType}, 'active', ${sanitized.jurisdiction}, ${sanitized.description}, NOW(), NOW())
        RETURNING id
      `;
    const caseId = String(result[0].id);
    await logCaseCreated(auth.userId, caseId);
    return {
      success: true,
      caseId
    };
  } catch (error) {
    console.error("Case creation error:", error);
    return {
      error: "Failed to create case. Please try again."
    };
  }
});
export {
  createCase_createServerFn_handler
};
