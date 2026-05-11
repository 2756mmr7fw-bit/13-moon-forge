import { useState } from "react";
import { Search, TrendingUp, Newspaper, Star, Zap, ArrowRight, RotateCcw, ChevronRight, AlertTriangle, CheckCircle2, Lightbulb, Target, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Step = "input" | "scanning" | "results";

interface FixPlanItem {
  title: string;
  action: string;
  priority: "High" | "Medium" | "Low";
  effort: string;
}

interface Analysis {
  score: number;
  searchPresence: { score: number; status: string; summary: string };
  newsCoverage: { status: string; summary: string; topics: string[] };
  customerSentiment: { status: string; summary: string; sources: string[] };
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  fixPlan: FixPlanItem[];
}

function ScoreRing({ score }: { score: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center w-28 h-28">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold" style={{ color }}>{score}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Score</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "Strong" || status === "Positive" ? "bg-green-500/15 text-green-400 border-green-500/20" :
    status === "Mixed" || status === "Neutral" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" :
    "bg-red-500/15 text-red-400 border-red-500/20";
  return <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", color)}>{status}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const color =
    priority === "High" ? "bg-red-500/15 text-red-400" :
    priority === "Medium" ? "bg-amber-500/15 text-amber-400" :
    "bg-blue-500/15 text-blue-400";
  return <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide", color)}>{priority}</span>;
}

export default function BrandScout() {
  const [step, setStep] = useState<Step>("input");
  const [domain, setDomain] = useState("");
  const [brandName, setBrandName] = useState("");
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<"overview" | "swot" | "plan">("overview");
  const [, navigate] = useLocation();

  async function runAnalysis() {
    if (!brandName.trim() && !domain.trim()) {
      setError("Enter your brand name or domain to continue.");
      return;
    }
    setError("");
    setStep("scanning");

    try {
      const res = await fetch(`${API_BASE}/api/brand-scout/analyze`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), brandName: brandName.trim(), description: description.trim() }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json() as Analysis;
      setAnalysis(data);
      setStep("results");
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("input");
    }
  }

  function reset() {
    setStep("input");
    setAnalysis(null);
    setError("");
    setActiveSection("overview");
  }

  if (step === "input") {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold mb-2">
            <Search size={12} />
            Forge Brand Scout
          </div>
          <h1 className="text-2xl font-bold">How visible is your brand?</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter your brand below and Forge scans your search presence, news coverage, and online reputation — then tells you exactly what to fix.
          </p>
        </div>

        <div className="space-y-4 bg-card border border-border rounded-xl p-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Brand Name *</label>
            <Input
              placeholder="e.g. 13 Moon Forge"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && runAnalysis()}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Website / Domain</label>
            <Input
              placeholder="e.g. 13moonforge.com"
              value={domain}
              onChange={e => setDomain(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What do you do? <span className="text-muted-foreground/50 font-normal">(optional)</span></label>
            <Textarea
              placeholder="Briefly describe your business or product..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button className="w-full" size="lg" onClick={runAnalysis}>
            Scan My Brand <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: Search, label: "Search Presence" },
            { icon: Newspaper, label: "News Coverage" },
            { icon: Star, label: "Brand Sentiment" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="bg-muted/30 border border-border rounded-lg p-3 space-y-1.5">
              <Icon size={16} className="mx-auto text-primary" />
              <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === "scanning") {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 flex flex-col items-center gap-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <Search size={24} className="absolute inset-0 m-auto text-primary animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold">Scanning {brandName || domain}…</h2>
          <p className="text-sm text-muted-foreground">Analyzing search presence, news coverage, and brand sentiment</p>
        </div>
        <div className="w-full max-w-sm space-y-2">
          {["Checking search visibility", "Scanning news mentions", "Analyzing brand sentiment", "Building fix plan"].map((label, i) => (
            <div key={label} className="flex items-center gap-3 text-xs text-muted-foreground animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              {label}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{brandName || domain}</h1>
          {domain && <p className="text-xs text-muted-foreground mt-0.5">{domain}</p>}
        </div>
        <button onClick={reset} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <RotateCcw size={13} />
          New scan
        </button>
      </div>

      {/* Score + quick stats */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-8">
          <ScoreRing score={analysis.score} />
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Search Presence</span>
              <StatusBadge status={analysis.searchPresence.status} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">News Coverage</span>
              <StatusBadge status={analysis.newsCoverage.status} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Customer Sentiment</span>
              <StatusBadge status={analysis.customerSentiment.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-lg">
        {(["overview", "swot", "plan"] as const).map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all capitalize",
              activeSection === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s === "overview" ? "Overview" : s === "swot" ? "Analysis" : "Fix Plan"}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSection === "overview" && (
        <div className="space-y-4">
          {[
            { icon: Search, label: "Search Presence", score: analysis.searchPresence.score, status: analysis.searchPresence.status, summary: analysis.searchPresence.summary, topics: [] },
            { icon: Newspaper, label: "News Coverage", score: null, status: analysis.newsCoverage.status, summary: analysis.newsCoverage.summary, topics: analysis.newsCoverage.topics },
            { icon: Star, label: "Customer Sentiment", score: null, status: analysis.customerSentiment.status, summary: analysis.customerSentiment.summary, topics: analysis.customerSentiment.sources },
          ].map(({ icon: Icon, label, score, status, summary, topics }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={15} className="text-primary" />
                  <span className="text-sm font-semibold">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {score !== null && <span className="text-xs font-bold text-muted-foreground">{score}/100</span>}
                  <StatusBadge status={status} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
              {topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {topics.map(t => (
                    <span key={t} className="text-[11px] bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SWOT */}
      {activeSection === "swot" && (
        <div className="space-y-4">
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 size={15} />
              <span className="text-sm font-semibold">Strengths</span>
            </div>
            <ul className="space-y-2">
              {analysis.strengths.map(s => (
                <li key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 size={13} className="text-green-400 mt-0.5 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle size={15} />
              <span className="text-sm font-semibold">Weaknesses</span>
            </div>
            <ul className="space-y-2">
              {analysis.weaknesses.map(w => (
                <li key={w} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-violet-400">
              <Lightbulb size={15} />
              <span className="text-sm font-semibold">Opportunities</span>
            </div>
            <ul className="space-y-2">
              {analysis.opportunities.map(o => (
                <li key={o} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ChevronRight size={13} className="text-violet-400 mt-0.5 shrink-0" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Fix Plan */}
      {activeSection === "plan" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Here's exactly what to do — in order of impact.</p>
          {analysis.fixPlan.map((item, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                  <span className="text-sm font-semibold">{item.title}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <PriorityBadge priority={item.priority} />
                  <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Clock size={9} />
                    {item.effort}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-8">{item.action}</p>
            </div>
          ))}

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Target size={15} className="text-primary" />
              <span className="text-sm font-semibold">Want us to handle the press coverage?</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Forge Press writes and distributes SEO articles about your brand to authority news sites — starting at $19/month. Way cheaper than the competition.
            </p>
            <Button size="sm" onClick={() => navigate("/forge-press")}>
              Try Forge Press <Zap size={13} className="ml-1.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
