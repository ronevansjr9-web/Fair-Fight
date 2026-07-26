import { useAuth } from "@clerk/tanstack-start";
import type { ReactNode } from "react";

interface AuthenticatedGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthenticatedGuard({ children, fallback }: AuthenticatedGuardProps) {
  const auth = useAuth();

  if (auth.isSignedIn === undefined) {
    // Still loading auth state
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!auth.isSignedIn) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-navy/5">
          <svg className="h-10 w-10 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-navy">Sign in Required</h2>
        <p className="mb-6 text-gray-600">Please sign in to access this page.</p>
        <a
          href="/?signin=true"
          className="gold-gradient inline-flex items-center rounded-full px-8 py-3 font-semibold text-navy transition-all hover:shadow-lg"
        >
          Sign In
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
