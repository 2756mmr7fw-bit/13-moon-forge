import { useState } from "react";
import { Link } from "wouter";
import {
  Rss, CheckCircle2, Circle, ChevronRight, ExternalLink, ArrowRight,
  Copy, Zap, AlertTriangle, Clock, Radio, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AppFamily } from "@/components/app-family";

type SetupStatus = "done" | "pending" | "action-needed";

type SyndicationTarget = {
  id: string;
  name: string;
  url: string;
  color: string;
  bgColor: string;
  borderColor: string;
  audience: string;
  why: string;
  howItWorks: string;
  steps: { label: string; detail?: string; link?: string; linkLabel?: string }[];
  rssNote?: string;
  automationMethod: "rss-import" | "zapier-free" | "manual-rss";
  automationLabel: string;
};

const TARGETS: SyndicationTarget[] = [
  {
    id: "medium",
    name: "Medium",
    url: "https://medium.com",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    audience: "General tech, business, and culture readers — 100M+ monthly",
    why: "Extremely high domain authority. Articles index in ChatGPT, Claude, and Gemini training pipelines and rank in Google News. Medium's built-in RSS importer republishes your Substack posts automatically with zero copy-paste.",
    howItWorks: "Medium has a native 'Import a story' feature that pulls directly from any RSS feed URL. Point it at your Substack RSS feed and it imports each post as a new Medium draft — you hit Publish and you're done.",
    automationMethod: "rss-import",
    automationLabel: "Native RSS import — no third-party tools",
    steps: [
      { label: "Get your Substack RSS URL", detail: "Your Substack RSS feed is at: https://13moonforge.substack.com/feed (and https://thepeoplestownsquare.substack.com/feed for TPTS)" },
      { label: "Open Medium's import tool", link: "https://medium.com/p/import", linkLabel: "medium.com/p/import" },
      { label: "Paste the RSS URL and click Import", detail: "Medium fetches the post and creates a draft. All formatting carries over cleanly." },
      { label: "Review the draft and click Publish", detail: "Add relevant Medium tags (e.g. 'Self-Hosting', 'Indie Hacker', 'Software Development') before publishing for extra reach." },
      { label: "Add a canonical URL back to Substack", detail: "In Medium's story settings → SEO → enter your original Substack post URL. This protects your Substack SEO — Google knows which version is the original." },
    ],
    rssNote: "One import per post. Takes 2 minutes per article. No automation service needed — Medium does this natively.",
  },
  {
    id: "devto",
    name: "Dev.to",
    url: "https://dev.to",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    audience: "Developers worldwide — 1M+ active community members",
    why: "The largest developer community on the web. Posts pull directly into ChatGPT and Claude training data. Dev.to has a built-in RSS auto-sync that publishes your Substack posts automatically — this is the most powerful automation of the three.",
    howItWorks: "Dev.to has a native RSS feed integration in account settings. Once configured, it checks your Substack RSS every few hours and auto-creates posts from new entries. Fully automatic after a one-time setup.",
    automationMethod: "rss-import",
    automationLabel: "Built-in RSS auto-sync — fully automatic after setup",
    steps: [
      { label: "Go to Dev.to Settings → Extensions", link: "https://dev.to/settings/extensions", linkLabel: "dev.to/settings/extensions" },
      { label: "Find 'Publishing to DEV from RSS'", detail: "Scroll down to the RSS section on the Extensions settings page." },
      { label: "Enter your Substack RSS URL", detail: "For 13 Moon Forge: https://13moonforge.substack.com/feed" },
      { label: "Click 'Save' — it starts syncing immediately", detail: "Dev.to will check your feed every few hours and create drafts for new posts automatically. Posts start as drafts so you can review before they go live." },
      { label: "Optionally set posts to auto-publish", detail: "In the same settings section, you can toggle posts to publish immediately instead of as drafts — your choice." },
    ],
    rssNote: "After one-time setup, fully automatic. New Substack posts appear in Dev.to within hours.",
  },
  {
    id: "hashnode",
    name: "Hashnode",
    url: "https://hashnode.com",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    audience: "Developer community — 600K+ active developers",
    why: "High-authority developer blog platform. Hashnode lets you map it to your own domain (blog.13moonforge.ai) making it feel like your own property while still getting Hashnode's SEO juice. Your handle is already claimed: @thirteenmoonforge.",
    howItWorks: "Hashnode has a built-in article importer that accepts a URL or RSS feed. Import your Substack posts, then they live on your Hashnode blog with canonical URLs back to Substack to protect your SEO.",
    automationMethod: "rss-import",
    automationLabel: "Built-in article import — RSS or URL",
    steps: [
      { label: "Open Hashnode's import tool", link: "https://hashnode.com/settings/import", linkLabel: "hashnode.com/settings/import" },
      { label: "Choose 'Import from RSS feed'", detail: "Hashnode supports importing from Medium, WordPress, Ghost, Substack, and generic RSS feeds." },
      { label: "Enter your Substack RSS URL", detail: "https://13moonforge.substack.com/feed — or the TPTS Substack for that newsletter." },
      { label: "Select which posts to import", detail: "Hashnode shows a list of your posts to pick from. Import them in batches." },
      { label: "Set canonical URLs back to Substack", detail: "In each imported post's settings, add the original Substack URL as the canonical link. This is critical for SEO." },
      { label: "Optional: map to your custom domain", detail: "Go to Hashnode Blog Settings → Custom Domain → enter blog.13moonforge.ai. This makes Hashnode feel like part of your own site." },
    ],
    rssNote: "Import is per-batch. For ongoing auto-sync, check Hashnode's new 'Auto-import' beta in their settings — it may be available for your account.",
  },
];

const SUBSTACK_URLS = [
  { label: "13 Moon Forge", url: "https://13moonforge.substack.com/feed" },
  { label: "The People's Town Square", url: "https://thepeoplestownsquare.substack.com/feed" },
];

function StepItem({ step, n }: { step: SyndicationTarget["steps"][0]; n: number }) {
  const { toast } = useToast();

  return (
    <li className="flex items-start gap-3">
      <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{step.label}</p>
        {step.detail && (
          <p className="text-xs text-muted-foreground leading-relaxed">{step.detail}</p>
        )}
        {step.link && (
          <a
            href={step.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            {step.linkLabel ?? step.link}
            <ExternalLink size={10} />
          </a>
        )}
      </div>
    </li>
  );
}

function TargetCard({ target }: { target: SyndicationTarget }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Copied to clipboard" });
    });
  }

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", target.borderColor)}>
      <button
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-muted/20 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", target.bgColor)}>
          <Radio size={18} className={target.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold">{target.name}</h3>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", target.bgColor, target.borderColor, target.color)}>
              {target.automationLabel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{target.audience}</p>
        </div>
        <ChevronRight size={16} className={cn("text-muted-foreground transition-transform shrink-0 mt-1", open && "rotate-90")} />
      </button>

      {open && (
        <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Why this matters</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{target.why}</p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">How it works</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{target.howItWorks}</p>
          </div>

          {target.rssNote && (
            <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5">
              <Rss size={13} className="text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">{target.rssNote}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step-by-step setup</p>
            <ol className="space-y-3">
              {target.steps.map((step, i) => (
                <StepItem key={i} step={step} n={i + 1} />
              ))}
            </ol>
          </div>

          <a
            href={target.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="outline" className="gap-1.5">
              Open {target.name}
              <ExternalLink size={12} />
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}

export default function AutoSyndication() {
  const { toast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(url);
      toast({ title: "RSS URL copied" });
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">

        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
            <Rss size={12} />
            Auto-Syndication Setup
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Write on Substack once.<br />
            <span className="text-muted-foreground">Appear on three more platforms automatically.</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-2xl">
            Medium, Dev.to, and Hashnode all have native RSS import features. Point them at your Substack feed and every post you publish there shows up on all three — no copy-paste, no third-party tools, no monthly fees.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            {TARGETS.map(t => (
              <div key={t.id} className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold", t.bgColor, t.borderColor, t.color)}>
                <CheckCircle2 size={11} />
                {t.name}
              </div>
            ))}
          </div>
        </div>

        {/* How the loop works */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <RefreshCw size={14} />
            The loop you're setting up
          </h2>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            {["Substack (write once)", "→", "Medium (auto-import)", "→", "Dev.to (auto-sync)", "→", "Hashnode (import)"].map((item, i) => (
              <span
                key={i}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium",
                  item === "→"
                    ? "text-muted-foreground text-lg"
                    : "bg-primary/10 border border-primary/25 text-primary"
                )}
              >
                {item}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Each platform indexes your content independently, which means four separate domain authorities pointing to your brand — Google News, ChatGPT training pipelines, developer communities, and general readers all see you. None of them know you wrote it in one place.
          </p>
        </div>

        {/* Your RSS feed URLs */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Rss size={14} />
            Your Substack RSS feed URLs
          </h2>
          <p className="text-xs text-muted-foreground">You'll need these when setting up each platform below. Copy and keep them handy.</p>
          <div className="space-y-2">
            {SUBSTACK_URLS.map(s => (
              <div key={s.url} className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-2">
                <Rss size={12} className="text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">{s.url}</p>
                </div>
                <button
                  onClick={() => copyUrl(s.url)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedUrl === s.url ? (
                    <CheckCircle2 size={14} className="text-green-400" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* The three platforms */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Setup instructions — click to expand each
            </h2>
            <span className="text-[11px] text-muted-foreground">{TARGETS.length} platforms</span>
          </div>
          <div className="space-y-3">
            {TARGETS.map(t => (
              <TargetCard key={t.id} target={t} />
            ))}
          </div>
        </div>

        {/* Canonical URL reminder */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-2">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-amber-400">Always set the canonical URL</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every platform has a "canonical URL" or "original URL" field. Always enter the original Substack post URL there. This tells Google that Substack is the source of truth — so your Substack gains the SEO credit, while Medium/Dev.to/Hashnode still get indexed too. Without this, Google can penalize you for duplicate content.
              </p>
            </div>
          </div>
        </div>

        {/* Time estimate */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <Clock size={14} />
            Total setup time
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { platform: "Dev.to", time: "5 min", note: "One-time RSS config — then fully automatic" },
              { platform: "Medium", time: "2 min/post", note: "Import + canonical URL + publish per article" },
              { platform: "Hashnode", time: "3 min/post", note: "Import + optional custom domain setup" },
            ].map(row => (
              <div key={row.platform} className="rounded-lg border border-border bg-muted/20 px-3 py-3 text-center space-y-1">
                <p className="text-sm font-bold">{row.time}</p>
                <p className="text-xs font-semibold text-muted-foreground">{row.platform}</p>
                <p className="text-[10px] text-muted-foreground/70 leading-tight">{row.note}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Dev.to is set-and-forget after the first 5 minutes. Medium and Hashnode take a few minutes per post — but 10 minutes total to publish on 4 platforms is still a massive win over doing each one manually.
          </p>
        </div>

        {/* HARO next */}
        <div className="rounded-xl border border-border bg-primary/5 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Zap size={18} className="text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold">Next: Earned Media (HARO + Qwoted)</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Once you've set up auto-syndication, the next tier of the distribution plan is earned media — getting quoted in real publications by responding to journalist queries on HARO and Qwoted. Free, and 1-in-10 responses land a real press mention.
              </p>
            </div>
          </div>
          <Link href="/distribution-plan">
            <Button variant="outline" size="sm" className="gap-1.5">
              See the full distribution plan
              <ArrowRight size={12} />
            </Button>
          </Link>
        </div>

        <div className="mt-6">
          <AppFamily currentAppId="forge" />
        </div>
      </div>
    </div>
  );
}
