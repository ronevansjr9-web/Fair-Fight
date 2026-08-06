import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentAuth } from "~/lib/auth";
import { getReferralStats } from "~/lib/referral";

const fetchReferralInfo = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await getCurrentAuth();
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
      <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
        <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  if (!referralData) return null;

  const referralLink = `https://fairfight.ctonew.app/?ref=${referralData.code}`;

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
    <div className="rounded-xl border border-gold/20 bg-white/5 backdrop-blur-sm p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">
        <span className="mr-2">🎁</span>
        Share Fair Fight, Earn Credits
      </h3>

      <div className="mb-4 grid grid-cols-3 gap-4 rounded-lg bg-white/5 p-4 text-center">
        <div>
          <p className="text-2xl font-bold text-white">{referralData.totalReferrals}</p>
          <p className="text-xs text-white/60">Total Referrals</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{referralData.successfulReferrals}</p>
          <p className="text-xs text-white/60">Active</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gold">${referralData.creditsEarned}</p>
          <p className="text-xs text-white/60">Credits</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={referralLink}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70"
        />
        <button
          onClick={handleCopy}
          className="gold-gradient rounded-lg px-4 py-2 text-sm font-semibold text-navy transition-all hover:shadow-md"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <p className="mt-3 text-xs text-white/60">
        Share your link. When someone signs up and goes Pro, you both get $10 in credits.
      </p>
    </div>
  );
}
