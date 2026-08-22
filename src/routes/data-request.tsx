import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentAuth } from "~/lib/auth";
import {
  RESTRICTED_FEATURES,
  TEMP_UNAVAILABLE_MESSAGE,
  tempUnavailableError,
} from "~/lib/restrictedFeatures";
import { collectUserExport, deleteAllUserData } from "~/lib/dataProtection";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";

export const Route = createFileRoute("/data-request")({
  component: DataRequestPage,
  head: () => ({
    meta: [
      { title: "Data Request — Fair Fight" },
      { name: "description", content: "Request a copy of your data or delete your Fair Fight data. Export and deletion cover all data you own, scoped to your account." },
    ],
  }),
});

/**
 * Self-serve portable export. Returns the owning user's COMPLETE data set
 * (cases, payments, case_analyses, timeline_entries, calendar_events) as a
 * JSON payload, ownership-scoped. Fail-closed: any DB error returns `{ error }`,
 * never partial data.
 */
const exportUserData = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return { error: "Sign in required" };

  // P0 fail-closed gate: self-serve export stays disabled until it has been
  // verified end-to-end in a controlled deploy (see lib/restrictedFeatures.ts
  // and shared/data-flow-inventory-2026-08-20.md). The implementation below is
  // rebuilt and unit-tested; clearing the flag is the LAST step.
  if (RESTRICTED_FEATURES.exportUserData) {
    return tempUnavailableError();
  }

  try {
    const data = await collectUserExport(auth.userId);
    return { data };
  } catch (error) {
    console.error("[DATA-REQUEST] Export failed:", error);
    return { error: "Export failed. Please try again." };
  }
});

const REQUIRED_CONFIRMATION = "DELETE MY DATA";

/**
 * Self-serve deletion. Requires an explicit confirmation string, then deletes
 * ALL of the owning user's rows (case_analyses, timeline/calendar, payments,
 * cases) in ONE transaction, ownership-scoped. Fail-closed on error.
 */
const deleteUserData = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    const d = value as Record<string, unknown>;
    if (typeof d.confirm !== "string" || d.confirm.trim().toUpperCase() !== REQUIRED_CONFIRMATION) {
      throw new Error("Confirmation is required to delete your data.");
    }
    return {};
  })
  .handler(async () => {
    const auth = await getCurrentAuth();
    if (!auth.userId) return { error: "Sign in required" };

    // P0 fail-closed gate: self-serve deletion stays disabled until verified
    // end-to-end in a controlled deploy. Implementation is rebuilt + tested.
    if (RESTRICTED_FEATURES.deleteUserData) {
      return tempUnavailableError();
    }

    try {
      await deleteAllUserData(auth.userId);
      return { success: true };
    } catch (error) {
      console.error("[DATA-REQUEST] Delete failed:", error);
      return { error: "Deletion failed. No data was changed." };
    }
  });

function DataRequestPage() {
  // The self-serve flows stay gated (fail-closed) until verified live; show the
  // honest unavailable panel today. The functional UI below is fully built and
  // is rendered the moment both gates are cleared in a controlled deploy.
  const exportEnabled = !RESTRICTED_FEATURES.exportUserData;
  const deleteEnabled = !RESTRICTED_FEATURES.deleteUserData;

  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-navy px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-3xl font-extrabold text-white">Data Request</h1>
          <p className="mb-8 text-white/70">
            We're committed to protecting your data and your right to access, export, and delete it.
          </p>

          {exportEnabled && deleteEnabled ? (
            <DataRequestForms />
          ) : (
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
                <svg className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="mb-2 text-center text-xl font-bold text-white">
                Export and deletion are temporarily unavailable
              </h2>
              <p className="mx-auto mb-6 max-w-xl text-center text-sm text-white/70">
                {TEMP_UNAVAILABLE_MESSAGE}
              </p>
              <p className="mx-auto max-w-xl text-center text-sm text-white/60">
                We are verifying that export and deletion cover every category of
                data we hold — including payment records and any future uploaded
                files — before we re-enable them. In the meantime you can contact
                us directly at{" "}
                <a href="mailto:privacy@fairfight.ctonew.app" className="font-semibold text-gold underline hover:text-gold-dark">
                  privacy@fairfight.ctonew.app
                </a>{" "}
                and we will assist with access, export, or deletion requests.
              </p>
              <p className="mx-auto mt-6 max-w-xl text-center text-xs text-white/40">
                For details on how we handle your data, see our{" "}
                <a href="/privacy" className="text-gold underline hover:text-gold-dark">Privacy Policy</a>.
              </p>
            </div>
          )}
        </div>
      </main>
    </AuthenticatedGuard>
  );
}

function DataRequestForms() {
  const [exportState, setExportState] = React.useState<"idle" | "loading" | "error">("idle");
  const [deleteState, setDeleteState] = React.useState<
    "idle" | "confirm" | "loading" | "error" | "done"
  >("idle");
  const [message, setMessage] = React.useState("");

  async function handleExport() {
    setExportState("loading");
    setMessage("");
    try {
      const res = await exportUserData();
      if ("error" in res) {
        setMessage(res.error);
        setExportState("error");
        return;
      }
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fair-fight-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportState("idle");
    } catch {
      setMessage("Export failed. Please try again.");
      setExportState("error");
    }
  }

  async function handleDelete() {
    setDeleteState("loading");
    setMessage("");
    try {
      const res = await deleteUserData({ data: { confirm: "DELETE MY DATA" } });
      if ("error" in res) {
        setMessage(res.error);
        setDeleteState("error");
        return;
      }
      setDeleteState("done");
    } catch {
      setMessage("Deletion failed. No data was changed.");
      setDeleteState("error");
    }
  }

  return (
    <div className="space-y-8">
      {/* Export */}
      <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
        <h2 className="mb-1 text-xl font-bold text-white">Export your data</h2>
        <p className="mb-6 text-sm text-white/60">
          Download a JSON copy of everything you own in Fair Fight: your cases,
          payments, case analyses, timeline entries, and court calendar. Scoped
          to your account only.
        </p>
        <button
          onClick={handleExport}
          disabled={exportState === "loading"}
          className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-navy transition-all hover:bg-gold-dark disabled:opacity-50"
        >
          {exportState === "loading" ? "Preparing…" : "Download my data"}
        </button>
      </div>

      {/* Delete */}
      <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
        <h2 className="mb-1 text-xl font-bold text-white">Delete your data</h2>
        <p className="mb-6 text-sm text-white/60">
          Permanently delete everything you own in Fair Fight, in a single
          transaction: cases, payments, case analyses, timeline entries, and
          court calendar — only your account's data. This cannot be undone.
          (Your Clerk account and Stripe's records are handled separately — see
          the <a href="/privacy" className="text-gold underline">Privacy Policy</a>.)
        </p>
        {deleteState === "confirm" ? (
          <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-5">
            <p className="mb-3 text-sm text-white/80">
              This permanently deletes your data and cannot be undone.
            </p>
            <button
              onClick={handleDelete}
              disabled={deleteState === "loading"}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-red-600 disabled:opacity-50"
            >
              {deleteState === "loading" ? "Deleting…" : "Yes, delete all my data"}
            </button>
            <button
              onClick={() => setDeleteState("idle")}
              className="ml-3 inline-flex items-center rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/70 transition-all hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        ) : deleteState === "done" ? (
          <p className="text-sm font-semibold text-white">
            Your data has been deleted.
          </p>
        ) : (
          <button
            onClick={() => setDeleteState("confirm")}
            disabled={deleteState === "loading"}
            className="inline-flex items-center gap-2 rounded-xl border border-red-400/40 px-5 py-3 text-sm font-semibold text-red-300 transition-all hover:bg-red-400/10 disabled:opacity-50"
          >
            Delete my data…
          </button>
        )}
      </div>

      {message && <p className="text-sm text-gold">{message}</p>}
    </div>
  );
}

