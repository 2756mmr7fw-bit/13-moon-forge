import {
  KeyRound, ExternalLink, CheckCircle2, AlertCircle, Lock,
  Megaphone, Smartphone, Newspaper, Hash, Building2, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppFamily } from "@/components/app-family";

type SiteStatus = "you-likely-have" | "you-likely-need" | "decision-pending";

type Site = {
  n: number;
  name: string;
  url: string;
  what: string;
  status: SiteStatus;
  steps?: string[];
  note?: string;
};

type Group = {
  title: string;
  icon: any;
  blurb: string;
  sites: Site[];
};

const GROUPS: Group[] = [
  {
    title: "Distribution (Tier 1) — submit your apps",
    icon: Megaphone,
    blurb: "These are the 6 free venues from your Launch Kit. Create one account at each, then submit.",
    sites: [
      {
        n: 1,
        name: "Nextdoor",
        url: "https://nextdoor.com",
        what: "Hyperlocal neighbors-only social network. You post in your verified neighborhood feed.",
        status: "you-likely-need",
        steps: [
          "Go to nextdoor.com and click 'Sign up.'",
          "Enter your real address — Nextdoor verifies via postcard, phone, or credit-card billing address.",
          "Wait for verification (24–72 hrs by postcard; instant by phone/CC).",
          "Once verified: open your neighborhood feed, paste your Launch Kit post, hit publish.",
        ],
      },
      {
        n: 2,
        name: "AlternativeTo",
        url: "https://alternativeto.net/account/signup",
        what: "Search index ranking on Google for 'alternative to Facebook/Twitter/Notion/etc.' One account, 4 listings.",
        status: "you-likely-need",
        steps: [
          "Sign up at alternativeto.net (email or Google login).",
          "Confirm email.",
          "Click 'Add app' in the top nav, paste each of the 4 listings from your Launch Kit.",
        ],
      },
      {
        n: 3,
        name: "Indie Hackers",
        url: "https://www.indiehackers.com/login",
        what: "100k+ builders + curious humans. Best home for the founder story.",
        status: "you-likely-need",
        steps: [
          "Sign in with email at indiehackers.com.",
          "Fill the profile: name, bio (one line), photo, link to 13moonforge.ai.",
          "Post the launch story from your Launch Kit Tuesday or Wednesday morning Eastern.",
        ],
      },
      {
        n: 4,
        name: "BetaList",
        url: "https://betalist.com/submit",
        what: "Curated early-adopter waitlist site + newsletter. Submit once, they review, they feature.",
        status: "you-likely-need",
        steps: [
          "Go to betalist.com/submit — no account needed, just fill the form.",
          "Submit, then check your email in 5–14 days for the editor's response.",
        ],
      },
      {
        n: 5,
        name: "Hacker News",
        url: "https://news.ycombinator.com/login",
        what: "Show HN — the tech crowd. Frontpage post = 20k visitors in 6 hours.",
        status: "you-likely-need",
        steps: [
          "Create an account at news.ycombinator.com — pick a simple username (your first name or initials).",
          "Wait 1–2 weeks before posting your Show HN — brand-new accounts get flagged.",
          "In the meantime, comment thoughtfully on 5–10 posts to build minimal karma.",
          "Then post your Show HN on a Tue/Wed/Thu, 8–10 AM Eastern.",
        ],
        note: "HN is anti-marketing. The lower your karma when posting, the more skeptical the crowd. Two weeks of light commenting fixes this.",
      },
      {
        n: 6,
        name: "Product Hunt",
        url: "https://www.producthunt.com/signup",
        what: "The biggest one-day launch venue. Top-5 finish = 2k–10k signups in 24 hrs.",
        status: "you-likely-need",
        steps: [
          "Sign up at producthunt.com with X or Google.",
          "Fill your maker profile fully — photo, bio, link to all your apps, link to X/LinkedIn.",
          "Follow 30–50 other makers (gets you on their radar before launch).",
          "When ready, go to producthunt.com/posts/new and use your Launch Kit copy.",
          "Schedule for 12:01 AM Pacific on a Tuesday or Wednesday.",
        ],
      },
    ],
  },
  {
    title: "App stores (Tier 2) — only if you pick Route A",
    icon: Smartphone,
    blurb: "Skip this whole group if you decide on the free PWA route in your Distribution Plan.",
    sites: [
      {
        n: 7,
        name: "Apple Developer Program",
        url: "https://developer.apple.com/programs/enroll/",
        what: "Required to publish anything to the iOS App Store. $99/year. No free tier exists.",
        status: "decision-pending",
        steps: [
          "Sign in with an Apple ID at developer.apple.com.",
          "Click Enroll → choose Individual (faster) or Organization (requires D-U-N-S number, 1–2 wks).",
          "Pay the $99 annual fee.",
          "Approval: 24–48 hrs for individual enrollment.",
          "Once approved, I can upload the build via App Store Connect — you just click 'Submit for Review.'",
        ],
        note: "Individual enrollment is fastest. Organization enrollment shows '13 Moon Forge' instead of your name on the App Store but requires a D-U-N-S business number.",
      },
      {
        n: 8,
        name: "Google Play Console",
        url: "https://play.google.com/console/signup",
        what: "Required to publish anything to Google Play. $25 one-time fee, no annual.",
        status: "decision-pending",
        steps: [
          "Sign in with a Google account at play.google.com/console.",
          "Choose Developer Account (Individual) — same warning re: D-U-N-S as Apple.",
          "Pay $25 one-time.",
          "Approval is usually instant.",
          "First app submission requires 20 closed-test users for 14 days before public release (Google policy since 2023).",
        ],
        note: "The 14-day closed test rule means start the Google submission BEFORE the Apple submission — Apple is faster overall.",
      },
    ],
  },
  {
    title: "Earned media (Tier 3) — free press from journalists",
    icon: Newspaper,
    blurb: "Two services where journalists post 'I'm writing a story about X, who can I quote?' You reply with the templates I'll write. 1-in-10 gets you quoted.",
    sites: [
      {
        n: 9,
        name: "Connectively (formerly HARO)",
        url: "https://www.connectively.us/",
        what: "Journalists post queries; you reply with a quote. The biggest of these networks.",
        status: "you-likely-need",
        steps: [
          "Sign up at connectively.us — free tier sends you 3 emails/day of journalist queries.",
          "Set keyword alerts: 'social media,' 'censorship,' 'indie founder,' 'self-hosting,' 'creator economy.'",
          "Reply to one a day with the template I write — takes 5 min.",
        ],
      },
      {
        n: 10,
        name: "Qwoted",
        url: "https://www.qwoted.com/",
        what: "Same idea, smaller pool, higher hit rate (journalists are usually more responsive).",
        status: "you-likely-need",
        steps: [
          "Sign up at qwoted.com — free.",
          "Build a 'Source Profile' with your bio and expertise areas (I'll draft).",
          "Reply to 1–2 queries a day.",
        ],
      },
    ],
  },
  {
    title: "Founder presence — be findable as a real human",
    icon: Hash,
    blurb: "Journalists will Google you before quoting you. These are the four places that need to exist.",
    sites: [
      {
        n: 11,
        name: "X (Twitter)",
        url: "https://x.com/signup",
        what: "Founders without an X account get ignored by the tech press. The bar is low — just exist there.",
        status: "you-likely-need",
        steps: [
          "Create an account with your real name (Ezekiel Evans) or a handle people will recognize.",
          "Profile: bio one-liner, link to 13moonforge.ai, header image, real photo.",
          "Post 1 thing a day for 2 weeks before launching. Doesn't have to be brilliant.",
        ],
      },
      {
        n: 12,
        name: "LinkedIn",
        url: "https://www.linkedin.com/signup",
        what: "Local press, regional VCs, and corporate journalists check LinkedIn first. Need a basic profile.",
        status: "you-likely-need",
        steps: [
          "Create a profile with your real name and current title: 'Founder, 13 Moon Forge.'",
          "Add a one-paragraph 'About' section (I can write this).",
          "List 13 Moon Forge as current employer with a 2-sentence description.",
        ],
      },
      {
        n: 13,
        name: "Reddit",
        url: "https://www.reddit.com/register",
        what: "Communities like r/SideProject, r/SelfHosted, r/Entrepreneur are real distribution channels — but only if you have karma.",
        status: "you-likely-need",
        steps: [
          "Create an account at reddit.com.",
          "Comment thoughtfully in 5–10 posts a week for 3 weeks BEFORE you submit anything of your own.",
          "Reddit hard-bans accounts that post-and-run with self-promotion. The karma rule is real.",
        ],
        note: "I'll give you the exact subreddit list + rules + post timing once you have 100+ karma.",
      },
      {
        n: 14,
        name: "GitHub (you already have this)",
        url: "https://github.com/settings/profile",
        what: "Tech journalists and HN readers check your GitHub. Make sure your profile is clean and links to 13moonforge.ai.",
        status: "you-likely-have",
        steps: [
          "Add a profile bio: 'Founder, 13 Moon Forge. Building tools that nobody can take away from you.'",
          "Pin your most public-facing repos.",
          "Add 13moonforge.ai to the website field.",
        ],
      },
    ],
  },
  {
    title: "Operational accounts you already have",
    icon: Lock,
    blurb: "These are wired into your apps via API keys — no action needed. Listed here so you can find their dashboards.",
    sites: [
      {
        n: 15,
        name: "Resend (email)",
        url: "https://resend.com/login",
        what: "Sends every transactional email across your apps. Free tier is generous.",
        status: "you-likely-have",
      },
      {
        n: 16,
        name: "SendGrid (email backup)",
        url: "https://app.sendgrid.com/login",
        what: "Backup email provider.",
        status: "you-likely-have",
      },
      {
        n: 17,
        name: "Clerk (auth)",
        url: "https://dashboard.clerk.com",
        what: "User accounts across all your apps — one login, every app.",
        status: "you-likely-have",
      },
      {
        n: 18,
        name: "Square (payments)",
        url: "https://squareup.com/dashboard",
        what: "Card processing for the funnel + tpts. You receive money here.",
        status: "you-likely-have",
      },
      {
        n: 19,
        name: "Coinbase Commerce (crypto payments)",
        url: "https://commerce.coinbase.com/dashboard",
        what: "Crypto payment processing for the funnel.",
        status: "you-likely-have",
      },
      {
        n: 20,
        name: "Coolify (your server)",
        url: "http://5.78.154.21:8000",
        what: "The dashboard where your apps actually run. Bookmark this.",
        status: "you-likely-have",
      },
    ],
  },
];

function StatusBadge({ status }: { status: SiteStatus }) {
  const map = {
    "you-likely-have": { label: "You already have this", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40", icon: CheckCircle2 },
    "you-likely-need": { label: "Need to create", cls: "bg-amber-500/15 text-amber-400 border-amber-500/40", icon: AlertCircle },
    "decision-pending": { label: "Only if Route A in Tier 2", cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40", icon: Lock },
  };
  const x = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border", x.cls)}>
      <x.icon className="w-3 h-3" />
      {x.label}
    </span>
  );
}

export default function Accounts() {
  let runningNum = 0;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold mb-4">
            <KeyRound className="w-3.5 h-3.5" />
            Accounts & Sites · 20 places, one checklist
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            Every site you personally need to visit
          </h1>
          <p className="text-muted-foreground text-lg max-w-3xl">
            One checklist of every external account tied to your distribution plan. Each one has the URL, why it matters, and the exact signup steps. Green = you already have it. Amber = need to create. Grey = only if you pick Route A in Tier 2.
          </p>
        </div>

        {/* Groups */}
        <div className="space-y-10">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <div className="flex items-center gap-2 mb-1">
                <g.icon className="w-5 h-5" />
                <h2 className="text-2xl font-bold">{g.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{g.blurb}</p>

              <div className="space-y-3">
                {g.sites.map((s) => {
                  runningNum = s.n;
                  return (
                    <div
                      key={s.n}
                      className="rounded-lg border border-border bg-secondary/20 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-9 h-9 rounded-md bg-background border border-border flex items-center justify-center font-bold text-sm">
                          {s.n}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold">{s.name}</h3>
                            <StatusBadge status={s.status} />
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{s.what}</p>

                          {s.steps && (
                            <ol className="list-decimal list-inside space-y-1 text-sm text-foreground/85 mb-2">
                              {s.steps.map((step, i) => (
                                <li key={i} className="leading-relaxed">{step}</li>
                              ))}
                            </ol>
                          )}

                          {s.note && (
                            <div className="text-xs text-amber-400/90 italic mt-2 pl-3 border-l-2 border-amber-500/40">
                              {s.note}
                            </div>
                          )}
                        </div>
                        <Button asChild size="sm" variant="outline" className="shrink-0">
                          <a href={s.url} target="_blank" rel="noreferrer">
                            Open <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Cross-promo */}
        <div className="mt-12">
          <AppFamily currentAppId="forge" />
        </div>
      </div>
    </div>
  );
}
