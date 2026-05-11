import { useState, useEffect, useCallback } from "react";
import { BarChart2, Zap, RefreshCw, Loader2, ExternalLink, CheckCircle2, XCircle, CreditCard } from "lucide-react";
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

interface QuotaData {
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  plan: string;
  resetDate: string;
}

interface MoonEntry {
  id: string;
  label: string;
  desc: string;
  color: string;
  active: boolean;
  messagesRemaining: number | null;
  expiresAt: string | null;
  subscribeUrl: string;
}

interface MoonUsage {
  hasAnyActive: boolean;
  moons: MoonEntry[];
  updatedAt: string | null;
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

export default function UsageDashboard() {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [moons, setMoons] = useState<MoonUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [q, m] = await Promise.all([
        authFetch("/api/quota") as Promise<QuotaData>,
        authFetch("/api/moon/usage") as Promise<MoonUsage>,
      ]);
      setQuota(q);
      setMoons(m);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const barColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-yellow-500";
    return "bg-primary";
  };

  const planLabel = (plan: string) => {
    const map: Record<string, string> = {
      free: "Free", basic: "Basic", pro: "Pro",
      forge: "Forge", creator: "Creator", studio: "Studio",
      team: "Team", owner: "Owner",
    };
    return map[plan.toLowerCase()] ?? plan;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart2 size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Usage & Plan</h1>
            <p className="text-sm text-muted-foreground">Your Forge quota, Moon access, and subscription details</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
          {refreshing ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-card border rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Message Quota */}
          {quota && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">Message Quota</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Resets {new Date(quota.resetDate).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20 uppercase tracking-wider">
                  {planLabel(quota.plan)}
                </span>
              </div>

              <ProgressBar percent={quota.percent} color={barColor(quota.percent)} />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{quota.used.toLocaleString()}</strong> used of {quota.limit.toLocaleString()}
                </span>
                <span className={cn("font-semibold", quota.remaining < 10 ? "text-red-400" : "text-muted-foreground")}>
                  {quota.remaining.toLocaleString()} remaining
                </span>
              </div>

              {quota.percent >= 80 && (
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-400 flex items-center justify-between gap-2">
                  <span>You're running low. Upgrade to get more messages.</span>
                  <a href="/pricing" className="underline font-medium whitespace-nowrap">Upgrade →</a>
                </div>
              )}
            </div>
          )}

          {/* Moon Entitlements */}
          {moons && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">Moon Access</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your active AI assistants from thepeoplestownsq.com
                  </p>
                </div>
                {moons.updatedAt && (
                  <span className="text-[10px] text-muted-foreground">
                    Updated {new Date(moons.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {moons.moons.map(moon => (
                  <div key={moon.id} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: moon.color }} />
                      <div>
                        <p className="text-sm font-medium">{moon.label}</p>
                        <p className="text-[10px] text-muted-foreground">{moon.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {moon.active ? (
                        <div className="flex items-center gap-1 text-green-400 text-xs font-medium">
                          <CheckCircle2 size={13} />
                          Active
                        </div>
                      ) : (
                        <a
                          href={moon.subscribeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-primary underline flex items-center gap-1 hover:text-primary/80"
                        >
                          Subscribe <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!moons.hasAnyActive && (
                <div className="rounded-lg bg-muted/40 border p-4 text-center space-y-2">
                  <XCircle size={20} className="text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">No active Moon subscriptions</p>
                  <a
                    href="https://thepeoplestownsq.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary underline"
                  >
                    Subscribe at thepeoplestownsq.com <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Upgrade CTA */}
          <div className="rounded-xl border bg-card p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CreditCard size={18} className="text-primary shrink-0" />
              <div>
                <p className="font-semibold text-sm">Need more?</p>
                <p className="text-xs text-muted-foreground">Upgrade your plan or subscribe to additional Moons</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <a href="/pricing">
                <Button size="sm" variant="outline">View Plans</Button>
              </a>
              <a href="https://thepeoplestownsq.com" target="_blank" rel="noopener noreferrer">
                <Button size="sm">Get Moons <ExternalLink size={12} className="ml-1" /></Button>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
