import { useState, useRef, useEffect, useCallback } from "react";
import {
  ScanLine, Play, Loader2, CheckCircle2, AlertCircle, AlertTriangle,
  Info, ChevronDown, ChevronUp, Plus, Trash2, Globe, Lock, Eye, EyeOff,
  ArrowRight, Monitor, Terminal, Camera, RefreshCw, ExternalLink, X,
  Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

type FindingType = "info" | "warn" | "error" | "ok" | "step";

interface Finding {
  type: FindingType;
  page?: string;
  message: string;
  detail?: string;
  ts: number;
}

type InspectStatus = "idle" | "running" | "done" | "error";

interface CliScreenshot {
  page: string;
  label: string;
  dataUrl: string;
}

interface CliReport {
  appName: string;
  appUrl: string;
  inspectedAt: string;
  pagesChecked: number;
  errorCount: number;
  warnCount: number;
  findings: Omit<Finding, "ts">[];
  screenshots: CliScreenshot[];
}

// ── Finding row ───────────────────────────────────────────────────────────────

const FINDING_STYLES: Record<FindingType, { icon: React.ComponentType<{ size: number; className?: string }>; color: string; bg: string }> = {
  ok:   { icon: CheckCircle2,   color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/20" },
  warn: { icon: AlertTriangle,  color: "text-yellow-400",  bg: "bg-yellow-500/5 border-yellow-500/20" },
  error:{ icon: AlertCircle,    color: "text-red-400",     bg: "bg-red-500/5 border-red-500/20" },
  info: { icon: Info,           color: "text-blue-400",    bg: "bg-blue-500/5 border-blue-500/10" },
  step: { icon: ArrowRight,     color: "text-muted-foreground", bg: "" },
};

function FindingRow({ finding }: { finding: Finding | Omit<Finding, "ts"> }) {
  const [open, setOpen] = useState(false);
  const style = FINDING_STYLES[finding.type];
  const Icon = style.icon;

  return (
    <div className={cn(
      "rounded-lg border px-4 py-2.5 text-sm",
      finding.type === "step" ? "border-transparent py-1.5" : style.bg
    )}>
      <div className="flex items-start gap-2.5">
        <Icon size={15} className={cn("shrink-0 mt-0.5", style.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className={cn("flex-1", finding.type === "step" && "text-muted-foreground text-xs")}>
              {finding.page && <code className="text-[10px] bg-muted px-1 py-0.5 rounded mr-1.5 font-mono">{finding.page}</code>}
              {finding.message}
            </span>
            {finding.detail && (
              <button onClick={() => setOpen(v => !v)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>
          {open && finding.detail && (
            <pre className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap">{finding.detail}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Saved apps (localStorage) ─────────────────────────────────────────────────

interface SavedApp {
  id: string;
  name: string;
  url: string;
  loginUrl?: string;
  username?: string;
  usernameField?: string;
  passwordField?: string;
  loginMethod: "form" | "none";
  pages: string[];
  description?: string;
}

function loadApps(): SavedApp[] {
  try { return JSON.parse(localStorage.getItem("forge:inspector:apps") ?? "[]") as SavedApp[]; }
  catch { return []; }
}
function saveApps(apps: SavedApp[]) {
  localStorage.setItem("forge:inspector:apps", JSON.stringify(apps));
}

// ── CLI token copy helper ──────────────────────────────────────────────────────

function CliTokenButton() {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/help/cli-token`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setToken(d.token ?? null))
      .catch(() => {});
  }, []);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!token) return null;

  return (
    <button
      onClick={() => copy(token)}
      className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors font-mono"
      title="Copy your CLI token"
    >
      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
      {copied ? "Copied!" : "Copy CLI token"}
    </button>
  );
}

// ── Screenshot lightbox ────────────────────────────────────────────────────────

function ScreenshotGallery({ screenshots }: { screenshots: CliScreenshot[] }) {
  const [lightbox, setLightbox] = useState<CliScreenshot | null>(null);

  if (screenshots.length === 0) return null;

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Camera size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{screenshots.length} screenshots</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {screenshots.map((ss, i) => (
            <button
              key={i}
              onClick={() => setLightbox(ss)}
              className="group relative rounded-lg border border-border overflow-hidden hover:border-primary/40 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <img
                src={ss.dataUrl}
                alt={ss.label}
                className="w-full h-28 object-cover object-top"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <code className="text-[10px] text-white font-mono">{ss.label}</code>
              </div>
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ExternalLink size={18} className="text-white drop-shadow-lg" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-5xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <code className="text-sm text-white font-mono">{lightbox.label}</code>
              <button onClick={() => setLightbox(null)} className="text-white/70 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <img
              src={lightbox.dataUrl}
              alt={lightbox.label}
              className="w-full rounded-lg border border-white/10 max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

// ── CLI report panel ──────────────────────────────────────────────────────────

function CliReportPanel() {
  const [report, setReport] = useState<CliReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [polling, setPolling] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agent/cli-inspect/latest`, { credentials: "include" });
      const data = await res.json();
      if (data.report) setReport(data.report);
      setLastChecked(new Date());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 5s when no report, every 30s when we have one
  useEffect(() => {
    fetchReport();
    const interval = setInterval(fetchReport, report ? 30_000 : 5_000);
    return () => clearInterval(interval);
  }, [fetchReport, report]);

  const refresh = async () => {
    setPolling(true);
    await fetchReport();
    setPolling(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 size={15} className="animate-spin" />
        <span>Checking for CLI reports...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-5">
        <div className="border border-dashed border-border rounded-xl p-8 text-center space-y-3">
          <Monitor size={28} className="mx-auto text-muted-foreground/40" />
          <p className="font-medium">No CLI reports yet</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Run the inspect command on your computer. Forge will open a real browser, log into your app,
            take screenshots of every page, and send the full report here.
          </p>
        </div>

        <div className="border border-border rounded-xl p-5 space-y-4">
          <p className="text-sm font-medium">Run this on your computer:</p>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">1. Download the Forge CLI (one-time)</p>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs">
                curl -o forge.js https://13moonforge.ai/api/help/forge-agent.js
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5">2. Run the inspector</p>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs">
                node forge.js inspect https://myapp.com --username me@email.com --pages /dashboard,/settings
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5">3. Paste your token when prompted</p>
              <div className="flex items-center gap-2">
                <CliTokenButton />
                <span className="text-xs text-muted-foreground">— or get it at /get-forge</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 space-y-1 text-xs text-muted-foreground">
            <p>On first run: Forge installs a browser (~200MB, one-time) into <code className="font-mono bg-muted px-1 rounded">~/.forge-playwright/</code></p>
            <p>Screenshots save to <code className="font-mono bg-muted px-1 rounded">~/forge-inspection/</code> on your computer, and appear here when the run completes.</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {lastChecked && <span>Last checked: {lastChecked.toLocaleTimeString()}</span>}
          <button onClick={refresh} disabled={polling} className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto">
            <RefreshCw size={11} className={cn(polling && "animate-spin")} />
            Check now
          </button>
        </div>
      </div>
    );
  }

  const errCount = report.errorCount;
  const warnCount = report.warnCount;
  const findings = report.findings;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 border border-border rounded-xl bg-card/50">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{report.appName}</p>
          <p className="text-xs text-muted-foreground">
            {report.pagesChecked} page{report.pagesChecked !== 1 ? "s" : ""} · {new Date(report.inspectedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {errCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-red-400">
              <AlertCircle size={14} /> {errCount} error{errCount !== 1 ? "s" : ""}
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-yellow-400">
              <AlertTriangle size={14} /> {warnCount} warning{warnCount !== 1 ? "s" : ""}
            </span>
          )}
          {errCount === 0 && warnCount === 0 && (
            <span className="text-sm text-emerald-400 font-medium">All clear 🎉</span>
          )}
          <button onClick={refresh} disabled={polling} title="Check for newer reports" className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={14} className={cn(polling && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Screenshots */}
      {report.screenshots.length > 0 && (
        <div className="border border-border rounded-xl p-5">
          <ScreenshotGallery screenshots={report.screenshots} />
        </div>
      )}

      {/* Findings */}
      <div className="space-y-1.5">
        {findings.map((f, i) => (
          <FindingRow key={i} finding={{ ...f, ts: 0 }} />
        ))}
      </div>

      {/* Run again instructions */}
      <div className="border border-border/40 rounded-xl p-4 text-xs text-muted-foreground space-y-1.5">
        <p className="font-medium text-foreground text-sm">Run again</p>
        <div className="bg-muted/50 rounded-lg p-2.5 font-mono text-[11px]">
          node forge.js inspect {report.appUrl}
        </div>
        <p>This page auto-refreshes every 30 seconds while open.</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AppInspector() {
  const [mode, setMode] = useState<"server" | "cli">("server");
  const [apps, setApps] = useState<SavedApp[]>(loadApps);
  const [editingApp, setEditingApp] = useState<SavedApp | null>(null);
  const [addingApp, setAddingApp] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [status, setStatus] = useState<InspectStatus>("idle");
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [findings]);

  const runInspection = useCallback(async (app: SavedApp) => {
    setRunningId(app.id);
    setFindings([]);
    setStatus("running");
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_BASE}/api/agent/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortRef.current.signal,
        body: JSON.stringify({
          appUrl: app.url,
          loginUrl: app.loginUrl || undefined,
          username: app.username || undefined,
          password: passwords[app.id] || undefined,
          usernameField: app.usernameField || "username",
          passwordField: app.passwordField || "password",
          loginMethod: app.loginMethod,
          pagePaths: app.pages,
          appDescription: app.description || `${app.name} web application`,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { setStatus("done"); break; }
          try {
            const finding = JSON.parse(data) as Omit<Finding, "ts">;
            setFindings(prev => [...prev, { ...finding, ts: Date.now() }]);
          } catch { /* skip */ }
        }
      }
      setStatus("done");
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setFindings(prev => [...prev, { type: "error", message: `Inspection failed: ${(e as Error).message}`, ts: Date.now() }]);
        setStatus("error");
      } else {
        setStatus("idle");
      }
    } finally {
      setRunningId(null);
    }
  }, [passwords]);

  const deleteApp = (id: string) => {
    const next = apps.filter(a => a.id !== id);
    saveApps(next);
    setApps(next);
  };

  const saveApp = (app: SavedApp) => {
    const existing = apps.find(a => a.id === app.id);
    const next = existing ? apps.map(a => a.id === app.id ? app : a) : [app, ...apps];
    saveApps(next);
    setApps(next);
    setEditingApp(null);
    setAddingApp(false);
  };

  const errCount = findings.filter(f => f.type === "error").length;
  const warnCount = findings.filter(f => f.type === "warn").length;
  const okCount = findings.filter(f => f.type === "ok").length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ScanLine size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Forge Inspector</h1>
              <p className="text-xs text-muted-foreground">Forge logs into your apps and tells you what's broken</p>
            </div>
          </div>
        </div>
        {mode === "server" && (
          <Button onClick={() => { setAddingApp(true); setEditingApp(null); }} className="gap-2 shrink-0">
            <Plus size={15} /> Add app
          </Button>
        )}
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit">
        <button
          onClick={() => setMode("server")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            mode === "server"
              ? "bg-background text-foreground shadow-sm border border-border/50"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Globe size={14} />
          Server-side
        </button>
        <button
          onClick={() => setMode("cli")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            mode === "cli"
              ? "bg-background text-foreground shadow-sm border border-border/50"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Monitor size={14} />
          Browser (CLI)
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">Screenshots</span>
        </button>
      </div>

      {/* ── SERVER-SIDE MODE ─────────────────────────────────────────────────── */}
      {mode === "server" && (
        <>
          {/* Add/Edit form */}
          {(addingApp || editingApp) && (
            <AppForm
              initial={editingApp ?? undefined}
              onSave={saveApp}
              onCancel={() => { setAddingApp(false); setEditingApp(null); }}
            />
          )}

          {/* App list */}
          {apps.length === 0 && !addingApp ? (
            <div className="border border-dashed border-border rounded-xl p-12 text-center space-y-3">
              <Globe size={28} className="mx-auto text-muted-foreground/40" />
              <p className="font-medium">No apps added yet</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Add your app's URL and login credentials. Forge will log in, visit every page you specify, and report what it finds.
              </p>
              <Button variant="secondary" onClick={() => setAddingApp(true)} className="gap-2 mt-2">
                <Plus size={15} /> Add your first app
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {apps.map(app => (
                <div key={app.id} className="border border-border rounded-xl p-5 bg-card/30 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold">{app.name}</h3>
                        {app.loginMethod === "form" && app.username && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">
                            <Lock size={9} /> {app.username}
                          </span>
                        )}
                      </div>
                      <a href={app.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors truncate block">{app.url}</a>
                      {app.pages.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {app.pages.map(p => (
                            <code key={p} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{p}</code>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingApp(app); setAddingApp(false); }}
                        className="text-xs text-muted-foreground"
                      >
                        Edit
                      </Button>
                      <button onClick={() => deleteApp(app.id)} className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {app.loginMethod === "form" && (
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1 max-w-xs">
                        <Input
                          type={showPasswords[app.id] ? "text" : "password"}
                          placeholder="Password (not saved)"
                          value={passwords[app.id] ?? ""}
                          onChange={e => setPasswords(p => ({ ...p, [app.id]: e.target.value }))}
                          className="pr-9 text-sm"
                        />
                        <button
                          onClick={() => setShowPasswords(p => ({ ...p, [app.id]: !p[app.id] }))}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPasswords[app.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <Button
                        onClick={() => void runInspection(app)}
                        disabled={!!runningId || !passwords[app.id]}
                        className="gap-2"
                      >
                        {runningId === app.id
                          ? <><Loader2 size={14} className="animate-spin" /> Inspecting...</>
                          : <><Play size={14} /> Run inspection</>
                        }
                      </Button>
                    </div>
                  )}
                  {app.loginMethod === "none" && (
                    <Button
                      onClick={() => void runInspection(app)}
                      disabled={!!runningId}
                      className="gap-2"
                    >
                      {runningId === app.id
                        ? <><Loader2 size={14} className="animate-spin" /> Inspecting...</>
                        : <><Play size={14} /> Run inspection</>
                      }
                    </Button>
                  )}

                  {/* CLI shortcut for this app */}
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                    <Terminal size={11} />
                    <span>Also runnable with CLI for screenshots:</span>
                    <code className="font-mono bg-muted px-1.5 py-0.5 rounded">
                      node forge.js inspect {app.url}{app.username ? ` --username ${app.username}` : ""}{app.pages.length ? ` --pages ${app.pages.join(",")}` : ""}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {findings.length > 0 && (
            <div className="space-y-3">
              {status === "done" && (
                <div className="flex items-center gap-4 p-4 border border-border rounded-xl bg-card/50">
                  <div className="flex-1 font-semibold text-sm">Inspection complete</div>
                  {errCount > 0 && (
                    <span className="flex items-center gap-1.5 text-sm text-red-400">
                      <AlertCircle size={14} /> {errCount} error{errCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {warnCount > 0 && (
                    <span className="flex items-center gap-1.5 text-sm text-yellow-400">
                      <AlertTriangle size={14} /> {warnCount} warning{warnCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {okCount > 0 && (
                    <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                      <CheckCircle2 size={14} /> {okCount} passed
                    </span>
                  )}
                  {errCount === 0 && warnCount === 0 && (
                    <span className="text-sm text-emerald-400 font-medium">All clear 🎉</span>
                  )}
                </div>
              )}

              {status === "running" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Forge is inspecting your app...</span>
                </div>
              )}

              <div className="space-y-1.5">
                {findings.map((f, i) => <FindingRow key={i} finding={f} />)}
              </div>
              <div ref={bottomRef} />
            </div>
          )}

          {/* How it works note */}
          <div className="border border-border/40 rounded-xl p-5 bg-muted/10 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground text-sm">What Forge checks (server-side)</p>
            <ul className="space-y-1 text-xs leading-relaxed">
              <li>• Whether your app loads and responds</li>
              <li>• Login form submission with your credentials</li>
              <li>• Each page you list — HTTP status, HTML structure, error text in the page</li>
              <li>• GPT-4o analysis of every page's content for issues, missing sections, empty states</li>
              <li>• Common API health endpoints (/api/health, /healthz, /status)</li>
            </ul>
            <p className="text-[11px] pt-1 border-t border-border/30 mt-2">
              Passwords are never stored — they're entered fresh each session and used only for that inspection run.
              For screenshots, switch to Browser (CLI) mode above.
            </p>
          </div>
        </>
      )}

      {/* ── CLI (BROWSER) MODE ─────────────────────────────────────────────────── */}
      {mode === "cli" && (
        <div className="space-y-5">
          {/* What's different banner */}
          <div className="flex gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
            <Monitor size={18} className="text-primary shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Real browser on your computer</p>
              <p className="text-muted-foreground text-xs">
                The CLI opens a visible Chromium window on your machine, logs into your app, clicks through every page,
                and captures full-page screenshots. JavaScript-rendered content, dropdowns, and modals all work.
                Results appear here automatically when the run finishes.
              </p>
            </div>
          </div>

          <CliReportPanel />
        </div>
      )}
    </div>
  );
}

// ── App form ──────────────────────────────────────────────────────────────────

function AppForm({ initial, onSave, onCancel }: {
  initial?: SavedApp;
  onSave: (app: SavedApp) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [loginUrl, setLoginUrl] = useState(initial?.loginUrl ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [usernameField, setUsernameField] = useState(initial?.usernameField ?? "username");
  const [passwordField, setPasswordField] = useState(initial?.passwordField ?? "password");
  const [loginMethod, setLoginMethod] = useState<"form" | "none">(initial?.loginMethod ?? "form");
  const [pages, setPages] = useState<string[]>(initial?.pages ?? []);
  const [newPage, setNewPage] = useState("");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [advanced, setAdvanced] = useState(false);

  const addPage = () => {
    const p = newPage.startsWith("/") ? newPage : `/${newPage}`;
    if (p !== "/" && !pages.includes(p)) setPages(prev => [...prev, p]);
    setNewPage("");
  };

  const submit = () => {
    if (!name.trim() || !url.trim()) return;
    onSave({
      id: initial?.id ?? `app_${Date.now()}`,
      name: name.trim(),
      url: url.trim().replace(/\/$/, ""),
      loginUrl: loginUrl.trim() || undefined,
      username: username.trim() || undefined,
      usernameField: usernameField.trim() || "username",
      passwordField: passwordField.trim() || "password",
      loginMethod,
      pages,
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="border border-primary/30 bg-primary/5 rounded-xl p-6 space-y-5">
      <h2 className="font-semibold">{initial ? "Edit app" : "Add an app to inspect"}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">App name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="My App" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">App URL</label>
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://myapp.com" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium">What does this app do? <span className="text-muted-foreground font-normal">(helps Forge know what to look for)</span></label>
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="A project management tool for small teams" />
      </div>

      {/* Login method */}
      <div className="space-y-2">
        <label className="text-xs font-medium">Login</label>
        <div className="flex gap-2">
          {(["form", "none"] as const).map(m => (
            <button key={m} onClick={() => setLoginMethod(m)}
              className={cn(
                "flex-1 py-2 rounded-lg border text-xs font-medium transition-all",
                loginMethod === m ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              )}>
              {m === "form" ? "🔐 Form login" : "🌐 No login needed"}
            </button>
          ))}
        </div>
      </div>

      {loginMethod === "form" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Username / email</label>
            <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Login page URL <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input value={loginUrl} onChange={e => setLoginUrl(e.target.value)} placeholder="/login — defaults to /login" />
          </div>
        </div>
      )}

      {/* Advanced */}
      {loginMethod === "form" && (
        <div>
          <button onClick={() => setAdvanced(v => !v)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            {advanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Advanced: custom field names
          </button>
          {advanced && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Username field name</label>
                <Input value={usernameField} onChange={e => setUsernameField(e.target.value)} placeholder="username" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Password field name</label>
                <Input value={passwordField} onChange={e => setPasswordField(e.target.value)} placeholder="password" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pages */}
      <div className="space-y-2">
        <label className="text-xs font-medium">Pages to inspect</label>
        <p className="text-[11px] text-muted-foreground">Forge always checks the homepage. Add any other paths.</p>
        <div className="flex gap-2">
          <Input
            value={newPage}
            onChange={e => setNewPage(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPage(); } }}
            placeholder="/dashboard, /settings, /api/orders"
            className="flex-1"
          />
          <Button variant="secondary" onClick={addPage} size="sm">Add</Button>
        </div>
        {pages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {pages.map(p => (
              <span key={p} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full font-mono">
                {p}
                <button onClick={() => setPages(prev => prev.filter(x => x !== p))} className="hover:text-destructive transition-colors ml-0.5">
                  <Trash2 size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button onClick={submit} disabled={!name.trim() || !url.trim()} className="flex-1">
          {initial ? "Save changes" : "Add app"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
