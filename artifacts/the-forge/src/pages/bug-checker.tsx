import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Bug, Loader2, AlertTriangle, AlertCircle, Info, CheckCircle2,
  ChevronDown, ChevronUp, RefreshCw, Copy, Check, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const LANGUAGES = [
  "auto-detect", "javascript", "typescript", "python", "rust", "go",
  "java", "c", "c++", "c#", "ruby", "php", "swift", "kotlin", "sql", "bash",
];

type Severity = "critical" | "high" | "medium" | "low" | "info";

interface BugItem {
  id: string;
  severity: Severity;
  type: string;
  title: string;
  description: string;
  line: number | null;
  fix: string;
}

interface AnalysisResult {
  language: string;
  summary: string;
  score: number;
  bugs: BugItem[];
}

const SEVERITY_CONFIG: Record<Severity, { label: string; icon: React.ComponentType<any>; color: string; bg: string; border: string }> = {
  critical: { label: "Critical", icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  high:     { label: "High",     icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  medium:   { label: "Medium",   icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  low:      { label: "Low",      icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  info:     { label: "Info",     icon: Info, color: "text-muted-foreground", bg: "bg-muted/30", border: "border-border" },
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="-rotate-90" width="96" height="96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>{score}</span>
        <span className="text-[10px] text-muted-foreground -mt-0.5">score</span>
      </div>
    </div>
  );
}

function BugCard({ bug }: { bug: BugItem }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const cfg = SEVERITY_CONFIG[bug.severity] ?? SEVERITY_CONFIG.info;
  const Icon = cfg.icon;

  function copyFix() {
    navigator.clipboard.writeText(bug.fix).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={cn("rounded-xl border overflow-hidden", cfg.border, cfg.bg)}>
      <button
        className="w-full text-left p-4 flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <Icon size={16} className={cn("shrink-0 mt-0.5", cfg.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{bug.title}</span>
            <Badge variant="outline" className={cn("text-[10px] py-0 h-4", cfg.color, cfg.border)}>
              {cfg.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5 font-mono">
              {bug.type}
            </span>
            {bug.line && (
              <span className="text-[10px] text-muted-foreground">Line {bug.line}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bug.description}</p>
        </div>
        {expanded ? <ChevronUp size={14} className="shrink-0 mt-1 text-muted-foreground" /> : <ChevronDown size={14} className="shrink-0 mt-1 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{bug.description}</p>
          </div>
          {bug.fix && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suggested Fix</p>
                <button
                  onClick={copyFix}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="text-xs bg-background/60 rounded-lg border border-border/50 p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                {bug.fix}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BugChecker() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("auto-detect");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [filter, setFilter] = useState<Severity | "all">("all");

  const analyzeMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API_BASE}/api/bug-checker/analyze`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, context }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error ?? "Analysis failed");
      }
      return r.json() as Promise<AnalysisResult>;
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err) => {
      toast({ title: "Analysis failed", description: (err as Error).message, variant: "destructive" });
    },
  });

  const severityCounts: Record<string, number> = {};
  if (result) {
    for (const b of result.bugs) {
      severityCounts[b.severity] = (severityCounts[b.severity] ?? 0) + 1;
    }
  }

  const filteredBugs = result?.bugs.filter(b => filter === "all" || b.severity === filter) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
          <Bug size={22} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Bug Checker</h1>
          <p className="text-sm text-muted-foreground">Paste your code and get an instant AI-powered bug analysis</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card space-y-4 p-5">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Language</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {LANGUAGES.map(l => (
                <option key={l} value={l}>{l === "auto-detect" ? "Auto-detect" : l}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Context (optional)</label>
            <input
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="e.g. production API handler, React component..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Code <span className="text-muted-foreground/50">({code.length.toLocaleString()} / 50,000 chars)</span>
          </label>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Paste your code here..."
            rows={16}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y leading-relaxed"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => analyzeMut.mutate()}
            disabled={!code.trim() || analyzeMut.isPending}
            className="gap-2"
          >
            {analyzeMut.isPending ? (
              <><Loader2 size={15} className="animate-spin" /> Analyzing...</>
            ) : (
              <><Zap size={15} /> Analyze Code</>
            )}
          </Button>
          {result && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setResult(null); setCode(""); setContext(""); }}
              className="text-muted-foreground gap-1.5"
            >
              <RefreshCw size={13} /> Clear
            </Button>
          )}
        </div>
      </div>

      {result && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-6 flex-wrap">
              <ScoreRing score={result.score} />
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Language</span>
                  <Badge variant="outline" className="text-xs">{result.language}</Badge>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{result.summary}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {(["critical", "high", "medium", "low", "info"] as Severity[]).map(s => {
                    const count = severityCounts[s] ?? 0;
                    if (count === 0) return null;
                    const cfg = SEVERITY_CONFIG[s];
                    return (
                      <span key={s} className={cn("text-xs rounded-full px-2.5 py-0.5 font-medium border", cfg.color, cfg.bg, cfg.border)}>
                        {count} {cfg.label}
                      </span>
                    );
                  })}
                  {result.bugs.length === 0 && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={13} /> No issues found
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {result.bugs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">{result.bugs.length} Issue{result.bugs.length !== 1 ? "s" : ""}</span>
                <div className="flex gap-1 ml-auto">
                  {(["all", "critical", "high", "medium", "low", "info"] as const).map(s => {
                    const count = s === "all" ? result.bugs.length : (severityCounts[s] ?? 0);
                    if (s !== "all" && count === 0) return null;
                    return (
                      <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-full border transition-colors capitalize",
                          filter === s
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {s} {count > 0 && s !== "all" && `(${count})`}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2.5">
                {filteredBugs.map(bug => <BugCard key={bug.id} bug={bug} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
