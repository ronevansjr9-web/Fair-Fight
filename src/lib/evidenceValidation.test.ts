/**
 * Unit tests for the Wave 4 evidence validation layer (pure, hermetic — no
 * server imports, so this runs under plain `bun test` with no mocks).
 *
 * These pin the honest contract of the upload path: the 10 MB cap, the
 * five-file-type allow-list, server-computed decoded sizes, filename
 * sanitization, and specific plain-English rejection messages (never a
 * generic "upload failed").
 */
import { describe, expect, test } from "bun:test";
import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  EVIDENCE_ERRORS,
  MAX_EVIDENCE_FILE_SIZE,
  base64DecodedLength,
  parseEvidenceCaseId,
  parseEvidenceFileId,
  validateEvidenceUpload,
} from "./evidenceValidation";

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const validInput = (overrides: Record<string, unknown> = {}) => ({
  filename: "scan.pdf",
  mimeType: "application/pdf",
  dataBase64: b64("hello"),
  ...overrides,
});

describe("evidence limits", () => {
  test("max size is exactly 10 MB", () => {
    expect(MAX_EVIDENCE_FILE_SIZE).toBe(10 * 1024 * 1024);
  });

  test("allow-list is exactly the five spec'd types", () => {
    expect([...ALLOWED_EVIDENCE_MIME_TYPES]).toEqual([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/plain",
    ]);
  });

  test("base64DecodedLength computes exact decoded byte lengths", () => {
    expect(base64DecodedLength(b64(""))).toBe(0);
    expect(base64DecodedLength(b64("a"))).toBe(1);
    expect(base64DecodedLength(b64("hello world"))).toBe(11);
    expect(base64DecodedLength(Buffer.alloc(1024 * 1024).toString("base64"))).toBe(1024 * 1024);
  });
});

describe("validateEvidenceUpload", () => {
  test("accepts every allowed type and returns the server-computed size", () => {
    for (const mimeType of ALLOWED_EVIDENCE_MIME_TYPES) {
      const out = validateEvidenceUpload(validInput({ mimeType }));
      expect(out.mimeType).toBe(mimeType);
      expect(out.sizeBytes).toBe(5);
      expect(out.filename).toBe("scan.pdf");
    }
  });

  test("rejects disallowed types with the SPECIFIC plain-English error", () => {
    for (const bad of [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/gif",
      "image/svg+xml",
      "application/zip",
      "video/mp4",
      "",
      undefined,
    ]) {
      expect(() => validateEvidenceUpload(validInput({ mimeType: bad }))).toThrow(
        EVIDENCE_ERRORS.type,
      );
    }
  });

  test("rejects files over 10 MB with the SPECIFIC size error", () => {
    const dataBase64 = Buffer.alloc(MAX_EVIDENCE_FILE_SIZE + 1).toString("base64");
    expect(() => validateEvidenceUpload(validInput({ dataBase64 }))).toThrow(
      EVIDENCE_ERRORS.size,
    );
  });

  test("a file exactly at 10 MB passes the size check", () => {
    const dataBase64 = Buffer.alloc(MAX_EVIDENCE_FILE_SIZE).toString("base64");
    expect(validateEvidenceUpload(validInput({ dataBase64 })).sizeBytes).toBe(
      MAX_EVIDENCE_FILE_SIZE,
    );
  });

  test("rejects empty and corrupt payloads with specific errors", () => {
    // An empty base64 payload is unreadable -> corrupt (the client separately
    // pre-rejects zero-byte files with EVIDENCE_ERRORS.empty before upload).
    expect(() => validateEvidenceUpload(validInput({ dataBase64: "" }))).toThrow(
      EVIDENCE_ERRORS.corrupt,
    );
    expect(() => validateEvidenceUpload(validInput({ dataBase64: undefined }))).toThrow(
      EVIDENCE_ERRORS.corrupt,
    );
    expect(() => validateEvidenceUpload(validInput({ dataBase64: "not!base64!" }))).toThrow(
      EVIDENCE_ERRORS.corrupt,
    );
  });

  test("rejects empty filenames and strips path separators", () => {
    expect(() => validateEvidenceUpload(validInput({ filename: "  " }))).toThrow(
      EVIDENCE_ERRORS.filename,
    );
    // Filenames never contain path separators (stored as DB text metadata; the
    // download attribute is the only consumer), and are length-capped.
    const out = validateEvidenceUpload(validInput({ filename: "folder/scan.pdf" }));
    expect(out.filename).not.toContain("/");
    expect(out.filename).not.toContain("\\");
    expect(out.filename).toBe("folder_scan.pdf");
  });

  test("rejection messages are specific — never a generic failure", () => {
    const messages = [EVIDENCE_ERRORS.type, EVIDENCE_ERRORS.size];
    for (const m of messages) {
      expect(m).not.toMatch(/upload failed/i);
    }
  });
});

describe("evidence id parsing", () => {
  test("caseId accepts UUIDs and path-safe ids; anything else is rejected with a specific error", () => {
    expect(parseEvidenceCaseId({ caseId: "d8d6aa64-cf38-4f64-8c5a-179ce0b7935b" })).toBe(
      "d8d6aa64-cf38-4f64-8c5a-179ce0b7935b",
    );
    expect(() => parseEvidenceCaseId({ caseId: "" })).toThrow(EVIDENCE_ERRORS.caseId);
    expect(() => parseEvidenceCaseId({ caseId: "a/b" })).toThrow(EVIDENCE_ERRORS.caseId);
    expect(() => parseEvidenceCaseId({})).toThrow(EVIDENCE_ERRORS.caseId);
  });

  test("fileId is a 36-char uuid; anything else is rejected", () => {
    const id = "5f0f57ec-0f5a-4e1a-9f1e-9e8b1f2a3b4c";
    expect(parseEvidenceFileId({ id })).toBe(id);
    expect(() => parseEvidenceFileId({ id: "nope" })).toThrow(EVIDENCE_ERRORS.fileId);
    expect(() => parseEvidenceFileId({})).toThrow(EVIDENCE_ERRORS.fileId);
  });
});