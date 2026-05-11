import { useState, useRef } from "react";
import {
  Newspaper, ArrowRight, Copy, Download, CheckCircle2, Target, TrendingUp,
  Shield, Zap, ChevronRight, RotateCcw, Send, KeyRound, ExternalLink,
  AlertTriangle, Loader2, User, Mail, Phone, Building2, MapPin,
  Crown, Search, Users, FileText, DollarSign, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Step = "goal" | "brand" | "generating" | "result";
type SubmitState = "idle" | "submitting" | "success" | "error";

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

// FameHero plan data — so users see exactly what they're beating
const FAMEHERO_PLANS = [
  { name: "Launch",     price: 49,  articles: 1,  searchLift: "+20–40",     recall: "+80–120" },
  { name: "Rise",       price: 149, articles: 3,  searchLift: "+60–120",    recall: "+240–360" },
  { name: "Accelerate", price: 399, articles: 8,  searchLift: "+160–320",   recall: "+640–960" },
  { name: "Scale",      price: 499, articles: 10, searchLift: "+200–400",   recall: "+800–1,200" },
  { name: "Diamond",    price: 999, articles: 20, searchLift: "+400–800",   recall: "+1,600–2,400", isMax: true },
];

// What Forge + EIN gives you at each equivalent level
const FORGE_EQUIVALENT = {
  articles: 20,
  searchLift: "+400–800",
  recall: "+1,600–2,400",
  perYear: 240,
  perDay: "$0.27",
  monthlyEin: 8.25, // $99/yr ÷ 12
};

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

  const [showEinForm, setShowEinForm] = useState(false);
  const [einApiKey, setEinApiKey] = useState(() => localStorage.getItem("forge:ein:apikey") ?? "");
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactOrg, setContactOrg] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");

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

  async function submitToEin() {
    if (!einApiKey.trim()) { setSubmitError("Enter your EIN Presswire API key first."); return; }
    if (!contactEmail.trim()) { setSubmitError("Contact email is required by EIN Presswire."); return; }

    try { localStorage.setItem("forge:ein:apikey", einApiKey.trim()); } catch { /* ignore */ }

    const parsed = parseArticle(article);
    const fullBody = [parsed.dateline, parsed.body, parsed.boilerplate].filter(Boolean).join("\n\n");

    setSubmitState("submitting"); setSubmitError("");

    try {
      const res = await fetch(`${API_BASE}/api/forge-press/submit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          einApiKey: einApiKey.trim(),
          headline: parsed.headline || `${brandName} Press Release`,
          body: fullBody || article,
          keywords,
          contactFirstName, contactLastName, contactEmail,
          contactPhone, contactOrganization: contactOrg || brandName,
          city, state, country: "United States",
        }),
      });

      const data = await res.json() as { success?: boolean; error?: string; hint?: string };
      if (!res.ok || !data.success) {
        setSubmitState("error");
        setSubmitError(data.hint ?? data.error ?? "Submission failed. Check your API key.");
        return;
      }
      setSubmitState("success");
      toast({ title: "Press release submitted!", description: "EIN Presswire will review and distribute your article." });
    } catch {
      setSubmitState("error");
      setSubmitError("Network error. Please try again.");
    }
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
    setStep("goal"); setGoal(null); setBrandName(""); setDomain(""); setDescription("");
    setKeywords(""); setArticle(""); setError(""); setShowEinForm(false);
    setSubmitState("idle"); setSubmitError("");
  }

  const parsed = article ? parseArticle(article) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">
            <Newspaper size={12} />
            Forge Press
          </div>
          <div className="inline-flex items-center gap-1.5 bg-yellow-500/10 text-yellow-400 px-3 py-1.5 rounded-full text-xs font-semibold">
            <Crown size={11} />
            Diamond-Level Coverage
          </div>
        </div>
        <h1 className="text-2xl font-bold leading-snug">20 articles/month. AI-written.<br />Distributed to 7,500+ news sites.</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          FameHero charges $999/month for this. With Forge Press + EIN Presswire, you get the exact same result for <span className="text-primary font-semibold">$8.25/month</span>.
        </p>

        {/* Impact metrics row */}
        <div className="grid grid-cols-4 gap-3 pt-1">
          {[
            { icon: Search,    label: "Search Lift",   value: "+400–800",      sub: "searches/mo", color: "text-blue-400" },
            { icon: Users,     label: "Brand Recall",  value: "+1,600–2,400",  sub: "aware/mo",    color: "text-purple-400" },
            { icon: FileText,  label: "Articles/Year", value: "240",           sub: "published",   color: "text-green-400" },
            { icon: DollarSign,label: "Per Day",       value: "$0.27",         sub: "vs $33/day",  color: "text-primary" },
          ].map(m => (
            <div key={m.label} className="bg-card border border-border rounded-xl p-3 text-center space-y-0.5">
              <m.icon size={13} className={cn("mx-auto mb-1", m.color)} />
              <p className={cn("text-sm font-bold", m.color)}>{m.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{m.label}</p>
              <p className="text-[9px] text-muted-foreground/60">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* FameHero comparison toggle */}
        <button
          onClick={() => setShowComparison(v => !v)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <BarChart3 size={11} />
          {showComparison ? "Hide" : "See"} FameHero plan comparison
          <ChevronRight size={11} className={cn("transition-transform", showComparison && "rotate-90")} />
        </button>

        {showComparison && (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/30 px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              FameHero plans vs Forge Press
            </div>
            <div className="divide-y divide-border">
              {FAMEHERO_PLANS.map(plan => (
                <div key={plan.name} className={cn("flex items-center justify-between px-4 py-3", plan.isMax && "bg-red-500/5")}>
                  <div className="flex items-center gap-3">
                    {plan.isMax && <Crown size={12} className="text-yellow-400" />}
                    <div>
                      <span className="text-sm font-semibold">{plan.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{plan.articles} articles/mo</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div className="hidden sm:block">
                      <p className="text-[10px] text-muted-foreground">Search lift</p>
                      <p className="text-xs font-medium text-blue-400">{plan.searchLift}</p>
                    </div>
                    <div className={cn("text-sm font-bold", plan.isMax ? "text-red-400" : "text-muted-foreground")}>
                      ${plan.price}<span className="text-xs font-normal">/mo</span>
                    </div>
                  </div>
                </div>
              ))}
              {/* Forge row */}
              <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-t-2 border-primary/30">
                <div className="flex items-center gap-3">
                  <Crown size={12} className="text-primary" />
                  <div>
                    <span className="text-sm font-semibold text-primary">Forge Press</span>
                    <span className="text-xs text-muted-foreground ml-2">20 articles/mo (unlimited)</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="hidden sm:block">
                    <p className="text-[10px] text-muted-foreground">Search lift</p>
                    <p className="text-xs font-medium text-blue-400">{FORGE_EQUIVALENT.searchLift}</p>
                  </div>
                  <div className="text-sm font-bold text-primary">
                    $8.25<span className="text-xs font-normal">/mo</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground">
              Forge = EIN Presswire $99/yr ÷ 12. Impact estimates match FameHero's own methodology.
            </div>
          </div>
        )}
      </div>

      {/* ── Step indicator ─────────────────────────────────────────────── */}
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

      {/* ── Step 1 — Goal ──────────────────────────────────────────────── */}
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

          {/* EIN setup callout */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <KeyRound size={15} className="text-blue-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">First time? Get your EIN Presswire account</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sign up at EIN Presswire for <strong>$99/year</strong> — unlimited press releases to 7,500+ news sites, Google News, and Bing News.
                That's 20 articles/month for $8.25/mo total. Get your API key from your account after signing up.
              </p>
              <a
                href="https://www.einpresswire.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium mt-1"
              >
                Sign up at einpresswire.com <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2 — Brand info ─────────────────────────────────────────── */}
      {step === "brand" && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold">Tell Forge about your brand</h2>
            <p className="text-xs text-muted-foreground">OpenAI will write a publication-ready press release tailored to your goal.</p>
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
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target Keywords <span className="font-normal text-muted-foreground/50">(optional)</span></label>
                <Input placeholder="e.g. self-hosted AI tools, open source builder" value={keywords} onChange={e => setKeywords(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button className="w-full" size="lg" onClick={generate}>
              Write My Article with OpenAI <Zap size={15} className="ml-2" />
            </Button>
          </div>

          {/* Diamond plan value reminder */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-yellow-400 text-xs font-semibold">
              <Crown size={12} />
              Diamond-level campaign — what you're getting
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Brand Search Lift", value: "+400–800/mo" },
                { label: "Brand Recall", value: "+1,600–2,400/mo" },
                { label: "Distribution", value: "7,500+ news sites" },
                { label: "Cost vs FameHero", value: "99% less" },
              ].map(m => (
                <div key={m.label} className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
                  <p className="text-sm font-semibold text-yellow-300">{m.value}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Estimates based on FameHero's own methodology for Diamond-tier campaigns.</p>
          </div>
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

          {/* Expected impact card */}
          {article && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-yellow-400 text-xs font-semibold">
                <Crown size={12} />
                Expected campaign impact (Diamond-level)
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Search,   label: "Brand Search Lift",  value: "+400–800", sub: "new searches/mo" },
                  { icon: Users,    label: "Brand Recall Lift",   value: "+1,600–2,400", sub: "new people aware/mo" },
                  { icon: FileText, label: "Distribution",        value: "7,500+", sub: "authority news sites" },
                  { icon: ArrowRight, label: "Next article",     value: "Generate →", sub: "run 20/mo for full impact" },
                ].map(m => (
                  <div key={m.label} className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <m.icon size={10} className="text-yellow-400" />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
                    </div>
                    <p className="text-sm font-bold text-yellow-300">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.sub}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground border-t border-yellow-500/10 pt-2">
                Estimates match FameHero's own published methodology for Diamond-tier campaigns ($999/mo).
                Your cost: $8.25/mo via EIN Presswire.
              </p>
            </div>
          )}

          {/* EIN Presswire direct submit */}
          {article && (
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setShowEinForm(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Send size={14} className="text-green-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">Publish to EIN Presswire</p>
                    <p className="text-xs text-muted-foreground">Submit directly — no copy-paste, no leaving Forge</p>
                  </div>
                </div>
                <ChevronRight size={14} className={cn("text-muted-foreground transition-transform", showEinForm && "rotate-90")} />
              </button>

              {showEinForm && (
                <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
                  {submitState === "success" ? (
                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                      <CheckCircle2 size={28} className="text-green-400" />
                      <p className="font-semibold">Submitted to EIN Presswire!</p>
                      <p className="text-sm text-muted-foreground">They'll review and distribute to 7,500+ news sites. You'll get an email confirmation.</p>
                      <Button variant="outline" size="sm" onClick={() => { setSubmitState("idle"); setShowEinForm(false); }}>Done</Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <KeyRound size={11} />EIN Presswire API Key *
                        </label>
                        <Input
                          type="password"
                          placeholder="Paste your EIN API key here"
                          value={einApiKey} onChange={e => setEinApiKey(e.target.value)}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Get your key at{" "}
                          <a href="https://www.einpresswire.com/account/api" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                            einpresswire.com/account/api
                          </a>
                          {" "}after signing up ($99/yr).
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact Info (required by EIN Presswire)</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input className="pl-8" placeholder="First name" value={contactFirstName} onChange={e => setContactFirstName(e.target.value)} />
                          </div>
                          <Input placeholder="Last name" value={contactLastName} onChange={e => setContactLastName(e.target.value)} />
                        </div>
                        <div className="relative">
                          <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input className="pl-8" type="email" placeholder="Contact email *" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input className="pl-8" placeholder="Phone" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
                          </div>
                          <div className="relative">
                            <Building2 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input className="pl-8" placeholder="Organization" value={contactOrg} onChange={e => setContactOrg(e.target.value)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input className="pl-8" placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
                          </div>
                          <Input placeholder="State (e.g. TX)" value={state} onChange={e => setState(e.target.value)} />
                        </div>
                      </div>

                      {submitError && (
                        <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                          {submitError}
                        </div>
                      )}

                      <Button className="w-full" onClick={submitToEin} disabled={submitState === "submitting"}>
                        {submitState === "submitting"
                          ? <><Loader2 size={14} className="mr-2 animate-spin" />Submitting to EIN Presswire…</>
                          : <><Send size={14} className="mr-2" />Publish to 7,500+ News Sites</>
                        }
                      </Button>
                      <p className="text-[11px] text-muted-foreground text-center">
                        EIN Presswire reviews articles before distributing. API key saved locally for next time.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Write another */}
          {article && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Write another article</p>
                <p className="text-xs text-muted-foreground">Run 20/month to reach Diamond-level brand impact</p>
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
