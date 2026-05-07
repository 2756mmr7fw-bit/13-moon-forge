import { useQuery } from "@tanstack/react-query";
import {
  Activity, Database, Cpu, MemoryStick, Clock, Users, FolderOpen,
  MessageSquare, Shield, TrendingUp, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type CheckStatus = "ok" | "warn" | "error";

interface HealthCheck {
  status: CheckStatus;
  latencyMs?: number;
  detail?: string;
}

interface HealthData {
  status: CheckStatus;
  timestamp: string;
  version: string;
  nodeVersion: string;
  checks: Record<string, HealthCheck>;
}

interface MetricsData {
  users: { total: number; newThisWeek: number; paying: number };
  projects: number;
  chatSessions: number;
  inspections: number;
  messageUsage: { month: string; total: number }[];
}

const STATUS_CONFIG: Record<CheckStatus, { icon: React.ComponentType<any>; color: string; label: string; bg: string }> = {
  ok:    { icon: CheckCircle2,  color: "text-emerald-400", label: "Healthy", bg: "bg-emerald-500/10" },
  warn:  { icon: AlertTriangle, color: "text-amber-400",   label: "Warning", bg: "bg-amber-500/10" },
  error: { icon: XCircle,       color: "text-red-400",     label: "Error",   bg: "bg-red-500/10" },
};

const CHECK_META: Record<string, { label: string; icon: React.ComponentType<any> }> = {
  database: { label: "Database",    icon: Database },
  memory:   { label: "Memory",      icon: MemoryStick },
  cpu:      { label: "CPU Load",    icon: Cpu },
  uptime:   { label: "Uptime",      icon: Clock },
  api:      { label: "API Latency", icon: Activity },
};

function StatusPill({ status }: { status: CheckStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", cfg.color, cfg.bg)}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

function CheckCard({ name, check }: { name: string; check: HealthCheck }) {
  const meta = CHECK_META[name] ?? { label: name, icon: Activity };
  const Icon = meta.icon;
  const cfg = STATUS_CONFIG[check.status];

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <div className={cn("p-2 rounded-lg shrink-0", cfg.bg)}>
        <Icon size={16} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold">{meta.label}</span>
          <StatusPill status={check.status} />
        </div>
        {check.detail && (
          <p className="text-xs text-muted-foreground truncate">{check.detail}</p>
        )}
        {check.latencyMs !== undefined && (
          <p className="text-xs text-muted-foreground">{check.latencyMs}ms</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon: Icon, color = "text-primary" }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<any>;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={cn("text-2xl font-bold tabular-nums", color)}>{value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function SparkBar({ month, total, max }: { month: string; total: number; max: number }) {
  const pct = max > 0 ? (total / max) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-8 h-20 bg-muted/30 rounded-md overflow-hidden flex flex-col justify-end">
        <div
          className="w-full bg-primary/70 rounded-md transition-all"
          style={{ height: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] text-muted-foreground text-center leading-tight">{month.slice(5)}</span>
      <span className="text-[9px] font-mono text-muted-foreground">{total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}</span>
    </div>
  );
}

export default function AppHealth() {
  const { data: health, isLoading: healthLoading, refetch: refetchHealth, dataUpdatedAt } = useQuery<HealthData>({
    queryKey: ["app-health"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/app-health`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<MetricsData>({
    queryKey: ["app-health-metrics"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/app-health/metrics`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 60_000,
  });

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;
  const maxUsage = Math.max(...(metrics?.messageUsage.map(u => u.total) ?? [1]));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
          <Activity size={22} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">App Health</h1>
          <p className="text-sm text-muted-foreground">Real-time system status and platform metrics</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:block">Updated {lastUpdated}</span>
          )}
          <Button variant="ghost" size="icon" onClick={() => refetchHealth()} title="Refresh">
            <RefreshCw size={15} />
          </Button>
        </div>
      </div>

      {healthLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : health ? (
        <>
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
            <StatusPill status={health.status} />
            <div className="text-xs text-muted-foreground">
              <span className="font-mono">{health.nodeVersion}</span>
              {health.version !== "unknown" && <span className="ml-3">v{health.version}</span>}
            </div>
            <div className="ml-auto text-xs text-muted-foreground">
              {new Date(health.timestamp).toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(health.checks).map(([name, check]) => (
              <CheckCard key={name} name={name} check={check} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-muted-foreground text-sm">Failed to load health data</div>
      )}

      <div>
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <TrendingUp size={15} className="text-muted-foreground" />
          Platform Metrics
        </h2>

        {metricsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : metrics ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard
                label="Total Users"
                value={metrics.users.total.toLocaleString()}
                sub={`+${metrics.users.newThisWeek} this week`}
                icon={Users}
                color="text-primary"
              />
              <MetricCard
                label="Paying"
                value={metrics.users.paying.toLocaleString()}
                sub={metrics.users.total > 0 ? `${Math.round((metrics.users.paying / metrics.users.total) * 100)}% conversion` : ""}
                icon={Shield}
                color="text-emerald-400"
              />
              <MetricCard
                label="Projects"
                value={metrics.projects.toLocaleString()}
                icon={FolderOpen}
                color="text-blue-400"
              />
              <MetricCard
                label="Chat Sessions"
                value={metrics.chatSessions.toLocaleString()}
                sub={`${metrics.inspections} inspections`}
                icon={MessageSquare}
                color="text-violet-400"
              />
            </div>

            {metrics.messageUsage.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">AI Message Usage (6 months)</p>
                <div className="flex items-end gap-3 justify-center">
                  {[...metrics.messageUsage].reverse().map(u => (
                    <SparkBar key={u.month} month={u.month} total={u.total} max={maxUsage} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">Failed to load metrics</div>
        )}
      </div>
    </div>
  );
}
