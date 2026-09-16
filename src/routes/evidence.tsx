import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";
import {
  deleteEvidence,
  downloadEvidence,
  listEvidence,
  uploadEvidence,
  type EvidenceFileSummary,
} from "~/lib/evidence";
import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  EVIDENCE_ERRORS,
  EVIDENCE_LIMITS_SUMMARY,
  MAX_EVIDENCE_FILE_SIZE,
} from "~/lib/evidenceValidation";

export const Route = createFileRoute("/evidence")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search.caseId === "string" ? search.caseId : undefined,
  }),
  component: EvidencePage,
  head: () => ({
    meta: [
      { title: "Evidence Files | Fair Fight" },
      {
        name: "description",
        content:
          "Upload, view, and delete evidence files for your Fair Fight case workspace. Files are stored with your case for educational use only — not legal advice.",
      },
    ],
  }),
});

const ACCEPT_ATTR = ALLOWED_EVIDENCE_MIME_TYPES.join(",");

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function fileIcon(mimeType: string): string {
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType === "text/plain") return "📝";
  return "📎";
}

function EvidencePage() {
  const { caseId } = Route.useSearch();
  const [files, setFiles] = useState<EvidenceFileSummary[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!caseId) return;
    const res = await listEvidence({ data: { caseId } });
    if (res.ok) {
      setFiles(res.files);
      setError("");
    } else {
      setError(res.error);
    }
  }, [caseId]);

  useEffect(() => {
    if (caseId) {
      setError("");
      setNotice("");
      load().catch((e) =>
        setError(e instanceof Error ? e.message : EVIDENCE_ERRORS.load),
      );
    } else {
      setFiles([]);
    }
  }, [caseId, load]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Always reset so selecting the same file again re-triggers onChange.
    e.target.value = "";
    if (!file || !caseId) return;

    // Client-side pre-check with the SAME limits the server enforces — gives
    // an instant, specific message; the server re-validates regardless.
    if (!(ALLOWED_EVIDENCE_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError(EVIDENCE_ERRORS.type);
      setNotice("");
      return;
    }
    if (file.size > MAX_EVIDENCE_FILE_SIZE) {
      setError(EVIDENCE_ERRORS.size);
      setNotice("");
      return;
    }
    if (file.size === 0) {
      setError(EVIDENCE_ERRORS.empty);
      setNotice("");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");
    try {
      const dataBase64 = await readFileAsBase64(file);
      const res = await uploadEvidence({
        data: { caseId, filename: file.name, mimeType: file.type, dataBase64 },
      });
      if (res.ok) {
        setFiles((prev) => [res.file, ...prev]);
        setNotice(`${res.file.filename} uploaded to this case.`);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "We couldn't upload that file right now. Please try again in a moment.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id: string) => {
    if (!caseId || downloadingId) return;
    setDownloadingId(id);
    setError("");
    try {
      const res = await downloadEvidence({ data: { caseId, id } });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const binary = atob(res.dataBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: res.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice(`${res.filename} downloaded.`);
    } catch (err) {
      setError(
        err instanceof Error && err.message ? err.message : EVIDENCE_ERRORS.download,
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (f: EvidenceFileSummary) => {
    if (!caseId || deletingId) return;
    const confirmed = window.confirm(
      `Delete "${f.filename}" from this case workspace? This can't be undone.`,
    );
    if (!confirmed) return;
    setDeletingId(f.id);
    setError("");
    setNotice("");
    try {
      const res = await deleteEvidence({ data: { caseId, id: f.id } });
      if (res.ok) {
        setFiles((prev) => prev.filter((x) => x.id !== f.id));
        setNotice(`${f.filename} deleted.`);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message ? err.message : EVIDENCE_ERRORS.delete,
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-navy px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/dashboard"
            search={{ checkout: undefined }}
            className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-white/50 transition-colors hover:text-gold"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-white">Evidence Files</h1>
              <p className="mt-1 text-white/60">
                Files attached to this case — stored in your case workspace
              </p>
            </div>
            {caseId && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy shadow-md transition-all hover:shadow-lg disabled:opacity-60"
              >
                {uploading ? "Uploading…" : "＋ Upload File"}
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload an evidence file"
          />

          {!caseId ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white">
              <p className="text-lg font-semibold">Choose a case to view its evidence</p>
              <Link
                to="/dashboard"
                search={{ checkout: undefined }}
                className="mt-5 inline-block text-gold underline"
              >
                Go to dashboard
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                <p className="mb-1 font-semibold text-white/80">
                  How evidence storage works here
                </p>
                <p className="mb-2">
                  {EVIDENCE_LIMITS_SUMMARY} Files are saved in this case's workspace so you
                  can review them while you prepare.
                </p>
                <p>
                  This is educational tooling, not secure legal-grade evidence preservation —
                  keep your own copies of anything you plan to file, and don't rely on Fair
                  Fight as your only record.
                </p>
              </div>

              {error && (
                <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-900/40 p-4 text-sm text-red-200">
                  {error}
                </div>
              )}
              {notice && (
                <div role="status" className="mb-4 rounded-lg border border-green-500/30 bg-green-900/40 p-4 text-sm text-green-200">
                  {notice}
                </div>
              )}

              {files.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center shadow-sm">
                  <div className="mx-auto mb-4 text-5xl">📎</div>
                  <p className="text-lg font-semibold text-white/60">
                    No evidence files yet
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-white/40">
                    Upload a PDF, image, or text file to keep it with this case. Files are
                    limited to 10 MB each.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {files.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        {fileIcon(f.mimeType)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white" title={f.filename}>
                          {f.filename}
                        </p>
                        <p className="text-xs text-white/50">
                          {formatBytes(f.sizeBytes)} · {formatDate(f.createdAt)} ·{" "}
                          {f.mimeType}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 gap-2">
                        <button
                          onClick={() => handleDownload(f.id)}
                          disabled={downloadingId === f.id}
                          className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/20 disabled:opacity-60"
                        >
                          {downloadingId === f.id ? "Loading…" : "Download"}
                        </button>
                        <button
                          onClick={() => handleDelete(f)}
                          disabled={deletingId === f.id}
                          className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/50 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:opacity-60"
                        >
                          {deletingId === f.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </main>
    </AuthenticatedGuard>
  );
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("The file couldn't be read on this device. Please try again."));
    reader.readAsDataURL(file);
  });
}
