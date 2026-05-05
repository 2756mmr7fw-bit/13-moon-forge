import { useState, useRef, useEffect, useCallback } from "react";
import {
  ScanLine, Play, Loader2, CheckCircle2, AlertCircle, AlertTriangle,
  Info, ChevronDown, ChevronUp, Plus, Trash2, Globe, Lock, Eye, EyeOff,
  ArrowRight, Monitor, Terminal, Camera, RefreshCw, ExternalLink, X,
  Copy, Check, Share2, Bell, Clock, Zap, Shield, Activity, Wifi, Link,
  GitBranch, Smartphone, Tablet, Radio, BarChart2,
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

// ── Extended types ────────────────────────────────────────────────────────────

interface AxeViolation {
  id: string;
  impact: string;
  description: string;
  nodes: number;
  help: string;
  helpUrl?: string;
}

interface PerfMetrics {
  ttfb: number;
  domContentLoaded: number;
  loadTime: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
}

interface VisualDiff {
  page: string;
  viewport: string;
  changed: boolean;
  hash?: string;
  noBaseline?: boolean;
  baselineHash?: string;
}

interface TrendPoint {
  id: string;
  inspectedAt: string;
  errorCount: number;
  warnCount: number;
}

interface CustomAssertion {
  label: string;
  text?: string;
  selector?: string;
}

// ── Saved apps (localStorage + DB sync) ───────────────────────────────────────

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
  viewports?: string[];
  customAssertions?: CustomAssertion[];
}

function loadApps(): SavedApp[] {
  try { return JSON.parse(localStorage.getItem("forge:inspector:apps") ?? "[]") as SavedApp[]; }
  catch { return []; }
}
function saveApps(apps: SavedApp[]) {
  localStorage.setItem("forge:inspector:apps", JSON.stringify(apps));
}

// Sync localStorage apps to DB (runs once on mount)
async function syncAppsToDb(apps: SavedApp[]): Promise<void> {
  if (apps.length === 0) return;
  try {
    await fetch(`${API_BASE}/api/inspector/apps/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ apps }),
    });
  } catch { /* ignore — DB sync is best-effort */ }
}

async function dbSaveApp(app: SavedApp, isNew: boolean): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/inspector/apps${isNew ? "" : `/${app.id}`}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(app),
    });
  } catch { /* ignore */ }
}

async function dbDeleteApp(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/inspector/apps/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
  } catch { /* ignore */ }
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

// ── Trend sparkline ───────────────────────────────────────────────────────────

function TrendSparkline({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return null;
  const maxErr = Math.max(...points.map(p => p.errorCount), 1);
  const W = 80, H = 28, pad = 2;
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (W - pad * 2));
  const ys = points.map(p => H - pad - (p.errorCount / maxErr) * (H - pad * 2));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const lastErr = points[points.length - 1].errorCount;
  const color = lastErr === 0 ? "#10b981" : lastErr <= 3 ? "#f59e0b" : "#ef4444";

  return (
    <div title={`Last ${points.length} runs · latest: ${lastErr} error${lastErr !== 1 ? "s" : ""}`}>
      <svg width={W} height={H} className="opacity-70">
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.5" fill={color} />
      </svg>
    </div>
  );
}

// ── Share button ──────────────────────────────────────────────────────────────

function ShareButton({ reportId }: { reportId: string }) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/inspector/share/${reportId}`, {
        method: "POST", credentials: "include",
      });
      const d = await r.json();
      if (d.url) {
        setShareUrl(d.url);
        await navigator.clipboard.writeText(d.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  return (
    <button
      onClick={share}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
      title={shareUrl ? "Copy shareable link" : "Generate shareable link"}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : copied ? <Check size={12} className="text-emerald-400" /> : <Share2 size={12} />}
      {copied ? "Link copied!" : shareUrl ? "Copy link" : "Share"}
    </button>
  );
}

// ── Schedule / alert panel ────────────────────────────────────────────────────

function SchedulePanel({ appId, appName }: { appId: string; appName: string }) {
  const [open, setOpen] = useState(false);
  const [interval, setIntervalMin] = useState(60);
  const [email, setEmail] = useState("");
  const [slack, setSlack] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existing, setExisting] = useState<any | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch(`${API_BASE}/api/inspector/schedules`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const sched = d.schedules?.find((s: any) => s.appId === appId);
        if (sched) {
          setExisting(sched);
          setIntervalMin(sched.intervalMinutes);
          setEmail(sched.alertEmail ?? "");
          setSlack(sched.alertSlackWebhook ?? "");
          setEnabled(sched.enabled);
        }
      }).catch(() => {});
  }, [open, appId]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/inspector/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appId, intervalMinutes: interval, alertEmail: email || null, alertSlackWebhook: slack || null, enabled }),
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); }, 1500);
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const deleteSchedule = async () => {
    if (!existing) return;
    await fetch(`${API_BASE}/api/inspector/schedules/${existing.id}`, { method: "DELETE", credentials: "include" });
    setExisting(null);
    setOpen(false);
  };

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all",
          existing?.enabled
            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-400 hover:border-emerald-500/60"
            : "border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground"
        )}
        title="Configure scheduled monitoring"
      >
        <Clock size={12} />
        {existing?.enabled ? `Every ${existing.intervalMinutes}min` : "Schedule"}
      </button>

      {open && (
        <div className="mt-3 border border-border rounded-xl p-4 space-y-3 bg-card/50">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Monitoring schedule — {appName}</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Check every</label>
              <select
                value={interval}
                onChange={e => setIntervalMin(Number(e.target.value))}
                className="w-full text-xs rounded-lg border border-border bg-background px-2.5 py-2"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={360}>6 hours</option>
                <option value={720}>12 hours</option>
                <option value={1440}>24 hours</option>
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="rounded" />
                Enabled
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1.5"><Bell size={11} /> Alert email <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="text-xs" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1.5"><Radio size={11} /> Slack webhook URL <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input value={slack} onChange={e => setSlack(e.target.value)} placeholder="https://hooks.slack.com/services/..." className="text-xs" />
            <p className="text-[10px] text-muted-foreground">Paste an Incoming Webhook URL from your Slack app settings</p>
          </div>

          <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-2">
            Run <code className="font-mono bg-muted px-1 rounded">node forge.js monitor</code> on your computer to activate scheduled inspections.
          </p>

          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} size="sm" className="flex-1 text-xs">
              {saving ? <Loader2 size={12} className="animate-spin mr-1.5" /> : null}
              {saved ? "Saved ✓" : "Save schedule"}
            </Button>
            {existing && (
              <Button onClick={deleteSchedule} variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive">
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Diff badge ────────────────────────────────────────────────────────────────

function DiffBadge({ reportId }: { reportId: string }) {
  const [diff, setDiff] = useState<{ newErrors: number; fixed: number; persistent: number } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/inspector/diff/${reportId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.diff) setDiff(d.diff); })
      .catch(() => {});
  }, [reportId]);

  if (!diff || (diff.newErrors === 0 && diff.fixed === 0)) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {diff.newErrors > 0 && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
          +{diff.newErrors} new
        </span>
      )}
      {diff.fixed > 0 && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
          {diff.fixed} fixed ✓
        </span>
      )}
      {diff.persistent > 0 && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
          {diff.persistent} ongoing
        </span>
      )}
    </div>
  );
}

// ── Performance tab ───────────────────────────────────────────────────────────

function PerformanceTab({ metrics }: { metrics: Record<string, PerfMetrics> }) {
  const entries = Object.entries(metrics);
  if (entries.length === 0) return <p className="text-xs text-muted-foreground py-4 text-center">No performance data collected.</p>;

  const badge = (ms: number | undefined) => {
    if (ms === undefined || ms === null) return null;
    const color = ms < 1000 ? "text-emerald-400" : ms < 3000 ? "text-yellow-400" : "text-red-400";
    return <span className={cn("font-mono text-xs", color)}>{ms}ms</span>;
  };

  return (
    <div className="space-y-3">
      {entries.map(([page, m]) => (
        <div key={page} className="border border-border rounded-xl p-4 space-y-2">
          <code className="text-xs font-mono text-muted-foreground">{page}</code>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground">TTFB</p>
              {badge(m.ttfb)}
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground">FCP</p>
              {badge(m.firstContentfulPaint ?? undefined)}
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground">DOM Ready</p>
              {badge(m.domContentLoaded)}
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground">Load Time</p>
              {badge(m.loadTime)}
            </div>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", m.loadTime < 1000 ? "bg-emerald-500" : m.loadTime < 3000 ? "bg-yellow-500" : "bg-red-500")}
              style={{ width: `${Math.min(100, (m.loadTime / 5000) * 100)}%` }}
            />
          </div>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground">
        Targets: TTFB &lt;600ms · FCP &lt;1800ms · Load &lt;3000ms (Core Web Vitals guidance)
      </p>
    </div>
  );
}

// ── Accessibility tab ─────────────────────────────────────────────────────────

const IMPACT_COLOR: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  serious:  "text-orange-400 bg-orange-500/10 border-orange-500/20",
  moderate: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  minor:    "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

function AccessibilityTab({ violations }: { violations: Record<string, AxeViolation[]> }) {
  const entries = Object.entries(violations);
  const total = entries.reduce((s, [, v]) => s + v.length, 0);

  if (entries.length === 0) return (
    <div className="flex items-center gap-3 py-6 text-center justify-center">
      <Shield size={16} className="text-emerald-400" />
      <p className="text-sm text-emerald-400 font-medium">No WCAG violations found — fully accessible!</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{total} WCAG violation{total !== 1 ? "s" : ""} across {entries.length} page{entries.length !== 1 ? "s" : ""} · <a href="https://www.deque.com/axe/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Powered by axe-core</a></p>
      {entries.map(([page, viols]) => (
        <div key={page} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground"><code className="font-mono">{page}</code></p>
          {viols.map((v, i) => (
            <div key={i} className={cn("border rounded-lg px-3 py-2.5 text-xs space-y-1", IMPACT_COLOR[v.impact] ?? "border-border")}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{v.help}</span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-semibold uppercase shrink-0", IMPACT_COLOR[v.impact])}>{v.impact}</span>
              </div>
              <p className="text-muted-foreground">{v.description}</p>
              <p className="text-muted-foreground">{v.nodes} element{v.nodes !== 1 ? "s" : ""} affected</p>
              {v.helpUrl && (
                <a href={v.helpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Link size={10} /> Learn how to fix this
                </a>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Visual diff tab ───────────────────────────────────────────────────────────

function VisualTab({ diffs, screenshots, onApprove }: {
  diffs: VisualDiff[];
  screenshots: { page: string; viewport?: string; dataUrl: string; label: string }[];
  onApprove: (page: string, viewport: string, data: string) => Promise<void>;
}) {
  const [approving, setApproving] = useState<string | null>(null);
  const [approved, setApproved] = useState<Set<string>>(new Set());

  const changed = diffs.filter(d => d.changed);
  const noBaseline = diffs.filter(d => d.noBaseline);
  const matching = diffs.filter(d => !d.changed && !d.noBaseline);

  const getScreenshot = (page: string, vp: string) =>
    screenshots.find(s => s.page === page && (s.viewport ?? "desktop") === vp);

  const approve = async (page: string, viewport: string) => {
    const key = `${page}:${viewport}`;
    const ss = getScreenshot(page, viewport);
    if (!ss) return;
    setApproving(key);
    try {
      await onApprove(page, viewport, ss.dataUrl.split(",")[1] ?? ss.dataUrl);
      setApproved(prev => new Set([...prev, key]));
    } finally { setApproving(null); }
  };

  if (diffs.length === 0) return <p className="text-xs text-muted-foreground py-4 text-center">No visual comparison data.</p>;

  return (
    <div className="space-y-4">
      {changed.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-yellow-400 flex items-center gap-1.5"><AlertTriangle size={12} /> {changed.length} page{changed.length !== 1 ? "s" : ""} differ from baseline</p>
          {changed.map(d => {
            const key = `${d.page}:${d.viewport}`;
            const ss = getScreenshot(d.page, d.viewport);
            return (
              <div key={key} className="border border-yellow-500/20 rounded-xl p-3 space-y-2 bg-yellow-500/5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <code className="text-xs font-mono">{d.page}</code>
                    <span className="text-[10px] text-muted-foreground ml-2">{d.viewport}</span>
                  </div>
                  <button
                    onClick={() => approve(d.page, d.viewport)}
                    disabled={!!approving || approved.has(key)}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50"
                  >
                    {approved.has(key) ? "✓ Approved" : approving === key ? "Approving..." : "Approve new look"}
                  </button>
                </div>
                {ss && <img src={ss.dataUrl} alt={d.page} className="w-full h-28 object-cover object-top rounded-lg border border-border" />}
              </div>
            );
          })}
        </div>
      )}
      {noBaseline.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Camera size={12} /> {noBaseline.length} page{noBaseline.length !== 1 ? "s" : ""} have no baseline yet</p>
          {noBaseline.map(d => {
            const key = `${d.page}:${d.viewport}`;
            const ss = getScreenshot(d.page, d.viewport);
            return (
              <div key={key} className="border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <code className="text-xs font-mono">{d.page}</code>
                    <span className="text-[10px] text-muted-foreground ml-2">{d.viewport}</span>
                  </div>
                  <button
                    onClick={() => approve(d.page, d.viewport)}
                    disabled={!!approving || approved.has(key)}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50"
                  >
                    {approved.has(key) ? "✓ Set as baseline" : "Set as baseline"}
                  </button>
                </div>
                {ss && <img src={ss.dataUrl} alt={d.page} className="w-full h-24 object-cover object-top rounded-lg border border-border" />}
              </div>
            );
          })}
        </div>
      )}
      {matching.length > 0 && (
        <p className="text-xs text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={12} /> {matching.length} page{matching.length !== 1 ? "s" : ""} match baseline perfectly</p>
      )}
      <div className="text-[11px] text-muted-foreground border-t border-border/40 pt-3 space-y-1">
        <p>You can also set all baselines at once from the CLI:</p>
        <code className="font-mono bg-muted px-2 py-1 rounded block">node forge.js approve</code>
      </div>
    </div>
  );
}

// ── Network tab ───────────────────────────────────────────────────────────────

function NetworkTab({ failures, consoleErrors }: {
  failures: Array<{ url: string; status: number; page?: string }>;
  consoleErrors: Array<{ text: string; url?: string }>;
}) {
  const sigFailures = failures.filter(f => !f.url.includes("axe") && !f.url.includes("analytics"));

  return (
    <div className="space-y-4">
      {sigFailures.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium flex items-center gap-1.5"><Wifi size={12} className="text-red-400" /> {sigFailures.length} failed network request{sigFailures.length !== 1 ? "s" : ""}</p>
          {sigFailures.map((f, i) => (
            <div key={i} className="border border-red-500/20 bg-red-500/5 rounded-lg px-3 py-2 text-xs space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-red-400 font-semibold">{f.status}</span>
                <span className="text-muted-foreground truncate">{f.url}</span>
              </div>
              {f.page && <p className="text-[10px] text-muted-foreground">on page: {f.page}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={12} /> No failed network requests</p>
      )}

      {consoleErrors.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium flex items-center gap-1.5"><Terminal size={12} className="text-yellow-400" /> {consoleErrors.length} console error{consoleErrors.length !== 1 ? "s" : ""}</p>
          {consoleErrors.slice(0, 10).map((e, i) => (
            <div key={i} className="border border-yellow-500/20 bg-yellow-500/5 rounded-lg px-3 py-2 text-xs">
              <p className="font-mono text-muted-foreground break-all">{e.text.slice(0, 200)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={12} /> No console errors</p>
      )}
    </div>
  );
}

// ── CI generator panel ────────────────────────────────────────────────────────

function CiGeneratorButton({ appName }: { appName?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const cmd = `node forge.js generate-workflow${appName ? ` "${appName}"` : ""}`;

  const copy = async () => {
    await navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
      >
        <GitBranch size={12} /> CI/CD
      </button>

      {open && (
        <div className="mt-3 border border-border rounded-xl p-4 space-y-3 bg-card/50">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-2"><GitBranch size={14} /> GitHub Actions CI</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
          </div>
          <p className="text-xs text-muted-foreground">Generate a GitHub Actions workflow that runs Forge Inspector on every push and fails the build if errors are found.</p>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Run this in your project folder:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-xs font-mono">{cmd}</code>
              <button onClick={copy} className="shrink-0 p-2 rounded-lg border border-border hover:bg-muted transition-colors">
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1 border-t border-border/40 pt-3">
            <p>This creates <code className="font-mono bg-muted px-1 rounded">.github/workflows/forge-inspector.yml</code></p>
            <p>Then add <code className="font-mono bg-muted px-1 rounded">FORGE_TOKEN</code> to your GitHub repo secrets.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Extended report type (DB-backed) ─────────────────────────────────────────

interface DbReport extends CliReport {
  id: string;
  quillDoc?: string;
  recheckOf?: string;
  shareId?: string;
  consoleErrors?: Array<{ text: string; url?: string; ts?: number }>;
  networkFailures?: Array<{ url: string; status: number; page?: string }>;
  performanceMetrics?: Record<string, PerfMetrics>;
  accessibilityViolations?: Record<string, AxeViolation[]>;
  visualDiffs?: VisualDiff[];
  diffData?: { newErrors: number; fixed: number; persistent: number };
}

// ── CLI report panel ──────────────────────────────────────────────────────────

type ReportTab = "findings" | "perf" | "a11y" | "visual" | "network";

function CliReportPanel() {
  const [report, setReport] = useState<DbReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [polling, setPolling] = useState(false);
  const [quillOpen, setQuillOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTab>("findings");

  const fetchReport = useCallback(async () => {
    try {
      // Try new DB-backed endpoint first
      const res = await fetch(`${API_BASE}/api/inspector/reports`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.reports?.length > 0) {
          const latest = data.reports[0];
          // Fetch full report details
          const fullRes = await fetch(`${API_BASE}/api/inspector/reports/${latest.id}`, { credentials: "include" });
          if (fullRes.ok) {
            const fullData = await fullRes.json();
            setReport(fullData.report as DbReport);
            setLastChecked(new Date());
            setLoading(false);
            return;
          }
        }
      }
      // Fallback to old in-memory endpoint
      const fallback = await fetch(`${API_BASE}/api/agent/cli-inspect/latest`, { credentials: "include" });
      const data = await fallback.json();
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
              <p className="text-xs text-muted-foreground mb-1.5">2. Inspect by name (uses your saved apps above)</p>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs space-y-1">
                <div>node forge.js inspect</div>
                <div className="text-muted-foreground/60 text-[10px]">— shows a numbered menu of your saved apps</div>
                <div className="pt-1">node forge.js inspect "My App, Blog, Store"</div>
                <div className="text-muted-foreground/60 text-[10px]">— inspects all three in sequence, Quill documents each one</div>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5">3. After fixing issues, recheck</p>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs">
                node forge.js recheck
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">Re-runs only pages that had errors or warnings. Marks what's now passing.</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5">4. Paste your token when prompted</p>
              <div className="flex items-center gap-2">
                <CliTokenButton />
                <span className="text-xs text-muted-foreground">— or get it at /get-forge</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 space-y-1 text-xs text-muted-foreground">
            <p>On first run: Forge installs a browser (~200MB, one-time) into <code className="font-mono bg-muted px-1 rounded">~/.forge-playwright/</code></p>
            <p>Screenshots and Quill's issue doc appear here automatically when the run completes.</p>
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
          {report.id && <ShareButton reportId={report.id} />}
          <button onClick={refresh} disabled={polling} title="Check for newer reports" className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={14} className={cn(polling && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Diff badges (new/fixed/persistent vs previous run) */}
      {report.id && <DiffBadge reportId={report.id} />}

      {/* Quill doc */}
      {(report as DbReport).quillDoc && (
        <div className="border border-sky-500/20 bg-sky-500/5 rounded-xl overflow-hidden">
          <button
            onClick={() => setQuillOpen(v => !v)}
            className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-sky-500/5 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-sky-500/15 flex items-center justify-center">
                <Terminal size={12} className="text-sky-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-sky-300">Quill's Issue Report</p>
                <p className="text-[11px] text-muted-foreground">AI-written analysis of every finding</p>
              </div>
            </div>
            {quillOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </button>
          {quillOpen && (
            <div className="px-4 pb-4">
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed font-sans border border-border/40 rounded-lg p-4 bg-background/50">
                {(report as DbReport).quillDoc}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Report tab bar */}
      {(() => {
        const hasPerfData = report.performanceMetrics && Object.keys(report.performanceMetrics).length > 0;
        const hasA11yData = report.accessibilityViolations !== undefined;
        const hasVisualData = report.visualDiffs && report.visualDiffs.length > 0;
        const hasNetData = (report.networkFailures && report.networkFailures.length > 0) || (report.consoleErrors && report.consoleErrors.length > 0);
        const tabs: Array<{ id: ReportTab; label: string; icon: React.ReactNode; count?: number }> = [
          { id: "findings", label: "Findings", icon: <ScanLine size={12} />, count: findings.length },
          ...(hasPerfData ? [{ id: "perf" as ReportTab, label: "Performance", icon: <Activity size={12} /> }] : []),
          ...(hasA11yData ? [{ id: "a11y" as ReportTab, label: "Accessibility", icon: <Shield size={12} />, count: Object.values(report.accessibilityViolations ?? {}).flat().length }] : []),
          ...(hasVisualData ? [{ id: "visual" as ReportTab, label: "Visual", icon: <Camera size={12} />, count: report.visualDiffs?.filter(d => d.changed).length }] : []),
          ...(hasNetData ? [{ id: "network" as ReportTab, label: "Network", icon: <Wifi size={12} />, count: report.networkFailures?.length }] : []),
        ];
        if (tabs.length <= 1) return null;
        return (
          <div className="flex gap-1 p-1 bg-muted/40 rounded-xl overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                    tab.id === "a11y" || tab.id === "visual" ? "bg-yellow-500/20 text-yellow-400" :
                    tab.id === "network" ? "bg-red-500/20 text-red-400" : "bg-muted text-muted-foreground"
                  )}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Screenshots (always shown above tabbed content) */}
      {report.screenshots.length > 0 && activeTab === "findings" && (
        <div className="border border-border rounded-xl p-5">
          <ScreenshotGallery screenshots={report.screenshots} />
        </div>
      )}

      {/* Tab content */}
      {activeTab === "findings" && (
        <div className="space-y-1.5">
          {findings.map((f, i) => (
            <FindingRow key={i} finding={{ ...f, ts: 0 }} />
          ))}
        </div>
      )}

      {activeTab === "perf" && report.performanceMetrics && (
        <div className="border border-border rounded-xl p-5">
          <PerformanceTab metrics={report.performanceMetrics} />
        </div>
      )}

      {activeTab === "a11y" && (
        <div className="border border-border rounded-xl p-5">
          <AccessibilityTab violations={report.accessibilityViolations ?? {}} />
        </div>
      )}

      {activeTab === "visual" && report.visualDiffs && (
        <div className="border border-border rounded-xl p-5">
          <VisualTab
            diffs={report.visualDiffs}
            screenshots={report.screenshots.map(s => ({ ...s, viewport: "desktop" }))}
            onApprove={async (page, viewport, data) => {
              const appId = (report as any).appId;
              if (!appId) return;
              await fetch(`${API_BASE}/api/inspector/baselines`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ appId, page, viewport, screenshotData: data }),
              });
            }}
          />
        </div>
      )}

      {activeTab === "network" && (
        <div className="border border-border rounded-xl p-5">
          <NetworkTab
            failures={report.networkFailures ?? []}
            consoleErrors={report.consoleErrors ?? []}
          />
        </div>
      )}

      {/* Recheck / run again */}
      <div className="border border-border/40 rounded-xl p-4 text-xs text-muted-foreground space-y-1.5">
        {(report.errorCount > 0 || report.warnCount > 0) ? (
          <>
            <p className="font-medium text-foreground text-sm">After fixing — run recheck</p>
            <div className="bg-muted/50 rounded-lg p-2.5 font-mono text-[11px]">
              node forge.js recheck
            </div>
            <p>Forge re-inspects only the pages that had issues, marks what's now passing.</p>
          </>
        ) : (
          <>
            <p className="font-medium text-foreground text-sm">Run again</p>
            <div className="bg-muted/50 rounded-lg p-2.5 font-mono text-[11px]">
              node forge.js inspect "{report.appName}"
            </div>
            <p>This page auto-refreshes every 30 seconds while open.</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── App card ──────────────────────────────────────────────────────────────────

function AppCard({
  app, runningId, passwords, showPasswords,
  setPasswords, setShowPasswords, onEdit, onDelete, onRun,
}: {
  app: SavedApp;
  runningId: string | null;
  passwords: Record<string, string>;
  showPasswords: Record<string, boolean>;
  setPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setShowPasswords: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onEdit: () => void;
  onDelete: () => void;
  onRun: () => void;
}) {
  const [trend, setTrend] = useState<TrendPoint[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/inspector/trends/${encodeURIComponent(app.id)}?limit=10`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.trends) setTrend(d.trends); })
      .catch(() => {});
  }, [app.id]);

  return (
    <div className="border border-border rounded-xl p-5 bg-card/30 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="font-semibold">{app.name}</h3>
            {app.loginMethod === "form" && app.username && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">
                <Lock size={9} /> {app.username}
              </span>
            )}
            {app.viewports && app.viewports.length > 1 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">
                <Monitor size={9} /> {app.viewports.join(", ")}
              </span>
            )}
            {trend.length >= 2 && <TrendSparkline points={trend} />}
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
          <Button variant="ghost" size="sm" onClick={onEdit} className="text-xs text-muted-foreground">Edit</Button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors">
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
          <Button onClick={onRun} disabled={!!runningId || !passwords[app.id]} className="gap-2">
            {runningId === app.id
              ? <><Loader2 size={14} className="animate-spin" /> Inspecting...</>
              : <><Play size={14} /> Run</>}
          </Button>
        </div>
      )}
      {app.loginMethod === "none" && (
        <Button onClick={onRun} disabled={!!runningId} className="gap-2">
          {runningId === app.id
            ? <><Loader2 size={14} className="animate-spin" /> Inspecting...</>
            : <><Play size={14} /> Run inspection</>}
        </Button>
      )}

      {/* Bottom toolbar */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/30">
        <SchedulePanel appId={app.id} appName={app.name} />
        <CiGeneratorButton appName={app.name} />
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
          <Terminal size={11} />
          <code className="font-mono bg-muted px-1.5 py-0.5 rounded">
            node forge.js inspect "{app.name}"
          </code>
        </span>
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

  // Sync existing localStorage apps to DB on first mount
  useEffect(() => {
    const existing = loadApps();
    if (existing.length > 0) syncAppsToDb(existing);
  }, []);

  const deleteApp = (id: string) => {
    const next = apps.filter(a => a.id !== id);
    saveApps(next);
    setApps(next);
    dbDeleteApp(id);
  };

  const saveApp = (app: SavedApp) => {
    const existing = apps.find(a => a.id === app.id);
    const isNew = !existing;
    const next = existing ? apps.map(a => a.id === app.id ? app : a) : [app, ...apps];
    saveApps(next);
    setApps(next);
    setEditingApp(null);
    setAddingApp(false);
    dbSaveApp(app, isNew);
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
                <AppCard
                  key={app.id}
                  app={app}
                  runningId={runningId}
                  passwords={passwords}
                  showPasswords={showPasswords}
                  setPasswords={setPasswords}
                  setShowPasswords={setShowPasswords}
                  onEdit={() => { setEditingApp(app); setAddingApp(false); }}
                  onDelete={() => deleteApp(app.id)}
                  onRun={() => void runInspection(app)}
                />
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

const ALL_VIEWPORTS = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone },
] as const;

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
  const [viewports, setViewports] = useState<string[]>(initial?.viewports ?? ["desktop"]);
  const [assertions, setAssertions] = useState<CustomAssertion[]>(initial?.customAssertions ?? []);
  const [newAssertLabel, setNewAssertLabel] = useState("");
  const [newAssertText, setNewAssertText] = useState("");

  const addPage = () => {
    const p = newPage.startsWith("/") ? newPage : `/${newPage}`;
    if (p !== "/" && !pages.includes(p)) setPages(prev => [...prev, p]);
    setNewPage("");
  };

  const toggleViewport = (vp: string) => {
    setViewports(prev =>
      prev.includes(vp) ? (prev.length > 1 ? prev.filter(v => v !== vp) : prev) : [...prev, vp]
    );
  };

  const addAssertion = () => {
    if (!newAssertLabel.trim() || !newAssertText.trim()) return;
    setAssertions(prev => [...prev, { label: newAssertLabel.trim(), text: newAssertText.trim() }]);
    setNewAssertLabel("");
    setNewAssertText("");
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
      viewports,
      customAssertions: assertions.length > 0 ? assertions : undefined,
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

      {/* Viewports (for CLI / browser inspections) */}
      <div className="space-y-2">
        <label className="text-xs font-medium flex items-center gap-1.5">
          <Monitor size={12} /> Viewports to capture
          <span className="text-muted-foreground font-normal">(CLI browser mode only)</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {ALL_VIEWPORTS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => toggleViewport(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                viewports.includes(id)
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Desktop = 1280×720 · Tablet = 768×1024 · Mobile = 390×844
        </p>
      </div>

      {/* Custom assertions */}
      <div className="space-y-2">
        <label className="text-xs font-medium flex items-center gap-1.5">
          <Zap size={12} /> Custom text assertions
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <p className="text-[11px] text-muted-foreground">
          Forge will fail if any of these strings are missing from the page.
        </p>
        <div className="flex gap-2">
          <Input
            value={newAssertLabel}
            onChange={e => setNewAssertLabel(e.target.value)}
            placeholder='Label (e.g. "Shows dashboard")'
            className="flex-1 text-xs"
          />
          <Input
            value={newAssertText}
            onChange={e => setNewAssertText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addAssertion(); } }}
            placeholder='Text to find (e.g. "Welcome back")'
            className="flex-1 text-xs"
          />
          <Button variant="secondary" onClick={addAssertion} size="sm" disabled={!newAssertLabel.trim() || !newAssertText.trim()}>Add</Button>
        </div>
        {assertions.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {assertions.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
                <span className="font-medium flex-shrink-0">{a.label}:</span>
                <code className="font-mono text-muted-foreground flex-1 truncate">{a.text}</code>
                <button onClick={() => setAssertions(prev => prev.filter((_, j) => j !== i))} className="hover:text-destructive shrink-0">
                  <Trash2 size={11} />
                </button>
              </div>
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
