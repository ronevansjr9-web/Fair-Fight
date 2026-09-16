/**
 * Pure validation + limits for the evidence-file workspace (Wave 4).
 *
 * Kept free of any server/runtime imports (no createServerFn, no auth, no db)
 * so the team can unit-test the limits and the plain-English rejection
 * messages hermetically, and so the client page can reuse the exact same
 * limits + copy strings without pulling server code into the browser bundle.
 *
 * The server functions in src/lib/evidence.ts call these helpers AFTER the
 * Clerk auth gate — the auth gate runs first, per the no-validator POST
 * pattern (validator-compiled POST fns lose the request lifecycle
 * getCurrentAuth() needs, PR #46).
 */

/** 10 MB per file — enforced server-side here and by the DB CHECK constraint. */
export const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024;

/** The only file types accepted. Mirrors the migration's CHECK constraint. */
export const ALLOWED_EVIDENCE_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
] as const;

/** Cap on the cleaned filename (after path/control-char stripping). */
export const MAX_EVIDENCE_FILENAME_LENGTH = 200;

/** One-line limits summary shown in the UI and reused by tests. */
export const EVIDENCE_LIMITS_SUMMARY =
  "Up to 10 MB per file. Allowed types: PDF, JPG, PNG, WebP, and plain text (.txt).";

/**
 * Specific, plain-English rejection messages. The upload path NEVER falls back
 * to a generic "upload failed" — every rejection names the concrete problem.
 */
export const EVIDENCE_ERRORS = {
  signIn: "Sign in required.",
  caseId: "A valid caseId is required.",
  fileId: "Invalid file id.",
  filename: "Please give the file a name.",
  type: "This file type isn't supported. Allowed types: PDF, JPG, PNG, WebP, and plain text (.txt).",
  size: "This file is larger than 10 MB — the maximum size per file is 10 MB.",
  empty: "The selected file is empty.",
  corrupt: "The file data couldn't be read. Please try selecting the file again.",
  caseNotFound: "Case not found or you don't have access to it.",
  fileNotFound: "File not found or you don't have access to it.",
  storage: "We couldn't save the file right now. Please try again in a moment.",
  load: "We couldn't load the file list right now. Please try again in a moment.",
  download: "We couldn't load the file right now. Please try again in a moment.",
  delete: "We couldn't delete the file right now. Please try again in a moment.",
} as const;

/** Case IDs are UUIDs / safe path chars (same pattern as the case workspace). */
export const EVIDENCE_CASE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
/** Evidence file ids are Postgres uuids (36 chars). */
export const EVIDENCE_FILE_ID_PATTERN = /^[A-Fa-f0-9-]{36}$/;

/** Exact decoded byte length of a base64 string (no Buffer needed). */
export function base64DecodedLength(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Parse + validate the caseId from a client payload. Throws with a specific
 * plain-English message on malformed input (handler converts it to
 * { ok: false, error }).
 */
export function parseEvidenceCaseId(data: unknown): string {
  const d = (data ?? {}) as Record<string, unknown>;
  if (typeof d.caseId !== "string" || !EVIDENCE_CASE_ID_PATTERN.test(d.caseId)) {
    throw new Error(EVIDENCE_ERRORS.caseId);
  }
  return d.caseId;
}

/** Parse + validate the file id from a client payload. */
export function parseEvidenceFileId(data: unknown): string {
  const d = (data ?? {}) as Record<string, unknown>;
  if (typeof d.id !== "string" || !EVIDENCE_FILE_ID_PATTERN.test(d.id)) {
    throw new Error(EVIDENCE_ERRORS.fileId);
  }
  return d.id;
}

export interface ValidatedEvidenceUpload {
  filename: string;
  mimeType: string;
  dataBase64: string;
  /** Decoded byte length, computed server-side from the base64 payload. */
  sizeBytes: number;
}

/**
 * Validate an upload payload (filename, mime type, base64 data). Pure and
 * synchronous; the caller (uploadEvidence handler) converts thrown messages
 * into { ok: false, error }. The size check uses the DECODED byte length —
 * a client-supplied size figure is never trusted.
 */
export function validateEvidenceUpload(input: Record<string, unknown>): ValidatedEvidenceUpload {
  const filename = typeof input.filename === "string" ? input.filename.trim() : "";
  if (!filename) throw new Error(EVIDENCE_ERRORS.filename);
  // Strip path separators so a filename can never imply a directory traversal;
  // then cap the length.
  const cleanName = filename.replace(/[/\\]/g, "_").slice(0, MAX_EVIDENCE_FILENAME_LENGTH);

  const mimeType = typeof input.mimeType === "string" ? input.mimeType : "";
  if (!(ALLOWED_EVIDENCE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw new Error(EVIDENCE_ERRORS.type);
  }

  const dataBase64 = typeof input.dataBase64 === "string" ? input.dataBase64 : "";
  if (!dataBase64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(dataBase64) || dataBase64.length % 4 !== 0) {
    throw new Error(EVIDENCE_ERRORS.corrupt);
  }

  const sizeBytes = base64DecodedLength(dataBase64);
  if (sizeBytes === 0) throw new Error(EVIDENCE_ERRORS.empty);
  if (sizeBytes > MAX_EVIDENCE_FILE_SIZE) throw new Error(EVIDENCE_ERRORS.size);

  return { filename: cleanName, mimeType, dataBase64, sizeBytes };
}