import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentAuth } from "~/lib/auth";
import {
  RESTRICTED_FEATURES,
  TEMP_UNAVAILABLE_MESSAGE,
  tempUnavailableError,
} from "~/lib/restrictedFeatures";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";

export const Route = createFileRoute("/data-request")({
  component: DataRequestPage,
  head: () => ({
    meta: [
      { title: "Data Request — Fair Fight" },
      { name: "description", content: "Request a copy of your data or ask about deleting your Fair Fight data. Self-serve export and deletion are temporarily unavailable while we verify they cover all data." },
    ],
  }),
});

const exportUserData = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return { error: "Sign in required" };

  // P0 fail-closed gate: self-serve export is not verified to include
  // uploaded files and payment/subscription records.
  if (RESTRICTED_FEATURES.exportUserData) {
    return tempUnavailableError();
  }

  return { error: TEMP_UNAVAILABLE_MESSAGE };
});

const deleteUserData = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return { error: "Sign in required" };

  // P0 fail-closed gate: self-serve deletion is not verified to cover
  // uploaded files and payment/subscription records, and is not transactional.
  if (RESTRICTED_FEATURES.deleteUserData) {
    return tempUnavailableError();
  }

  return { error: TEMP_UNAVAILABLE_MESSAGE };
});

function DataRequestPage() {
  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-navy px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-3xl font-extrabold text-white">Data Request</h1>
          <p className="mb-8 text-white/70">
            We're committed to protecting your data and your right to access, export, and delete it.
          </p>

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
              data we hold — including uploaded files and payment records —
              before we re-enable them. In the meantime you can contact us
              directly at{" "}
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
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
