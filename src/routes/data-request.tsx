import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useClerk } from "@clerk/tanstack-react-start";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";

export const Route = createFileRoute("/data-request")({
  component: DataRequestPage,
  head: () => ({
    meta: [
      { title: "Data Request — Fair Fight" },
      { name: "description", content: "Download a copy of your Fair Fight data or permanently delete it. Export and deletion cover all data you own, scoped to your account." },
    ],
  }),
});

/**
 * Wave 5 — export/delete are LIVE (no gate). The UI talks to the rebuilt
 * API routes directly (same-origin fetch, session cookie auth):
 *   - POST /api/user/export-data → JSON document → served as a file download.
 *   - POST /api/user/delete-data (body { confirm: "DELETE" }) → deletes
 *     everything in one transaction, then best-effort deletes the Clerk
 *     account. On success the user is signed out and taken to a plain
 *     confirmation page (/data-deleted).
 */
const REQUIRED_CONFIRMATION = "DELETE";

function DataRequestPage() {
  return (
    <AuthenticatedGuard>
      <DataRequestForms />
    </AuthenticatedGuard>
  );
}

function DataRequestForms() {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const [exportState, setExportState] = React.useState<"idle" | "loading" | "error">("idle");
  const [deleteState, setDeleteState] = React.useState<"idle" | "confirm" | "loading" | "error">("idle");
  const [confirmationInput, setConfirmationInput] = React.useState("");
  const [message, setMessage] = React.useState("");

  async function handleExport() {
    setExportState("loading");
    setMessage("");
    try {
      const res = await fetch("/api/user/export-data", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage(body.error ?? "Export failed. Please try again.");
        setExportState("error");
        return;
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
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
      setMessage("Export failed. No data was exported. Please try again.");
      setExportState("error");
    }
  }

  async function handleDelete() {
    setDeleteState("loading");
    setMessage("");
    try {
      const res = await fetch("/api/user/delete-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmationInput.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        clerkAccountDeleted?: boolean;
        error?: string;
      };
      if (!res.ok || !body.success) {
        setMessage(body.error ?? "Deletion failed. No data was changed.");
        setDeleteState("error");
        return;
      }
      // Hand the Clerk-account outcome to the confirmation page via
      // sessionStorage (survives the sign-out state change and navigation).
      try {
        sessionStorage.setItem(
          "ff-data-deleted-clerk",
          body.clerkAccountDeleted ? "deleted" : "not-deleted",
        );
      } catch {
        /* sessionStorage unavailable — confirmation page shows general copy */
      }
      await navigate({ to: "/data-deleted" });
      // Sign the user out AFTER navigating so the confirmation page is
      // reached first (it is not behind the authenticated guard).
      signOut().catch(() => {
        /* session cookies may already be gone; the account was still deleted
           server-side and the confirmation page is already showing */
      });
    } catch {
      setMessage("Deletion failed. No data was changed.");
      setDeleteState("error");
    }
  }

  const canConfirm = confirmationInput === REQUIRED_CONFIRMATION;

  return (
    <main className="min-h-screen bg-navy px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-extrabold text-white">Data Request</h1>
        <p className="mb-8 text-white/70">
          Your right to access, export, and delete your data — scoped to your account only.
        </p>
        <div className="space-y-8">
          {/* Export */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <h2 className="mb-1 text-xl font-bold text-white">Export your data</h2>
            <p className="mb-6 text-sm text-white/60">
              Download a JSON copy of everything you own in Fair Fight, scoped to your
              account only: your cases, case analyses, payment records, timeline entries,
              court calendar, evidence file metadata (filename, type, and size — file
              contents are not included in the export), and your audit log entries.
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
              transaction: all of your cases, case analyses, calendar and timeline
              entries, evidence files, payment records, and the audit log entries for
              your account. Your Fair Fight sign-in account is deleted at the same time.
            </p>
            <ul className="mb-6 list-disc space-y-2 pl-5 text-sm text-white/60">
              <li>
                <span className="text-white/80">This is permanent and cannot be undone.</span>{" "}
                If you want a copy of your data, export it first.
              </li>
              <li>
                Deleting your payment records here does not delete Stripe's records —
                Stripe retains its own payment records independently.
              </li>
              <li>
                If automatic deletion of your sign-in account fails, your data is still
                deleted — the confirmation page will say so explicitly.
              </li>
            </ul>
            {deleteState === "confirm" || deleteState === "loading" ? (
              <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-5">
                <p className="mb-3 text-sm text-white/80">
                  This permanently deletes all of your data and your Fair Fight
                  account. It cannot be undone. Type{" "}
                  <span className="font-mono font-bold text-white">DELETE</span> to confirm.
                </p>
                <input
                  type="text"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  aria-label="Type DELETE to confirm permanent deletion"
                  autoComplete="off"
                  spellCheck={false}
                  className="mb-4 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-gold"
                />
                <button
                  onClick={handleDelete}
                  disabled={!canConfirm || deleteState === "loading"}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deleteState === "loading" ? "Deleting…" : "Yes, permanently delete everything"}
                </button>
                <button
                  onClick={() => {
                    setDeleteState("idle");
                    setConfirmationInput("");
                  }}
                  disabled={deleteState === "loading"}
                  className="ml-3 inline-flex items-center rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/70 transition-all hover:bg-white/5 disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteState("confirm")}
                className="inline-flex items-center gap-2 rounded-xl border border-red-400/40 px-5 py-3 text-sm font-semibold text-red-300 transition-all hover:bg-red-400/10"
              >
                Delete my data…
              </button>
            )}
          </div>
          {message && <p className="text-sm text-gold">{message}</p>}
        </div>
      </div>
    </main>
  );
}