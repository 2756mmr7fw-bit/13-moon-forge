import { useState, useEffect, useCallback } from "react";
import { Gift, Copy, Check, Users, Zap, Link as LinkIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function authFetch(path: string) {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

interface ReferralData {
  code: string;
  referralUrl: string;
  successfulReferrals: number;
  bonusMessages: number;
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ size: number; className?: string }>; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-2">
      <Icon size={20} className={color} />
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await authFetch("/api/referral") as ReferralData;
      setData(d);
    } catch {
      setError("Could not load your referral info. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function copyLink() {
    if (!data) return;
    navigator.clipboard.writeText(data.referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Gift size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Invite Friends</h1>
          <p className="text-sm text-muted-foreground">Share your link — earn 50 bonus messages for every friend who joins</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card border rounded-xl animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400 text-sm">{error}</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Users}   label="Friends joined"   value={data.successfulReferrals} color="text-primary" />
            <StatCard icon={Zap}     label="Bonus messages earned" value={data.bonusMessages} color="text-yellow-400" />
            <StatCard icon={LinkIcon} label="Your referral code" value={data.code}             color="text-muted-foreground" />
          </div>

          <div className="rounded-xl border bg-card p-6 space-y-4">
            <p className="text-sm font-medium">Your referral link</p>
            <div className="flex items-center gap-2 bg-muted/40 border rounded-lg px-4 py-3">
              <span className="flex-1 text-sm font-mono text-muted-foreground truncate">{data.referralUrl}</span>
              <Button size="sm" variant="ghost" onClick={copyLink} className="shrink-0">
                {copied ? <><Check size={14} className="text-green-400 mr-1" />Copied!</> : <><Copy size={14} className="mr-1" />Copy</>}
              </Button>
            </div>
            <Button className="w-full" onClick={copyLink}>
              {copied ? "Link copied!" : "Copy & Share Your Link"}
              <ArrowRight size={14} className="ml-2" />
            </Button>
          </div>

          <div className="rounded-xl border bg-card p-6 space-y-4">
            <p className="text-sm font-semibold">How it works</p>
            <ol className="space-y-3">
              {[
                "Copy your unique referral link above",
                "Share it with friends, teammates, or on social media",
                "When they sign up and use Forge, you both get 50 bonus messages",
                "No limit — keep inviting, keep earning",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : null}
    </div>
  );
}
