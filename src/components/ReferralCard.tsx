import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { getReferralStats } from "~/lib/referral";

const fetchReferralInfo = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await getAuth();
  if (!auth.userId) return null;
  return getReferralStats(auth.userId);
});

export function ReferralCard() {
  const [referralData, setReferralData] = useState<{
    totalReferrals: number;
    successfulReferrals: number;
    creditsEarned: number;
    code: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReferralInfo().then((data) => {
      setReferralData(data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (!referralData) return null;

  const referralLink = `https://fairfight.ai/?ref=${referralData.code}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-gold/10 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-navy">
        <span className="mr-2">🎁</span>
        Share Fair Fight, Earn Credits
      </h3>

      <div className="mb-4 grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4 text-center">
        <div>
          <p className="text-2xl font-bold text-navy">{referralData.totalReferrals}</p>
          <p className="text-xs text-gray-500">Total Referrals</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-navy">{referralData.successfulReferrals}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gold">${referralData.creditsEarned}</p>
          <p className="text-xs text-gray-500">Credits</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={referralLink}
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
        />
        <button
          onClick={handleCopy}
          className="gold-gradient rounded-lg px-4 py-2 text-sm font-semibold text-navy transition-all hover:shadow-md"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Share your link. When someone signs up and goes Pro, you both get $10 in credits.
      </p>
    </div>
  );
}
