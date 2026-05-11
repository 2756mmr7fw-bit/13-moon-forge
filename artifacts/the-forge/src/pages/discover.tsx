import { useState, useEffect } from "react";
import { Search, Server, ExternalLink, Flame, ArrowRight, CheckCircle2, Globe, Star, Zap, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface App {
  id: number;
  name: string;
  description: string;
  category: string;
  repoUrl?: string;
  websiteUrl?: string;
  deployUrl?: string;
  status: string;
  tags?: string[];
}

const CATEGORIES = ["All", "Developer Tools", "AI", "Productivity", "E-Commerce", "Communication", "Analytics", "Security", "Media", "Other"];

const HERO_FEATURES = [
  { icon: Zap, label: "One-click hosting", desc: "Deploy any app to your own server in minutes" },
  { icon: Shield, label: "You own everything", desc: "No vendor lock-in — it's your server, your data" },
  { icon: Globe, label: "Live in hours", desc: "Domain, SSL, and auto-deploy all handled for you" },
];

export default function Discover() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/registry?approved=true&limit=100`);
        if (res.ok) {
          const data = await res.json() as { apps: App[] };
          setApps(data.apps ?? []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const filtered = apps.filter(a => {
    const matchQ = !query || a.name.toLowerCase().includes(query.toLowerCase()) || a.description?.toLowerCase().includes(query.toLowerCase());
    const matchC = category === "All" || a.category === category;
    return matchQ && matchC;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">
            <Flame size={12} />
            Powered by 13 Moon Forge
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            Discover apps. Host them yourself.
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Browse hundreds of open-source and self-hostable apps. Find something you love — then Forge sets it up on your own server for less than the cost of a SaaS subscription.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2">
                Host an App Free <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="gap-2">
                See Pricing
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2 max-w-2xl mx-auto">
            {HERO_FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="text-center space-y-1">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                  <Icon size={15} className="text-primary" />
                </div>
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* App browser */}
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search apps…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                category === cat ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3 animate-pulse">
                <div className="h-4 bg-muted/50 rounded w-2/3" />
                <div className="h-3 bg-muted/30 rounded w-full" />
                <div className="h-3 bg-muted/30 rounded w-4/5" />
                <div className="h-8 bg-muted/20 rounded mt-4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Server size={32} className="mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {apps.length === 0
                ? "No apps in the directory yet — be the first to submit one."
                : "No apps match your search."}
            </p>
            <Link href="/sign-in">
              <Button variant="outline" size="sm">Submit an App</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(app => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}

        {/* CTA banner */}
        <div className="mt-12 bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Flame size={24} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold">Don't see what you're looking for?</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Tell Forge what you need. We'll build it, find it, or set up an open-source alternative on your own server — often for less than you're paying now.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2">
                Get Started Free <ArrowRight size={15} />
              </Button>
            </Link>
          </div>
        </div>

        {/* Why self-host section */}
        <div className="space-y-4 pt-4">
          <h3 className="text-lg font-bold text-center">Why self-host instead of SaaS?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Pay once, not forever", desc: "A $5/month server runs most apps cheaper than any subscription." },
              { label: "Your data stays yours", desc: "No company scanning your files, no terms-of-service surprises." },
              { label: "No feature lock-in", desc: "Open-source means you can modify anything you want." },
              { label: "Scales with you", desc: "Move to a bigger server when you need it — no plan upgrades." },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-3 bg-card border border-border rounded-xl p-4">
                <CheckCircle2 size={15} className="text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppCard({ app }: { app: App }) {
  const url = app.websiteUrl || app.repoUrl;
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">{app.name}</h3>
          {app.category && (
            <span className="text-[10px] bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full shrink-0">{app.category}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{app.description}</p>
      </div>

      {app.tags && app.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {app.tags.slice(0, 3).map(t => (
            <span key={t} className="text-[10px] bg-muted/30 text-muted-foreground px-1.5 py-0.5 rounded">{t}</span>
          ))}
        </div>
      )}

      <div className="mt-auto flex gap-2 pt-1">
        <Link href="/sign-up" className="flex-1">
          <Button size="sm" className="w-full gap-1.5 text-xs">
            <Star size={11} />
            Host This App
          </Button>
        </Link>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="px-2.5">
              <ExternalLink size={12} />
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
