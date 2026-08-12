import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentAuth } from "~/lib/auth";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";
import { listFiles, deleteFile } from "~/lib/storage";
import {
  RESTRICTED_FEATURES,
  TEMP_UNAVAILABLE_MESSAGE,
} from "~/lib/restrictedFeatures";

export const Route = createFileRoute("/evidence")({
  component: EvidencePage,
  head: () => ({
    meta: [
      { title: "Evidence Manager — Fair Fight" },
      { name: "description", content: "The Evidence Manager — organizing and uploading case evidence — is temporarily unavailable while we verify durable file storage. Educational purposes only — not legal advice." },
    ],
  }),
});

interface UploadedFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  caseId: string | null;
}

const getUploadedFiles = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return { files: [], unavailable: true };

  // P0 fail-closed gate: evidence uploads are not durable; do not present
  // the stored-file surface as operational.
  if (RESTRICTED_FEATURES.evidenceUploads) {
    return { files: [], unavailable: true };
  }

  // NOTE: the evidence-manager UI (upload form, file list, delete actions)
  // was replaced by the unavailable panel; clearing the flag alone does NOT
  // restore it (see lib/restrictedFeatures.ts). The stored-file surface must
  // be rebuilt and the durable-storage path verified before any re-enable.
  const files = await listFiles(auth.userId);
  return { files };
});

const removeFile = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    if (typeof d.fileId !== "string") throw new Error("fileId required");
    return { fileId: d.fileId as string };
  })
  .handler(async ({ data }) => {
    const auth = await getCurrentAuth();
    if (!auth.userId) return { success: false, error: "Unauthorized" };

    // P0 fail-closed gate: evidence storage is not durable/verified; refuse
    // destructive evidence actions too.
    if (RESTRICTED_FEATURES.evidenceUploads) {
      return { success: false, error: TEMP_UNAVAILABLE_MESSAGE };
    }

    const ok = await deleteFile(data.fileId, auth.userId);
    return { success: ok };
  });

function EvidencePage() {
  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-navy px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-3xl font-extrabold text-white">Evidence Manager</h1>
          <p className="mb-8 text-white/70">
            The Evidence Manager — organizing and uploading case evidence — is
            temporarily unavailable while we verify durable file storage.
          </p>

          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
              <svg className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-white">
              Evidence uploads are temporarily unavailable
            </h2>
            <p className="mx-auto mb-6 max-w-xl text-center text-sm text-white/70">
              {TEMP_UNAVAILABLE_MESSAGE}
            </p>
            <p className="mx-auto max-w-xl text-center text-sm text-white/60">
              We are verifying that uploaded files are stored durably and can
              be included in export and deletion before we re-enable uploads.
              Your cases, timeline, and court calendar continue to work.
            </p>
          </div>
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
