/**
 * File storage helper for Fair Fight.
 *
 * CURRENT APPROACH (MVP): Store files as base64 in PostgreSQL (Neon).
 * - Max file size: 5 MB
 * - Supported MIME types: images, PDFs, common document formats
 * - Maximum 25 files per user in this phase
 *
 * PRODUCTION PLAN: Migrate to S3 / Cloudflare R2 for scalable object storage.
 * The helper API is designed so swapping the backend only requires changing
 * this file — all callers import from here.
 */

import { sql } from "~/db";
import {
  RESTRICTED_FEATURES,
  TEMP_UNAVAILABLE_MESSAGE,
} from "~/lib/restrictedFeatures";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES_PER_USER = 25;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/json",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "video/mp4",
];

export interface FileRecord {
  id: string;
  userId: string;
  caseId: string | null;
  filename: string;
  mimeType: string;
  dataBase64: string;
  sizeBytes: number;
  createdAt: string;
}

/**
 * Upload a file to the database.
 * Returns the created FileRecord or an error.
 */
export async function uploadFile(params: {
  userId: string;
  caseId?: string;
  filename: string;
  mimeType: string;
  dataBase64: string;
  sizeBytes: number;
}): Promise<{ success: true; file: FileRecord } | { success: false; error: string }> {
  const { userId, caseId, filename, mimeType, dataBase64, sizeBytes } = params;

  // P0 fail-closed gate: evidence uploads are not durable (no `files`
  // migration on master; /api/upload is not a registered route).
  if (RESTRICTED_FEATURES.evidenceUploads) {
    return { success: false, error: TEMP_UNAVAILABLE_MESSAGE };
  }

  // Validate size
  if (sizeBytes > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
    };
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      success: false,
      error: `Unsupported file type: ${mimeType}. Allowed: images, PDFs, documents, spreadsheets, audio, video.`,
    };
  }

  // Check user file count limit
  try {
    const countResult = await sql()`
      SELECT COUNT(*) as count FROM files WHERE user_id = ${userId}
    `;
    const currentCount = Number(countResult[0]?.count || 0);
    if (currentCount >= MAX_FILES_PER_USER) {
      return {
        success: false,
        error: `File limit reached (${MAX_FILES_PER_USER} files). Delete some files before uploading more.`,
      };
    }
  } catch (dbError) {
    console.error("[STORAGE] Failed to check file count:", dbError);
    return { success: false, error: "Storage is temporarily unavailable." };
  }

  // Insert into DB
  try {
    const rows = await sql()`
      INSERT INTO files (user_id, case_id, filename, mime_type, data_base64, size_bytes, created_at)
      VALUES (${userId}, ${caseId || null}, ${filename}, ${mimeType}, ${dataBase64}, ${sizeBytes}, NOW())
      RETURNING id, user_id, case_id, filename, mime_type, data_base64, size_bytes, created_at
    `;

    const row = rows[0] as Record<string, unknown>;
    const file: FileRecord = {
      id: String(row.id),
      userId: String(row.user_id),
      caseId: row.case_id ? String(row.case_id) : null,
      filename: String(row.filename),
      mimeType: String(row.mime_type),
      dataBase64: String(row.data_base64),
      sizeBytes: Number(row.size_bytes),
      createdAt: String(row.created_at),
    };

    return { success: true, file };
  } catch (dbError) {
    console.error("[STORAGE] Failed to insert file:", dbError);
    return { success: false, error: "Failed to store file. Please try again." };
  }
}

/**
 * List files for a user, optionally filtered by case.
 */
export async function listFiles(
  userId: string,
  caseId?: string
): Promise<Omit<FileRecord, "dataBase64">[]> {
  try {
    let rows;
    if (caseId) {
      rows = await sql()`
        SELECT id, user_id, case_id, filename, mime_type, size_bytes, created_at
        FROM files
        WHERE user_id = ${userId} AND case_id = ${caseId}
        ORDER BY created_at DESC
      `;
    } else {
      rows = await sql()`
        SELECT id, user_id, case_id, filename, mime_type, size_bytes, created_at
        FROM files
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
    }

    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      userId: String(r.user_id),
      caseId: r.case_id ? String(r.case_id) : null,
      filename: String(r.filename),
      mimeType: String(r.mime_type),
      sizeBytes: Number(r.size_bytes),
      createdAt: String(r.created_at),
    }));
  } catch (error) {
    console.error("[STORAGE] Failed to list files:", error);
    return [];
  }
}

/**
 * Get a single file by ID (including base64 data).
 */
export async function getFile(
  fileId: string,
  userId: string
): Promise<FileRecord | null> {
  try {
    const rows = await sql()`
      SELECT id, user_id, case_id, filename, mime_type, data_base64, size_bytes, created_at
      FROM files
      WHERE id = ${fileId} AND user_id = ${userId}
      LIMIT 1
    `;

    if (rows.length === 0) return null;

    const r = rows[0] as Record<string, unknown>;
    return {
      id: String(r.id),
      userId: String(r.user_id),
      caseId: r.case_id ? String(r.case_id) : null,
      filename: String(r.filename),
      mimeType: String(r.mime_type),
      dataBase64: String(r.data_base64),
      sizeBytes: Number(r.size_bytes),
      createdAt: String(r.created_at),
    };
  } catch (error) {
    console.error("[STORAGE] Failed to get file:", error);
    return null;
  }
}

/**
 * Delete a file. Returns true if deleted, false if not found.
 */
export async function deleteFile(
  fileId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await sql()`
      DELETE FROM files
      WHERE id = ${fileId} AND user_id = ${userId}
    `;
    return result.count > 0;
  } catch (error) {
    console.error("[STORAGE] Failed to delete file:", error);
    return false;
  }
}

/**
 * Get total storage used by a user (in bytes).
 */
export async function getStorageUsed(userId: string): Promise<number> {
  try {
    const rows = await sql()`
      SELECT COALESCE(SUM(size_bytes), 0) as total FROM files WHERE user_id = ${userId}
    `;
    return Number(rows[0]?.total || 0);
  } catch {
    return 0;
  }
}
