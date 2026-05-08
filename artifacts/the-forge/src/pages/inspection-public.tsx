import { useEffect, useState } from "react";
import { useParams } from "wouter";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  ShieldCheck,
  Zap,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

interface Finding {
  type: string;
  message: string;
  page?: string | null;
  detail?: string | null;
}

interface PerfMetrics {
  ttfb?: number | null;
  domContentLoaded?: number | null;
  loadTime?: number | null;
  firstPaint?: number | null;
  firstContentfulPaint?: number | null;
}

interface AxeViolation {
  id: string;
  impact?: string | null;
  description?: string;
  nodes?: number;
  help?: string;
}

interface PublicReport {
  id: string;
  shareId: string;
  appName: string;
  appUrl?: string | null;
  pagesChecked: number;
  errorCount: number;
  warnCount: number;
  inspectedAt: string;
  environment?: string | null;
  buildSha?: string | null;
  quillDoc?: string | null;
  findings?: Finding[];
  performanceMetrics?: Record<string, PerfMetrics>;
  accessibilityViolations?: Record<string, AxeViolation[]>;
}

function FindingRow({ f }: { f: Finding }) {
  const isError = f.type === "error";
  const isWarn = f.type === "warn";
  const isOk = f.type === "ok";

  return (
    <div
      className={cn(
        "flex gap-2.5 px-3 py-2.5 rounded-lg border text-sm",
        isError && "border-red-500/20 bg-red-500/5",
        isWarn && "border-yellow-500/20 bg-yellow-500/5",
        isOk && "border-emerald-500/20 bg-emerald-500/5",
        !isError && !isWarn && !isOk && "border-border bg-muted/30"
      )}
    >
      <div className="shrink-0 mt-0.5">
        {isError && <AlertCircle size={13} className="text-red-400" />}
        {isWarn && <AlertTriangle size={13} className="text-yellow-400" />}
        {isOk && <CheckCircle2 size={13} className="text-emerald-400" />}
        {!isError && !isWarn && !isOk && <div className="w-3 h-3 rounded-full bg-muted-foreground/30 mt-0.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {f.page && (
            <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
              {f.page}
            </code>
          )}
          <span className="text-sm leading-snug">{f.message}</span>
        </div>
        {f.detail && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{f.detail}</p>
        )}
      </div>
    </div>
  );
}

export default function InspectionPublicPage() {
  const params = useParams<{ shareId: string }>();
  const shareId = params.shareId;

  const [report, setReport] = useState<PublicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quillOpen, setQuillOpen] = useState(true);

  useEffect(() => {
    if (!shareId) return;
    setLoading(true);
    fetch(`${API_BASE}/api/inspection/public/${encodeURIComponent(shareId)}`)
      .then(async r => {
        if (r.status === 404) { setNotFound(true); return; }
        const d = await r.json();
        if (d.report) setReport(d.report);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <ShieldCheck size={24} className="text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-lg">Report not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            This share link may have expired or never existed.
          </p>
        </div>
        <a
          href="https://13moonforge.ai"
          className="text-sm text-primary hover:underline"
        >
          Go to 13 Moon Forge
        </a>
      </div>
    );
  }

  const findings = report.findings ?? [];
  const errors = findings.filter(f => f.type === "error");
  const warns = findings.filter(f => f.type === "warn");
  const oks = findings.filter(f => f.type === "ok");
  const health = Math.max(0, 100 - report.errorCount * 20 - report.warnCount * 5);
  const healthColor = health >= 90 ? "text-emerald-400" : health >= 60 ? "text-yellow-400" : "text-red-400";
  const healthBg = health >= 90 ? "bg-emerald-500/10 border-emerald-500/20" : health >= 60 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20";

  const perfPages = Object.entries(report.performanceMetrics ?? {});
  const a11yPages = Object.entries(report.accessibilityViolations ?? {});
  const totalA11y = a11yPages.reduce((s, [, v]) => s + v.length, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <ShieldCheck size={14} className="text-primary" />
            </div>
            <span className="text-sm font-semibold">Forge Inspector</span>
            <span className="text-muted-foreground/50 text-xs hidden sm:block">Shared Report</span>
          </div>
          <a
            href="https://13moonforge.ai/app-inspector"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            Open in Forge <ExternalLink size={11} />
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header card */}
        <div className="border border-border rounded-2xl p-6 bg-card space-y-4">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{report.appName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {report.appUrl && (
                  <a
                    href={report.appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <Globe size={10} />
                    {report.appUrl}
                  </a>
                )}
                {report.environment && report.environment !== "production" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium border border-blue-500/20">
                    {report.environment}
                  </span>
                )}
                {report.buildSha && (
                  <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    {report.buildSha.slice(0, 7)}
                  </code>
                )}
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Clock size={11} />
                <span>{new Date(report.inspectedAt).toLocaleString()}</span>
                <span className="mx-1 text-muted-foreground/30">·</span>
                <span>{report.pagesChecked} page{report.pagesChecked !== 1 ? "s" : ""}</span>
              </div>
            </div>

            {/* Health score */}
            <div className={cn("rounded-xl border px-5 py-3 text-center shrink-0", healthBg)}>
              <p className={cn("text-3xl font-bold tabular-nums", healthColor)}>{health}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Health Score</p>
            </div>
          </div>

          {/* Summary pills */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
            {report.errorCount > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full">
                <AlertCircle size={13} />
                {report.errorCount} error{report.errorCount !== 1 ? "s" : ""}
              </span>
            )}
            {report.warnCount > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-full">
                <AlertTriangle size={13} />
                {report.warnCount} warning{report.warnCount !== 1 ? "s" : ""}
              </span>
            )}
            {oks.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                <CheckCircle2 size={13} />
                {oks.length} passed
              </span>
            )}
            {report.errorCount === 0 && report.warnCount === 0 && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full font-medium">
                <CheckCircle2 size={13} />
                All clear — no issues found
              </span>
            )}
            {perfPages.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 border border-border px-3 py-1.5 rounded-full">
                <Zap size={13} />
                {perfPages.length} page{perfPages.length !== 1 ? "s" : ""} timed
              </span>
            )}
            {totalA11y > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 border border-border px-3 py-1.5 rounded-full">
                ♿ {totalA11y} a11y issue{totalA11y !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Quill doc */}
        {report.quillDoc && (
          <div className="border border-sky-500/20 bg-sky-500/5 rounded-2xl overflow-hidden">
            <button
              onClick={() => setQuillOpen(v => !v)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-sky-500/5 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-sky-500/15 flex items-center justify-center">
                  <span className="text-[13px]">✨</span>
                </div>
                <span className="text-sm font-semibold text-sky-300">Quill's Summary</span>
              </div>
              <span className="text-xs text-muted-foreground">{quillOpen ? "collapse" : "expand"}</span>
            </button>
            {quillOpen && (
              <div className="px-5 pb-5">
                <pre className="text-[13px] leading-relaxed whitespace-pre-wrap text-sky-100/80 font-sans">
                  {report.quillDoc}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Performance */}
        {perfPages.length > 0 && (
          <div className="border border-border rounded-2xl bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50 flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" />
              <h2 className="text-sm font-semibold">Performance</h2>
            </div>
            <div className="divide-y divide-border/40">
              {perfPages.map(([page, m]) => {
                const slow = (m.loadTime ?? 0) > 3000;
                return (
                  <div key={page} className="px-5 py-3 flex items-center gap-4 flex-wrap">
                    <code className="text-xs font-mono text-muted-foreground flex-1 min-w-0 truncate">{page}</code>
                    <div className="flex gap-3 text-xs shrink-0">
                      {m.ttfb != null && (
                        <span className={cn(m.ttfb > 800 ? "text-yellow-400" : "text-muted-foreground")}>
                          TTFB {m.ttfb}ms
                        </span>
                      )}
                      {m.firstContentfulPaint != null && (
                        <span className="text-muted-foreground">FCP {m.firstContentfulPaint}ms</span>
                      )}
                      {m.loadTime != null && (
                        <span className={cn("font-medium", slow ? "text-yellow-400" : "text-emerald-400")}>
                          Load {m.loadTime}ms
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Accessibility */}
        {totalA11y > 0 && (
          <div className="border border-border rounded-2xl bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50 flex items-center gap-2">
              <span className="text-sm">♿</span>
              <h2 className="text-sm font-semibold">Accessibility</h2>
              <span className="ml-auto text-xs text-muted-foreground">{totalA11y} violation{totalA11y !== 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-border/40">
              {a11yPages.map(([page, violations]) => (
                <div key={page} className="px-5 py-3 space-y-1.5">
                  <code className="text-xs font-mono text-muted-foreground">{page}</code>
                  {violations.map((v, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className={cn(
                        "shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border",
                        v.impact === "critical" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                        v.impact === "serious" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" :
                        "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                      )}>
                        {v.impact ?? "minor"}
                      </span>
                      <span className="text-muted-foreground leading-snug">{v.help ?? v.description}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Findings */}
        {findings.length > 0 && (
          <div className="border border-border rounded-2xl bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Findings</h2>
              <span className="text-xs text-muted-foreground">{findings.length} total</span>
            </div>
            <div className="p-4 space-y-1.5">
              {/* Errors first */}
              {errors.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-red-400/70 uppercase tracking-wide px-1 pt-1">
                    Errors ({errors.length})
                  </p>
                  {errors.map((f, i) => <FindingRow key={i} f={f} />)}
                </div>
              )}
              {warns.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-yellow-400/70 uppercase tracking-wide px-1 pt-2">
                    Warnings ({warns.length})
                  </p>
                  {warns.map((f, i) => <FindingRow key={i} f={f} />)}
                </div>
              )}
              {oks.length > 0 && (
                <details className="group">
                  <summary className="text-[11px] font-medium text-emerald-400/70 uppercase tracking-wide px-1 pt-2 cursor-pointer list-none flex items-center gap-1.5">
                    <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                    Passed ({oks.length})
                  </summary>
                  <div className="space-y-1.5 mt-1.5">
                    {oks.map((f, i) => <FindingRow key={i} f={f} />)}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-xs text-muted-foreground/50">
            Generated by{" "}
            <a href="https://13moonforge.ai" className="hover:text-muted-foreground transition-colors">
              13 Moon Forge Inspector
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
