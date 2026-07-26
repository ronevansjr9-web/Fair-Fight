import { json } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { sql } from "~/db";
import { logDataDeleted } from "~/lib/audit";

export async function POST({ request }: { request: Request) {
  const auth = await getAuth();
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
