import { useState, useRef } from "react";
import { Link } from "wouter";
import {
  Newspaper, Copy, Download, CheckCircle2, Target, TrendingUp, Shield,
  Zap, ChevronRight, RotateCcw, ExternalLink, Search, Users, Bot,
  Globe, Tv2, Crown, BarChart3, Send, Loader2,
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

// Distribution tiers
const DIST_FREE_DIRECT = [
  {
    name: "Google News Publisher Center",
    url: "https://publishercenter.google.com",
    price: "Free — forever",
    model: "Direct application to Google",
    note: "Apply once with your own website. Google indexes every article you publish there. This is the same Google News feed that PRLog and IssueWire pay to access — you skip them entirely.",
    badge: "Best",
    badgeColor: "bg-primary/15 text-primary border-primary/30",
    setupNote: "Requires your own website. Apply at publishercenter.google.com → verify site → done.",
    highlight: true,
  },
  {
    name: "Local NBC / FOX / ABC / CBS affiliates",
    url: "https://www.google.com/search?q=local+news+submit+press+release",
    price: "Free",
    model: "Direct newsroom submission",
    note: "Every local NBC/FOX/ABC/CBS affiliate has a 'Submit News Tip' or 'Community Events' page. Find your city's affiliates and submit directly. No middleman, no fee.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "Search '[your city] NBC affiliate news tip' → submit your article link.",
  },
  {
    name: "LinkedIn Articles",
    url: "https://www.linkedin.com",
    price: "Free",
    model: "Publish on your profile",
    note: "High domain authority — LinkedIn articles index in Google and get pulled into AI chatbots. Your professional network amplifies it immediately.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "Copy your article → LinkedIn → Write an article → publish.",
  },
  {
    name: "Medium",
    url: "https://medium.com",
    price: "Free",
    model: "Publish as a story",
    note: "Medium has extremely high domain authority. Articles here get indexed by ChatGPT, Claude, and Gemini training pipelines and rank in Google News.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "medium.com → New Story → paste your article → publish.",
  },
  {
    name: "Substack",
    url: "https://substack.com",
    price: "Free",
    model: "Publish as a newsletter post",
    note: "Substack posts are publicly indexed by Google and frequently pulled into AI training data. A free Substack newsletter gives you a permanent, searchable archive of every press release you publish.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "substack.com → New Publication → publish your post publicly.",
  },
  {
    name: "OpenPR",
    url: "https://www.openpr.com",
    price: "Free",
    model: "Free press release directory",
    note: "One of the largest free press release directories online. Releases are indexed by Google News and archived permanently. No account tier required — submit and publish for free.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "openpr.com → Submit Press Release → paste your article.",
  },
  {
    name: "PR.com",
    url: "https://www.pr.com",
    price: "Free",
    model: "Free basic listing",
    note: "Free press release submission with permanent indexing. Includes a free business profile page alongside your release — useful for brand authority.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "pr.com → Submit a Press Release → create free account → publish.",
  },
  {
    name: "1888 Press Release",
    url: "https://www.1888pressrelease.com",
    price: "Free",
    model: "Free submission directory",
    note: "A long-running free press release site that syndicates to a network of partner news sites. Good supplemental distribution alongside Google News Publisher Center.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "1888pressrelease.com → Submit → free account → publish.",
  },
  {
    name: "PR Underground",
    url: "https://prunderground.com",
    price: "Free",
    model: "Free distribution network",
    note: "Free press release distribution to Google News, Bing, and a network of regional news sites. No credit card required. Solid reach for zero cost.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "prunderground.com → Submit Release → publish free.",
  },
  {
    name: "Newswire Today",
    url: "https://www.newswiretoday.com",
    price: "Free",
    model: "Free press release wire",
    note: "Free wire service that distributes to RSS feeds, partner sites, and search engines. Been running since 2004 — reliable indexing and long-term archiving.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "newswiretoday.com → Submit Free Press Release → publish.",
  },
  {
    name: "Hashnode",
    url: "https://hashnode.com",
    price: "Free",
    model: "Developer publishing platform",
    note: "High-authority developer blogging platform. Articles index in Google and get syndicated across the developer community. Best for tech-related press releases and product launches.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "hashnode.com → Write → publish publicly on your blog.",
  },
  {
    name: "Apple News Publisher",
    url: "https://www.icloud.com/newspublisher/",
    price: "Free",
    model: "Apply to publish on Apple News",
    note: "Apple News reaches hundreds of millions of iPhone users daily. Apply once as a publisher and every article you post goes directly into the Apple News feed — completely free. One of the most underused free distribution channels available.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "icloud.com/newspublisher → apply with your website → once approved, publish via RSS.",
  },
  {
    name: "Bing Webmaster Tools",
    url: "https://www.bing.com/webmasters",
    price: "Free",
    model: "Submit your site to Bing News",
    note: "The Bing equivalent of Google News Publisher Center. Submit your site once and every article you publish gets indexed in Bing News — which also powers MSN News. Free, permanent, and completely separate from Google.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "bing.com/webmasters → verify site → submit sitemap → auto-indexed going forward.",
  },
  {
    name: "News Break",
    url: "https://creators.newsbreak.com",
    price: "Free",
    model: "Free creator account",
    note: "One of the largest local news apps in the US with 50M+ users. Free creator program lets you post articles directly to their feed. Great for reaching local and regional audiences that don't use Google News.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "creators.newsbreak.com → apply as a creator → post articles directly.",
  },
  {
    name: "Flipboard",
    url: "https://flipboard.com",
    price: "Free",
    model: "Create a free magazine",
    note: "Flipboard is a high-authority content platform read by millions. Create a free magazine for your brand, publish your articles there, and they get indexed in Google and shared across Flipboard's editorial network.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "flipboard.com → Create Magazine → post your press releases as stories.",
  },
  {
    name: "SmartNews",
    url: "https://publishers.smartnews.com",
    price: "Free",
    model: "Apply as a content publisher",
    note: "SmartNews has 50M+ monthly users across the US and Japan. Apply via desktop browser at publishers.smartnews.com — or email publishers@smartnews.com directly with your domain and what you publish. Approval takes 1–2 weeks.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "Desktop: publishers.smartnews.com → apply. Or email publishers@smartnews.com with your domain.",
  },
  {
    name: "Product Hunt",
    url: "https://www.producthunt.com",
    price: "Free",
    model: "Launch your product/app",
    note: "The #1 free launch platform for new products and apps. A successful launch gets covered by TechCrunch, The Verge, and other tech press automatically. Schedule your launch for a Tuesday/Wednesday for max visibility.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "producthunt.com → Submit → schedule your launch day → mobilize community for upvotes.",
  },
  {
    name: "Indie Hackers",
    url: "https://www.indiehackers.com",
    price: "Free",
    model: "Community posts + product page",
    note: "Free community for solo builders, indie devs, and small startups. List your product, share your build journey, and posts get indexed in Google and pulled into AI training. Perfect audience for The Forge.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "indiehackers.com → create profile → list your product → post about milestones.",
  },
  {
    name: "BetaList",
    url: "https://betalist.com",
    price: "Free",
    model: "Free startup launch directory",
    note: "Free startup launch listing read by early adopters, investors, and journalists. Get your beta featured for free — paid tier ($129) accelerates the listing but free works fine with 2-4 week wait.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "betalist.com → Submit a Startup → fill form → wait for free listing.",
  },
  {
    name: "Dev.to",
    url: "https://dev.to",
    price: "Free",
    model: "Developer publishing platform",
    note: "Largest free developer publishing community on the web. High domain authority, articles index in Google and get pulled into ChatGPT, Claude, and Gemini training data. Best for technical announcements and build-in-public content.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "dev.to → New Post → write or paste article → publish.",
  },
  {
    name: "HARO / Connectively",
    url: "https://connectively.us",
    price: "Free",
    model: "Respond to journalist queries",
    note: "Journalists from Forbes, Inc, Entrepreneur, TechCrunch, and more post daily queries asking for expert sources. Respond by email and get quoted in real articles — completely free. The most underused press channel for indie founders.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "connectively.us → free account → receive daily query emails → reply when relevant.",
  },
  {
    name: "Qwoted",
    url: "https://www.qwoted.com",
    price: "Free",
    model: "Respond to journalist queries",
    note: "HARO alternative. Journalists post source requests, you respond. Free tier gives you 3–5 pitches per week — enough to get featured in 1–2 real press articles per month.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "qwoted.com → expert account → respond to relevant queries.",
  },
  {
    name: "Reddit",
    url: "https://www.reddit.com",
    price: "Free",
    model: "Post in relevant subreddits",
    note: "Posts in r/SideProject, r/Entrepreneur, r/InternetIsBeautiful, r/SelfHosted, r/IndieDev can drive thousands of visitors in hours. Read each subreddit's rules — self-promo gets banned in many subs unless framed as a story.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "Find 3–5 relevant subreddits → check their self-promo rules → post a value-first story, not an ad.",
  },
  {
    name: "Hacker News",
    url: "https://news.ycombinator.com",
    price: "Free",
    model: "Show HN / news submissions",
    note: "Hitting the front page can drive 50,000+ visitors in a day. Submit as 'Show HN: [your project]' for product launches. Quality bar is high — the community detects promotion and downvotes hard.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "news.ycombinator.com → Submit → use 'Show HN:' prefix for launches → post on weekday mornings.",
  },
  {
    name: "Bluesky",
    url: "https://bsky.app",
    price: "Free",
    model: "Federated social network",
    note: "Fastest-growing decentralized social platform in 2026. Posts get indexed by Google and AI training pipelines. Strong fit for The Forge's sovereignty-aligned audience — early adopters there overlap heavily with anti-Big-Tech users.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "bsky.app → create account → post launches → engage with builder community.",
  },
  {
    name: "Mastodon",
    url: "https://mastodon.social",
    price: "Free",
    model: "Federated social network",
    note: "Federated, ad-free, algorithm-free social platform. Posts are increasingly indexed by search engines and pulled into AI training data. Pick an instance that fits your audience (mastodon.social, fosstodon.org for devs, social.coop, etc.).",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "Pick a Mastodon instance → create account → post and tag relevant hashtags.",
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com",
    price: "Free",
    model: "Video press release",
    note: "Upload a 2–5 minute video announcement for any release. YouTube videos are indexed by Google video search and surface in regular Google results for your brand name. Powerful for product demos and launch stories.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "youtube.com → Create channel → upload announcement video → optimize title + description with keywords.",
  },
  {
    name: "AlternativeTo",
    url: "https://alternativeto.net",
    price: "Free",
    model: "Product directory",
    note: "Free product directory where users find alternatives to existing tools. Add your app as an alternative to bigger competitors (e.g., 'alternative to Replit' for The Forge) — drives free, high-intent traffic from people specifically looking to switch.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "alternativeto.net → Submit Software → fill form → tag competitors your app replaces.",
  },
  {
    name: "Quora",
    url: "https://www.quora.com",
    price: "Free",
    model: "Answer questions",
    note: "Answer questions related to your product/industry with helpful info — link to your site naturally. Quora answers rank extremely well in Google and stay relevant for years. Long-tail SEO play with zero ad spend.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "quora.com → search your niche → answer top-viewed questions with real value + soft link.",
  },
  {
    name: "EIN Presswire (Free Tier)",
    url: "https://www.einpresswire.com",
    price: "Free tier",
    model: "Limited free distribution",
    note: "Free tier offers a basic press release submission with limited distribution. Paid tiers ($99+) unlock wider syndication, but the free tier still gets indexed by Google News and a few aggregators — worth doing alongside other free channels.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "einpresswire.com → register → submit on the free plan.",
  },
];

const DIST_PAID = [
  {
    name: "PRLog",
    url: "https://www.prlog.org",
    signupUrl: "https://www.prlog.org/register.html",
    price: "Free tier",
    model: "Free account (premium features paid)",
    note: "Free basic distribution that indexes in Google News. Good backup if you don't have your own site yet.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
    setupNote: "Sign up → Submit Release → paste your article.",
  },
  {
    name: "IssueWire",
    url: "https://www.issuewire.com",
    signupUrl: "https://www.issuewire.com/register",
    price: "From $19/release",
    model: "Pay per release — no subscription",
    note: "No monthly fee. Higher tiers ($89+) include AP/NBC/CBS syndication. Only worth it once you've maxed out free options.",
    badge: "Per Release",
    badgeColor: "bg-muted/50 text-muted-foreground border-border",
    setupNote: "Create free account → buy a release credit when ready.",
  },
  {
    name: "Send2Press",
    url: "https://www.send2press.com",
    signupUrl: "https://www.send2press.com/wire/",
    price: "$89/release",
    model: "Pay per release — no subscription",
    note: "Solid mid-tier with real newsroom pickup. Pay only when you publish.",
    badge: "Per Release",
    badgeColor: "bg-muted/50 text-muted-foreground border-border",
    setupNote: "Submit your release at checkout → pay per article.",
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

  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

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

  async function publishToNetwork() {
    if (!article || !parsed) return;
    setPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/api/forge-press/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: brandName,
          headline: parsed.headline || brandName + " Press Release",
          dateline: parsed.dateline || null,
          body: parsed.body || article,
          boilerplate: parsed.boilerplate || null,
          keywords: keywords || null,
          websiteUrl: domain ? (domain.startsWith("http") ? domain : `https://${domain}`) : null,
        }),
      });
      const data = await res.json() as { success?: boolean; slug?: string; error?: string };
      if (data.success && data.slug) {
        setPublishedSlug(data.slug);
        toast({ title: "Published to Forge Press Network!", description: "Your article is now live and indexable by Google News." });
      } else {
        toast({ title: "Publish failed", description: data.error ?? "Try again", variant: "destructive" });
      }
    } catch {
      toast({ title: "Publish failed", description: "Network error — try again", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  }

  function reset() {
    setStep("goal"); setGoal(null); setBrandName(""); setDomain("");
    setDescription(""); setKeywords(""); setArticle(""); setError("");
    setPublishedSlug(null);
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

          {/* Publish to Forge Network */}
          {!publishedSlug ? (
            <div className="bg-primary/5 border border-primary/25 rounded-xl px-4 py-4 space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Newspaper size={15} className="text-primary" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">Publish to Forge Press Network</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Get a permanent public URL on <span className="font-medium text-foreground">/press/your-article</span>. 
                    Indexed by Google News, ChatGPT, and Gemini. Free — no distribution fees, ever.
                  </p>
                </div>
              </div>
              <Button
                className="w-full"
                size="sm"
                onClick={publishToNetwork}
                disabled={publishing || !article}
              >
                {publishing ? (
                  <><Loader2 size={13} className="mr-1.5 animate-spin" />Publishing…</>
                ) : (
                  <><Send size={13} className="mr-1.5" />Publish to Forge Network — Free</>
                )}
              </Button>
            </div>
          ) : (
            <div className="bg-green-500/8 border border-green-500/25 rounded-xl px-4 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-green-400" />
                <p className="text-sm font-semibold text-green-400">Published to Forge Press Network</p>
              </div>
              <p className="text-xs text-muted-foreground">Your article is live. Share the link or submit it directly to Google News Publisher Center.</p>
              <div className="flex items-center gap-2">
                <Link href={`/press/${publishedSlug}`}>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    <ExternalLink size={11} /> View Article
                  </Button>
                </Link>
                <Link href="/press">
                  <Button size="sm" variant="ghost" className="gap-1.5 text-xs">
                    Forge Press Network
                  </Button>
                </Link>
              </div>
            </div>
          )}

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
            <div className="space-y-3">

              {/* How wire services actually work */}
              <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                <p className="font-semibold text-amber-400 mb-1">How companies like PRWeb actually get on NBC/FOX/CBS</p>
                <p>They have multi-year syndication agreements with those outlets — you can't buy your way into those directly. But <span className="text-foreground font-medium">Google News is the real distribution layer those outlets use</span>, and Google News accepts direct applications from any website, for free. Skip the middlemen entirely.</p>
              </div>

              {/* Free direct routes */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-primary/5 border-b border-border">
                  <p className="text-xs font-bold text-primary uppercase tracking-wide">Direct routes — free, no middleman</p>
                </div>
                <div className="divide-y divide-border">
                  {DIST_FREE_DIRECT.map(s => (
                    <div key={s.name} className={cn("px-4 py-3 space-y-1.5", s.highlight && "bg-primary/3")}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0", s.badgeColor)}>
                            {s.badge}
                          </span>
                          <span className="text-sm font-semibold">{s.name}</span>
                        </div>
                        <span className="text-xs font-bold text-green-400 shrink-0">{s.price}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.note}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground/70 italic">{s.setupNote}</span>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium shrink-0"
                        >
                          Go <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wire services as backup */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/20 border-b border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Wire services — if you want extra reach later</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">Pay per release only. No subscriptions. Use these after your own site is set up.</p>
                </div>
                <div className="divide-y divide-border">
                  {DIST_PAID.map(s => (
                    <div key={s.name} className="px-4 py-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0", s.badgeColor)}>
                            {s.badge}
                          </span>
                          <span className="text-sm font-semibold">{s.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground shrink-0">{s.price}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.note}</p>
                      <div className="flex items-center gap-3">
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
