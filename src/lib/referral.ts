import { sql } from "~/db";

const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_REWARD_AMOUNT = 10; // $10 credit per successful referral
const REFERRAL_EXPIRY_DAYS = 365;

export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0/O/1/I to avoid confusion
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  try {
    const rows = await sql()`
      SELECT code FROM referral_codes
      WHERE user_id = ${userId} AND expires_at > NOW()
      LIMIT 1
    `;
    if (rows.length > 0) {
      return rows[0].code;
    }

    const code = generateReferralCode();
    await sql()`
      INSERT INTO referral_codes (user_id, code, created_at, expires_at)
      VALUES (${userId}, ${code}, NOW(), NOW() + INTERVAL '${REFERRAL_EXPIRY_DAYS} days')
      ON CONFLICT (user_id) DO UPDATE SET code = ${code}, expires_at = NOW() + INTERVAL '${REFERRAL_EXPIRY_DAYS} days'
    `;
    return code;
  } catch (error) {
    console.error("Referral code error:", error);
    return generateReferralCode(); // Fallback
  }
}

export async function getReferrerInfo(code: string): Promise<{ referrerId: string; valid: boolean } | null> {
  try {
    const rows = await sql()`
      SELECT user_id FROM referral_codes
      WHERE code = ${code} AND expires_at > NOW()
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    return { referrerId: rows[0].user_id, valid: true };
  } catch {
    return null;
  }
}

export async function trackReferral(referrerId: string, referredUserId: string, code: string): Promise<void> {
  try {
    await sql()`
      INSERT INTO referral_tracking (referrer_id, referred_user_id, code, created_at, status)
      VALUES (${referrerId}, ${referredUserId}, ${code}, NOW(), 'pending')
    `;
  } catch (error) {
    console.error("Referral tracking error:", error);
  }
}

export async function getReferralStats(userId: string): Promise<{
  totalReferrals: number;
  successfulReferrals: number;
  creditsEarned: number;
  code: string;
}> {
  try {
    const code = await getOrCreateReferralCode(userId);
    const stats = await sql()`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful
      FROM referral_tracking
      WHERE referrer_id = ${userId}
    `;
    return {
      totalReferrals: Number(stats[0]?.total || 0),
      successfulReferrals: Number(stats[0]?.successful || 0),
      creditsEarned: Number(stats[0]?.successful || 0) * REFERRAL_REWARD_AMOUNT,
      code,
    };
  } catch {
    return { totalReferrals: 0, successfulReferrals: 0, creditsEarned: 0, code: "" };
  }
}
