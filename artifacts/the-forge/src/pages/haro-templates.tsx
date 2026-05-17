import { useState } from "react";
import { Link } from "wouter";
import {
  Mic, Copy, CheckCircle2, ExternalLink, ChevronRight, ArrowRight,
  Newspaper, AlertTriangle, Clock, Users, Zap, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AppFamily } from "@/components/app-family";

type Template = {
  id: string;
  title: string;
  scenario: string;
  keywords: string[];
  subject: string;
  body: string;
  notes: string;
  bestFor: string[];
};

const TEMPLATES: Template[] = [
  {
    id: "indie-founder",
    title: "The Indie Founder Story",
    scenario: "A journalist asks about solo founders, indie devs, bootstrapped startups, or building in public",
    keywords: ["indie founder", "bootstrapped", "solo developer", "building in public", "self-funded startup"],
    subject: "Re: [Query Title] — Solo founder building sovereign software infrastructure",
    body: `Hi [Journalist's Name],

I'm Ezekiel Evans, the founder of 13 Moon Forge — a self-hosted AI development platform I've bootstrapped completely solo since [year].

The short version: I build everything myself, host it on infrastructure I own, and charge directly without giving Apple, Google, or platform middlemen a cut. The platform currently serves builders who want to own their stack — no subscriptions to Big Tech, no algorithm deciding what their users see.

What makes my story relevant to your piece: I've built a 5-app ecosystem (The Forge, The People's Town Square, EzQuill, 13 Moon Film Editor, and a mobile companion) as a one-person team, with zero outside funding. Every technical decision is driven by sovereignty — not growth hacking.

Happy to answer any specific questions you have. I can turn around quotes within a few hours.

Best,
Ezekiel Evans
Founder, 13 Moon Forge
13moonforge.ai | ezekiel@thepeoplestownsq.com`,
    notes: "Use this for queries about indie dev, bootstrapping, solo founders, building in public, or startup culture stories. Personalize [Journalist's Name] and add a specific hook from their query in the opening if possible.",
    bestFor: ["Indie Hackers coverage", "Forbes contributor pieces on bootstrapping", "TechCrunch features on solo founders"],
  },
  {
    id: "censorship-social",
    title: "The Anti-Censorship / Platform Independence Angle",
    scenario: "A journalist asks about social media censorship, deplatforming, content moderation, or Big Tech control",
    keywords: ["social media censorship", "deplatforming", "content moderation", "free speech", "platform independence", "algorithm bias"],
    subject: "Re: [Query Title] — Building the alternative to algorithmically-controlled social media",
    body: `Hi [Journalist's Name],

I built The People's Town Square specifically because of what you're covering.

It's a platform-independent social community — no algorithm curating your feed, no ad-driven engagement traps, no risk of deplatforming because I don't answer to Facebook, YouTube, or any platform that can disappear your audience overnight.

I started building it after watching creators and communities lose years of work to a single content moderation decision by a platform they had no recourse against. My response was to build something where the users and the community, not the platform, set the rules.

Current user base is growing through word-of-mouth from people who've been burned by algorithmic suppression. The value proposition is simple: you own your presence here. Nobody can take it from you.

I'm happy to speak on the record about what it takes to build sovereign alternatives to centralized social media, and what the appetite actually looks like among users who've left the major platforms.

Best,
Ezekiel Evans
Founder, The People's Town Square & 13 Moon Forge
thepeoplestownsq.com | ezekiel@thepeoplestownsq.com`,
    notes: "Use when the query is about social media alternatives, censorship, deplatforming, digital sovereignty, or content moderation policy. Lead with TPTS, not The Forge.",
    bestFor: ["Vice, Wired, or The Verge pieces on social media alternatives", "Political media covering Big Tech censorship", "Tech journalism on decentralization"],
  },
  {
    id: "self-hosting",
    title: "The Self-Hosting / Sovereign Infrastructure Expert",
    scenario: "A journalist asks about self-hosting, data privacy, cloud alternatives, or owning your own infrastructure",
    keywords: ["self-hosting", "data sovereignty", "cloud alternatives", "privacy", "open source", "self-managed infrastructure"],
    subject: "Re: [Query Title] — Self-hosting practitioner with production-scale deployment experience",
    body: `Hi [Journalist's Name],

Self-hosting is central to everything I build — so your query caught my attention.

I run 13 Moon Forge, a platform that helps developers migrate off cloud SaaS (Replit, Vercel, Heroku, etc.) onto infrastructure they own. Our migration tools pull codebases from GitHub/GitLab/Bitbucket and deploy them to Coolify-managed servers — the user ends up with their app running on a VPS they control, with no monthly SaaS fee.

From a practical standpoint, I can speak to: the real cost comparison between managed cloud and self-hosting at different scales, the failure modes people underestimate (backups, uptime monitoring, SSL cert renewal), the tools that make self-hosting realistic for non-sysadmins, and the data sovereignty implications that most cloud users don't think about until something goes wrong.

Happy to go deeper on any angle that fits your piece. I've been in production with this stack for [time period].

Best,
Ezekiel Evans
Founder, 13 Moon Forge
13moonforge.ai | ezekiel@thepeoplestownsq.com`,
    notes: "Use for queries about cloud costs, self-hosting trends, data privacy, open source infrastructure, or the 'own your stack' movement. Lead with The Forge's migration features.",
    bestFor: ["Hacker News-adjacent publications", "DevOps and SRE industry press", "Privacy-focused tech media"],
  },
  {
    id: "ai-tools-dev",
    title: "The AI-Powered Developer Tools Builder",
    scenario: "A journalist asks about AI coding assistants, developer productivity, AI in software development, or the future of coding",
    keywords: ["AI coding tools", "developer productivity", "AI pair programming", "code generation", "AI development platform"],
    subject: "Re: [Query Title] — Building AI developer tools for self-hosted environments",
    body: `Hi [Journalist's Name],

I build AI-powered developer tools — specifically for the segment of developers who want AI assistance without sending their code to a third-party API they don't control.

13 Moon Forge is an AI coding and project management platform that runs on the user's own infrastructure. The AI features — code generation, workspace assistance, and the Brainstorm tool — all route through a configurable API layer so users can point at their own OpenAI key, a local Ollama instance, or any OpenAI-compatible endpoint.

My perspective on AI in development: the current wave of cloud-based AI coding tools (Cursor, GitHub Copilot, Replit AI) solve the productivity problem but create a new dependency problem. Developers become reliant on a service that can change pricing, change capabilities, or disappear entirely. The interesting design challenge is how to deliver the same AI leverage without that dependency.

I'm happy to comment on the developer tools landscape, the tension between AI productivity gains and infrastructure lock-in, or the specific decisions I've made building AI features into a self-hosted platform.

Best,
Ezekiel Evans
Founder, 13 Moon Forge
13moonforge.ai | ezekiel@thepeoplestownsq.com`,
    notes: "Use for AI coding tools, developer productivity, the future of software development, or AI infrastructure stories. Emphasize the self-hosted / sovereign angle as the differentiator.",
    bestFor: ["TechCrunch, InfoQ, The New Stack", "Developer-focused publications", "AI industry coverage"],
  },
  {
    id: "creative-tools",
    title: "The Creative Tools / No-Code Filmmaker",
    scenario: "A journalist asks about creative tools, video editing software, writing tools, content creation, or tools for independent creators",
    keywords: ["content creation tools", "video editing", "indie filmmakers", "writing tools", "creator economy", "no-code tools"],
    subject: "Re: [Query Title] — Building affordable creative tools for independent creators",
    body: `Hi [Journalist's Name],

Independent creators — filmmakers, writers, game designers — pay for a lot of tools they only use 10% of. I'm building the alternative.

13 Moon Forge's creator tools include: a scriptwriting and story development platform (EzQuill), a browser-based video editor built for indie filmmakers who don't want to pay Adobe's monthly rate (13 Moon Film Editor), and an AI-assisted game design document builder. All of them are priced as a bundle, not individual SaaS subscriptions.

The design philosophy is the same across all of them: a creator with a $0 monthly software budget should be able to build something real. The tools exist to remove the financial gate between a good idea and its execution.

My user base skews toward solo creators who've been priced out of the major creative suites, or who want tools that don't phone home to a subscription service every time they open a file.

Happy to provide more detail on any of the specific tools or the creator tools market in general.

Best,
Ezekiel Evans
Founder, 13 Moon Forge
13moonforge.ai | ezekiel@thepeoplestownsq.com`,
    notes: "Use for queries about creator economy, affordable creative tools, indie filmmakers, writers, or the tools-for-creators space. Lead with EzQuill and Film Editor as the product examples.",
    bestFor: ["Creator economy coverage in Forbes, Fast Company", "Filmmaking and screenwriting publications", "Indie dev and content creator communities"],
  },
];

function TemplateCopyBlock({ template }: { template: Template }) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<"subject" | "body" | null>(null);

  function copy(field: "subject" | "body") {
    const text = field === "subject" ? template.subject : template.body;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast({ title: `${field === "subject" ? "Subject line" : "Email body"} copied` });
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  return (
    <div className="space-y-3">
      {/* Subject line */}
      <div className="rounded-lg border border-border bg-muted/20">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Subject line</span>
          <button
            onClick={() => copy("subject")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {copiedField === "subject" ? (
              <CheckCircle2 size={13} className="text-green-400" />
            ) : (
              <Copy size={13} />
            )}
          </button>
        </div>
        <p className="px-3 py-2.5 text-sm font-mono text-muted-foreground leading-relaxed">
          {template.subject}
        </p>
      </div>

      {/* Body */}
      <div className="rounded-lg border border-border bg-muted/20">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Email body — copy and paste</span>
          <button
            onClick={() => copy("body")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {copiedField === "body" ? (
              <CheckCircle2 size={13} className="text-green-400" />
            ) : (
              <Copy size={13} />
            )}
          </button>
        </div>
        <pre className="px-3 py-3 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">
          {template.body}
        </pre>
      </div>
    </div>
  );
}

function TemplateCard({ template, n }: { template: Template; n: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-muted/20 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-primary font-bold text-sm">{n}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold">{template.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{template.scenario}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {template.keywords.slice(0, 3).map(kw => (
              <span key={kw} className="text-[10px] bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full">{kw}</span>
            ))}
          </div>
        </div>
        <ChevronRight size={16} className={cn("text-muted-foreground transition-transform shrink-0 mt-1", open && "rotate-90")} />
      </button>

      {open && (
        <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">

          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-amber-400">When to use: </span>
            {template.notes}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Star size={11} />
              Best for
            </p>
            <ul className="space-y-1">
              {template.bestFor.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 size={11} className="text-green-400 shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <TemplateCopyBlock template={template} />
        </div>
      )}
    </div>
  );
}

export default function HaroTemplates() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">

        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
            <Mic size={12} />
            Earned Media — HARO + Qwoted
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            5 reply templates.<br />
            <span className="text-muted-foreground">1-in-10 lands a real press mention.</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-2xl">
            Journalists on HARO and Qwoted post daily queries asking for expert sources. These templates are written in your founder voice, covering the five angles you're most likely to get queried on. Copy, personalize the bracketed fields, and send.
          </p>
        </div>

        {/* How this works */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Newspaper size={14} />
            How HARO and Qwoted work
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              {
                name: "HARO / Connectively",
                url: "https://connectively.us",
                tier: "Free — 3 emails/day",
                desc: "Journalists from Forbes, Inc, TechCrunch, and Entrepreneur post daily queries looking for expert sources. You reply by email. If they use your quote, you get a real press mention with a backlink. Response window is usually 24–48 hours.",
              },
              {
                name: "Qwoted",
                url: "https://www.qwoted.com",
                tier: "Free tier — 3–5 pitches/week",
                desc: "Similar to HARO but with a cleaner interface. Journalists post source requests and you pitch. Free tier is enough to get 1–2 press placements per month if you're consistent. Create an expert profile as 'Founder, 13 Moon Forge'.",
              },
            ].map(p => (
              <div key={p.name} className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold">{p.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/30 shrink-0">
                    {p.tier}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  Sign up <ExternalLink size={10} />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Setup steps */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Zap size={14} />
            Your two setup steps (15 minutes total)
          </h2>
          <ol className="space-y-3">
            {[
              {
                n: 1,
                label: "Sign up for both platforms",
                detail: "connectively.us (free) and qwoted.com (free). Use ezekiel@thepeoplestownsq.com as your contact email. Profile title: 'Founder, 13 Moon Forge & The People's Town Square'.",
              },
              {
                n: 2,
                label: "Set keyword alerts",
                detail: "On both platforms, set up alerts for: 'social media', 'censorship', 'indie founder', 'self-hosting', 'developer tools', 'content creation', 'bootstrapped', 'cloud infrastructure'. HARO sends 3 digests per day — scan each one for queries that match your templates below.",
              },
            ].map(step => (
              <li key={step.n} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                  {step.n}
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* How to use the templates */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-2">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-400">How to use these templates without sounding like a template</h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 size={11} className="text-green-400 shrink-0 mt-0.5" />Replace every [bracketed field] before sending</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={11} className="text-green-400 shrink-0 mt-0.5" />Add one sentence in the opening that references the journalist's specific query — shows you actually read it</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={11} className="text-green-400 shrink-0 mt-0.5" />Keep it under 250 words — journalists read dozens of pitches, shorter wins</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={11} className="text-green-400 shrink-0 mt-0.5" />Reply within the first 2 hours of seeing a query — speed matters on HARO</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={11} className="text-green-400 shrink-0 mt-0.5" />Don't follow up unless they ask — one reply per query</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Time and success expectation */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "5 min/day", desc: "Scan the HARO digest and send one reply if a query fits" },
            { label: "1-in-10", desc: "Typical hit rate — 1 press mention per 10 quality responses" },
            { label: "$0 cost", desc: "Free tier on both platforms is more than enough" },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg border border-border bg-card px-3 py-4 text-center space-y-1">
              <p className="text-lg font-bold text-primary">{stat.label}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{stat.desc}</p>
            </div>
          ))}
        </div>

        {/* The 5 templates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Users size={14} />
              The 5 templates — click to expand and copy
            </h2>
            <span className="text-[11px] text-muted-foreground">In your founder voice</span>
          </div>
          <div className="space-y-3">
            {TEMPLATES.map((t, i) => (
              <TemplateCard key={t.id} template={t} n={i + 1} />
            ))}
          </div>
        </div>

        {/* What's next */}
        <div className="rounded-xl border border-border bg-primary/5 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Clock size={18} className="text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold">While you wait for press responses</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                HARO placements take days to weeks. In parallel, auto-syndication is the fastest way to expand your content footprint today — write one Substack post and it appears on Medium, Dev.to, and Hashnode automatically.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/auto-syndication">
              <Button variant="outline" size="sm" className="gap-1.5">
                Set up auto-syndication
                <ArrowRight size={12} />
              </Button>
            </Link>
            <Link href="/distribution-plan">
              <Button variant="ghost" size="sm" className="gap-1.5">
                Full distribution plan
                <ArrowRight size={12} />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <AppFamily currentAppId="forge" />
        </div>
      </div>
    </div>
  );
}
