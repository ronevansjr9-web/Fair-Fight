import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { sql } from "~/db";
import { logDataExported, logDataDeleted } from "~/lib/audit";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";

export const Route = createFileRoute("/data-request")({
  component: DataRequestPage,
  head: () => ({
    meta: [
      { title: "Data Request — Export or Delete Your Data | Fair Fight" },
      { name: "description", content: "Request a copy of your data or delete your Fair Fight account and associated data." },
    ],
  }),
});

const exportUserData = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await getAuth();
  if (!auth.userId) return { error: "Sign in required" };

  try {
    const cases = await sql()`SELECT * FROM cases WHERE user_id = ${auth.userId}`;
    const auditLogs = await sql()`SELECT * FROM audit_logs WHERE user_id = ${auth.userId} ORDER BY created_at DESC LIMIT 1000`;

    await logDataExported(auth.userId);

    return {
      success: true,
      data: {
        userId: auth.userId,
        email: auth.user?.primaryEmailAddress?.emailAddress || "",
        cases: cases.map((c: Record<string, unknown>) => ({
          id: c.id, title: c.title, caseType: c.case_type,
          status: c.status, jurisdiction: c.jurisdiction,
          description: c.description, createdAt: c.created_at,
        })),
        auditLogs: auditLogs.map((l: Record<string, unknown>) => ({
          action: l.action, resource: l.resource, createdAt: l.created_at,
        })),
        exportedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Export error:", error);
    return { error: "Failed to export data. Please try again." };
  }
});

const deleteUserData = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await getAuth();
  if (!auth.userId) return { error: "Sign in required" };

  try {
    await sql()`DELETE FROM evidence WHERE user_id = ${auth.userId}`;
    await sql()`DELETE FROM timeline_events WHERE user_id = ${auth.userId}`;
    await sql()`DELETE FROM calendar_events WHERE user_id = ${auth.userId}`;
    await sql()`DELETE FROM cases WHERE user_id = ${auth.userId}`;
    await sql()`DELETE FROM audit_logs WHERE user_id = ${auth.userId}`;
    await sql()`DELETE FROM referral_codes WHERE user_id = ${auth.userId}`;
    await sql()`DELETE FROM referral_tracking WHERE referrer_id = ${auth.userId} OR referred_user_id = ${auth.userId}`;

    await logDataDeleted(auth.userId);

    return { success: true };
  } catch (error) {
    console.error("Deletion error:", error);
    return { error: "Failed to delete data. Please try again." };
  }
});

function DataRequestPage() {
  const [exportedData, setExportedData] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setError("");
    setMessage("");

    const result = await exportUserData();
    if (result.success) {
      setExportedData(JSON.stringify(result.data, null, 2));
      setMessage("Data export complete. You can copy the data below.");
    } else if (result.error) {
      setError(result.error);
    }
    setIsExporting(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    setError("");
    setMessage("");

    const result = await deleteUserData();
    if (result.success) {
      setMessage("All your data has been deleted. You will be redirected...");
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } else if (result.error) {
      setError(result.error);
    }
    setIsDeleting(false);
    setConfirmDelete(false);
  };

  const handleDownload = () => {
    const blob = new Blob([exportedData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fairfight-data-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-navy px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-3xl font-extrabold text-white">Data Request</h1>
          <p className="mb-8 text-white/70">Export your data or request deletion of your account and associated data.</p>

          <div className="space-y-6">
            {/* Export Section */}
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
              <h2 className="mb-4 text-xl font-bold text-white">
                <span className="mr-2">📥</span>Export Your Data
              </h2>
              <p className="mb-4 text-sm text-white/70">
                Download a copy of all your data, including case information, evidence, calendar events, and activity logs.
              </p>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="gold-gradient rounded-full px-6 py-2.5 font-semibold text-navy shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {isExporting ? "Exporting..." : "Export My Data"}
              </button>

              {exportedData && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Exported Data</h3>
                    <button onClick={handleDownload} className="rounded-lg bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10">
                      Download JSON
                    </button>
                  </div>
                  <pre className="max-h-96 overflow-y-auto rounded-lg bg-white/5 p-4 text-xs text-white/80">
                    {exportedData}
                  </pre>
                </div>
              )}
            </div>

            {/* Delete Section */}
            <div className="rounded-2xl border-2 border-red-800 bg-red-900/10 backdrop-blur-sm p-8">
              <h2 className="mb-4 text-xl font-bold text-red-600">
                <span className="mr-2">🗑️</span>Delete Your Data
              </h2>
              <p className="mb-4 text-sm text-white/70">
                Permanently delete all your Fair Fight data, including cases, evidence, calendar events, timeline entries, audit logs, and referral information. This action cannot be undone.
              </p>

              {confirmDelete && (
                <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 p-4 text-sm text-red-300">
                  <strong>⚠️ Are you sure?</strong> This will permanently delete ALL your data. This action cannot be reversed. Click the button again to confirm.
                </div>
              )}

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-full bg-red-600 px-6 py-2.5 font-semibold text-white shadow-md transition-all hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : confirmDelete ? "Yes, Delete Everything" : "Delete My Data"}
              </button>

              {confirmDelete && (
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="ml-3 rounded-full bg-white/10 px-6 py-2.5 font-semibold text-white/70"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Messages */}
            {message && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-300">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-300">
                {error}
              </div>
            )}
          </div>
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
