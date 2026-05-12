import { useMemo, useState, useEffect } from "react";
import { Sparkles, Globe, MonitorSmartphone, LayoutTemplate, Server, Megaphone, ArrowRight, CheckCircle, TrendingUp, ExternalLink, ThumbsUp } from "lucide-react";
import { getAuthToken } from "@workspace/api-client-react";
import { useListShowcaseApps } from "@workspace/api-client-react";
import type { ShowcaseApp } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function ShowcasePage() {
  const { data: apps, isLoading } = useListShowcaseApps();

  const featured = apps?.featured ?? [];
  const rawCommunity = apps?.community ?? [];

  const community = useMemo(() => {
    return [...rawCommunity].sort(() => Math.random() - 0.5);
  }, [rawCommunity]);

  return (
    <div className="space-y-16 pb-24 max-w-5xl mx-auto">

      {/* Hero */}
      <section className="text-center space-y-6 pt-12 pb-4 px-4">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
          The Forge Showcase
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Every app hosted on Forge gets broadcast here automatically.
          No algorithm, no ranking — real apps, real builders, equal visibility.
        </p>

        {/* Two paths */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto pt-2 text-left">
          <div className="bg-card border border-primary/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Server className="w-4 h-4 text-primary" />
              Host with Forge
            </div>
            <ul className="space-y-1.5">
              {["Your app runs on Forge infrastructure", "Automatically listed here the moment it's live", "Description is yours to write — we broadcast it"].map(t => (
                <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/forge-hosting">
              <Button size="sm" className="w-full mt-1">
                Start Hosting <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="bg-card border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Megaphone className="w-4 h-4 text-primary" />
              Advertise Only
            </div>
            <ul className="space-y-1.5">
              {["You host your app anywhere you like", "Pay for a Showcase listing — we add you", "Manually reviewed and added by our team"].map(t => (
                <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <a href="https://thepeoplestownsq.com" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="w-full mt-1">
                Get a Listing <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* The Forge & 13 Moons — always pinned at the top */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2 border-b pb-3">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold leading-tight">The Forge &amp; 13 Moons</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Our family of apps — always here</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 bg-card rounded-2xl border animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="text-center py-12 bg-card/50 rounded-2xl border border-dashed">
            <Sparkles className="w-8 h-8 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground">Featured apps will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featured.map((app) => (
              <AppCard key={app.id} app={app} variant="featured" />
            ))}
          </div>
        )}
      </section>

      {/* Community Board */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2 border-b pb-3">
          <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
            <LayoutTemplate className="w-4 h-4 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold leading-tight">Community Board</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Shuffled fresh on every visit — no ranking, no favourites</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 bg-card rounded-xl border animate-pulse" />
            ))}
          </div>
        ) : community.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No community apps yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Apps hosted on Forge appear here automatically. Host your app to claim your spot.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {community.map((app) => (
              <AppCard key={app.id} app={app} variant="community" />
            ))}
          </div>
        )}
      </section>

      {/* Get Your App Seen */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2 border-b pb-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold leading-tight">Get Your App Seen</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Platforms and services that help builders reach more people</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADVERTISING_PARTNERS.map((partner) => (
            <a
              key={partner.name}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-3 rounded-2xl border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg shrink-0">
                    {partner.emoji}
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-snug">{partner.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium uppercase tracking-wider">
                      {partner.tag}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{partner.description}</p>
            </a>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          These are independent platforms — Forge is not affiliated with or responsible for their services.
        </p>
      </section>
    </div>
  );
}

const ADVERTISING_PARTNERS = [
  {
    name: "The People's Town Square",
    url: "https://thepeoplestownsq.com",
    emoji: "🏛️",
    tag: "Community",
    description: "A free community marketplace for goods, services, and ideas. List your app where real people connect and discover.",
  },
  {
    name: "Product Hunt",
    url: "https://www.producthunt.com",
    emoji: "🐱",
    tag: "Launch Platform",
    description: "The go-to platform for launching new products. Get featured in front of thousands of early adopters and tech enthusiasts.",
  },
  {
    name: "FameHero",
    url: "https://famehero.com",
    emoji: "📈",
    tag: "SEO & Branding",
    description: "Brand analysis and SEO boost service. Understand your search presence and grow your visibility in Google results.",
  },
  {
    name: "AppSumo",
    url: "https://appsumo.com",
    emoji: "🔥",
    tag: "Deals & Exposure",
    description: "Run a lifetime deal campaign to acquire thousands of customers fast. Best for SaaS tools ready to scale.",
  },
  {
    name: "BetaList",
    url: "https://betalist.com",
    emoji: "🚀",
    tag: "Early Access",
    description: "Submit your app to get early users and feedback before a full launch. Great for pre-launch and beta signups.",
  },
  {
    name: "Indie Hackers",
    url: "https://www.indiehackers.com",
    emoji: "🛠️",
    tag: "Community",
    description: "A community of independent builders. Post your app, share your story, and get honest feedback from fellow makers.",
  },
  {
    name: "Hacker News",
    url: "https://news.ycombinator.com/show",
    emoji: "🧡",
    tag: "Show & Tell",
    description: "Post a \"Show HN\" to share your project with one of the most engaged tech audiences on the internet.",
  },
  {
    name: "Reddit",
    url: "https://www.reddit.com",
    emoji: "👾",
    tag: "Communities",
    description: "Find subreddits that match your niche — r/SideProject, r/startups, r/entrepreneur — and share your work with targeted audiences.",
  },
  {
    name: "Twitter / X",
    url: "https://x.com",
    emoji: "✦",
    tag: "Social",
    description: "Build in public. Share your launch, progress, and milestones with the #buildinpublic community for organic reach.",
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com",
    emoji: "💼",
    tag: "Professional",
    description: "Reach business decision-makers and professionals. Especially powerful for B2B tools, SaaS, and productivity apps.",
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com",
    emoji: "▶️",
    tag: "Video",
    description: "Demo videos, tutorials, and build-in-public vlogs. Video content drives long-term organic discovery that outlasts any launch day.",
  },
  {
    name: "Dev.to",
    url: "https://dev.to",
    emoji: "👩‍💻",
    tag: "Developer Community",
    description: "Write about how you built your app and share it with a large developer audience. Tutorials and case studies perform especially well.",
  },
  {
    name: "daily.dev",
    url: "https://daily.dev",
    emoji: "📰",
    tag: "Developer Feed",
    description: "The news feed for developers. Submit articles or posts about your app and get discovered by engineers and technical founders.",
  },
  {
    name: "Peerlist",
    url: "https://peerlist.io",
    emoji: "🌐",
    tag: "Developer Portfolio",
    description: "A professional network built for developers and makers. Showcase your app alongside your work and get visibility in the builder community.",
  },
  {
    name: "G2",
    url: "https://www.g2.com",
    emoji: "⭐",
    tag: "Software Reviews",
    description: "List your software on the world's largest software review platform. Verified reviews build trust and drive inbound leads at scale.",
  },
  {
    name: "Capterra",
    url: "https://www.capterra.com",
    emoji: "📋",
    tag: "Software Reviews",
    description: "The leading business software review site. A free listing puts you in front of buyers actively searching for tools like yours.",
  },
  {
    name: "AlternativeTo",
    url: "https://alternativeto.net",
    emoji: "🔄",
    tag: "Directory",
    description: "People search for alternatives to popular tools every day. List your app here and capture users actively looking to switch.",
  },
  {
    name: "SaaSHub",
    url: "https://www.saashub.com",
    emoji: "🗂️",
    tag: "Directory",
    description: "A software alternatives and reviews directory. Submit your product to be found by users researching your category.",
  },
  {
    name: "There's An AI For That",
    url: "https://theresanaiforthat.com",
    emoji: "🤖",
    tag: "AI Directory",
    description: "The largest AI tool discovery platform. If your app uses AI, this is one of the highest-traffic directories to be listed on.",
  },
  {
    name: "Futurepedia",
    url: "https://www.futurepedia.io",
    emoji: "🧠",
    tag: "AI Directory",
    description: "A curated directory of AI tools updated daily. Great exposure for AI-powered apps with a growing audience of AI enthusiasts.",
  },
  {
    name: "Uneed",
    url: "https://www.uneed.best",
    emoji: "🎯",
    tag: "Launch Platform",
    description: "A daily product showcase with a voting system. Launch your app and compete for visibility in a growing community of makers.",
  },
  {
    name: "Microlaunch",
    url: "https://microlaunch.net",
    emoji: "⚡",
    tag: "Launch Platform",
    description: "Built specifically for micro-SaaS and indie makers. A tight-knit community that gives real attention to small, focused products.",
  },
  {
    name: "Launching Next",
    url: "https://www.launchingnext.com",
    emoji: "🛸",
    tag: "Pre-Launch",
    description: "Submit your startup before it launches to build an early audience. Collect email signups and generate buzz before day one.",
  },
  {
    name: "Discord",
    url: "https://discord.com",
    emoji: "💬",
    tag: "Community",
    description: "Build a community directly around your app. A Discord server gives your users a home and turns customers into advocates.",
  },
  {
    name: "Google Business Profile",
    url: "https://business.google.com",
    emoji: "🗺️",
    tag: "Local & Search",
    description: "A free listing that puts your business on Google Search and Maps. One of the highest-ROI free moves any local or online business can make.",
  },
  {
    name: "Yelp for Business",
    url: "https://biz.yelp.com",
    emoji: "⭐",
    tag: "Local & Reviews",
    description: "Free business listing with customer reviews. Millions of people check Yelp before spending money — be there when they look.",
  },
  {
    name: "Craigslist",
    url: "https://craigslist.org",
    emoji: "📌",
    tag: "Free Classifieds",
    description: "Still one of the highest-traffic classified sites in the world. Post your service, product, or app in the right local or national category for free.",
  },
  {
    name: "Facebook Groups",
    url: "https://www.facebook.com/groups",
    emoji: "👥",
    tag: "Social Communities",
    description: "Find and post in niche Facebook Groups related to your product. Millions of active buyers and users gather in groups daily — completely free to post.",
  },
  {
    name: "Nextdoor",
    url: "https://nextdoor.com",
    emoji: "🏡",
    tag: "Local Community",
    description: "The neighborhood social network. Free for local businesses to post. Ideal for services or products that serve a specific city or region.",
  },
  {
    name: "Medium",
    url: "https://medium.com",
    emoji: "✍️",
    tag: "Content Marketing",
    description: "Publish in-depth articles about your product, your journey, or your industry. Medium's built-in audience can drive significant organic traffic for free.",
  },
  {
    name: "Quora",
    url: "https://www.quora.com",
    emoji: "❓",
    tag: "Q&A Marketing",
    description: "Answer questions in your niche and mention your product naturally. Quora answers rank high on Google and drive long-term traffic for years.",
  },
  {
    name: "Wellfound (AngelList)",
    url: "https://wellfound.com",
    emoji: "🌱",
    tag: "Startup Community",
    description: "The startup and investor network. List your company, share your story, and connect with early adopters, co-founders, and angels who want to find you.",
  },
  {
    name: "StackShare",
    url: "https://stackshare.io",
    emoji: "🧱",
    tag: "Developer Discovery",
    description: "Developers share the tools and tech they use. List your product here and get discovered by engineers actively researching their next tool.",
  },
  {
    name: "SideProjectors",
    url: "https://www.sideprojectors.com",
    emoji: "🧪",
    tag: "Side Projects",
    description: "A marketplace for side projects — buy, sell, and showcase. Great for early-stage products that need an audience of fellow builders.",
  },
  {
    name: "Startup Stash",
    url: "https://startupstash.com",
    emoji: "📦",
    tag: "Directory",
    description: "A curated directory of tools and resources for startups. Submit your product and be discovered by founders actively building their stack.",
  },
  {
    name: "GetApp",
    url: "https://www.getapp.com",
    emoji: "📲",
    tag: "Software Reviews",
    description: "A Gartner-owned software discovery site. Free listing puts you in front of business buyers comparing tools in your category.",
  },
  {
    name: "TikTok",
    url: "https://www.tiktok.com",
    emoji: "🎵",
    tag: "Video Social",
    description: "Short-form video with massive organic reach — especially for consumer apps. A single viral video can drive thousands of signups overnight.",
  },
  {
    name: "Pinterest",
    url: "https://www.pinterest.com",
    emoji: "📍",
    tag: "Visual Discovery",
    description: "Pin images, infographics, and screenshots of your product. Pinterest content has a long shelf life and drives steady search traffic for months.",
  },
  {
    name: "Lobsters",
    url: "https://lobste.rs",
    emoji: "🦞",
    tag: "Tech Community",
    description: "A curated link-aggregator for technology topics. Invite-only community of serious developers — a well-received post here signals real credibility.",
  },
  {
    name: "1000.tools",
    url: "https://1000.tools",
    emoji: "🔧",
    tag: "Tool Directory",
    description: "A growing directory of internet tools and products. Submit your app and get discovered by users browsing for exactly what you built.",
  },
  {
    name: "MakerLog",
    url: "https://getmakerlog.com",
    emoji: "📓",
    tag: "Builder Community",
    description: "Log your daily progress and build in public. A tight-knit maker community that follows each other's journeys and supports new launches.",
  },
];

function screenshotSrc(app: ShowcaseApp): string | null {
  if (app.screenshotUrl) return app.screenshotUrl;
  if (app.websiteUrl) {
    const clean = app.websiteUrl.replace(/^https?:\/\//, "");
    return `https://image.thum.io/get/width/600/crop/500/noanimate/https://${clean}`;
  }
  return null;
}

function AppCard({ app, variant }: { app: ShowcaseApp; variant: "featured" | "community" }) {
  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();
  const isFeatured = variant === "featured";
  const [imgFailed, setImgFailed] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const [myVote, setMyVote] = useState(false);
  const [voting, setVoting] = useState(false);
  const shot = screenshotSrc(app);

  useEffect(() => {
    fetch(`/api/showcase/${app.id}/reviews`)
      .then(r => r.json())
      .then((d: { upvotes?: number; myVote?: boolean }) => {
        if (typeof d.upvotes === "number") setUpvotes(d.upvotes);
        if (typeof d.myVote === "boolean") setMyVote(d.myVote);
      })
      .catch(() => {});
  }, [app.id]);

  async function handleUpvote(e: React.MouseEvent) {
    e.preventDefault();
    if (voting) return;
    setVoting(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/showcase/${app.id}/upvote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json() as { upvoted: boolean };
        setMyVote(d.upvoted);
        setUpvotes(v => d.upvoted ? v + 1 : Math.max(0, v - 1));
      }
    } catch {}
    setVoting(false);
  }

  return (
    <div className={`flex flex-col group overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg ${
      isFeatured
        ? "bg-card border-primary/30 shadow-md hover:border-primary/60"
        : "bg-card/50 hover:bg-card hover:border-border/80"
    }`}>
      {shot && !imgFailed ? (
        <div className="h-40 w-full overflow-hidden border-b bg-muted relative">
          <img
            src={shot}
            alt={`Screenshot of ${app.name}`}
            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
            onError={() => setImgFailed(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          {app.websiteUrl && (
            <a
              href={app.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2"
            >
              <span className="bg-black/70 text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm">
                <Globe className="w-3 h-3" /> Visit site
              </span>
            </a>
          )}
        </div>
      ) : (
        <div className={`h-16 w-full border-b flex items-center justify-center ${isFeatured ? "bg-primary/5" : "bg-muted/30"}`}>
          <span className="text-2xl font-bold text-muted-foreground/30">{getInitials(app.name)}</span>
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          <div className={`shrink-0 w-12 h-12 rounded-xl overflow-hidden border flex items-center justify-center ${
            app.logoUrl ? "bg-white" : "bg-muted"
          }`}>
            {app.logoUrl ? (
              <img
                src={app.logoUrl}
                alt={`${app.name} logo`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const t = e.target as HTMLElement;
                  t.style.display = "none";
                  (t.nextElementSibling as HTMLElement | null)?.style.setProperty("display", "flex");
                }}
              />
            ) : null}
            <div className={`w-full h-full flex items-center justify-center font-bold text-base text-muted-foreground ${app.logoUrl ? "hidden" : "flex"}`}>
              {getInitials(app.name)}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base truncate text-foreground leading-snug">{app.name}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider shrink-0 ${
                isFeatured ? "bg-primary/20 text-primary" : "bg-secondary text-secondary-foreground"
              }`}>
                {app.category}
              </span>
            </div>
            <p className="text-xs text-foreground/70 mt-0.5 line-clamp-1">{app.tagline}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-3 mb-4">
          {app.description}
        </p>

        <div className="mt-auto pt-3 border-t flex flex-wrap items-center justify-between gap-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground">
              {app.builderName ? getInitials(app.builderName) : "??"}
            </div>
            <span className="text-xs text-muted-foreground">{app.builderName ?? "Anonymous"}</span>
            {app.listingType === "hosted" && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium">
                Hosted
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleUpvote}
              disabled={voting}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                myVote
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title={myVote ? "Remove upvote" : "Upvote this app"}
            >
              <ThumbsUp className={`w-3 h-3 ${myVote ? "fill-primary" : ""}`} />
              {upvotes > 0 && <span>{upvotes}</span>}
            </button>
            {app.websiteUrl && (
              <a
                href={app.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-secondary hover:bg-secondary/80 rounded-md transition-colors text-secondary-foreground inline-flex items-center"
                title="Visit Website"
              >
                <Globe className="w-3.5 h-3.5" />
              </a>
            )}
            {app.iosUrl && (
              <a
                href={app.iosUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-secondary hover:bg-secondary/80 rounded-md transition-colors text-secondary-foreground inline-flex items-center"
                title="iOS App Store"
              >
                <MonitorSmartphone className="w-3.5 h-3.5" />
              </a>
            )}
            {app.androidUrl && (
              <a
                href={app.androidUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-secondary hover:bg-secondary/80 rounded-md transition-colors text-secondary-foreground inline-flex items-center"
                title="Google Play Store"
              >
                <MonitorSmartphone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
