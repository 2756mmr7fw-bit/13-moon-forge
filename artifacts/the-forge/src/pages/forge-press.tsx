import { useState, useRef } from "react";
import { Newspaper, ArrowRight, Copy, Download, CheckCircle2, Target, TrendingUp, Shield, Zap, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Step = "goal" | "brand" | "generating" | "result";

const GOALS = [
  {
    id: "brand-awareness",
    label: "Brand Awareness",
    icon: TrendingUp,
    desc: "Increase how many people discover and recognize your brand across your industry through strategic visibility in high-traffic, highly relevant content.",
    tags: ["High-Traffic Content", "New Audiences", "Industry Visibility"],
  },
  {
    id: "trust-credibility",
    label: "Trust & Credibility",
    icon: Shield,
    desc: "Strengthen trust in your brand so people feel more confident engaging with you. Authority content places your name where people already go for expert opinions.",
    tags: ["Authority Content", "Expert Positioning", "Press Mentions"],
  },
  {
    id: "sales-leads",
    label: "Sales & Leads",
    icon: Target,
    desc: "Get more sales and qualified leads by attracting visitors who already show buying intent through targeted keyword placement on authority news sites.",
    tags: ["High-Intent Keywords", "Lead Generation", "Conversion Lift"],
    popular: true,
  },
];

const PLANS = [
  {
    name: "Launch",
    price: "$19",
    articles: 1,
    desc: "1 article/month on authority news sites",
    perDay: "$0.63",
    perDayNote: "Less than a cup of coffee",
  },
  {
    name: "Momentum",
    price: "$49",
    articles: 4,
    desc: "4 articles/month on authority news sites",
    perDay: "$1.63",
    perDayNote: "Less than a taxi ride",
    highlight: true,
  },
  {
    name: "Authority",
    price: "$99",
    articles: 10,
    desc: "10 articles/month — aggressive brand building",
    perDay: "$3.30",
    perDayNote: "Less than a business lunch",
  },
];

export default function ForgePress() {
  const [step, setStep] = useState<Step>("goal");
  const [goal, setGoal] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [domain, setDomain] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [article, setArticle] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const streamRef = useRef<() => void>(() => {});
  const { toast } = useToast();

  function selectGoal(id: string) {
    setGoal(id);
    setStep("brand");
  }

  async function generate() {
    if (!brandName.trim()) { setError("Brand name is required."); return; }
    setError("");
    setArticle("");
    setStep("generating");

    const res = await fetch(`${API_BASE}/api/forge-press/generate`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandName, domain, goal, description, keywords }),
    });

    if (!res.ok || !res.body) {
      setError("Generation failed. Please try again.");
      setStep("brand");
      return;
    }

    setStep("result");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let cancelled = false;
    streamRef.current = () => { cancelled = true; };

    try {
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const { text } = JSON.parse(payload) as { text?: string };
            if (text) setArticle(prev => prev + text);
          } catch { /* skip */ }
        }
      }
    } catch { /* stream ended */ }
  }

  function copyArticle() {
    navigator.clipboard.writeText(article).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied to clipboard" });
    });
  }

  function downloadArticle() {
    const blob = new Blob([article], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brandName.replace(/\s+/g, "-").toLowerCase()}-press-release.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setStep("goal");
    setGoal(null);
    setBrandName("");
    setDomain("");
    setDescription("");
    setKeywords("");
    setArticle("");
    setError("");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">
          <Newspaper size={12} />
          Forge Press
        </div>
        <h1 className="text-2xl font-bold">Get your brand on the news</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Forge writes and distributes SEO-optimized articles about your brand to authority news sites. Build trust, rank higher, get found — starting at $19/month.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {["Goal", "Brand", "Article"].map((label, i) => {
          const active = (step === "goal" && i === 0) || (step === "brand" && i === 1) || ((step === "generating" || step === "result") && i === 2);
          const done = (step === "brand" && i === 0) || ((step === "generating" || step === "result") && i <= 1);
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border transition-all",
                done ? "bg-primary border-primary text-primary-foreground" :
                active ? "bg-primary/10 border-primary text-primary" :
                "bg-muted/30 border-border text-muted-foreground"
              )}>
                {done ? <CheckCircle2 size={13} /> : i + 1}
              </div>
              <span className={cn("text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              {i < 2 && <ChevronRight size={12} className="text-muted-foreground/40" />}
            </div>
          );
        })}
        {step !== "goal" && (
          <button onClick={reset} className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <RotateCcw size={11} />
            Start over
          </button>
        )}
      </div>

      {/* Step 1 — Goal */}
      {step === "goal" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">What is your goal?</h2>
          {GOALS.map(g => (
            <button
              key={g.id}
              onClick={() => selectGoal(g.id)}
              className="w-full text-left bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:bg-primary/5 transition-all group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <g.icon size={16} className="text-primary" />
                  </div>
                  <span className="font-semibold">{g.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {g.popular && <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">Popular</span>}
                  <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-11">{g.desc}</p>
              <div className="flex flex-wrap gap-1.5 pl-11">
                {g.tags.map(t => (
                  <span key={t} className="text-[10px] bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2 — Brand info */}
      {step === "brand" && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold">Tell us about your brand</h2>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Brand Name *</label>
                <Input placeholder="e.g. 13 Moon Forge" value={brandName} onChange={e => setBrandName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Website / Domain</label>
                <Input placeholder="e.g. 13moonforge.com" value={domain} onChange={e => setDomain(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What do you do?</label>
                <Textarea
                  placeholder="Describe your product, service, or mission in a few sentences..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target Keywords <span className="font-normal text-muted-foreground/50">(optional)</span></label>
                <Input placeholder="e.g. self-hosted AI tools, open source builder" value={keywords} onChange={e => setKeywords(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button className="w-full" size="lg" onClick={generate}>
              Write My Article <Zap size={15} className="ml-2" />
            </Button>
          </div>

          {/* Pricing plans */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Choose your plan</p>
            <div className="grid gap-3">
              {PLANS.map(p => (
                <div key={p.name} className={cn(
                  "border rounded-xl p-4 space-y-1 relative",
                  p.highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                )}>
                  {p.highlight && <div className="absolute -top-2.5 left-4 text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Most Popular</div>}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-lg">{p.price}</span>
                      <span className="text-muted-foreground text-sm">/mo</span>
                      <span className="text-xs text-muted-foreground ml-2">{p.desc}</span>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">{p.name}</span>
                  </div>
                  <p className="text-[11px] text-primary/70">{p.perDay}/day — {p.perDayNote}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Pricing managed via your subscription. Cancel anytime — no contracts.
            </p>
          </div>
        </div>
      )}

      {/* Step 3 — Generating */}
      {step === "generating" && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <Newspaper size={20} className="absolute inset-0 m-auto text-primary animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold">Writing your article…</h2>
            <p className="text-sm text-muted-foreground">Crafting a publication-ready press release for {brandName}</p>
          </div>
        </div>
      )}

      {/* Step 4 — Result */}
      {step === "result" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-400" />
              <span className="text-sm font-semibold">Your article is ready</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyArticle}>
                {copied ? <CheckCircle2 size={13} className="mr-1.5 text-green-400" /> : <Copy size={13} className="mr-1.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadArticle}>
                <Download size={13} className="mr-1.5" />
                Download
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed font-sans">
              {article || <span className="animate-pulse text-muted-foreground/50">Generating…</span>}
            </pre>
          </div>

          {article && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ArrowRight size={14} className="text-amber-400" />
                Next: Distribute to news sites
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your article is ready to distribute. To get it on authority news sites, submit it to one of these PR wire services:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { name: "EIN Presswire", url: "https://www.einpresswire.com", note: "~$99/yr for unlimited releases", badge: "Best Value" },
                  { name: "PRWeb", url: "https://www.prweb.com", note: "From $99 per release", badge: "" },
                  { name: "Newswire", url: "https://www.newswire.com", note: "From $149 per release", badge: "" },
                  { name: "Globe Newswire", url: "https://www.globenewswire.com", note: "Enterprise-scale distribution", badge: "" },
                ].map(s => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-muted/30 hover:bg-muted/60 border border-border rounded-lg px-4 py-3 transition-colors group"
                  >
                    <div>
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">{s.name}</span>
                      <p className="text-xs text-muted-foreground">{s.note}</p>
                    </div>
                    {s.badge && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">{s.badge}</span>}
                  </a>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Copy your article above and paste it directly into any of these services.
                EIN Presswire is the most cost-effective for monthly publishing.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
