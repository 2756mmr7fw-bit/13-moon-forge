import { useState, useRef } from "react";
import {
  Newspaper, Copy, Download, CheckCircle2, Target, TrendingUp, Shield,
  Zap, ChevronRight, RotateCcw, ExternalLink, Search, Users, Bot,
  Globe, Tv2, Crown, BarChart3,
} from "lucide-react";
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
    desc: "Get discovered by new audiences through strategic placement in high-traffic, authoritative content.",
    tags: ["High-Traffic Content", "New Audiences", "Industry Visibility"],
  },
  {
    id: "trust-credibility",
    label: "Trust & Credibility",
    icon: Shield,
    desc: "Strengthen trust by placing your name where people already go for expert opinions and industry news.",
    tags: ["Authority Content", "Expert Positioning", "Press Mentions"],
  },
  {
    id: "sales-leads",
    label: "Sales & Leads",
    icon: Target,
    desc: "Attract visitors with buying intent through targeted keyword placement on authority news sites.",
    tags: ["High-Intent Keywords", "Lead Generation", "Conversion Lift"],
    popular: true,
  },
];

// Where articles land after distribution
const DISTRIBUTION_SITES = [
  { icon: Globe,  label: "AP News · Google News · Bing News",       color: "text-blue-400" },
  { icon: Tv2,    label: "USA TODAY · NBC · FOX · ABC · CBS",        color: "text-orange-400" },
  { icon: Bot,    label: "ChatGPT · Claude · Gemini (AI indexing)",  color: "text-purple-400" },
  { icon: Users,  label: "Journalists & media influencers",          color: "text-green-400" },
];

// Distribution options — free first, paid optional
const DIST_OPTIONS = [
  {
    name: "PRLog",
    url: "https://www.prlog.org",
    signupUrl: "https://www.prlog.org/register.html",
    price: "Free",
    model: "Free account",
    note: "Create an account, paste your article, publish. Shows in Google News.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "Sign up → Submit Release → done.",
  },
  {
    name: "OpenPR",
    url: "https://www.openpr.com",
    signupUrl: "https://www.openpr.com/register",
    price: "Free",
    model: "Free account",
    note: "Free worldwide distribution. Reaches journalists and Google News.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "Register → New Press Release → paste and publish.",
  },
  {
    name: "IssueWire",
    url: "https://www.issuewire.com",
    signupUrl: "https://www.issuewire.com/register",
    price: "From $19",
    model: "Pay per release — no subscription",
    note: "No monthly fee. Pay only when you publish. Higher tiers reach AP/NBC/CBS.",
    badge: "Per Release",
    badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    setupNote: "Create account free → buy a release credit when ready to publish.",
  },
  {
    name: "Send2Press",
    url: "https://www.send2press.com",
    signupUrl: "https://www.send2press.com/wire/",
    price: "$89",
    model: "Pay per release — no subscription",
    note: "No monthly fee. One flat rate per release. Solid newsroom pickup.",
    badge: "Per Release",
    badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    setupNote: "Go to their site → submit your release → pay at checkout.",
  },
  {
    name: "PRWeb",
    url: "https://www.prweb.com",
    signupUrl: "https://app.prweb.com/prweb/register.aspx",
    price: "From $99",
    model: "Pay per release — no subscription",
    note: "No monthly fee. Wide digital media reach. Owned by Cision.",
    badge: "Per Release",
    badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    setupNote: "Create account free → submit and pay per release.",
  },
];

// FameHero comparison data
const FAMEHERO_PLANS = [
  { name: "Launch",     price: 49,  articles: 1  },
  { name: "Rise",       price: 149, articles: 3  },
  { name: "Accelerate", price: 399, articles: 8  },
  { name: "Scale",      price: 499, articles: 10 },
  { name: "Diamond",    price: 999, articles: 20, isMax: true },
];

function parseArticle(raw: string) {
  const headline    = raw.match(/\[HEADLINE\]\s*([\s\S]*?)(?=\[DATELINE\]|\[BODY\]|$)/i)?.[1]?.trim() ?? "";
  const dateline    = raw.match(/\[DATELINE\]\s*([\s\S]*?)(?=\[BODY\]|$)/i)?.[1]?.trim() ?? "";
  const body        = raw.match(/\[BODY\]\s*([\s\S]*?)(?=\[BOILERPLATE\]|$)/i)?.[1]?.trim() ?? "";
  const boilerplate = raw.match(/\[BOILERPLATE\]\s*([\s\S]*?)$/i)?.[1]?.trim() ?? "";
  return { headline, dateline, body, boilerplate };
}

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
  const [showComparison, setShowComparison] = useState(false);

  const streamRef = useRef<() => void>(() => {});
  const { toast } = useToast();

  function selectGoal(id: string) { setGoal(id); setStep("brand"); }

  async function generate() {
    if (!brandName.trim()) { setError("Brand name is required."); return; }
    setError(""); setArticle(""); setStep("generating");

    const res = await fetch(`${API_BASE}/api/forge-press/generate`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandName, domain, goal, description, keywords }),
    });

    if (!res.ok || !res.body) { setError("Generation failed. Please try again."); setStep("brand"); return; }

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
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied to clipboard" });
    });
  }

  function downloadArticle() {
    const blob = new Blob([article], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brandName.replace(/\s+/g, "-").toLowerCase()}-press-release.txt`;
    a.click(); URL.revokeObjectURL(url);
  }

  function reset() {
    setStep("goal"); setGoal(null); setBrandName(""); setDomain("");
    setDescription(""); setKeywords(""); setArticle(""); setError("");
  }

  const parsed = article ? parseArticle(article) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">
          <Newspaper size={12} />
          Forge Press
        </div>
        <h1 className="text-2xl font-bold leading-snug">
          OpenAI writes your press release.<br />You pick where it gets distributed.
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          FameHero charges $49–$999/month for this. Forge writes it for free with OpenAI.
          Distribution options range from <span className="text-green-400 font-semibold">completely free</span> to paid — your choice.
        </p>

        {/* Distribution destinations */}
        <div className="grid grid-cols-2 gap-2">
          {DISTRIBUTION_SITES.map(s => (
            <div key={s.label} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
              <s.icon size={13} className={cn("shrink-0", s.color)} />
              <span className="text-xs text-muted-foreground leading-tight">{s.label}</span>
            </div>
          ))}
        </div>

        {/* FameHero comparison toggle */}
        <button
          onClick={() => setShowComparison(v => !v)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <BarChart3 size={11} />
          {showComparison ? "Hide" : "See"} what FameHero charges for this
          <ChevronRight size={11} className={cn("transition-transform", showComparison && "rotate-90")} />
        </button>

        {showComparison && (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/30 px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              FameHero monthly subscription
            </div>
            <div className="divide-y divide-border">
              {FAMEHERO_PLANS.map(plan => (
                <div key={plan.name} className={cn("flex items-center justify-between px-4 py-2.5", plan.isMax && "bg-red-500/5")}>
                  <div className="flex items-center gap-2">
                    {plan.isMax && <Crown size={11} className="text-yellow-400" />}
                    <span className="text-sm font-medium">{plan.name}</span>
                    <span className="text-xs text-muted-foreground">{plan.articles} article{plan.articles > 1 ? "s" : ""}/mo</span>
                  </div>
                  <span className={cn("text-sm font-bold", plan.isMax ? "text-red-400" : "text-muted-foreground")}>
                    ${plan.price}<span className="text-xs font-normal">/mo</span>
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary">Forge Press</span>
                  <span className="text-xs text-muted-foreground">unlimited articles</span>
                </div>
                <span className="text-sm font-bold text-primary">Free to write</span>
              </div>
            </div>
            <div className="bg-muted/10 px-4 py-2.5 text-[11px] text-muted-foreground">
              Forge writes with OpenAI at no extra cost. Distribution is separate — free options are listed after your article is generated.
            </div>
          </div>
        )}
      </div>

      {/* ── Step indicator ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {["Goal", "Brand", "Article"].map((label, i) => {
          const active = (step === "goal" && i === 0) || (step === "brand" && i === 1) || ((step === "generating" || step === "result") && i === 2);
          const done   = (step === "brand" && i === 0) || ((step === "generating" || step === "result") && i <= 1);
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border transition-all",
                done   ? "bg-primary border-primary text-primary-foreground" :
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
            <RotateCcw size={11} />Start over
          </button>
        )}
      </div>

      {/* ── Step 1 — Goal ───────────────────────────────────────────────── */}
      {step === "goal" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">What is your campaign goal?</h2>
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

      {/* ── Step 2 — Brand info ─────────────────────────────────────────── */}
      {step === "brand" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Tell Forge about your brand</h2>
            <p className="text-xs text-muted-foreground mt-0.5">OpenAI will write a publication-ready press release from this.</p>
          </div>
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
                value={description} onChange={e => setDescription(e.target.value)}
                rows={3} className="resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Target Keywords <span className="font-normal text-muted-foreground/50">(optional)</span>
              </label>
              <Input placeholder="e.g. self-hosted AI tools, open source builder" value={keywords} onChange={e => setKeywords(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button className="w-full" size="lg" onClick={generate}>
            Write My Article with OpenAI <Zap size={15} className="ml-2" />
          </Button>
        </div>
      )}

      {/* ── Step 3 — Generating ─────────────────────────────────────────── */}
      {step === "generating" && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <Newspaper size={20} className="absolute inset-0 m-auto text-primary animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold">OpenAI is writing your article…</h2>
            <p className="text-sm text-muted-foreground">Crafting a publication-ready press release for {brandName}</p>
          </div>
        </div>
      )}

      {/* ── Step 4 — Result ─────────────────────────────────────────────── */}
      {step === "result" && (
        <div className="space-y-4">

          {/* Controls */}
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
                <Download size={13} className="mr-1.5" />Download
              </Button>
            </div>
          </div>

          {/* Formatted article */}
          {article && parsed && (parsed.headline || parsed.body) ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {parsed.headline && (
                <div className="border-b border-border px-6 py-4 bg-muted/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Headline</p>
                  <h2 className="text-base font-bold leading-snug">{parsed.headline}</h2>
                  {parsed.dateline && <p className="text-xs text-muted-foreground mt-1">{parsed.dateline}</p>}
                </div>
              )}
              <div className="px-6 py-5">
                {parsed.body && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{parsed.body}</p>}
                {parsed.boilerplate && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{parsed.boilerplate}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed font-sans">
                {article || <span className="animate-pulse text-muted-foreground/50">Generating…</span>}
              </pre>
            </div>
          )}

          {/* Distribution options */}
          {article && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/20 border-b border-border">
                <p className="text-sm font-semibold">Now distribute it</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Copy or download your article above, then submit to any of these.
                  The paid ones are <span className="font-semibold text-foreground">pay-per-release</span> — no monthly fees, no subscriptions. You pay only when you publish.
                </p>
              </div>
              <div className="divide-y divide-border">
                {DIST_OPTIONS.map(s => (
                  <div key={s.name} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0", s.badgeColor)}>
                          {s.badge}
                        </span>
                        <span className="text-sm font-semibold">{s.name}</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">{s.model}</span>
                      </div>
                      <span className="text-sm font-bold text-primary shrink-0">{s.price}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-0.5">{s.note}</p>
                    <div className="flex items-center gap-3 pl-0.5">
                      <span className="text-[11px] text-muted-foreground/70 italic">{s.setupNote}</span>
                      <a
                        href={s.signupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium shrink-0"
                      >
                        Sign up <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-green-500/5 border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
                <span className="font-semibold text-green-400">Start free:</span> PRLog and OpenPR cost nothing and get you into Google News right away. Use them first, then upgrade to paid if you want broader newsroom reach.
              </div>
            </div>
          )}

          {/* Write another */}
          {article && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Write another article</p>
                <p className="text-xs text-muted-foreground">Consistent publishing builds authority over time</p>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw size={13} className="mr-1.5" />New Article
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
