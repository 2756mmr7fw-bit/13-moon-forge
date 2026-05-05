import { useState, useEffect, useCallback } from "react";
import {
  Layers, RefreshCw, Loader2, CheckCircle2, XCircle, AlertCircle,
  Play, ExternalLink, Github, Server, RotateCcw, Clock, Zap,
  Lock, ChevronDown, ChevronUp, GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type AppStatus = "running" | "stopped" | "deploying" | "restarting" | "starting" | "error" | "unknown";

interface DeployApp {
  id: string;
  name: string;
  kind: "app" | "service";
  status: AppStatus;
  url: string | null;
  gitUrl: string | null;
  gitBranch: string | null;
  updatedAt: string | null;
  canDeploy: boolean;
}

interface DeploysData {
  connected: boolean;
  coolifyUrl?: string;
  apps: DeployApp[];
}

const STATUS_CONFIG: Record<AppStatus, { label: string; color: string; icon: React.ReactNode; dot: string }> = {
  running:    { label: "Running",    color: "text-green-400",  icon: <CheckCircle2 className="w-3.5 h-3.5" />, dot: "bg-green-400" },
  stopped:    { label: "Stopped",    color: "text-muted-foreground", icon: <XCircle className="w-3.5 h-3.5" />, dot: "bg-muted-foreground" },
  deploying:  { label: "Deploying",  color: "text-amber-400",  icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, dot: "bg-amber-400 animate-pulse" },
  restarting: { label: "Restarting", color: "text-amber-400",  icon: <RotateCcw className="w-3.5 h-3.5 animate-spin" />, dot: "bg-amber-400 animate-pulse" },
  starting:   { label: "Starting",   color: "text-sky-400",    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, dot: "bg-sky-400 animate-pulse" },
  error:      { label: "Error",      color: "text-red-400",    icon: <AlertCircle className="w-3.5 h-3.5" />, dot: "bg-red-400" },
  unknown:    { label: "Unknown",    color: "text-muted-foreground", icon: <Clock className="w-3.5 h-3.5" />, dot: "bg-muted-foreground/40" },
};

function StatusPill({ status }: { status: AppStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium", cfg.color)}>
      <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

interface LogEntry {
  id: string;
  status: string;
  commit?: string;
  commitMessage?: string;
  startedAt?: string;
  finishedAt?: string;
}

function AppCard({ app, coolifyUrl, onDeploy }: { app: DeployApp; coolifyUrl?: string; onDeploy: (id: string) => Promise<void> }) {
  const [deploying, setDeploying] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [deployErr, setDeployErr] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);

  const handleDeploy = async () => {
    setDeploying(true);
    setDeployErr(null);
    setNeedsKey(false);
    try {
      const r = await fetch(`${API_BASE}/api/deploys/trigger/${app.id}`, {
        method: "POST", credentials: "include",
      });
      const d = await r.json() as { ok?: boolean; error?: string; needsWriteKey?: boolean };
      if (!r.ok) {
        setDeployErr(d.error ?? "Deploy failed");
        if (d.needsWriteKey) setNeedsKey(true);
      }
    } finally {
      await onDeploy(app.id);
      setDeploying(false);
    }
  };

  const loadLogs = async () => {
    if (logsLoading) return;
    setLogsLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/deploys/logs/${app.id}`, { credentials: "include" });
      const d = await r.json() as unknown;
      setLogs(Array.isArray(d) ? d.slice(0, 10) : []);
    } finally {
      setLogsLoading(false);
    }
  };

  const toggleLogs = () => {
    const next = !logsOpen;
    setLogsOpen(next);
    if (next && logs.length === 0) loadLogs();
  };

  const gitShort = app.gitUrl
    ? app.gitUrl.replace("https://github.com/", "").replace(/\.git$/, "")
    : null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Server className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{app.name}</h3>
              <Badge variant="outline" className="text-[10px]">
                {app.kind}
              </Badge>
            </div>
            <StatusPill status={app.status} />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {app.url && (
              <a href={app.url.startsWith("http") ? app.url : `https://${app.url}`} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Open app">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            )}
            {coolifyUrl && (
              <a href={`${coolifyUrl}/project`} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Open in Coolify">
                  <Layers className="w-3.5 h-3.5" />
                </Button>
              </a>
            )}
          </div>
        </div>

        {gitShort && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Github className="w-3 h-3" />
            <span className="truncate">{gitShort}</span>
            {app.gitBranch && (
              <span className="flex items-center gap-0.5 text-muted-foreground/60">
                <GitBranch className="w-2.5 h-2.5" />{app.gitBranch}
              </span>
            )}
          </div>
        )}

        {deployErr && (
          <div className={cn("rounded-lg p-3 text-xs mb-3", needsKey ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "bg-red-500/10 border border-red-500/20 text-red-400")}>
            {needsKey ? (
              <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> Coolify API key needs deploy permissions. <Link href="/connections" className="underline font-medium">Update key →</Link></span>
            ) : deployErr}
          </div>
        )}

        <div className="flex gap-2">
          {app.canDeploy && (
            <Button size="sm" onClick={handleDeploy} disabled={deploying} className="h-8">
              {deploying ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
              {deploying ? "Deploying…" : "Redeploy"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={toggleLogs} className="h-8">
            {logsOpen ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
            Deployments
          </Button>
        </div>
      </div>

      {logsOpen && (
        <div className="border-t border-border bg-muted/40 p-4">
          {logsLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No deployments found.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((l, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span className={cn("mt-0.5 w-2 h-2 rounded-full shrink-0",
                    l.status === "success" ? "bg-green-400" :
                    l.status === "running" || l.status === "queued" ? "bg-amber-400 animate-pulse" :
                    l.status === "failed" ? "bg-red-400" : "bg-muted-foreground/40"
                  )} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium capitalize">{l.status}</span>
                    {l.commitMessage && <span className="text-muted-foreground ml-2 truncate">— {l.commitMessage}</span>}
                    {l.commit && <span className="text-muted-foreground/50 ml-2 font-mono">{String(l.commit).slice(0, 7)}</span>}
                  </div>
                  {l.startedAt && (
                    <span className="text-muted-foreground/50 shrink-0">{new Date(l.startedAt).toLocaleDateString()}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DeploysPage() {
  const [data, setData] = useState<DeploysData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/deploys/apps`, { credentials: "include" });
      const d = await r.json() as DeploysData;
      setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDeploy = async (_id: string) => { await load(); };

  const apps = data?.apps ?? [];
  const running = apps.filter(a => a.status === "running").length;
  const errors  = apps.filter(a => a.status === "error").length;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Deploy Dashboard</h1>
          </div>
          <p className="text-muted-foreground text-sm">Every app running on your server — trigger redeploys, view logs, check status.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-1.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* Stats row */}
      {data?.connected && apps.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Apps", value: apps.length, color: "text-foreground" },
            { label: "Running",    value: running,      color: "text-green-400" },
            { label: "Errors",     value: errors,       color: errors > 0 ? "text-red-400" : "text-muted-foreground" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Not connected */}
      {!loading && data && !data.connected && (
        <div className="border border-dashed border-border rounded-xl py-16 text-center">
          <Server className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">No server connected</p>
          <p className="text-sm text-muted-foreground/60 mt-1 mb-4">Connect your Coolify server to see your deployed apps here.</p>
          <Link href="/connections">
            <Button size="sm"><Layers className="w-4 h-4 mr-1.5" /> Connect Server</Button>
          </Link>
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Fetching your apps…
        </div>
      )}

      {/* No apps */}
      {!loading && data?.connected && apps.length === 0 && (
        <div className="border border-dashed border-border rounded-xl py-16 text-center">
          <Layers className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">No apps deployed yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1 mb-4">Use the "Connect & Deploy" flow to launch your first app.</p>
          <Link href="/migrate">
            <Button size="sm"><Play className="w-4 h-4 mr-1.5" /> Connect a Repo</Button>
          </Link>
        </div>
      )}

      {/* Apps grid */}
      {apps.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Your Apps ({apps.length})</h2>
            <div className="flex-1 h-px bg-border" />
            <Link href="/migrate">
              <Button size="sm" variant="outline"><Play className="w-3.5 h-3.5 mr-1.5" /> Connect New Repo</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {apps.map(app => (
              <AppCard key={app.id} app={app} coolifyUrl={data?.coolifyUrl} onDeploy={handleDeploy} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
