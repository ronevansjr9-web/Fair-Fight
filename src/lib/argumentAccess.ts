import { sql } from "~/db";
import { hasAnyEntitlement, hasCaseEntitlement } from "~/lib/payment";

/** Returns true only when the case belongs to the user (does not require existing paid entitlement). */
export async function isCaseOwner(userId: string, caseId: string): Promise<boolean> {
  if (!userId || !caseId || !/^[A-Za-z0-9_-]+$/.test(caseId)) return false;
  const owned = await sql()`SELECT 1 FROM cases WHERE id=${caseId} AND user_id=${userId} LIMIT 1`;
  return owned.length > 0;
}

/** Returns true only when the case belongs to the user and that exact case is paid. */
export async function hasOwnedCaseEntitlement(userId: string, caseId: string): Promise<boolean> {
  if (!userId || !caseId || !/^[A-Za-z0-9_-]+$/.test(caseId)) return false;
  return (await isCaseOwner(userId, caseId)) && await hasCaseEntitlement(userId, caseId);
}

/**
 * Per-user Pro-membership check (Wave 1, 2026-08-24): true iff the `payments`
 * table has at least one row for this user with status='succeeded'.
 *
 * This is the entitlement model for the non-case-scoped member tools
 * (/documents and /chat). The business plan defines Fair Fight as paid-only
 * ("no free user tier"), so ANY verified $99 Pro Case Analysis purchase
 * unlocks the member tools — there is deliberately NO case-binding here, unlike
 * `hasOwnedCaseEntitlement` which authorizes its exact case only. Pending,
 * failed, and refunded payments never grant membership (the query only counts
 * status='succeeded', and refunds flip the row to 'refunded').
 */
export async function hasProMembership(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  return hasAnyEntitlement(userId);
}
