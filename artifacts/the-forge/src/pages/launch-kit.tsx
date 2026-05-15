import { useState } from "react";
import {
  Rocket, Copy, CheckCircle2, ExternalLink, Users, MapPin,
  Hammer, Globe, Sparkles, Newspaper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Field = { label: string; value: string; long?: boolean };
type Platform = {
  id: string;
  name: string;
  url: string;
  icon: any;
  accent: string;
  tagline: string;
  why: string;
  leadApp: string;
  fields: Field[];
  steps: string[];
};

const TPTS_URL = "https://thepeoplestownsquare.ai";
const FORGE_URL = "https://13moonforge.ai";

const FOUNDER_BIO =
  "Built by Ezekiel Evans — one person, no VCs, no ad team. Self-hosted on community-owned infrastructure. The founding promise is simple: no one can be erased here.";

const TPTS_PITCH_SHORT =
  "Social media for real people. No algorithms, no shadow-banning, and a delete-proof Book of Names archive that physically cannot remove anyone. You can talk, sell, trade, and directly fund the people you love.";

const TPTS_PITCH_LONG = `The People's Digital Town Square is a social platform built for real humans who are tired of algorithmic suppression, shell-game moderation, and "free speech" that disappears the moment it gets inconvenient.

Three things make it different:

1. The Book of Names — a delete-proof archive. Every real human who joins is recorded in a registry that the platform itself cannot delete from. Database-level locks reject any DELETE, UPDATE, or TRUNCATE against the member archive, even from the server's own admin. The promise "no one can erase you" is enforced by Postgres, not by company policy.

2. No algorithm. The feed is chronological. No shadow-banning, no engagement-optimization, no rage-baiting. What you see is what your community is actually posting, in the order they posted it.

3. Mutual economy built in. You can lend a friend $20. You can buy from a neighbor. You can fund a creator you trust. The platform takes no cut on peer-to-peer support.

Built by one person, hosted on community-owned infrastructure, free to use, open about how it works.`;

const PLATFORMS: Platform[] = [
  {
    id: "product-hunt",
    name: "Product Hunt",
    url: "https://www.producthunt.com/posts/new",
    icon: Rocket,
    accent: "from-orange-500/20 to-red-500/20 border-orange-500/40",
    tagline: "One-day launch · 100k+ curious humans · Top-5 finish = 2k–10k signups",
    why: "The single highest-leverage free launch venue on the web. A top-5 finish on launch day drives thousands of signups in 24 hours and a permanent backlink that ranks in Google forever. Schedule launch for 12:01 AM PST on a Tuesday or Wednesday for best results.",
    leadApp: "The People's Digital Town Square",
    fields: [
      { label: "Name", value: "The People's Digital Town Square" },
      { label: "Tagline (60 chars max)", value: "Delete-proof social media. No algorithm. Real humans only." },
      { label: "Description", value: TPTS_PITCH_SHORT, long: true },
      { label: "Topics / categories", value: "Social Media, Social Networking, Community, Open Source" },
      {
        label: "First comment from the maker (paste this on launch day)",
        long: true,
        value: `Hey Product Hunt — Ezekiel here.

I built The People's Town Square after watching too many real people get erased from the platforms they helped build. Suppressed posts, shadow-banned accounts, "deleted for community standards" notices on perfectly fine content.

So I built something different. The core feature isn't a feed or a profile — it's a delete-proof archive called the Book of Names. Every real human who joins is recorded in a registry that the database itself rejects DELETE operations against. The promise "no one can erase you" is enforced by Postgres, not by company policy.

A few other things:
• No algorithm. Chronological only. What your community posts is what you see.
• You can directly fund people you trust — lend a friend $20, buy from a neighbor, support a creator. The platform takes no cut.
• Built by one person. Self-hosted on community-owned infrastructure. No VCs, no ads.

Free to use, open about how it works. Try it, tell me what's broken, tell me what's missing. I read every reply.

— Eze`,
      },
    ],
    steps: [
      "Create / log into your Product Hunt account at producthunt.com.",
      "Pick a launch date 1–2 weeks out — Tuesday or Wednesday, 12:01 AM Pacific time.",
      "Go to producthunt.com/posts/new and paste the fields above into the form.",
      "Upload 4–6 gallery images (screenshots of the feed, the Book of Names page, the welcome email, the mobile view).",
      "Add a 30–60 second demo GIF or video walking through signup → first post.",
      "Add yourself as Maker.",
      "Schedule the launch.",
      "On launch day: post the maker comment above first thing in the morning. Reply to every comment within 30 minutes. Share the PH link to anyone you know.",
    ],
  },
  {
    id: "betalist",
    name: "BetaList",
    url: "https://betalist.com/submit",
    icon: Sparkles,
    accent: "from-purple-500/20 to-pink-500/20 border-purple-500/40",
    tagline: "Newsletter + waitlist site read daily by early adopters",
    why: "BetaList's audience are humans who specifically hunt for new things to try before everyone else. A feature there drives 500–2,000 highly-engaged signups and gets you onto every aggregator that scrapes BetaList (which is most of them).",
    leadApp: "The People's Digital Town Square",
    fields: [
      { label: "Startup name", value: "The People's Digital Town Square" },
      { label: "URL", value: TPTS_URL },
      { label: "Tagline", value: "The delete-proof social network for real humans." },
      { label: "Description (paste in the long-form field)", long: true, value: TPTS_PITCH_LONG },
      { label: "Categories", value: "Social Network, Community, Open Source, Privacy" },
      { label: "Maker name", value: "Ezekiel Evans" },
      { label: "Maker bio (one line)", value: FOUNDER_BIO },
    ],
    steps: [
      "Go to betalist.com/submit.",
      "Fill in startup name, URL, tagline, and the long description above.",
      "Upload 1 logo (square, transparent background) and 1 screenshot of the homepage.",
      "Add Ezekiel as the maker with the bio above and a link to your personal site / X / LinkedIn.",
      "Submit. Review takes 5–14 days. If approved, your feature day brings the bulk of traffic in a 48-hour window.",
    ],
  },
  {
    id: "alternativeto",
    name: "AlternativeTo.net",
    url: "https://alternativeto.net/account/login",
    icon: Globe,
    accent: "from-blue-500/20 to-cyan-500/20 border-blue-500/40",
    tagline: "Where people type \"alternative to Facebook\" into Google and find you forever",
    why: "Permanent SEO real estate. Each listing ranks on the first page of Google for \"alternative to [big platform]\" searches. Listings stay live and accumulate upvotes/reviews for years. We can list multiple Forge apps here — one per app.",
    leadApp: "All apps — one listing each",
    fields: [
      {
        label: "Listing #1 — The People's Town Square",
        long: true,
        value: `Name: The People's Digital Town Square
URL: ${TPTS_URL}
Tags: social-network, decentralized, open-source, privacy-focused, no-ads
Alternative to: Facebook, Twitter / X, Threads, Bluesky, Truth Social
Description: ${TPTS_PITCH_SHORT}
Platforms: Web, iOS (PWA), Android (PWA)
License: Source-available, free to use`,
      },
      {
        label: "Listing #2 — The Forge (13 Moon Forge)",
        long: true,
        value: `Name: 13 Moon Forge
URL: ${FORGE_URL}
Tags: ai-development, no-code, self-hosting, developer-tools
Alternative to: Replit, Lovable, Bolt.new, v0, Cursor
Description: AI-powered platform that builds full applications and deploys them to your own infrastructure. Includes Forge Press (free PR distribution), Brand Scout, Code Vault, App Hub, and Sovereign Stack tooling.
Platforms: Web
License: Source-available`,
      },
      {
        label: "Listing #3 — 13 Moon Film Editor",
        long: true,
        value: `Name: 13 Moon Film Editor
URL: ${FORGE_URL}/film-editor
Tags: video-editing, browser-based, no-install
Alternative to: CapCut, Adobe Premiere, DaVinci Resolve, Clipchamp
Description: Browser-based film editor with AI assist. No install, no subscription, works on any device.
Platforms: Web
License: Free`,
      },
      {
        label: "Listing #4 — EzQuill",
        long: true,
        value: `Name: EzQuill
URL: ${FORGE_URL}/ezquill
Tags: writing, note-taking, ai-writing
Alternative to: Notion, Obsidian, Bear, Roam Research
Description: A clean, focused writing tool from the 13 Moon ecosystem. AI-assisted, no lock-in, exports cleanly.
Platforms: Web
License: Free`,
      },
    ],
    steps: [
      "Create an account at alternativeto.net (or sign in if you have one).",
      "For each listing above: click \"Add app\" in the top nav.",
      "Paste the name, URL, tags, and \"alternative to\" list from each block above.",
      "Upload a square icon for each app (256×256 PNG works).",
      "Submit. Approval takes 1–3 days per listing.",
      "After approval: ask 5–10 humans you know to leave honest reviews — that's what pushes a listing to the top of \"alternative to Facebook\" results.",
    ],
  },
  {
    id: "indie-hackers",
    name: "Indie Hackers",
    url: "https://www.indiehackers.com/post/new",
    icon: Hammer,
    accent: "from-amber-500/20 to-yellow-500/20 border-amber-500/40",
    tagline: "100k+ builders and curious humans · founder-story posts go far",
    why: "Indie Hackers loves a real founder story more than any other community on the web. A well-written launch post regularly hits 500–2,000 upvotes and lives on the homepage for 24+ hours. Lead with the story, not the features.",
    leadApp: "The whole ecosystem — founder story",
    fields: [
      {
        label: "Post title",
        value: "I built a delete-proof social network because I watched real people get erased — and the database itself refuses to lose them",
      },
      {
        label: "Category",
        value: "Milestones (or Show IH if you have a launch milestone, e.g. \"first 100 humans\")",
      },
      {
        label: "Post body",
        long: true,
        value: `Hey Indie Hackers — Eze here.

Last year I watched accounts I cared about get suppressed, shadow-banned, and quietly deleted across every major platform. Not for breaking real rules. For inconvenient opinions. Real people I knew — their voices, their followers, their work — gone in an afternoon.

So I spent the last six months building The People's Digital Town Square (${TPTS_URL}). It's a social network with three rules baked into the architecture itself:

**1. The Book of Names — a delete-proof archive.**
The members table has Postgres-level triggers that reject any DELETE, UPDATE, or TRUNCATE operation against it. Even the admin (me) cannot delete a real human's record from the registry. The promise "no one can erase you" isn't a policy. It's enforced by the database.

**2. No algorithm.**
Chronological feed. No engagement-optimization, no shadow-banning, no "for you" page. Your community is what you see. That's it.

**3. Mutual economy.**
You can directly fund anyone — lend a friend $20, support a creator, buy from a neighbor. The platform takes $0. The integration is already wired (Square + Coinbase Commerce).

It's not the prettiest thing I've ever shipped. The mobile app needs polish. The discovery experience is rough. But the core promise works, and it works the way I said it would.

I'm at ~17 real humans right now. That's tiny and I'm at peace with that — the next year is about reaching the people this was built for, not chasing vanity metrics.

If any of this resonates, you can sign up at ${TPTS_URL}. If you want to follow along instead, my whole ecosystem is at ${FORGE_URL}.

Happy to answer any technical questions about the delete-proof architecture or the philosophy behind it. Reply to any comment and I will see it.

— Eze`,
      },
    ],
    steps: [
      "Sign in at indiehackers.com.",
      "Click \"Post\" in the top nav.",
      "Pick the Milestones category (or Show IH if you can frame it as a specific milestone).",
      "Paste the title and body above.",
      "Post on a Tuesday or Wednesday morning (Eastern time) for max visibility.",
      "Reply to every single comment for the first 8 hours — that's how IH posts climb.",
    ],
  },
  {
    id: "hacker-news",
    name: "Hacker News — Show HN",
    url: "https://news.ycombinator.com/submit",
    icon: Newspaper,
    accent: "from-orange-600/20 to-red-600/20 border-orange-600/40",
    tagline: "Front-page spot = 20k visitors in 6 hours · technical novelty wins",
    why: "HN's audience is brutally smart and allergic to marketing. They love technical novelty and hate hype. The delete-proof Book of Names is genuine novelty — most HN readers have never seen DB-level triggers used as a guarantee against the platform owner. Lead with the technical story.",
    leadApp: "tpts — but framed as a database/architecture story",
    fields: [
      {
        label: "Title (Show HN format)",
        value: "Show HN: I made my social network's member registry physically undeletable",
      },
      { label: "URL", value: TPTS_URL },
      {
        label: "Text (only fill the \"text\" field if you don't want it to be a link post — pick one)",
        long: true,
        value: `I run a small social platform called The People's Town Square. After watching enough real users get silently scrubbed from larger networks, I wanted a hard guarantee that my own platform — including me, the admin — could never erase someone.

So I added a Postgres trigger-based lock to the members archive table. DELETE, UPDATE, and TRUNCATE against members_registry.members all raise an exception. Inserts and read-only queries work normally. There's an internal "override" session variable for one specific use case (correcting an obviously-spam first-write within 60 seconds), but the override is logged to a separate append-only audit table.

The result: the platform's "no one gets erased" promise is enforced by the database, not by company policy. If a future me, or a future bug, or a future bad actor with admin credentials tries to remove a person from the record, Postgres refuses.

Live at ${TPTS_URL}. The schema, including the locks, will be open-sourced this month.

Things I'm curious to hear from HN:
- Real ways to defeat this guarantee (DROP TRIGGER, pg_class manipulation, restoring from a tampered backup, etc.) — what's the strongest version of this?
- Patterns anyone else has used for "the platform owner cannot delete this" guarantees.
- Whether the override (60-second window for spam correction) is too generous.

Happy to share the actual SQL if there's interest.`,
      },
    ],
    steps: [
      "Sign into news.ycombinator.com.",
      "Click \"submit\" in the top right.",
      "Use the title above exactly — \"Show HN:\" prefix matters.",
      "For URL: paste the tpts homepage URL. For text: leave blank if URL is set (HN allows one or the other). If you want the technical story up front, leave URL blank and paste the text instead.",
      "Submit on a Tuesday, Wednesday, or Thursday around 8–10 AM Eastern.",
      "Stay glued to the thread for the first 2 hours. Reply technically to every comment. Never argue, never get defensive — HN respects measured technical replies and punishes everything else.",
    ],
  },
  {
    id: "nextdoor",
    name: "Nextdoor (hyperlocal)",
    url: "https://nextdoor.com",
    icon: MapPin,
    accent: "from-green-500/20 to-emerald-500/20 border-green-500/40",
    tagline: "Verified neighbors only · perfect venue for tpts specifically",
    why: "Every other listing on this page reaches strangers on the internet. Nextdoor reaches your actual neighbors — verified by address. tpts's whole pitch (\"a town square for real humans in real communities\") lands harder here than anywhere else. Start in your own neighborhood, expand to surrounding ones once verified.",
    leadApp: "The People's Digital Town Square",
    fields: [
      {
        label: "Post title",
        value: "I built a town square for our neighborhood (and others like it)",
      },
      {
        label: "Post body (post in your neighborhood feed)",
        long: true,
        value: `Hey neighbors — Ezekiel here.

I spent the last six months building something I want to share with you first, before anywhere else. It's called The People's Digital Town Square. It's a simple website where neighbors and friends can talk, sell things, trade help, and support each other — without algorithms picking who sees what, and without anyone (including me) being able to erase you.

A few things that make it different from Facebook or Nextdoor:

• Posts are shown in the order they were posted. No algorithm deciding what's "relevant."
• You can lend a neighbor $20 or buy from a small business on here, directly. The site takes nothing.
• Your account literally cannot be deleted by me or anyone else. That's not a promise — it's wired into the database.
• Free to use. Always will be.

I'd love to have our neighborhood be one of the first real communities on it. If you'd like to try it, the site is ${TPTS_URL}. If you have ideas, problems, or questions, comment below or message me directly — I read every one.

Thanks for being good neighbors. Let's build something that actually serves us.

— Eze`,
      },
    ],
    steps: [
      "Sign into nextdoor.com (or download the app) — your address must be verified.",
      "Open your neighborhood's main feed.",
      "Click \"Post\" → choose \"General\" or \"Recommendations\" depending on what's allowed in your area.",
      "Paste the title and body above. Keep it warm and local — Nextdoor flags anything that reads like a sales pitch.",
      "Reply to every single neighbor who comments within 30 minutes. This is the most important step — Nextdoor is reputation-driven.",
      "After 2–3 weeks: ask Nextdoor to widen your visibility to nearby neighborhoods (Settings → Nearby Neighborhoods). Repeat the post there.",
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast({ title: "Copied", description: "Paste it into the submission form." });
          setTimeout(() => setCopied(false), 1800);
        } catch {
          toast({ title: "Copy failed", description: "Select the text manually." });
        }
      }}
      className="h-7 px-2 text-xs"
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export default function LaunchKit() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold mb-4">
            <Rocket className="w-3.5 h-3.5" />
            Launch Kit · 6 Free Distribution Channels
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            Get on every platform without paying gatekeepers
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Six high-leverage launch venues with the exact copy, the submission URL, and the steps — already drafted. Copy, paste, submit. No guessing.
          </p>
        </div>

        {/* Quick nav */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {PLATFORMS.map((p) => (
            <a
              key={p.id}
              href={`#${p.id}`}
              className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 border border-border transition-colors"
            >
              <p.icon className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              {p.name}
            </a>
          ))}
        </div>

        {/* Platforms */}
        <div className="space-y-12">
          {PLATFORMS.map((p, idx) => (
            <section
              key={p.id}
              id={p.id}
              className={cn(
                "rounded-xl border bg-gradient-to-br p-6 md:p-8 scroll-mt-8",
                p.accent
              )}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-background/60 border border-border flex items-center justify-center">
                  <p.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                    <h2 className="text-2xl font-bold">{p.name}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.tagline}</p>
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <a href={p.url} target="_blank" rel="noreferrer">
                    Open <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </a>
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Why this venue</h3>
                  <p className="text-sm leading-relaxed mb-4">{p.why}</p>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold">Lead app: </span>{p.leadApp}
                  </div>

                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-6 mb-2">Steps to submit</h3>
                  <ol className="list-decimal list-inside space-y-1.5 text-sm text-foreground/90">
                    {p.steps.map((s, i) => (
                      <li key={i} className="leading-relaxed">{s}</li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ready to copy</h3>
                  <div className="space-y-3">
                    {p.fields.map((f, i) => (
                      <div key={i} className="rounded-lg bg-background/60 border border-border p-3">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="text-xs font-semibold text-muted-foreground">{f.label}</div>
                          <CopyButton text={f.value} />
                        </div>
                        <div className={cn(
                          "text-sm whitespace-pre-wrap break-words font-mono leading-relaxed",
                          f.long ? "max-h-48 overflow-y-auto" : ""
                        )}>
                          {f.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary border border-border text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            Need help on any of these? Open Forge Press or Brand Scout — they pair with this kit.
          </div>
        </div>
      </div>
    </div>
  );
}
