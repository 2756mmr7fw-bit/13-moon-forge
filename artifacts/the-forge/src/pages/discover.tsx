import { useState, useEffect, useMemo } from "react";
import {
  Search, ExternalLink, Flame, ArrowRight, Globe,
  Gamepad2, Smartphone, Wrench, Palette, Users,
  Sparkles, LogIn, LayoutDashboard, Star, Plus,
  Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ShowcaseApp {
  id: number;
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string | null;
  iosUrl: string | null;
  androidUrl: string | null;
  logoUrl: string | null;
  screenshotUrl: string | null;
  category: string;
  listingType: string;
  isFeatured: boolean;
  isActive: boolean;
  isPlaceholder: boolean;
  builderName: string | null;
}

type FilterCat = "All" | "Apps" | "Games" | "Websites" | "Tools" | "Creative" | "Social";

const FILTER_CATS: FilterCat[] = ["All", "Apps", "Games", "Websites", "Tools", "Creative", "Social"];

function getTypeLabel(app: ShowcaseApp): { label: string; icon: typeof Globe } {
  if (app.category === "games")                          return { label: "Game",       icon: Gamepad2 };
  if (app.iosUrl || app.androidUrl)                      return { label: "Mobile App", icon: Smartphone };
  if (app.category === "tools")                          return { label: "Tool",       icon: Wrench };
  if (app.category === "creative" || app.category === "media") return { label: "Creative",  icon: Palette };
  if (app.category === "social")                         return { label: "App",        icon: Users };
  if (app.websiteUrl && !app.iosUrl && !app.androidUrl)  return { label: "Website",    icon: Globe };
  return { label: "App", icon: Globe };
}

function matchesFilter(app: ShowcaseApp, filter: FilterCat): boolean {
  if (filter === "All")      return true;
  if (filter === "Games")    return app.category === "games";
  if (filter === "Tools")    return app.category === "tools";
  if (filter === "Creative") return app.category === "creative" || app.category === "media";
  if (filter === "Social")   return app.category === "social";
  if (filter === "Websites") return !!app.websiteUrl && !app.iosUrl && !app.androidUrl && app.category !== "games";
  if (filter === "Apps")     return !["games", "tools", "creative", "media", "social"].includes(app.category);
  return true;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Discover() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [featured, setFeatured] = useState<ShowcaseApp[]>([]);
  const [community, setCommunity] = useState<ShowcaseApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterCat>("All");
  const [shuffleKey, setShuffleKey] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/showcase`)
      .then(r => r.json())
      .then((data: { featured: ShowcaseApp[]; community: ShowcaseApp[] }) => {
        setFeatured(data.featured ?? []);
        setCommunity(shuffle(data.community ?? []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const reshuffled = useMemo(() => shuffle(community), [community, shuffleKey]);

  const filteredFeatured = featured.filter(a =>
    matchesFilter(a, filter) &&
    (!query || a.name.toLowerCase().includes(query.toLowerCase()) || a.description.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredCommunity = reshuffled.filter(a =>
    matchesFilter(a, filter) &&
    (!query || a.name.toLowerCase().includes(query.toLowerCase()) || a.description.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Flame size={14} className="text-primary" />
            </div>
            <span className="font-bold text-sm">13 Moon Forge</span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/press">
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground hidden sm:flex">
                <Star size={12} /> Press Network
              </Button>
            </Link>
            <Button
              size="sm"
              className="gap-1.5 font-semibold"
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/sign-in")}
            >
              {isAuthenticated
                ? <><LayoutDashboard size={13} /> Enter Forge</>
                : <><LogIn size={13} /> Enter Forge</>
              }
            </Button>
          </div>
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-gradient-to-b from-primary/6 via-primary/2 to-transparent">
        <div className="max-w-5xl mx-auto px-4 py-14 text-center space-y-5">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold tracking-wide">
            <Sparkles size={11} />
            Apps · Games · Websites · Tools · Everything
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            Discover what builders are making.<br />
            <span className="text-primary">Built free. Owned by you.</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Every app, game, and website here was built or deployed through 13 Moon Forge.
            Browse the network, find something you love, or launch your own — free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="gap-2 font-bold"
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/sign-in")}
            >
              Enter Forge <ArrowRight size={15} />
            </Button>
            <Link href="/sign-up">
              <Button size="lg" variant="outline" className="gap-2">
                <Plus size={14} /> Submit Your Listing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Manifesto ───────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pt-10 pb-2">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-muted/10 to-background p-8 space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
              <Flame size={13} className="text-primary" />
            </div>
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Why This Exists</span>
          </div>

          <div className="space-y-4 text-sm leading-relaxed text-foreground/85 max-w-3xl">
            <p>
              I couldn't find an easy, affordable way to advertise my apps. What I did find were companies
              charging steep prices — prices that put promotion out of reach for independent builders.
              So I found free ways to do it instead. And then I gave them to you.
            </p>
            <p>
              I didn't build this just for myself. I built it for the people. If you built something great,
              you deserve to be found. To be seen. To be heard. Not because you paid for it —
              because you earned it.
            </p>
            <p className="text-foreground font-medium">
              Freedom is my motivator. Sovereignty is the force behind it.
            </p>
            <p>
              We live on a giant chess board. The people who run this game don't give — they take.
              They take your attention, your money, your data, your leverage.
              So that's exactly what we're going to do. We're going to take our freedom back.
            </p>
            <p className="text-muted-foreground">
              I'm only a soldier in pursuit of happiness and solidarity. Not one in pursuit of money.
              Money slips through our fingers. What doesn't slip away is what you build and who you build it for.
            </p>
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-muted-foreground">— Ezekiel, Builder of 13 Moon Forge</span>
            <Link href="/sign-up">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <Plus size={11} /> List Your App Free
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Browser ─────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Search + filter row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search apps, games, websites…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => setShuffleKey(k => k + 1)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground border border-border rounded-lg hover:border-primary/40 hover:text-primary transition-all"
          >
            <Shuffle size={12} /> Reshuffle
          </button>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {FILTER_CATS.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                filter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Featured (Your apps — always top) ───────────────────────── */}
        {!loading && filteredFeatured.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Star size={13} className="text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Featured by 13 Moons</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFeatured.map(app => (
                <FeaturedCard key={app.id} app={app} />
              ))}
            </div>
          </div>
        )}

        {/* ── Community (everyone else — shuffled) ─────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3 animate-pulse">
                <div className="h-4 bg-muted/50 rounded w-2/3" />
                <div className="h-3 bg-muted/30 rounded w-full" />
                <div className="h-3 bg-muted/30 rounded w-4/5" />
              </div>
            ))}
          </div>
        ) : filteredCommunity.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={13} className="text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Community</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{filteredCommunity.length} listings · shuffled</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCommunity.map(app => (
                <CommunityCard key={app.id} app={app} />
              ))}
            </div>
          </div>
        ) : !loading && filteredFeatured.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl space-y-3">
            <Globe size={28} className="mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {query ? "Nothing matches your search." : "No listings in this category yet."}
            </p>
            <Link href="/sign-up">
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus size={12} /> Be the First
              </Button>
            </Link>
          </div>
        ) : null}

        {/* ── Submit CTA ──────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center space-y-4 mt-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Flame size={22} className="text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold">Got something to show?</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              List your app, game, or website here — free. Reach the entire 13 Moon Forge network.
              AI builds it, you own it, the world finds it here.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="gap-2"
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/sign-up")}
            >
              Enter Forge <ArrowRight size={14} />
            </Button>
            <Link href="/press">
              <Button size="lg" variant="outline" className="gap-2">
                <Star size={13} /> Publish a Press Release
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedCard({ app }: { app: ShowcaseApp }) {
  const { label, icon: Icon } = getTypeLabel(app);
  const url = app.websiteUrl || app.iosUrl || app.androidUrl;

  return (
    <div className="relative bg-card border-2 border-primary/30 rounded-xl p-5 flex flex-col gap-3 hover:border-primary/60 hover:shadow-md transition-all">
      {/* Featured badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
        <Star size={9} fill="currentColor" /> Featured
      </div>

      <div className="space-y-1 pr-16">
        <h3 className="font-bold text-sm leading-tight">{app.name}</h3>
        <p className="text-xs text-primary/80 font-medium">{app.tagline}</p>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
        {app.description}
      </p>

      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70 bg-muted/40 px-2 py-0.5 rounded-full">
          <Icon size={9} /> {label}
        </span>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="gap-1 text-xs h-7 px-3">
              Visit <ExternalLink size={10} />
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}

function CommunityCard({ app }: { app: ShowcaseApp }) {
  const { label, icon: Icon } = getTypeLabel(app);
  const url = app.websiteUrl || app.iosUrl || app.androidUrl;

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">{app.name}</h3>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full shrink-0">
            <Icon size={9} /> {label}
          </span>
        </div>
        {app.tagline && (
          <p className="text-xs text-muted-foreground/80 font-medium">{app.tagline}</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
        {app.description}
      </p>

      <div className="flex items-center gap-2 mt-auto pt-1">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
              <ExternalLink size={10} /> Visit
            </Button>
          </a>
        ) : (
          <Link href="/sign-up" className="flex-1">
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
              Learn More
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
