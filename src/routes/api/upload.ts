import { json } from "@tanstack/react-start";
import { getCurrentAuth } from "~/lib/auth";
import { uploadFile, listFiles } from "~/lib/storage";
import { checkRateLimit } from "~/lib/rate-limit";
import {
  RESTRICTED_FEATURES,
  TEMP_UNAVAILABLE_MESSAGE,
  TEMP_UNAVAILABLE_STATUS,
} from "~/lib/restrictedFeatures";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/upload — Upload a file (multipart form data)
 *
 * Fields:
 *   - file: (required) the file blob
 *   - caseId: (optional) associated case ID
 *
 * GET /api/upload — List files for the authenticated user
 *   Query: ?caseId=<id> (optional)
 */
export async function POST({ request }: { request: Request }) {
  // P0 fail-closed gate: evidence uploads are not durable (no `files`
  // migration on master; this route is not registered in the route tree).
  if (RESTRICTED_FEATURES.evidenceUploads) {
    return json(
      { error: TEMP_UNAVAILABLE_MESSAGE, code: "temporarily_unavailable" },
      { status: TEMP_UNAVAILABLE_STATUS },
    );
  }

  const auth = await getCurrentAuth(request);
  if (!auth.userId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResp = await checkRateLimit("general", auth.userId);
  if (rateLimitResp) {
    return json({ error: rateLimitResp.error }, { status: rateLimitResp.status });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const caseId = (formData.get("caseId") as string) || undefined;

    if (!file) {
      return json({ error: "No file provided" }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
        { status: 400 }
      );
    }

    // Read file as base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const dataBase64 = buffer.toString("base64");

    const result = await uploadFile({
      userId: auth.userId,
      caseId,
      filename: file.name || "unnamed",
      mimeType: file.type || "application/octet-stream",
      dataBase64,
      sizeBytes: file.size,
    });

    if (!result.success) {
      return json({ error: result.error }, { status: 400 });
    }

    const { dataBase64: _, ...safeFile } = result.file;
    return json({ success: true, file: safeFile });
  } catch (error) {
    console.error("[UPLOAD] Error:", error);
    return json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

export async function GET({ request }: { request: Request }) {
  // P0 fail-closed gate: same restriction as POST — do not present the
  // unverified upload/storage surface as operational.
  if (RESTRICTED_FEATURES.evidenceUploads) {
    return json(
      { error: TEMP_UNAVAILABLE_MESSAGE, code: "temporarily_unavailable" },
      { status: TEMP_UNAVAILABLE_STATUS },
    );
  }

  const auth = await getCurrentAuth(request);
  if (!auth.userId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const caseId = url.searchParams.get("caseId") || undefined;

  const files = await listFiles(auth.userId, caseId);
  return json({ files });
}
