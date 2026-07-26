import { sql } from "~/db";

export interface AuditLog {
  userId: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  ip?: string;
}

export async function logAuditEvent(log: AuditLog): Promise<void> {
  try {
    await sql()`
      INSERT INTO audit_logs (user_id, action, resource, details, ip_address, created_at)
      VALUES (${log.userId}, ${log.action}, ${log.resource}, ${
        log.details ? JSON.stringify(log.details) : null
      }, ${log.ip || null}, NOW())
    `;
  } catch (error) {
    console.error("Audit log error:", error);
    // Fail silently — audit logging should not break the user experience
  }
}

export async function logAIAnalysisGenerated(userId: string, source: string): Promise<void> {
  await logAuditEvent({
    userId,
    action: "AI_ANALYSIS_GENERATED",
    resource: source,
    details: { source },
  });
}

export async function logUserLogin(userId: string, ip?: string): Promise<void> {
  await logAuditEvent({
    userId,
    action: "USER_LOGIN",
    resource: "auth",
    ip,
  });
}

export async function logCaseCreated(userId: string, caseId: string): Promise<void> {
  await logAuditEvent({
    userId,
    action: "CASE_CREATED",
    resource: caseId,
    details: { caseId },
  });
}

export async function logDocumentGenerated(userId: string, docType: string, caseId?: string): Promise<void> {
  await logAuditEvent({
    userId,
    action: "DOCUMENT_GENERATED",
    resource: docType,
    details: { docType, caseId },
  });
}

export async function logPaymentCompleted(userId: string, caseId?: string): Promise<void> {
  await logAuditEvent({
    userId,
    action: "PAYMENT_COMPLETED",
    resource: "stripe",
    details: { caseId },
  });
}

export async function logDataExported(userId: string): Promise<void> {
  await logAuditEvent({
    userId,
    action: "DATA_EXPORTED",
    resource: "user-data",
  });
}

export async function logDataDeleted(userId: string): Promise<void> {
  await logAuditEvent({
    userId,
    action: "DATA_DELETED",
    resource: "user-data",
  });
}

export async function getAuditLogs(userId: string, limit = 50): Promise<AuditLog[]> {
  try {
    const rows = await sql()`
      SELECT user_id, action, resource, details, ip_address, created_at
      FROM audit_logs
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      userId: r.user_id,
      action: r.action,
      resource: r.resource,
      details: r.details ? JSON.parse(r.details) : undefined,
      ip: r.ip_address,
    }));
  } catch {
    return [];
  }
}
