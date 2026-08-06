import { sql } from "~/db";
import { hasCaseEntitlement } from "~/lib/payment";

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
