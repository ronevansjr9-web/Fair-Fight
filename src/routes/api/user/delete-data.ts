import { json } from "@tanstack/react-start";
import { getCurrentAuth } from "~/lib/auth";
import { sql } from "~/db";
import { logDataDeleted } from "~/lib/audit";
import {
  RESTRICTED_FEATURES,
  TEMP_UNAVAILABLE_MESSAGE,
  TEMP_UNAVAILABLE_STATUS,
} from "~/lib/restrictedFeatures";

export async function POST({ request }: { request: Request }) {
  // P0 fail-closed gate: self-serve deletion is not verified to cover
  // uploaded files and payment/subscription records, and is not transactional.
  if (RESTRICTED_FEATURES.deleteUserData) {
    return json(
      { error: TEMP_UNAVAILABLE_MESSAGE, code: "temporarily_unavailable" },
      { status: TEMP_UNAVAILABLE_STATUS },
    );
  }

  const auth = await getCurrentAuth(request);
  if (!auth.userId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete all user data in order (respect foreign keys)
    await sql()`DELETE FROM evidence WHERE user_id = ${auth.userId}`;
    await sql()`DELETE FROM timeline_events WHERE user_id = ${auth.userId}`;
    await sql()`DELETE FROM calendar_events WHERE user_id = ${auth.userId}`;
    await sql()`DELETE FROM cases WHERE user_id = ${auth.userId}`;
    await sql()`DELETE FROM audit_logs WHERE user_id = ${auth.userId}`;
    await sql()`DELETE FROM payments WHERE user_id = ${auth.userId}`;
    await sql()`DELETE FROM subscriptions WHERE user_id = ${auth.userId}`;
    await sql()`DELETE FROM referral_codes WHERE user_id = ${auth.userId}`;
    await sql()`DELETE FROM referral_tracking WHERE referrer_id = ${auth.userId} OR referred_user_id = ${auth.userId}`;

    await logDataDeleted(auth.userId);

    return json({ success: true, message: "All data deleted" });
  } catch (error) {
    console.error("Delete API error:", error);
    return json({ error: "Deletion failed" }, { status: 500 });
  }
}
