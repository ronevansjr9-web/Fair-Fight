import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { c as createServerFn } from "../server.js";
import { g as getCurrentAuth } from "./auth-Ds7eJc8W.js";
import { s as sql } from "./db-D7cnbd5l.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "@neondatabase/serverless";
const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_REWARD_AMOUNT = 10;
const REFERRAL_EXPIRY_DAYS = 365;
function generateReferralCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
async function getOrCreateReferralCode(userId) {
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
    return generateReferralCode();
  }
}
async function getReferralStats(userId) {
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
      code
    };
  } catch {
    return { totalReferrals: 0, successfulReferrals: 0, creditsEarned: 0, code: "" };
  }
}
const fetchReferralInfo_createServerFn_handler = createServerRpc({
  id: "04982c0608dc132cc2f8b6a058c94f7349b3fbf92e3ba15b4f1887e179b924aa",
  name: "fetchReferralInfo",
  filename: "src/components/ReferralCard.tsx"
}, (opts) => fetchReferralInfo.__executeServer(opts));
const fetchReferralInfo = createServerFn({
  method: "GET"
}).handler(fetchReferralInfo_createServerFn_handler, async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return null;
  return getReferralStats(auth.userId);
});
export {
  fetchReferralInfo_createServerFn_handler
};
