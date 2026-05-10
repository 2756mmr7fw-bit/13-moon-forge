import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Terminal, RefreshCw, Loader2, Play, Square, Download,
  AlertTriangle, Wifi, WifiOff, Server,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@workspace/api-client-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

interface CoolifyApp {
  id: string;
  name: string;
  kind: "app" | "service";
  status: string;
  domains?: string[];
}

function statusColor(status: string) {
  if (status === "running") return "bg-green-400";
  if (status === "stopped" || status === "exited") return "bg-red-400";
  if (status === "restarting") return "bg-orange-400";
  return "bg-zinc-500";
}

function logLine(line: string, idx: number) {
  const isError = /error|err\b|fatal|exception|failed|traceback/i.test(line);
  const isWarn  = /warn|warning/i.test(line);
  return (
    <div key={idx} className={cn(
      "font-mono text-[11px] leading-relaxed px-3 py-0.5 hover:bg-white/5 transition-colors",
      isError ? "text-red-400" : isWarn ? "text-yellow-400" : "text-zinc-300"
    )}>
      {line}
    </div>
  );
}

export default function AppLogsPage() {
  const [apps, setApps]         = useState<CoolifyApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [connected, setConnected] = useState(true);
  const [selectedUuid, setSelectedUuid] = useState("");
  const [lines, setLines]       = useState(100);
  const [logs, setLogs]         = useState("");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingApps(true);
      try {
        const h = await authHeaders();
        const r = await fetch(`${API_BASE}/api/coolify/apps`, { headers: h, credentials: "include" });
        if (r.ok) {
          const d = await r.json() as { connected: boolean; apps: CoolifyApp[] };
          setConnected(d.connected);
          setApps(d.apps ?? []);
          if (d.apps?.length) setSelectedUuid(d.apps[0].id);
        } else {
          setConnected(false);
        }
      } finally { setLoadingApps(false); }
    })();
  }, []);

  const fetchLogs = useCallback(async (uuid?: string) => {
    const target = uuid ?? selectedUuid;
    if (!target) return;
    setLoadingLogs(true);
    try {
      const h = await authHeaders();
      const r = await fetch(`${API_BASE}/api/app-logs/${target}?lines=${lines}`, { headers: h, credentials: "include" });
      const d = await r.json() as { logs?: string; error?: string };
      setLogs(d.logs ?? d.error ?? "No logs returned.");
      setLastFetched(new Date());
    } catch { setLogs("Failed to load logs."); }
    finally { setLoadingLogs(false); }
  }, [selectedUuid, lines]);

  useEffect(() => {
    if (selectedUuid) fetchLogs(selectedUuid);
  }, [selectedUuid]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchLogs(), 10000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchLogs]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  async function restart() {
    if (!selectedUuid) return;
    setRestarting(true);
    try {
      const h = await authHeaders();
      await fetch(`${API_BASE}/api/app-logs/${selectedUuid}/restart`, { method: "POST", headers: h, credentials: "include" });
      setTimeout(() => fetchLogs(), 3000);
    } finally { setRestarting(false); }
  }

  function downloadLogs() {
    const app = apps.find(a => a.id === selectedUuid);
    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${app?.name ?? "app"}-logs-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedApp = apps.find(a => a.id === selectedUuid);
  const logLines = logs.split("\n").filter(Boolean);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col gap-0 max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal size={22} className="text-primary" />
            <h1 className="text-2xl font-bold">App Logs</h1>
          </div>
          <p className="text-muted-foreground text-sm">Live container logs from your deployed apps — streamed from Coolify.</p>
        </div>
        {!connected && (
          <div className="flex items-center gap-2 text-sm text-yellow-400">
            <WifiOff size={16} />No server connected — go to <a href="/connections" className="underline">Integrations</a>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {loadingApps ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />Loading apps…
          </div>
        ) : (
          <Select value={selectedUuid} onValueChange={setSelectedUuid}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select an app…" />
            </SelectTrigger>
            <SelectContent>
              {apps.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", statusColor(a.status))} />
                    {a.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={String(lines)} onValueChange={v => setLines(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[50, 100, 200, 500].map(n => (
              <SelectItem key={n} value={String(n)}>{n} lines</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button size="sm" variant="outline" onClick={() => fetchLogs()} disabled={loadingLogs || !selectedUuid}>
          {loadingLogs ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}
          Refresh
        </Button>

        <Button
          size="sm"
          variant={autoRefresh ? "default" : "outline"}
          onClick={() => setAutoRefresh(v => !v)}
          disabled={!selectedUuid}
        >
          {autoRefresh ? <><Square size={13} className="mr-1" />Stop</> : <><Play size={13} className="mr-1" />Auto (10s)</>}
        </Button>

        {logs && (
          <Button size="sm" variant="outline" onClick={downloadLogs}>
            <Download size={14} className="mr-1" />Download
          </Button>
        )}

        {selectedApp && (
          <Button size="sm" variant="outline" onClick={restart} disabled={restarting}
            className="ml-auto text-orange-400 border-orange-400/30 hover:bg-orange-400/10">
            {restarting ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}
            Restart App
          </Button>
        )}
      </div>

      {/* App status bar */}
      {selectedApp && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/40 border border-border mb-2 text-sm flex-wrap">
          <span className={cn("w-2.5 h-2.5 rounded-full", statusColor(selectedApp.status))} />
          <span className="font-medium">{selectedApp.name}</span>
          <Badge variant="outline" className="text-[10px]">{selectedApp.kind}</Badge>
          <span className="text-muted-foreground capitalize">{selectedApp.status}</span>
          {lastFetched && (
            <span className="ml-auto text-xs text-muted-foreground">
              Last fetched: {lastFetched.toLocaleTimeString()}
              {autoRefresh && <span className="ml-1 text-green-400">● live</span>}
            </span>
          )}
        </div>
      )}

      {/* Log terminal */}
      <div className="flex-1 min-h-0 rounded-lg border border-border bg-[#0d0d0f] overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 shrink-0">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-zinc-500 font-mono ml-1">
            {selectedApp ? `${selectedApp.name} — stdout/stderr` : "select an app"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {!selectedUuid ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
              <Server size={32} />
              <p className="text-sm">Select an app to view logs</p>
            </div>
          ) : loadingLogs && !logs ? (
            <div className="flex items-center justify-center h-full gap-2 text-zinc-500">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm font-mono">Fetching logs…</span>
            </div>
          ) : logLines.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm font-mono">
              No log output found.
            </div>
          ) : (
            <>
              {logLines.map((line, i) => logLine(line, i))}
              <div ref={logsEndRef} />
            </>
          )}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-2">
        Showing last {lines} lines from container stdout/stderr. Errors in red, warnings in yellow.
      </p>
    </div>
  );
}
