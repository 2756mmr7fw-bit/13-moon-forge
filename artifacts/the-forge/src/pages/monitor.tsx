import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import {
  AlertTriangle, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Loader2, Activity, Server, ExternalLink,
  Play, Square, RotateCcw, Wifi, Shield, Database,
  Mail, Eye, Key, Package, Zap, TrendingUp, Clock,
  Globe, HardDrive, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpPanel } from "@/components/help-panel";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const REFRESH_INTERVAL = 30;

// ─── Types ────────────────────────────────────────────────────────────────────

type TrafficLevel = "normal" | "elevated" | "high" | "critical";
type AppStatus    = "running" | "stopped" | "restarting" | "starting" | "error" | "unknown";
type DeployStatus = "success" | "failed" | "running" | "queued" | "unknown";
type AlertSev     = "critical" | "warning" | "info";
type QuotaRisk    = "critical" | "high" | "medium" | "low";
type InfraCat     = "vps" | "vpn" | "cdn" | "dns" | "storage" | "database" | "email" | "monitoring" | "auth" | "payments" | "security" | "external_api";

interface ApiQuota {
  key: string; label: string; limit: string; period: string;
  risk: QuotaRisk; riskReason: string; upgradeHint: string; upgradePrice?: string;
}

interface MonitorData {
  summary: {
    totalApps: number; runningApps: number; problemApps: number;
    recentFails: number; alertCount: number;
    hasCritical: boolean; hasWarning: boolean;
  };
  traffic: {
    estimatedRpm: number; requestsThisMinute: number; rlHitsThisMinute: number;
    peakRpm: number; routes: Record<string, number>; level: TrafficLevel;
    previousMinute: { requests: number; rlHits: number }; uptimeMs: number;
  };
  apps: {
    id: string; name: string; kind: "app" | "service";
    status: AppStatus; url: string | null; updatedAt: string | null;
  }[];
  deployments: {
    id: string; appName: string; status: DeployStatus;
    commit: string | null; commitMessage: string | null;
    startedAt: string | null; finishedAt: string | null;
  }[];
  detectedProviders: { label: string; category: InfraCat; key: string }[];
  detectedApiQuotas: ApiQuota[];
  alerts: { id: string; severity: AlertSev; title: string; body: string }[];
  coolifyConnected: boolean;
  coolifyError: string | null;
}

// ─── Infrastructure category metadata ────────────────────────────────────────

const CAT_META: Record<InfraCat, { label: string; icon: React.ComponentType<{ size: number; className?: string }>; color: string }> = {
  vps:        { label: "Compute / VPS",     icon: Server,    color: "text-blue-400"    },
  vpn:        { label: "VPN / Tunnels",      icon: Wifi,      color: "text-purple-400"  },
  cdn:        { label: "CDN / Edge",         icon: Globe,     color: "text-cyan-400"    },
  dns:        { label: "DNS",               icon: Activity,  color: "text-teal-400"    },
  storage:    { label: "Object Storage",    icon: HardDrive, color: "text-orange-400"  },
  database:   { label: "Database",          icon: Database,  color: "text-emerald-400" },
  email:      { label: "Email / SMTP",      icon: Mail,      color: "text-yellow-400"  },
  monitoring: { label: "Monitoring",        icon: Eye,       color: "text-pink-400"    },
  auth:       { label: "Auth / Identity",   icon: Key,       color: "text-indigo-400"  },
  payments:   { label: "Payments",          icon: CreditCard,color: "text-green-400"   },
  security:     { label: "Security",          icon: Shield,    color: "text-red-400"     },
  external_api: { label: "Third-Party APIs",  icon: Activity,  color: "text-violet-400"  },
};

// Traffic level → capacity pressure message
function getTrafficAdvice(level: TrafficLevel, vpsLabels: string[], vpnLabels: string[], cdnLabels: string[]) {
  const vpsText  = vpsLabels.length ? vpsLabels.join(", ") : "your VPS";
  const cdnTip   = cdnLabels.length ? "" : " Adding a CDN (Cloudflare, BunnyCDN) can offload traffic.";
  const vpnTip   = vpnLabels.length ? ` Also check your ${vpnLabels.join(", ")} tunnel capacity.` : "";

  if (level === "critical") return `Upgrade ${vpsText} immediately — add a larger plan or a second node.${vpnTip}`;
  if (level === "high")     return `Consider scaling up ${vpsText}.${cdnTip}${vpnTip}`;
  if (level === "elevated") return `Traffic is picking up. Keep an eye on ${vpsText}.`;
  return "All good — traffic is well within capacity.";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBanner({ data }: { data: MonitorData }) {
  const { hasCritical, hasWarning, alertCount, runningApps, totalApps } = data.summary;
  const allOk = !hasCritical && !hasWarning;

  return (
    <div className={cn(
      "rounded-2xl border px-6 py-5 flex items-start gap-4",
      hasCritical ? "border-red-500/30 bg-red-500/10" :
      hasWarning  ? "border-amber-500/30 bg-amber-500/10" :
                    "border-emerald-500/30 bg-emerald-500/10"
    )}>
      <div className="mt-0.5 shrink-0">
        {hasCritical ? <XCircle size={28} className="text-red-400" /> :
         hasWarning  ? <AlertTriangle size={28} className="text-amber-400" /> :
                       <CheckCircle2 size={28} className="text-emerald-400" />}
      </div>
      <div className="flex-1">
        <p className={cn("text-lg font-bold",
          hasCritical ? "text-red-300" : hasWarning ? "text-amber-300" : "text-emerald-300"
        )}>
          {hasCritical ? "Critical — Action Required" :
           hasWarning  ? `${alertCount} Issue${alertCount !== 1 ? "s" : ""} Need Attention` :
                         "All Systems Operational"}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {runningApps} of {totalApps} apps running
          {allOk && " · No alerts · Traffic normal"}
          {hasCritical && " · Check alerts below immediately"}
          {hasWarning && !hasCritical && " · Review alerts below"}
        </p>
      </div>
    </div>
  );
}

function TrafficMeter({ traffic, vpsLabels, vpnLabels, cdnLabels }: {
  traffic: MonitorData["traffic"];
  vpsLabels: string[]; vpnLabels: string[]; cdnLabels: string[];
}) {
  const { level, estimatedRpm, requestsThisMinute, rlHitsThisMinute, peakRpm, routes } = traffic;
  const pct = Math.min(100, (estimatedRpm / 200) * 100);

  const barColor =
    level === "critical" ? "bg-red-500" :
    level === "high"     ? "bg-amber-500" :
    level === "elevated" ? "bg-yellow-400" :
                           "bg-emerald-500";

  const levelLabel = {
    normal:   { label: "Normal",   color: "text-emerald-400" },
    elevated: { label: "Elevated", color: "text-yellow-400"  },
    high:     { label: "High",     color: "text-amber-400"   },
    critical: { label: "Critical", color: "text-red-400"     },
  }[level];

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <TrendingUp size={15} className="text-muted-foreground" />
        <span className="text-sm font-bold tracking-wide">Traffic Pressure</span>
      </div>

      {/* RPM gauge */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className={cn("font-bold text-lg", levelLabel.color)}>
            ~{estimatedRpm} <span className="text-sm font-normal text-muted-foreground">req/min</span>
          </span>
          <span className={cn("font-semibold text-sm self-end", levelLabel.color)}>{levelLabel.label}</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0</span>
          <span>40 elevated</span>
          <span>80 high</span>
          <span>200+ critical</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "This min",   value: requestsThisMinute },
          { label: "Throttled",  value: rlHitsThisMinute, warn: rlHitsThisMinute > 0 },
          { label: "Peak RPM",   value: peakRpm },
        ].map(s => (
          <div key={s.label} className="text-center rounded-lg bg-muted/40 py-2.5 px-2">
            <p className={cn("text-lg font-bold", s.warn ? "text-amber-400" : "")}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Route breakdown */}
      {Object.keys(routes).length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Route Breakdown</p>
          {Object.entries(routes).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-xs">
              <span className="w-20 text-muted-foreground capitalize">{k}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/60 rounded-full"
                  style={{ width: `${Math.min(100, (v / requestsThisMinute) * 100)}%` }} />
              </div>
              <span className="w-5 text-right text-muted-foreground">{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Advice */}
      <p className="text-xs text-muted-foreground border-t border-border pt-3">
        {getTrafficAdvice(level, vpsLabels, vpnLabels, cdnLabels)}
      </p>
    </div>
  );
}

const APP_STATUS_META: Record<AppStatus, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  running:    { color: "text-emerald-400", bg: "bg-emerald-500/5",  border: "border-emerald-500/20", icon: <Play size={11} className="text-emerald-400" />,             label: "Running"    },
  stopped:    { color: "text-red-400",     bg: "bg-red-500/5",      border: "border-red-500/20",     icon: <Square size={11} className="text-red-400" />,                label: "Stopped"    },
  restarting: { color: "text-amber-400",   bg: "bg-amber-500/5",    border: "border-amber-500/20",   icon: <RotateCcw size={11} className="text-amber-400" />,            label: "Restarting" },
  starting:   { color: "text-amber-400",   bg: "bg-amber-500/5",    border: "border-amber-500/20",   icon: <Loader2 size={11} className="text-amber-400 animate-spin" />, label: "Starting"   },
  error:      { color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/40",     icon: <XCircle size={11} className="text-red-400" />,               label: "Error"      },
  unknown:    { color: "text-muted-foreground", bg: "bg-muted/30",  border: "border-border",         icon: <AlertCircle size={11} className="text-muted-foreground" />,   label: "Unknown"    },
};

function AppCard({ app }: { app: MonitorData["apps"][0] }) {
  const m = APP_STATUS_META[app.status] ?? APP_STATUS_META.unknown;
  const ago = app.updatedAt ? formatAgo(app.updatedAt) : null;

  return (
    <div className={cn("rounded-xl border p-4 flex flex-col gap-2.5", m.border, m.bg)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{app.name}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{app.kind}</p>
        </div>
        <span className={cn(
          "flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
          m.color, m.border, m.bg
        )}>
          {m.icon} {m.label}
        </span>
      </div>
      {app.url && (
        <a href={`https://${app.url}`} target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 truncate">
          <ExternalLink size={9} />{app.url}
        </a>
      )}
      {ago && <p className="text-[10px] text-muted-foreground">Updated {ago}</p>}
    </div>
  );
}

function InfraCard({ category, providers, traffic }: {
  category: InfraCat;
  providers: { label: string }[];
  traffic: MonitorData["traffic"];
}) {
  const meta = CAT_META[category];
  const Icon = meta.icon;

  const needsUpgrade =
    (category === "vps" || category === "vpn") &&
    (traffic.level === "high" || traffic.level === "critical");

  return (
    <div className={cn(
      "rounded-xl border p-4 flex flex-col gap-3",
      needsUpgrade ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"
    )}>
      <div className="flex items-center gap-2.5">
        <Icon size={15} className={meta.color} />
        <span className="text-xs font-bold tracking-wide">{meta.label}</span>
        {needsUpgrade && (
          <span className="ml-auto text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            Check capacity
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {providers.map(p => (
          <span key={p.label}
            className="text-[11px] bg-muted/60 border border-border rounded-md px-2 py-0.5 font-medium">
            {p.label}
          </span>
        ))}
      </div>
      {needsUpgrade && (
        <p className="text-[11px] text-amber-300/80 border-t border-amber-500/20 pt-2">
          {category === "vps"
            ? "High traffic detected — consider scaling up this provider."
            : "High traffic may stress your VPN tunnel. Check provider dashboard."}
        </p>
      )}
    </div>
  );
}

const DEPLOY_STATUS_META = {
  success:  { icon: <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />, color: "text-emerald-400" },
  failed:   { icon: <XCircle size={13} className="text-red-400 shrink-0" />,          color: "text-red-400"     },
  running:  { icon: <Loader2 size={13} className="text-blue-400 animate-spin shrink-0" />, color: "text-blue-400" },
  queued:   { icon: <Clock size={13} className="text-muted-foreground shrink-0" />,   color: "text-muted-foreground" },
  unknown:  { icon: <AlertCircle size={13} className="text-muted-foreground shrink-0" />, color: "text-muted-foreground" },
};

function DeployRow({ d }: { d: MonitorData["deployments"][0] }) {
  const m = DEPLOY_STATUS_META[d.status] ?? DEPLOY_STATUS_META.unknown;
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-border/50 last:border-0">
      {m.icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{d.appName}</p>
        {d.commitMessage && (
          <p className="text-[10px] text-muted-foreground truncate">{d.commitMessage.slice(0, 70)}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        {d.commit && <p className="text-[10px] font-mono text-muted-foreground">{d.commit}</p>}
        {d.startedAt && <p className="text-[10px] text-muted-foreground">{formatAgo(d.startedAt)}</p>}
      </div>
    </div>
  );
}

// ─── Quota risk metadata ──────────────────────────────────────────────────────

const QUOTA_RISK_META: Record<QuotaRisk, {
  label: string; dot: string; bar: string; bg: string; border: string; text: string;
}> = {
  critical: { label: "Critical", dot: "bg-red-500",    bar: "bg-red-500",    bg: "bg-red-500/8",    border: "border-red-500/25",    text: "text-red-400"    },
  high:     { label: "High",     dot: "bg-amber-500",  bar: "bg-amber-500",  bg: "bg-amber-500/8",  border: "border-amber-500/25",  text: "text-amber-400"  },
  medium:   { label: "Medium",   dot: "bg-yellow-400", bar: "bg-yellow-400", bg: "bg-yellow-400/8", border: "border-yellow-400/25", text: "text-yellow-400" },
  low:      { label: "Low",      dot: "bg-emerald-500",bar: "bg-emerald-500",bg: "bg-emerald-500/8",border: "border-emerald-500/25",text: "text-emerald-400"},
};

function QuotaCard({ quota }: { quota: ApiQuota }) {
  const m = QUOTA_RISK_META[quota.risk];
  return (
    <div className={cn("rounded-xl border p-4 flex flex-col gap-3", m.border, m.bg)}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm">{quota.label}</p>
        <span className={cn(
          "flex items-center gap-1 shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border",
          m.text, m.border, m.bg
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", m.dot)} />
          {m.label} risk
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Clock size={11} className="text-muted-foreground shrink-0" />
        <span className="text-xs font-mono font-bold">{quota.limit}</span>
        <span className="text-[10px] text-muted-foreground">free tier</span>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">{quota.riskReason}</p>

      <div className={cn("rounded-md border p-2.5 text-[11px]", m.border, "bg-black/20")}>
        <span className="text-muted-foreground">Upgrade: </span>
        <span className="text-foreground/80">{quota.upgradeHint}</span>
        {quota.upgradePrice && (
          <span className={cn("ml-1 font-semibold", m.text)}> · {quota.upgradePrice}</span>
        )}
      </div>
    </div>
  );
}

const ALERT_SEV = {
  critical: { bar: "bg-red-500",    bg: "bg-red-500/8",    border: "border-red-500/25",    icon: <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" /> },
  warning:  { bar: "bg-amber-500",  bg: "bg-amber-500/8",  border: "border-amber-500/25",  icon: <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" /> },
  info:     { bar: "bg-blue-500",   bg: "bg-blue-500/8",   border: "border-blue-500/25",   icon: <AlertCircle size={14} className="text-blue-400 shrink-0 mt-0.5" /> },
};

function AlertRow({ alert }: { alert: MonitorData["alerts"][0] }) {
  const m = ALERT_SEV[alert.severity];
  return (
    <div className={cn("rounded-lg border flex overflow-hidden", m.border, m.bg)}>
      <div className={cn("w-1 shrink-0", m.bar)} />
      <div className="flex gap-2.5 px-3 py-3 flex-1 min-w-0">
        {m.icon}
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-snug">{alert.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{alert.body}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Monitor() {
  const { getToken } = useAuth();
  const [data, setData]       = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const token = await getToken();
      const r = await fetch(`${API_BASE}/api/monitor/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json() as MonitorData;
      setData(d);
      setError(null);
      setLastFetched(new Date());
      setCountdown(REFRESH_INTERVAL);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load status");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => setCountdown(c => c <= 1 ? REFRESH_INTERVAL : c - 1), 1000);
    return () => clearInterval(t);
  }, [lastFetched]);

  // Categorize detected providers
  const providersByCategory = data
    ? (Object.keys(CAT_META) as InfraCat[]).reduce((acc, cat) => {
        const ps = data.detectedProviders.filter(p => p.category === cat);
        if (ps.length) acc[cat] = ps;
        return acc;
      }, {} as Partial<Record<InfraCat, typeof data.detectedProviders>>)
    : {};

  const vpsLabels = data?.detectedProviders.filter(p => p.category === "vps").map(p => p.label) ?? [];
  const vpnLabels = data?.detectedProviders.filter(p => p.category === "vpn").map(p => p.label) ?? [];
  const cdnLabels = data?.detectedProviders.filter(p => p.category === "cdn").map(p => p.label) ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted/60 border border-border/60">
            <Activity size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              App Monitor
              <HelpPanel
                config={{
                  title: "App Monitor",
                  moon: { name: "Cypress · Moon #8", color: "#10b981", tagline: "What you can't see, you can't fix." },
                  what: "App Monitor shows the real-time health of your self-hosted apps and infrastructure — active apps, recent deployments, detected providers (VPS, CDN, DNS, etc.), live traffic, and system alerts.",
                  when: "Check Monitor when you need to see if your apps are running, a deployment just happened, traffic is spiking, or something looks wrong. It auto-refreshes every 30 seconds.",
                  examples: [
                    "Check if my site is still running after a deployment",
                    "See how much traffic my app got today",
                    "Check if there are any alerts I should act on",
                  ],
                  tips: [
                    "Connect your Coolify server first (App Hub → Connections) to see your real apps here",
                    "The page auto-refreshes every 30 seconds — or use the Refresh button to pull fresh data now",
                    "Green alerts are positive events; yellow are warnings; red means action needed",
                  ],
                }}
              />
            </h1>
            <p className="text-xs text-muted-foreground">
              {lastFetched ? `Updated ${lastFetched.toLocaleTimeString()}` : "Loading…"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={12} />
            Refresh in {countdown}s
          </div>
          <button
            onClick={() => { setLoading(true); fetchStatus(); }}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md px-3 py-1.5 hover:bg-muted disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
          <Loader2 size={18} className="animate-spin" /> Loading infrastructure status…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 flex items-center gap-2">
          <XCircle size={15} /> {error}
        </div>
      )}

      {data && (
        <>
          {/* Status banner */}
          <StatusBanner data={data} />

          {/* Traffic + Alerts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrafficMeter
              traffic={data.traffic}
              vpsLabels={vpsLabels}
              vpnLabels={vpnLabels}
              cdnLabels={cdnLabels}
            />

            {/* Alerts */}
            <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-muted-foreground" />
                <span className="text-sm font-bold tracking-wide">Alerts</span>
                {data.alerts.length > 0 && (
                  <span className={cn(
                    "ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    data.summary.hasCritical
                      ? "text-red-400 bg-red-500/10 border-red-500/20"
                      : data.summary.hasWarning
                        ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                        : "text-blue-400 bg-blue-500/10 border-blue-500/20"
                  )}>
                    {data.alerts.length} alert{data.alerts.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {data.alerts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                  <CheckCircle2 size={28} className="text-emerald-400 opacity-60" />
                  <p className="text-sm">No alerts — all clear</p>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-72">
                  {data.alerts.map(a => <AlertRow key={a.id} alert={a} />)}
                </div>
              )}
            </div>
          </div>

          {/* Coolify app status grid */}
          {data.coolifyConnected ? (
            <div>
              <h2 className="text-sm font-bold tracking-wide mb-3 flex items-center gap-2">
                <Server size={14} className="text-muted-foreground" />
                App Status ({data.apps.length} total)
              </h2>
              {data.apps.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                  No apps found on your Coolify instance.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.apps.map(app => <AppCard key={app.id} app={app} />)}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-300">Coolify not connected</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connect your Coolify server in <span className="text-primary">App Hub</span> to see live app status here.
                </p>
              </div>
            </div>
          )}

          {/* Infrastructure capacity cards */}
          {Object.keys(providersByCategory).length > 0 && (
            <div>
              <h2 className="text-sm font-bold tracking-wide mb-3 flex items-center gap-2">
                <Package size={14} className="text-muted-foreground" />
                Infrastructure Capacity
                <span className="text-[10px] text-muted-foreground font-normal ml-1">— detected from your Secrets Vault</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.entries(providersByCategory) as [InfraCat, typeof data.detectedProviders][]).map(([cat, providers]) => (
                  <InfraCard
                    key={cat}
                    category={cat}
                    providers={providers}
                    traffic={data.traffic}
                  />
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                Add API keys to your <span className="text-primary">Secrets Vault</span> for any provider you use — they'll appear here with capacity indicators.
              </p>
            </div>
          )}

          {/* No infra detected */}
          {Object.keys(providersByCategory).length === 0 && (data.detectedApiQuotas?.length ?? 0) === 0 && (
            <div className="rounded-xl border border-border bg-card/50 p-5 flex items-start gap-3">
              <Package size={15} className="text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">No infrastructure providers detected</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add your VPS, VPN, CDN, database, email, and third-party API keys to the <span className="text-primary">Secrets Vault</span>.
                  The monitor will automatically detect which services you use and show capacity alerts when it matters.
                </p>
              </div>
            </div>
          )}

          {/* Third-party API quota limits */}
          {(data.detectedApiQuotas?.length ?? 0) > 0 && (
            <div>
              <h2 className="text-sm font-bold tracking-wide mb-1 flex items-center gap-2">
                <Activity size={14} className="text-muted-foreground" />
                Third-Party API Quotas
                <span className="text-[10px] text-muted-foreground font-normal ml-1">— free-tier limits for detected services</span>
              </h2>

              {/* Risk summary strip */}
              <div className="flex flex-wrap gap-2 mb-3">
                {(["critical","high","medium","low"] as QuotaRisk[]).map(risk => {
                  const count = data.detectedApiQuotas.filter(q => q.risk === risk).length;
                  if (!count) return null;
                  const m = QUOTA_RISK_META[risk];
                  return (
                    <span key={risk} className={cn(
                      "flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border",
                      m.text, m.border, m.bg
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", m.dot)} />
                      {count} {m.label.toLowerCase()}
                    </span>
                  );
                })}
                <span className="text-[11px] text-muted-foreground self-center ml-1">
                  — how quickly you'll hit the ceiling
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.detectedApiQuotas.map(q => <QuotaCard key={q.key} quota={q} />)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                No real-time usage data yet — these are known free-tier limits. Add usage logging to your app to see actual consumption.
              </p>
            </div>
          )}

          {/* Recent deployments */}
          {data.deployments.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold tracking-wide mb-3 flex items-center gap-2">
                <Package size={14} className="text-muted-foreground" />
                Recent Deployments
              </h2>
              {data.deployments.map(d => <DeployRow key={d.id} d={d} />)}
            </div>
          )}

          {/* Uptime */}
          <div className="text-center text-[11px] text-muted-foreground/50">
            API server uptime: {formatUptime(data.traffic.uptimeMs)}
            &nbsp;·&nbsp;
            {data.traffic.peakRpm} req/min peak this session
          </div>
        </>
      )}
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}
