import { useState } from "react";
import { Link } from "wouter";
import {
  MessageSquare, Copy, CheckCircle2, ExternalLink, AlertTriangle,
  Clock, Users, Flame, Shield, Lightbulb, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AppFamily } from "@/components/app-family";

type Tier = "perfect-fit" | "strong-fit" | "good-fit" | "risky";

type Subreddit = {
  name: string;
  subscribers: string;
  tier: Tier;
  whichApp: string;
  angle: string;
  rules: string[];
  bestTime: string;
  sampleTitle: string;
  sampleBody: string;
  killers: string[];
};

const SUBS: Subreddit[] = [
  {
    name: "r/selfhosted",
    subscribers: "~430k",
    tier: "perfect-fit",
    whichApp: "13 Moon Forge",
    angle: "You built a self-hostable AI dev platform. This subreddit IS your audience. Lead with 'I built X because I was tired of Y SaaS', show screenshots, link to the GitHub/Forgejo, and be brutally honest about what works and what doesn't.",
    rules: [
      "No 'show off without context' posts — every post must explain WHY you built this and HOW someone uses it",
      "Self-promotion is allowed if your post adds value (rule of thumb: 90% useful info, 10% link)",
      "Open source / source-available preferred — they'll downvote closed source",
      "Tag with [Project] flair",
    ],
    bestTime: "Tuesday or Thursday, 9–11 AM Eastern (early-morning EU + waking US devs)",
    sampleTitle: "[Project] I built a self-hostable AI dev platform after getting locked into Vercel/Replit pricing — 13 Moon Forge",
    sampleBody: "I was paying $50/mo across Vercel + Replit + a dozen API keys, and getting frustrated that none of it was mine. So I built 13 Moon Forge — a self-hostable, AI-powered dev environment you run on your own Coolify/Docker/whatever.\n\nWhat it does: project management, AI-pair programming, secrets vault, app monitor, code editor, all in one Docker image you own.\n\nWhat it does NOT do: lock you in, charge per build minute, or send your code to anyone's training data.\n\nGitHub: [link]\nForgejo (primary): git.13moonforge.ai\nWebsite: 13moonforge.ai\n\nBuilt this completely solo over [N] months. Roast it.",
    killers: [
      "Don't use marketing buzzwords ('revolutionary', 'game-changing'). They'll smell it instantly.",
      "Don't pretend it's perfect. Lead with one honest limitation.",
      "Don't post on Friday afternoon or weekends — engagement is dead.",
    ],
  },
  {
    name: "r/sysadmin",
    subscribers: "~960k",
    tier: "strong-fit",
    whichApp: "13 Moon Forge",
    angle: "Sysadmins LOVE self-hosting tools that replace their SaaS dependencies. Pitch it as 'replaced 3 of my SaaS subscriptions with this one Docker container.' Don't lead with AI — lead with operational independence.",
    rules: [
      "Strict no-promotion enforcement — must be useful BEFORE you mention your tool",
      "There's historically been a weekly self-promo / 'Thickheaded Thursday'-style thread — check the sidebar/pinned posts for the current one",
      "Show the docker-compose.yml or you'll get downvoted",
    ],
    bestTime: "Tuesday 8–10 AM Eastern (their self-promo day if you can't get past the filter)",
    sampleTitle: "Replaced 3 SaaS subs with one self-hosted Docker image — here's what works and what doesn't",
    sampleBody: "Quick share for anyone trying to consolidate their dev tooling away from monthly SaaS bills.\n\nWhat I replaced:\n- Replit ($25/mo) → self-hosted dev environment\n- 1Password Secrets Automation ($20/mo) → built-in encrypted secrets vault\n- UptimeRobot Pro ($7/mo) → built-in app monitor\n\nWhat it is: a single Docker container running an Express API + React frontend. AES-256 encrypted secrets, Coolify-aware deploys, GitHub/Forgejo sync.\n\nWhat broke: [be honest — one or two things you wish were different]\n\nDocker compose: [link]\nLive demo: 13moonforge.ai",
    killers: [
      "Don't post in the main feed without checking their pinned promotion rules first",
      "Don't say 'AI-powered' in the title — they hate that phrase here",
    ],
  },
  {
    name: "r/SideProject",
    subscribers: "~270k",
    tier: "perfect-fit",
    whichApp: "All 4 — Forge, TPTS, EzQuill, Film Editor",
    angle: "This is the friendliest subreddit for solo founders showing off what they built. Tell the story: how long, how alone, what you're scared of, what you learned. They reward vulnerability.",
    rules: [
      "Post about ONE project per submission — don't dump all 4 apps in one post",
      "Include a screenshot or short video",
      "Tell the story: time invested, motivation, what's next",
      "Self-promotion encouraged — that's the whole subreddit",
    ],
    bestTime: "Saturday or Sunday morning Eastern — weekend hackers browse here",
    sampleTitle: "I quit/built/etc and spent [N] months building a self-hostable AI dev platform — solo, no funding",
    sampleBody: "Quick share. I'm a solo dev and over the past [N] months I built 13 Moon Forge.\n\nWhat it is: A self-hostable dev environment with built-in AI pair programming, secrets vault, project management, and a code editor. You run it on your own Docker host.\n\nWhy I built it: I got tired of paying 5 different SaaS bills for tools I could host myself.\n\nWhat I'm scared of: I don't know if anyone wants this. So I'm posting here to find out.\n\nWhat's next: launching the mobile companion app and Forge Press (an AI press release tool I'm bundling in).\n\nLive: 13moonforge.ai\nMe: @[your handle]\n\nAsk me anything — I'll be here all day.",
    killers: [
      "Don't be coy — they want the real story",
      "Don't paste a marketing page link without a story attached",
    ],
  },
  {
    name: "r/IndieHackers",
    subscribers: "~70k",
    tier: "strong-fit",
    whichApp: "Forge",
    angle: "Builder-to-builder community. They want to know revenue, costs, what tools you used, what didn't work. Treat this like Indie Hackers itself — be transparent with numbers if you have them.",
    rules: [
      "Numbers > marketing — share MRR, user count, costs",
      "Be specific about what tools you used and dropped",
      "Don't link to anything if you can't share at least one real number",
    ],
    bestTime: "Tuesday or Wednesday morning Eastern",
    sampleTitle: "Built a self-hostable AI dev platform solo in [N] months — here's the stack and the costs",
    sampleBody: "Building in public. 13 Moon Forge is a self-hostable AI dev environment.\n\nStack:\n- Express 5 + React 19 + Vite\n- Drizzle ORM + Postgres\n- Clerk for auth (will replace with self-hosted later)\n- Replit AI Integrations (OpenAI-compatible proxy)\n- pnpm monorepo, single Docker image\n\nCosts so far:\n- Domain: [$X]\n- Server: [$X/mo Coolify on Hetzner]\n- Clerk: $0 free tier\n- AI API: [$X — through Replit proxy so I don't have to manage keys]\n- Total: under $[X]/month\n\nUsers: [number, even if it's small — be honest]\nRevenue: [number, even if it's 0]\n\nWhat I'd do differently: [one honest thing]\n\nLink: 13moonforge.ai",
    killers: [
      "Don't fake numbers — this community will sniff it out fast",
      "Don't post if you can't share at least one cost or user number",
    ],
  },
  {
    name: "r/Entrepreneur",
    subscribers: "~4.1M",
    tier: "good-fit",
    whichApp: "Forge or TPTS",
    angle: "Massive but noisy. Best for the TPTS angle ('built an alternative to algorithm-controlled social') because business-minded readers respond to David-vs-Goliath narratives. Limit to one post per month.",
    rules: [
      "Outbound product links often get auto-flagged or removed — keep the URL in a comment, or put it in your profile and reference it",
      "Tell a business story, not a tech story",
      "Mention your product naturally, don't 'announce' it",
    ],
    bestTime: "Monday or Tuesday morning Eastern",
    sampleTitle: "I'm building an alternative to algorithm-driven social media — here's what I'm learning about distribution",
    sampleBody: "Solo founder here. I'm building The People's Town Square — a social platform where there is NO algorithm. The feed is chronological, the rules are community-set, and nobody can be deplatformed by a corporate decision.\n\nWhat I'm learning about distribution as a solo founder going against the current:\n\n1. [Insight 1]\n2. [Insight 2]\n3. [Insight 3]\n\nThe hardest part has been [honest challenge].\n\nAnyone else here building against the platform-controlled current? What's working for you?",
    killers: [
      "Don't include a clickable link to your product — they'll auto-remove",
      "Don't post on weekends — wasted",
    ],
  },
  {
    name: "r/webdev",
    subscribers: "~2.4M",
    tier: "good-fit",
    whichApp: "Forge or EzQuill",
    angle: "Devs hang out here. Pitch as 'tool I built for devs like us.' Stack details matter. Avoid AI hype.",
    rules: [
      "There's typically a 'Showoff Saturday' weekly thread — that's the safest window for self-promo. Check the sidebar/pinned posts for the current rules",
      "Must include the stack in the post",
      "No marketing speak — they'll roast you",
    ],
    bestTime: "Saturday 9 AM – noon Eastern (Showoff Saturday is the only safe window)",
    sampleTitle: "Showoff Saturday: I built a self-hostable AI dev environment — Express 5 + React 19 + single Docker image",
    sampleBody: "Showoff Saturday post.\n\nProject: 13 Moon Forge — a self-hostable AI dev environment.\n\nStack:\n- Backend: Express 5, Node 24, Drizzle ORM, Postgres\n- Frontend: React 19, Vite, Tailwind, shadcn/ui\n- Monorepo: pnpm workspaces\n- Auth: Clerk (will swap for self-hosted later)\n- Deployment: Single Docker image, Coolify-friendly\n\nWhat's interesting technically: [one specific technical insight you're proud of]\n\nLive: 13moonforge.ai\nCode: [forgejo link]\n\nRoast it — what would you change?",
    killers: [
      "Don't post outside Showoff Saturday unless your post is genuinely technical content (not promotion)",
      "Don't lead with 'AI-powered'",
    ],
  },
  {
    name: "r/programming",
    subscribers: "~6.5M",
    tier: "risky",
    whichApp: "Forge — only if you have a technical post worth reading",
    angle: "DON'T post a product announcement here. They will eat you. Only post if you have a real technical insight (a blog post about a hard problem you solved) and the product link is in the bio at the end.",
    rules: [
      "Technical content only — product launches are routinely removed",
      "Must be a substantive blog post or open source release",
      "Repeated self-promotion or thinly-disguised marketing risks removal or a ban — read the wiki before posting",
    ],
    bestTime: "Don't post until you have a strong technical writeup",
    sampleTitle: "How I migrated a monorepo from npm to pnpm without breaking 50+ artifact deployments",
    sampleBody: "[Technical post about something hard you actually did. The product mention is one line at the bottom of the post, not in the title.]\n\n---\n\nI work on 13 Moon Forge, a self-hostable dev environment. Recently I had to migrate the whole monorepo from npm to pnpm without breaking the artifact lifecycle scripts. Here's what happened.\n\n[Real technical content]",
    killers: [
      "If your post smells remotely like marketing, you'll get banned",
      "Don't even put your product name in the title",
    ],
  },
  {
    name: "r/opensource",
    subscribers: "~225k",
    tier: "strong-fit",
    whichApp: "Forge (if Forgejo repo is public)",
    angle: "Pitch as 'I open-sourced X.' They love source-available, MIT/AGPL-licensed projects. If your repo is gated, this isn't for you.",
    rules: [
      "Your repo must be publicly readable",
      "License must be visible in the post",
      "Self-promo allowed if the project is genuinely open",
    ],
    bestTime: "Any weekday morning Eastern",
    sampleTitle: "I open-sourced my self-hostable AI dev environment — 13 Moon Forge",
    sampleBody: "I just made 13 Moon Forge source-available under [LICENSE]. It's a self-hostable AI dev environment I've been building solo.\n\nWhat it does: project management, AI pair programming, secrets vault, app monitor, code editor — all in one Docker image you own.\n\nLicense: [LICENSE — say it clearly]\nRepo: [Forgejo link]\nWebsite: 13moonforge.ai\n\nWhy source-available not OSI-open: [one honest sentence about your licensing choice]\n\nContributions welcome. Issues open.",
    killers: [
      "Don't claim 'open source' if your license isn't OSI-approved — they'll call you out",
    ],
  },
  {
    name: "r/Forgejo",
    subscribers: "small but exact-match",
    tier: "perfect-fit",
    whichApp: "Forge — specifically the Forgejo integration",
    angle: "Tiny but every member is your exact target user. Pitch the Forgejo-native git integration as the headline.",
    rules: [
      "Niche community — be specific about your Forgejo use case",
      "Self-promo welcome if relevant",
    ],
    bestTime: "Any weekday",
    sampleTitle: "Built a self-hostable dev platform with Forgejo as the primary code host (not GitHub)",
    sampleBody: "Forge-friendly post.\n\n13 Moon Forge uses Forgejo as the primary git host (not GitHub or GitLab). My code lives at git.13moonforge.ai and Forge pushes/pulls/webhooks all flow through Forgejo's API.\n\nWhy this matters: most 'dev platforms' assume GitHub. Forge assumes Forgejo first, GitHub second.\n\nIntegration details:\n- Forgejo webhooks → Forge's code-vault for git tracking\n- Auto-registration of webhooks on all repos\n- OAuth integration so you log in to your own Forgejo from inside Forge\n\nWebsite: 13moonforge.ai\nCode mirror: [if you mirror to github too]",
    killers: [
      "Small subreddit — don't post twice in a row",
    ],
  },
  {
    name: "r/CoolifyApp",
    subscribers: "small but exact-match",
    tier: "perfect-fit",
    whichApp: "Forge — Coolify integration is a real feature",
    angle: "Coolify users are your bullseye. You have Coolify integration baked in. Pitch the env-pull and deploy features.",
    rules: [
      "Niche, Coolify-specific posts only",
      "Self-promo welcome",
    ],
    bestTime: "Any weekday",
    sampleTitle: "Tool that auto-pulls Coolify env vars into an encrypted secrets vault",
    sampleBody: "Coolify users — I built something specifically for our workflow.\n\n13 Moon Forge has built-in Coolify integration:\n- Validates Coolify connection via /api/v1/healthcheck\n- Pulls env vars from ALL your Coolify apps + services into an AES-256 encrypted vault\n- One-click webhook registration on all your repos\n- 'Run All' button that syncs everything in one shot\n\nIf you're managing 5+ Coolify apps and tired of copy-pasting env vars between them, this might save you time.\n\nLive: 13moonforge.ai\nDocs: [link]",
    killers: [
      "Don't post if your Coolify integration isn't actually working — they'll test it",
    ],
  },
];

const TIER_STYLES: Record<Tier, { label: string; cls: string; icon: typeof Flame }> = {
  "perfect-fit": { label: "Perfect fit — start here", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40", icon: Flame },
  "strong-fit": { label: "Strong fit", cls: "bg-blue-500/15 text-blue-400 border-blue-500/40", icon: CheckCircle2 },
  "good-fit": { label: "Good fit if you're careful", cls: "bg-amber-500/15 text-amber-400 border-amber-500/40", icon: Lightbulb },
  "risky": { label: "Risky — read rules first", cls: "bg-rose-500/15 text-rose-400 border-rose-500/40", icon: Shield },
};

export default function RedditMapPage() {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: "Copied", description: "Paste it into Reddit's post editor." });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: "Couldn't copy automatically",
        description: "Select the sample text below and copy it manually (Ctrl/Cmd + C).",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <AppFamily />

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/distribution-plan" className="hover:text-slate-200">Distribution Plan</Link>
            <span>/</span>
            <span>Reddit Map</span>
          </div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <MessageSquare className="h-7 w-7 text-orange-400" />
            Reddit Subreddit Map
          </h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            10 subreddits where your story belongs. For each one: the rules, the best posting time, the angle that fits, a paste-ready sample, and the mistakes that get you downvoted into oblivion. Don't post to all 10 in a week — Reddit's spam detection will shadowban you. One per week, max.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                Reddit's spam filter is brutal
              </div>
              <p className="mt-1 text-xs text-amber-200/80">
                Comment on 5+ other posts in a subreddit before you post your own. Build karma there first. Brand-new accounts with no activity who immediately post a product link get auto-removed.
              </p>
            </div>
          </div>
        </div>

        {/* Cadence guide */}
        <div className="mb-8 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Clock className="h-4 w-4 text-cyan-400" />
            Suggested cadence (10 weeks, one post per week)
          </h2>
          <ol className="ml-5 list-decimal space-y-1 text-sm text-slate-300">
            <li>Week 1: <span className="text-emerald-400">r/SideProject</span> — friendliest first impression</li>
            <li>Week 2: <span className="text-emerald-400">r/selfhosted</span> — your core audience</li>
            <li>Week 3: <span className="text-blue-400">r/IndieHackers</span> — share numbers</li>
            <li>Week 4: <span className="text-blue-400">r/sysadmin</span> — operational pitch (Tuesday self-promo day)</li>
            <li>Week 5: <span className="text-amber-400">r/webdev</span> — Showoff Saturday only</li>
            <li>Week 6: <span className="text-blue-400">r/opensource</span> — if you've made your repo readable</li>
            <li>Week 7: <span className="text-emerald-400">r/Forgejo</span> — niche, exact-match</li>
            <li>Week 8: <span className="text-emerald-400">r/CoolifyApp</span> — niche, exact-match</li>
            <li>Week 9: <span className="text-amber-400">r/Entrepreneur</span> — business angle for TPTS</li>
            <li>Week 10: <span className="text-rose-400">r/programming</span> — only if you have a real technical writeup</li>
          </ol>
        </div>

        {/* Subreddit cards */}
        <div className="space-y-6">
          {SUBS.map((sub, idx) => {
            const style = TIER_STYLES[sub.tier];
            const TierIcon = style.icon;
            return (
              <article
                key={sub.name}
                id={sub.name.replace(/[^a-zA-Z0-9]/g, "-")}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-6"
              >
                {/* Header */}
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">#{idx + 1}</span>
                      <h2 className="text-xl font-semibold text-orange-400">{sub.name}</h2>
                      <span className="text-xs text-slate-500">· {sub.subscribers}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      <span className="text-slate-300">Which app:</span> {sub.whichApp}
                    </p>
                  </div>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", style.cls)}>
                    <TierIcon className="h-3.5 w-3.5" />
                    {style.label}
                  </span>
                </div>

                {/* Angle */}
                <div className="mb-4 rounded-md border border-slate-800 bg-slate-950/60 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Your angle
                  </div>
                  <p className="text-sm text-slate-200">{sub.angle}</p>
                </div>

                {/* Rules + timing */}
                <div className="mb-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <Shield className="h-3.5 w-3.5" />
                      Rules to respect
                    </div>
                    <ul className="ml-4 list-disc space-y-1 text-sm text-slate-300">
                      {sub.rules.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                    <p className="mt-2 text-xs italic text-slate-500">
                      Subreddit rules drift — always{" "}
                      <a
                        href={`https://reddit.com/${sub.name}/about/rules`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300 underline"
                      >
                        check the live rules
                      </a>{" "}
                      and pinned posts before you submit.
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      Best posting time
                    </div>
                    <p className="text-sm text-slate-300">{sub.bestTime}</p>

                    <div className="mt-3 mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      What will get you killed
                    </div>
                    <ul className="ml-4 list-disc space-y-1 text-sm text-slate-300">
                      {sub.killers.map((k, i) => <li key={i}>{k}</li>)}
                    </ul>
                  </div>
                </div>

                {/* Sample post */}
                <div className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Paste-ready sample post
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(`${sub.sampleTitle}\n\n${sub.sampleBody}`, sub.name)}
                      className="border-slate-700 bg-slate-900 hover:bg-slate-800"
                      data-testid={`button-copy-${sub.name.replace(/[^a-zA-Z0-9]/g, "-")}`}
                    >
                      {copiedId === sub.name ? (
                        <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Copied</>
                      ) : (
                        <><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy title + body</>
                      )}
                    </Button>
                  </div>
                  <div className="mb-2 text-sm font-semibold text-slate-100">{sub.sampleTitle}</div>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-300">{sub.sampleBody}</pre>
                </div>

                {/* External link */}
                <div className="mt-3">
                  <a
                    href={`https://reddit.com/${sub.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
                  >
                    Open {sub.name} on Reddit <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-10 rounded-lg border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-300">
          <h3 className="mb-2 flex items-center gap-2 font-semibold">
            <Users className="h-4 w-4 text-cyan-400" />
            The one rule that matters more than any of this
          </h3>
          <p>
            Comment on 5+ other people's posts in a subreddit before posting your own. Reply with helpful, specific advice. The mod team and the regulars notice. When you finally post your own thing, you have karma in that community, your post doesn't get auto-flagged as spam, and the regulars upvote you because they recognize your name. Skip this step and you'll get shadowbanned within 24 hours.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="border-slate-700 bg-slate-900 hover:bg-slate-800">
              <Link href="/distribution-plan">
                Back to Distribution Plan <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-slate-700 bg-slate-900 hover:bg-slate-800">
              <Link href="/haro-templates">
                HARO Templates <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
