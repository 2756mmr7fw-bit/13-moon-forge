import { Link } from "wouter";
import {
  Map, CheckCircle2, Clock, Hammer, ExternalLink, AlertTriangle,
  Smartphone, Globe, Newspaper, MapPin, DollarSign, ArrowRight,
  Rocket, Mic, Users, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppFamily } from "@/components/app-family";

type Status = "done" | "ready-for-you" | "i-build-next" | "your-call" | "skip-for-now";

type Tier = {
  n: number;
  name: string;
  icon: any;
  status: Status;
  timeline: string;
  cost: string;
  summary: string;
  iBuild: { label: string; done: boolean }[];
  youDo: { n: number; label: string; minutes?: string }[];
  decision?: {
    question: string;
    options: { title: string; cost: string; pros: string[]; cons: string[]; recommend?: boolean }[];
  };
  cta?: { label: string; href: string; external?: boolean };
  cta2?: { label: string; href: string; external?: boolean };
  cta3?: { label: string; href: string; external?: boolean };
  accent: string;
};

const TIERS: Tier[] = [
  {
    n: 1,
    name: "Free Web Distribution",
    icon: Globe,
    status: "ready-for-you",
    timeline: "This week (≈2 hours total spread out)",
    cost: "$0",
    summary:
      "Six free venues where your apps get seen by real humans. Each one is permanent — the listings keep working for you for years after you submit them. Total cost is zero.",
    iBuild: [
      { label: "Launch Kit page with all 6 sites, ready-to-paste copy, and step-by-step submission for each", done: true },
      { label: "Founder voice baked into every draft — sounds like you, not like marketing", done: true },
      { label: "AlternativeTo listings drafted for all 4 of your apps (tpts, Forge, Film Editor, EzQuill)", done: true },
      { label: "Auto-syndication setup guide — Substack → Medium, Dev.to, Hashnode (write once, post to 4 platforms)", done: true },
      { label: "Multi-Post composer — one editor, one click, posts to Dev.to + Hashnode + Medium + Substack via their APIs", done: true },
    ],
    youDo: [
      { n: 1, label: "Nextdoor — paste the post into your verified neighborhood feed", minutes: "5 min" },
      { n: 2, label: "AlternativeTo — submit all 4 app listings in one sitting", minutes: "45 min" },
      { n: 3, label: "Indie Hackers — post the founder story (Tue or Wed morning Eastern)", minutes: "20 min" },
      { n: 4, label: "BetaList — submit the form, then wait 1–2 weeks for their review", minutes: "10 min" },
      { n: 5, label: "Show HN — post on a Tue/Wed/Thu, 8–10 AM Eastern, when you're patient", minutes: "15 min + 2 hrs replies" },
      { n: 6, label: "Product Hunt — schedule for 1–2 weeks out (I'll build assets first)", minutes: "30 min to prep" },
      { n: 7, label: "Multi-Post setup — Dev.to: grab API key at dev.to/settings/extensions and paste it in", minutes: "3 min" },
      { n: 8, label: "Multi-Post setup — Hashnode: grab token at hashnode.com/settings/developer, paste it, then type your blog host (yourhandle.hashnode.dev) and click Find to auto-fill publication ID", minutes: "5 min" },
      { n: 9, label: "Multi-Post setup — Substack: in Substack → Settings → Publishing → 'Post by email', copy your unique publish-by-email address and paste it in", minutes: "3 min" },
      { n: 10, label: "Multi-Post setup — Medium (skip if account is post-2021): if you have a legacy account, go to Medium → Settings → Security → Integration tokens and generate one. New accounts can't do this — Medium killed the API in 2021. Use the RSS auto-syndication path for Medium instead.", minutes: "3 min" },
      { n: 11, label: "First Multi-Post run — write one short article, leave 'Publish immediately' OFF, save as drafts on all platforms. Open each platform's draft and confirm it looks right. THEN start publishing live.", minutes: "20 min one-time" },
    ],
    cta: { label: "Open the Launch Kit", href: "/launch-kit" },
    cta2: { label: "Set up Auto-Syndication", href: "/auto-syndication" },
    cta3: { label: "Open Multi-Post composer", href: "/multi-post" },
    accent: "from-emerald-500/20 to-green-500/20 border-emerald-500/40",
  },
  {
    n: 2,
    name: "App Store Distribution",
    icon: Smartphone,
    status: "your-call",
    timeline: "2–3 weeks of build + 1–2 weeks of review",
    cost: "See decision below — $124 first year OR $0",
    summary:
      "Get your apps into the official Apple App Store and Google Play. Strategy: one umbrella '13 Moon' mobile app with reader-mode tabs for each of your web apps. No payments inside the app — anyone who wants to pay you goes to the web. This matches your rule exactly and keeps Apple/Google out of every dollar that flows.",
    iBuild: [
      { label: "Audit the existing forge-mobile app and strip every payment code path", done: false },
      { label: "Add reader-mode tabs: TPTS feed, EzQuill notes, Film Editor preview", done: false },
      { label: "'Visit on web' buttons on every screen that mentions money — the law-of-physics rule", done: false },
      { label: "App icons, splash screens, and 5–8 screenshots per device size", done: false },
      { label: "Privacy policy + Terms of Service pages on 13moonforge.ai", done: false },
      { label: "Production EAS Builds (.aab for Play, .ipa for App Store)", done: false },
      { label: "Listing copy + keywords for both stores", done: false },
    ],
    youDo: [
      { n: 1, label: "Pick the route: Native stores (paid fees) OR PWA-only (free) — see decision below" },
      { n: 2, label: "If native: create Apple Developer + Google Play Console accounts (I'll walk you through)" },
      { n: 3, label: "If native: pay the gate fees (one-time + annual)" },
      { n: 4, label: "Submit the build I hand you — I do the upload, you click 'Submit for Review'" },
      { n: 5, label: "Reply to Apple's reviewer questions within 24 hours (they always ask 2–3 questions)" },
    ],
    decision: {
      question: "Two ways to do this — pick one before I build",
      options: [
        {
          title: "Route A — Official app stores (Apple + Google)",
          cost: "$99/year Apple + $25 one-time Google = $124 first year, $99/year after",
          recommend: true,
          pros: [
            "Reaches the 99% of people who only install apps from the official stores",
            "Real install metrics, app-store SEO, reviews you can show off",
            "Apple/Google take $0 from you — the fees are gate fees, not revenue cuts",
            "Because no payments live in the app, the 30% IAP tax never applies — saves you forever",
          ],
          cons: [
            "$99/year forever for iOS is unavoidable — there's no free tier for native iOS distribution",
            "Apple reviews can be picky; expect 2–3 rounds of back-and-forth before approval",
            "Cannot mention pricing or 'subscribe' inside the app without their permission",
          ],
        },
        {
          title: "Route B — PWAs only (free forever)",
          cost: "$0",
          pros: [
            "Zero gate fees. No Apple, no Google, no fees, ever",
            "Installable directly from the browser — 'Add to Home Screen' on iOS, install on Android",
            "Updates ship instantly without app review",
            "Listed for free on PWA directories like progressier.app, appsco.pe, pwa-directory",
          ],
          cons: [
            "Most people don't know what a PWA is — you'd need to teach every signup how to install it",
            "Not searchable in the App Store or Play Store — invisible to 99% of phone users",
            "iOS PWA support has limits (no push notifications until iOS 16.4+, no widgets)",
          ],
        },
      ],
    },
    accent: "from-blue-500/20 to-cyan-500/20 border-blue-500/40",
  },
  {
    n: 3,
    name: "Earned Media (HARO + Qwoted + Reddit)",
    icon: Newspaper,
    status: "i-build-next",
    timeline: "Ongoing, ~30 min per response",
    cost: "$0",
    summary:
      "Three places where journalists actively ask for expert quotes from people like you. Reply to one a day, and 1-in-10 gets you quoted in a real publication. Free press, no PR firm.",
    iBuild: [
      { label: "HARO/Qwoted reply templates in your founder voice (5 templates covering common journalist asks)", done: true },
      { label: "Reddit subreddit map — 10 subreddits with rules, timing, sample posts, and what gets you downvoted (live at /reddit-map)", done: true },
      { label: "Saved reply snippets — 20 paste-ready answers in your founder voice for HN, IH, and Reddit (live at /reply-snippets)", done: true },
    ],
    youDo: [
      { n: 1, label: "Sign up for free HARO accounts at connectively.us (free tier) and qwoted.com (free tier)" },
      { n: 2, label: "Set keyword alerts: 'social media', 'censorship', 'indie founder', 'self-hosting'" },
      { n: 3, label: "Reply to 1 journalist request a day with the template I write — 5 minutes per reply" },
    ],
    cta: { label: "Open HARO Templates", href: "/haro-templates" },
    cta2: { label: "Open Reddit Map", href: "/reddit-map" },
    cta3: { label: "Open Reply Snippets", href: "/reply-snippets" },
    accent: "from-amber-500/20 to-yellow-500/20 border-amber-500/40",
  },
  {
    n: 4,
    name: "Local & Community Press",
    icon: MapPin,
    status: "i-build-next",
    timeline: "1-week sprint",
    cost: "$0",
    summary:
      "Local newspapers, alt-weeklies, and college campus papers near you. Every editor of every local paper is starved for stories. A one-person founder building a 'no-algorithm town square' is exactly the story they want.",
    iBuild: [
      { label: "3 pitch templates tailored to local press (founder story / anti-algorithm / TV morning show) — live at /local-press", done: true },
      { label: "Newsroom map — search links for TV affiliates, daily papers, alt-weeklies, university papers, neighborhood blogs, chambers, calendars (auto-tailored to your city)", done: true },
      { label: "Press kit one-pager — copy/paste ready, auto-fills your city", done: true },
      { label: "Nextdoor playbook — 5-step sequence to avoid auto-flagging", done: true },
    ],
    youDo: [
      { n: 1, label: "Enter your city on the Local Press page — everything tailors instantly" },
      { n: 2, label: "Run the discovery week: Mon find outlets, Tue–Thu send pitches, Fri Nextdoor + calendars" },
      { n: 3, label: "Send pitches to 20–30 editors over the week using the templates" },
      { n: 4, label: "Do a 15-minute phone interview if anyone bites — most will say no, that's fine" },
    ],
    cta: { label: "Open Local Press", href: "/local-press" },
    accent: "from-rose-500/20 to-pink-500/20 border-rose-500/40",
  },
  {
    n: 5,
    name: "Audience Amplifiers (in your own apps)",
    icon: Users,
    status: "i-build-next",
    timeline: "1 week",
    cost: "$0",
    summary:
      "The cheapest, highest-converting distribution is the people already using your apps inviting their friends. Build the invite path inside tpts, the share buttons inside Forge Press, and the 'tell a neighbor' nudge on the welcome email.",
    iBuild: [
      { label: "TPTS invite system — shareable links with first-name personalization", done: false },
      { label: "Forge Press 'share this article' buttons — LinkedIn, Facebook, Reddit, Email, Copy link (no X, per your preference)", done: true },
      { label: "Welcome-email P.S. line — invites readers to share 13moonforge.ai with one builder they know (live in the mailbox welcome)", done: true },
    ],
    youDo: [
      { n: 1, label: "Approve the invite copy before I ship it (I'll show you drafts)" },
      { n: 2, label: "Send your own first 10 invites to people you know" },
      { n: 3, label: "Publish one Forge Press article and use the new share buttons on it — that's your first test of the amplifier loop" },
    ],
    cta: { label: "Open Forge Press (share buttons live)", href: "/forge-press" },
    accent: "from-purple-500/20 to-fuchsia-500/20 border-purple-500/40",
  },
  {
    n: 6,
    name: "Paid Acceleration",
    icon: DollarSign,
    status: "skip-for-now",
    timeline: "—",
    cost: "$50–$5,000 / month — SKIP",
    summary:
      "Sparkloop newsletter swaps, podcast ad reads, paid Reddit, Meta ads, BetaList Boosted. These move the needle fast but burn cash. You said no. We don't touch these until you decide to.",
    iBuild: [
      { label: "Nothing right now — explicitly de-scoped at your request", done: false },
    ],
    youDo: [
      { n: 1, label: "If/when you want to revisit, tell me and I'll build a budget breakdown" },
    ],
    accent: "from-zinc-500/10 to-zinc-500/10 border-zinc-500/30",
  },
];

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string; icon: any }> = {
    "done": { label: "Built — you can use it now", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40", icon: CheckCircle2 },
    "ready-for-you": { label: "My part done — your turn", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40", icon: CheckCircle2 },
    "i-build-next": { label: "I build when you give the go-ahead", cls: "bg-blue-500/15 text-blue-400 border-blue-500/40", icon: Hammer },
    "your-call": { label: "Needs your decision first", cls: "bg-amber-500/15 text-amber-400 border-amber-500/40", icon: AlertTriangle },
    "skip-for-now": { label: "Skipped at your request", cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40", icon: Clock },
  };
  const x = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", x.cls)}>
      <x.icon className="w-3.5 h-3.5" />
      {x.label}
    </span>
  );
}

export default function DistributionPlan() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold mb-4">
            <Map className="w-3.5 h-3.5" />
            Distribution Plan · 6 Tiers · No middlemen
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            Your tier plan, end to end
          </h1>
          <p className="text-muted-foreground text-lg max-w-3xl">
            Every move you can make to get your apps in front of real humans, sorted from cheapest-fastest to expensive-skip. Each tier is split into <span className="font-semibold text-foreground">what I've built or will build</span> and <span className="font-semibold text-foreground">what you do</span>. No surprises.
          </p>

          <div className="mt-6 p-4 rounded-lg bg-secondary/50 border border-border text-sm">
            <div className="font-semibold mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              The rule that drives everything
            </div>
            <p className="text-muted-foreground">
              No money flows through Apple or Google. Mobile apps are reader/companion only — "a basic way to check things on the go." Anyone who wants to pay you, subscribe, or send funds is linked over to the web, where the platform takes 0%.
            </p>
          </div>
        </div>

        {/* Tiers */}
        <div className="space-y-8">
          {TIERS.map((t) => (
            <section
              key={t.n}
              id={`tier-${t.n}`}
              className={cn("rounded-xl border bg-gradient-to-br p-6 md:p-8", t.accent)}
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="shrink-0 w-14 h-14 rounded-xl bg-background/60 border border-border flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">Tier</div>
                    <div className="text-2xl font-bold leading-none">{t.n}</div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <t.icon className="w-5 h-5" />
                    <h2 className="text-2xl font-bold">{t.name}</h2>
                  </div>
                  <div className="mb-2"><StatusPill status={t.status} /></div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    <span><Clock className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />{t.timeline}</span>
                    <span><DollarSign className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />{t.cost}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm leading-relaxed mb-5">{t.summary}</p>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="rounded-lg bg-background/50 border border-border p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Hammer className="w-3.5 h-3.5" />
                    What I build
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {t.iBuild.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        {item.done ? (
                          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                        ) : (
                          <div className="w-4 h-4 mt-0.5 shrink-0 rounded-sm border border-muted-foreground/50" />
                        )}
                        <span className={item.done ? "text-foreground/90" : "text-foreground/80"}>
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg bg-background/50 border border-border p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5" />
                    What you do
                  </h3>
                  <ol className="space-y-2 text-sm">
                    {t.youDo.map((item) => (
                      <li key={item.n} className="flex items-start gap-2.5">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-bold flex items-center justify-center">
                          {item.n}
                        </span>
                        <span className="flex-1">
                          {item.label}
                          {item.minutes && (
                            <span className="block text-xs text-muted-foreground mt-0.5">{item.minutes}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {t.decision && (
                <div className="mt-5 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    {t.decision.question}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {t.decision.options.map((opt, i) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded-lg border p-4",
                          opt.recommend ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-background/40"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-sm">{opt.title}</h4>
                          {opt.recommend && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/15">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground mb-3">{opt.cost}</div>
                        <div className="space-y-2 text-xs">
                          <div>
                            <div className="font-semibold text-emerald-400 mb-1">Pros</div>
                            <ul className="space-y-1 text-muted-foreground">
                              {opt.pros.map((p, j) => <li key={j}>• {p}</li>)}
                            </ul>
                          </div>
                          <div>
                            <div className="font-semibold text-rose-400 mb-1">Cons</div>
                            <ul className="space-y-1 text-muted-foreground">
                              {opt.cons.map((c, j) => <li key={j}>• {c}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(t.cta || t.cta2 || t.cta3) && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {t.cta && (
                    <Button asChild>
                      {t.cta.external ? (
                        <a href={t.cta.href} target="_blank" rel="noreferrer">
                          {t.cta.label} <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                        </a>
                      ) : (
                        <Link href={t.cta.href}>
                          {t.cta.label} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Link>
                      )}
                    </Button>
                  )}
                  {t.cta2 && (
                    <Button asChild variant="outline">
                      {t.cta2.external ? (
                        <a href={t.cta2.href} target="_blank" rel="noreferrer">
                          {t.cta2.label} <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                        </a>
                      ) : (
                        <Link href={t.cta2.href}>
                          {t.cta2.label} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Link>
                      )}
                    </Button>
                  )}
                  {t.cta3 && (
                    <Button asChild variant="outline">
                      {t.cta3.external ? (
                        <a href={t.cta3.href} target="_blank" rel="noreferrer">
                          {t.cta3.label} <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                        </a>
                      ) : (
                        <Link href={t.cta3.href}>
                          {t.cta3.label} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Link>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 rounded-lg border border-border bg-secondary/30 p-5 text-sm">
          <div className="font-semibold mb-2 flex items-center gap-2">
            <Rocket className="w-4 h-4" />
            The bottom line
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Tier 1 is ready — go submit. Tier 2 (mobile apps) needs your call on route. Tiers 3–5 I build the moment you say go. Tier 6 stays off the table unless you decide otherwise. Nothing in this plan asks you to spend a dollar except the $124 first-year Apple/Google fees, and only if you pick Route A in Tier 2.
          </p>
        </div>

        <div className="mt-10">
          <AppFamily currentAppId="forge" />
        </div>
      </div>
    </div>
  );
}
