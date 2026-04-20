import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import {
  RefreshCw, Loader2, CheckCircle2, XCircle, AlertCircle,
  Server, Github, GitMerge, Cloud, CreditCard, KeyRound,
  Zap, Moon, ExternalLink, Wifi, WifiOff, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@workspace/api-client-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectionsData {
  infrastructure: {
    coolify: { connected: boolean; name?: string; url?: string; healthy?: boolean; connectedAt?: string };
  };
  codeSources: {
    github: { connected: boolean; username?: string; avatarUrl?: string | null };
    gitlab: { connected: boolean; username?: string; avatarUrl?: string | null };
    bitbucket: { connected: boolean; username?: string; displayName?: string | null; avatarUrl?: string | null };
  };
  moons: Record<string, { active: boolean; isBundle: boolean; messagesRemaining: number | null }>;
  payments: {
    square: { configured: boolean; source: string | null };
    stripe: { configured: boolean; source: string | null };
    other: { service: string; keyName: string }[];
  };
  secrets: { total: number; byService: Record<string, number> };
}

// ─── Status dot ──────────────────────────────────────────────────────────────

function StatusDot({ connected, pulse = false }: { connected: boolean; pulse?: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {connected && pulse && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
      )}
      <span className={cn(
        "relative inline-flex h-2.5 w-2.5 rounded-full",
        connected ? "bg-emerald-500" : "bg-muted-foreground/30"
      )} />
    </span>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-lg bg-muted/60 border border-border/60">
        <Icon size={16} className="text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-sm font-bold tracking-wide">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Connection card ──────────────────────────────────────────────────────────

function ConnCard({
  icon, name, connected, detail, sub, href, hrefLabel = "Connect", external = false,
}: {
  icon: React.ReactNode;
  name: string;
  connected: boolean;
  detail?: string | null;
  sub?: React.ReactNode;
  href?: string;
  hrefLabel?: string;
  external?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border p-4 flex flex-col gap-3 transition-colors",
      connected ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg border shrink-0",
          connected ? "bg-emerald-500/10 border-emerald-500/20" : "bg-muted/40 border-border/60"
        )}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{name}</span>
            <StatusDot connected={connected} pulse={connected} />
            <span className={cn("text-xs", connected ? "text-emerald-400" : "text-muted-foreground/60")}>
              {connected ? "Connected" : "Not connected"}
            </span>
          </div>
          {detail && <p className="text-xs text-muted-foreground mt-0.5 truncate">{detail}</p>}
          {sub && <div className="mt-1">{sub}</div>}
        </div>
      </div>
      {!connected && href && (
        external ? (
          <a href={href} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="w-full text-xs">
              {hrefLabel} <ExternalLink size={11} className="ml-1.5" />
            </Button>
          </a>
        ) : (
          <Link href={href}>
            <Button size="sm" variant="outline" className="w-full text-xs">{hrefLabel}</Button>
          </Link>
        )
      )}
    </div>
  );
}

// ─── Moon card ────────────────────────────────────────────────────────────────

const MOON_META: Record<string, {
  num: number; label: string; tagline: string; color: string; page?: string;
}> = {
  forge:  { num: 3,  label: "Forge",  tagline: "AI builder",      color: "text-orange-400", page: "/" },
  hawk:   { num: 2,  label: "Hawk",   tagline: "Research",         color: "text-sky-400",    page: "/hawk" },
  quill:  { num: 5,  label: "Quill",  tagline: "AI writing",       color: "text-emerald-400" },
  creed:  { num: 6,  label: "Creed",  tagline: "Values & mission", color: "text-violet-400" },
  sage:   { num: 7,  label: "Sage",   tagline: "Learning",         color: "text-amber-400",  page: "/sage" },
  flint:  { num: 13, label: "Flint",  tagline: "Spark & brainstorm", color: "text-red-400",  page: "/brainstorm" },
};

const TSQ_BASE = "https://thepeoplestownsq.com";

function MoonCard({ slug, data }: {
  slug: string;
  data: { active: boolean; isBundle: boolean; messagesRemaining: number | null };
}) {
  const meta = MOON_META[slug];
  if (!meta) return null;

  const remaining = data.isBundle ? null : data.messagesRemaining;
  const subscribeUrl = `${TSQ_BASE}/moons/${slug}?ref=${slug}`;

  return (
    <div className={cn(
      "rounded-xl border p-4 flex flex-col gap-2 transition-colors",
      data.active ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card"
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("font-black text-xs tabular-nums", meta.color)}>#{meta.num}</span>
          <span className="font-bold text-sm">{meta.label}</span>
        </div>
        <StatusDot connected={data.active} pulse={data.active} />
      </div>

      <p className="text-xs text-muted-foreground">{meta.tagline}</p>

      <div className="mt-auto pt-1 flex items-center justify-between gap-2">
        {data.active ? (
          <span className="text-xs text-emerald-400 font-medium">
            {data.isBundle
              ? "Bundle — unlimited"
              : remaining != null
                ? `${remaining.toLocaleString()} msg left`
                : "Active"}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/60">Not subscribed</span>
        )}
        {!data.active && (
          <a href={subscribeUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="text-[10px] h-6 px-2">
              Subscribe <ExternalLink size={9} className="ml-1" />
            </Button>
          </a>
        )}
        {data.active && meta.page && (
          <Link href={meta.page}>
            <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 text-primary">
              Open →
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Connections() {
  const { getToken } = useAuth();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<ConnectionsData>({
    queryKey: ["connections"],
    staleTime: 60_000,
    queryFn: async () => {
      const token = await getToken();
      const r = await fetch(`${API_BASE}/api/connections`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error("Failed to load connections");
      return r.json();
    },
  });

  const anyConnected = data && (
    data.infrastructure.coolify.connected ||
    data.codeSources.github.connected ||
    data.codeSources.gitlab.connected ||
    data.codeSources.bitbucket.connected ||
    Object.values(data.moons).some(m => m.active)
  );

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Connections</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everything your workspace is wired into — live status, subscriptions, and payment gateways.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0"
        >
          <RefreshCw size={13} className={cn("mr-1.5", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-muted-foreground" size={28} />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle size={36} className="text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Failed to load connection status.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {data && (
        <div className="space-y-10">

          {/* ── Infrastructure ──────────────────────────────────────────────── */}
          <section>
            <SectionHeader icon={Server} title="Infrastructure" subtitle="Your self-hosted stack" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <ConnCard
                icon={<Server size={16} className={data.infrastructure.coolify.connected ? "text-emerald-400" : "text-muted-foreground"} />}
                name="Coolify"
                connected={data.infrastructure.coolify.connected}
                detail={
                  data.infrastructure.coolify.connected
                    ? `${data.infrastructure.coolify.name} · ${data.infrastructure.coolify.url}`
                    : undefined
                }
                sub={data.infrastructure.coolify.connected && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {data.infrastructure.coolify.healthy ? (
                      <><Wifi size={10} className="text-emerald-400" /><span className="text-emerald-400">Reachable</span></>
                    ) : (
                      <><WifiOff size={10} className="text-amber-400" /><span className="text-amber-400">Unreachable</span></>
                    )}
                  </div>
                )}
                href="/app-hub"
                hrefLabel="Connect Server"
              />
            </div>
          </section>

          {/* ── Code Sources ─────────────────────────────────────────────────── */}
          <section>
            <SectionHeader icon={Github} title="Code Sources" subtitle="Version control connections" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <ConnCard
                icon={<Github size={16} className={data.codeSources.github.connected ? "text-emerald-400" : "text-muted-foreground"} />}
                name="GitHub"
                connected={data.codeSources.github.connected}
                detail={data.codeSources.github.username ? `@${data.codeSources.github.username}` : undefined}
                sub={data.codeSources.github.avatarUrl && (
                  <img src={data.codeSources.github.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                )}
                href="/github"
                hrefLabel="Connect GitHub"
              />
              <ConnCard
                icon={
                  <svg viewBox="0 0 24 24" className={cn("w-4 h-4 fill-current", data.codeSources.gitlab.connected ? "text-emerald-400" : "text-muted-foreground")}>
                    <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51a.42.42 0 01.54-.28.41.41 0 01.28.28l2.44 7.51L23 13.45a.84.84 0 01-.35.94z" />
                  </svg>
                }
                name="GitLab"
                connected={data.codeSources.gitlab.connected}
                detail={data.codeSources.gitlab.username ? `@${data.codeSources.gitlab.username}` : undefined}
                href="/github"
                hrefLabel="Connect GitLab"
              />
              <ConnCard
                icon={
                  <svg viewBox="0 0 24 24" className={cn("w-4 h-4 fill-current", data.codeSources.bitbucket.connected ? "text-emerald-400" : "text-muted-foreground")}>
                    <path d="M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891L.778 1.213zM14.52 15.53H9.522L8.17 8.466h7.561l-1.211 7.064z" />
                  </svg>
                }
                name="Bitbucket"
                connected={data.codeSources.bitbucket.connected}
                detail={
                  data.codeSources.bitbucket.displayName
                    ? data.codeSources.bitbucket.displayName
                    : data.codeSources.bitbucket.username
                      ? `@${data.codeSources.bitbucket.username}`
                      : undefined
                }
                href="/github"
                hrefLabel="Connect Bitbucket"
              />
            </div>
          </section>

          {/* ── 13 Moons ─────────────────────────────────────────────────────── */}
          <section>
            <SectionHeader
              icon={Moon}
              title="13 Moons Subscriptions"
              subtitle="AI features powered by the 13 Moons network via thepeoplestownsq.com"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(data.moons).map(([slug, moonData]) => (
                <MoonCard key={slug} slug={slug} data={moonData} />
              ))}
            </div>
            {!Object.values(data.moons).some(m => m.active) && (
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                <Zap size={16} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">No active Moon subscriptions</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Subscribe to a Moon at{" "}
                    <a href={TSQ_BASE} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                      thepeoplestownsq.com
                    </a>{" "}
                    to unlock AI features in Forge.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ── Payment Gateways ─────────────────────────────────────────────── */}
          <section>
            <SectionHeader icon={CreditCard} title="Payment Gateways" subtitle="Stripe, Square, and other payment connections" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <ConnCard
                icon={
                  <svg viewBox="0 0 24 24" className={cn("w-4 h-4", data.payments.square.configured ? "text-emerald-400" : "text-muted-foreground")} fill="currentColor">
                    <path d="M17.1 0H6.9C3.09 0 0 3.09 0 6.9v10.2C0 20.91 3.09 24 6.9 24h10.2c3.81 0 6.9-3.09 6.9-6.9V6.9C24 3.09 20.91 0 17.1 0zM16 16H8V8h8v8z" />
                  </svg>
                }
                name="Square"
                connected={data.payments.square.configured}
                detail={
                  data.payments.square.configured
                    ? data.payments.square.source === "platform"
                      ? "Platform key configured"
                      : "Key stored in Secrets Vault"
                    : undefined
                }
                href="/secrets"
                hrefLabel="Add Square Key"
              />
              <ConnCard
                icon={
                  <svg viewBox="0 0 24 24" className={cn("w-4 h-4", data.payments.stripe.configured ? "text-emerald-400" : "text-muted-foreground")} fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                  </svg>
                }
                name="Stripe"
                connected={data.payments.stripe.configured}
                detail={data.payments.stripe.configured ? "Key stored in Secrets Vault" : undefined}
                href="/secrets"
                hrefLabel="Add Stripe Key"
              />
              {data.payments.other.length > 0 && data.payments.other.map((p, i) => (
                <ConnCard
                  key={i}
                  icon={<CreditCard size={16} className="text-emerald-400" />}
                  name={p.service}
                  connected={true}
                  detail={p.keyName}
                />
              ))}
            </div>
          </section>

          {/* ── Secrets Vault Summary ─────────────────────────────────────────── */}
          {data.secrets.total > 0 && (
            <section>
              <SectionHeader icon={KeyRound} title="Secrets Vault" subtitle={`${data.secrets.total} encrypted key${data.secrets.total !== 1 ? "s" : ""} stored`} />
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.secrets.byService)
                    .sort(([, a], [, b]) => b - a)
                    .map(([service, count]) => (
                      <div key={service} className="flex items-center gap-1.5 rounded-lg bg-muted/50 border border-border/60 px-3 py-1.5 text-xs">
                        <StatusDot connected={true} />
                        <span className="font-medium">{service}</span>
                        <span className="text-muted-foreground">×{count}</span>
                      </div>
                    ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <Link href="/secrets">
                    <Button size="sm" variant="outline" className="text-xs">
                      Manage Secrets →
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
          )}

          {!anyConnected && data.secrets.total === 0 && (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Shield size={40} className="mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-bold text-base mb-1">Nothing connected yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Connect a server, link your code repos, and subscribe to a Moon to unlock the full Forge experience.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
