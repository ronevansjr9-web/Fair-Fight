/**
 * Evidence-file workspace server functions (Wave 4).
 *
 * Evidence is part of the case workspace — available to the signed-in OWNER
 * of the case, with the same ownership model as calendar/timeline in
 * caseActivity.ts: every query joins cases on user_id. It is NOT gated behind
 * the $99 payment (that gate is for AI tools only).
 *
 * Server-fn pattern: POST, NO `.validator(...)` — validator-compiled POST fns
 * lose the request lifecycle that getCurrentAuth() needs (PR #46 lesson, same
 * as getAdminStats). Every handler auth-gates FIRST, then parses/validates,
 * then runs an ownership-scoped query. Failures return
 * { ok: false, error: <specific plain-English message> } — never a generic
 * "upload failed" and never a thrown message that the client cannot surface.
 */
import { createServerFn } from "@tanstack/react-start";
import { getCurrentAuth } from "~/lib/auth";
import { sql } from "~/db";
import { logEvidenceUploaded, logEvidenceDeleted } from "~/lib/audit";
import {
  EVIDENCE_ERRORS,
  parseEvidenceCaseId,
  parseEvidenceFileId,
  validateEvidenceUpload,
  type ValidatedEvidenceUpload,
} from "~/lib/evidenceValidation";

export interface EvidenceFileSummary {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

type EvidenceResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

function toSummary(r: Record<string, unknown>): EvidenceFileSummary {
  return {
    id: String(r.id),
    filename: String(r.filename),
    mimeType: String(r.mime_type),
    sizeBytes: Number(r.size_bytes),
    createdAt: String(r.created_at),
  };
}

/** List evidence files for one owned case (no file data — metadata only). */
export const listEvidence = createServerFn({ method: "POST" }).handler(
  async ({ data }): Promise<EvidenceResult<{ files: EvidenceFileSummary[] }>> => {
    try {
      const auth = await getCurrentAuth();
      if (!auth.userId) return { ok: false, error: EVIDENCE_ERRORS.signIn };
      let caseId: string;
      try {
        caseId = parseEvidenceCaseId(data);
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
      const rows = await sql()`
        SELECT e.id, e.filename, e.mime_type, e.size_bytes, e.created_at
        FROM evidence_files e
        JOIN cases c ON c.id = e.case_id
        WHERE e.case_id = ${caseId} AND c.user_id = ${auth.userId}
        ORDER BY e.created_at DESC, e.filename
      `;
      return { ok: true, files: rows.map(toSummary) };
    } catch (error) {
      console.error("listEvidence error:", error);
      return { ok: false, error: EVIDENCE_ERRORS.load };
    }
  },
);

/**
 * Upload one evidence file (base64 payload) for an owned case. The decoded
 * size is computed server-side; type, size, and ownership are all enforced
 * server-side regardless of what the client sent.
 */
export const uploadEvidence = createServerFn({ method: "POST" }).handler(
  async ({ data }): Promise<EvidenceResult<{ file: EvidenceFileSummary }>> => {
    try {
      const auth = await getCurrentAuth();
      if (!auth.userId) return { ok: false, error: EVIDENCE_ERRORS.signIn };
      let caseId: string;
      try {
        caseId = parseEvidenceCaseId(data);
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
      let valid: ValidatedEvidenceUpload;
      try {
        valid = validateEvidenceUpload((data ?? {}) as Record<string, unknown>);
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
      const rows = await sql()`
        INSERT INTO evidence_files (case_id, user_id, filename, mime_type, size_bytes, data)
        SELECT ${caseId}, ${auth.userId}, ${valid.filename}, ${valid.mimeType}, ${valid.sizeBytes}, decode(${valid.dataBase64}, 'base64')
        WHERE EXISTS (SELECT 1 FROM cases WHERE id = ${caseId} AND user_id = ${auth.userId})
        RETURNING id, filename, mime_type, size_bytes, created_at
      `;
      if (!rows.length) return { ok: false, error: EVIDENCE_ERRORS.caseNotFound };
      const file = toSummary(rows[0] as Record<string, unknown>);
      await logEvidenceUploaded(auth.userId, caseId, valid.filename, valid.sizeBytes);
      return { ok: true, file };
    } catch (error) {
      console.error("uploadEvidence error:", error);
      return { ok: false, error: EVIDENCE_ERRORS.storage };
    }
  },
);

/** Delete one evidence file, ownership-scoped (deletes via the cases join). */
export const deleteEvidence = createServerFn({ method: "POST" }).handler(
  async ({ data }): Promise<EvidenceResult> => {
    try {
      const auth = await getCurrentAuth();
      if (!auth.userId) return { ok: false, error: EVIDENCE_ERRORS.signIn };
      let caseId: string;
      let fileId: string;
      try {
        caseId = parseEvidenceCaseId(data);
        fileId = parseEvidenceFileId(data);
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
      const rows = await sql()`
        DELETE FROM evidence_files e
        USING cases c
        WHERE e.id = ${fileId} AND e.case_id = ${caseId}
          AND c.id = e.case_id AND c.user_id = ${auth.userId}
        RETURNING e.id, e.filename, e.size_bytes
      `;
      if (!rows.length) return { ok: false, error: EVIDENCE_ERRORS.fileNotFound };
      const r = rows[0] as Record<string, unknown>;
      await logEvidenceDeleted(auth.userId, caseId, String(r.filename), Number(r.size_bytes));
      return { ok: true };
    } catch (error) {
      console.error("deleteEvidence error:", error);
      return { ok: false, error: EVIDENCE_ERRORS.delete };
    }
  },
);

/**
 * Download one evidence file (owner only). Simplest honest streaming: the
 * server returns the stored bytes base64-encoded with the correct mime type
 * and the client triggers a download.
 */
export const downloadEvidence = createServerFn({ method: "POST" }).handler(
  async ({ data }): Promise<
    EvidenceResult<{ filename: string; mimeType: string; sizeBytes: number; dataBase64: string }>
  > => {
    try {
      const auth = await getCurrentAuth();
      if (!auth.userId) return { ok: false, error: EVIDENCE_ERRORS.signIn };
      let caseId: string;
      let fileId: string;
      try {
        caseId = parseEvidenceCaseId(data);
        fileId = parseEvidenceFileId(data);
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
      const rows = await sql()`
        SELECT e.filename, e.mime_type, e.size_bytes, encode(e.data, 'base64') AS data_base64
        FROM evidence_files e
        JOIN cases c ON c.id = e.case_id
        WHERE e.id = ${fileId} AND e.case_id = ${caseId} AND c.user_id = ${auth.userId}
        LIMIT 1
      `;
      if (!rows.length) return { ok: false, error: EVIDENCE_ERRORS.fileNotFound };
      const r = rows[0] as Record<string, unknown>;
      return {
        ok: true,
        filename: String(r.filename),
        mimeType: String(r.mime_type),
        sizeBytes: Number(r.size_bytes),
        dataBase64: String(r.data_base64),
      };
    } catch (error) {
      console.error("downloadEvidence error:", error);
      return { ok: false, error: EVIDENCE_ERRORS.download };
    }
  },
);