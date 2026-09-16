import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/data-deleted")({
  component: DataDeletedPage,
  head: () => ({
    meta: [
      { title: "Data Deleted — Fair Fight" },
      { name: "description", content: "Your Fair Fight data has been deleted." },
    ],
  }),
});

/**
 * Plain, honest post-deletion confirmation (no authenticated guard — the
 * session has ended). The outcome of the best-effort Clerk account deletion
 * is passed from /data-request via sessionStorage and shown precisely.
 */
function DataDeletedPage() {
  const [clerkNote, setClerkNote] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      const v = sessionStorage.getItem("ff-data-deleted-clerk");
      if (v === "not-deleted") setClerkNote("not-deleted");
      else if (v === "deleted") setClerkNote("deleted");
      sessionStorage.removeItem("ff-data-deleted-clerk");
    } catch {
      /* sessionStorage unavailable — show general copy */
    }
  }, []);
  return (
    <main className="min-h-screen bg-navy px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mb-3 text-2xl font-bold text-white">
            Your Fair Fight data has been deleted
          </h1>
          <div className="space-y-3 text-sm text-white/70">
            <p>
              All of your cases, case analyses, calendar and timeline entries, evidence
              files, payment records, and audit log entries for your account have been
              permanently deleted. This cannot be undone.
            </p>
            {clerkNote === "not-deleted" && (
              <p className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-gold">
                <span className="font-semibold text-white">One thing to know:</span> your
                Fair Fight sign-in account could not be deleted automatically. Your data
                has still been deleted — only the sign-in account remains.
              </p>
            )}
            {clerkNote === "deleted" && (
              <p>
                Your Fair Fight sign-in account was also deleted, and you have been signed
                out.
              </p>
            )}
            <p>
              Stripe retains its own payment records independently — deleting your Fair
              Fight payment records does not delete Stripe's records, and that is outside
              our control.
            </p>
          </div>
          <Link
            to="/"
            className="mt-6 inline-flex items-center rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-navy transition-all hover:bg-gold-dark"
          >
            Back to Fair Fight
          </Link>
        </div>
      </div>
    </main>
  );
}