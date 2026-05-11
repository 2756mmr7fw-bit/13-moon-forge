import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Newspaper, Calendar, Building2, Search, Zap, ArrowRight, Globe,
  Bot, Tv2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PressRelease {
  id: number;
  slug: string;
  companyName: string;
  headline: string;
  dateline: string | null;
  boilerplate: string | null;
  authorName: string | null;
  websiteUrl: string | null;
  publishedAt: string;
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const PAGE_TITLE = "Forge Press Network — Free AI Press Releases";
const PAGE_DESC  = "AI-written press releases from the 13 Moon Forge ecosystem. Published free, indexed by Google News, ChatGPT, Claude, and Gemini. No middlemen, no monthly fees.";
const PAGE_URL   = typeof window !== "undefined" ? window.location.origin + "/press" : "";

function usePageOG(title: string, desc: string, url: string) {
  useEffect(() => {
    const prev = {
      title: document.title,
      desc:  document.querySelector("meta[name='description']")?.getAttribute("content") ?? "",
      ogTitle: document.querySelector("meta[property='og:title']")?.getAttribute("content") ?? "",
      ogDesc: document.querySelector("meta[property='og:description']")?.getAttribute("content") ?? "",
      ogUrl: document.querySelector("meta[property='og:url']")?.getAttribute("content") ?? "",
      twTitle: document.querySelector("meta[name='twitter:title']")?.getAttribute("content") ?? "",
      twDesc: document.querySelector("meta[name='twitter:description']")?.getAttribute("content") ?? "",
    };

    const set = (sel: string, attr: string, val: string) => {
      let el = document.querySelector(sel);
      if (!el) { el = document.createElement("meta"); document.head.appendChild(el); }
      el.setAttribute(attr, val);
    };

    document.title = title;
    set("meta[name='description']",       "content", desc);
    set("meta[property='og:title']",      "content", title);
    set("meta[property='og:description']","content", desc);
    set("meta[property='og:url']",        "content", url);
    set("meta[property='og:type']",       "content", "website");
    set("meta[name='twitter:card']",      "content", "summary_large_image");
    set("meta[name='twitter:title']",     "content", title);
    set("meta[name='twitter:description']","content", desc);

    return () => {
      document.title = prev.title;
      set("meta[name='description']",       "content", prev.desc);
      set("meta[property='og:title']",      "content", prev.ogTitle);
      set("meta[property='og:description']","content", prev.ogDesc);
      set("meta[property='og:url']",        "content", prev.ogUrl);
      set("meta[name='twitter:title']",     "content", prev.twTitle);
      set("meta[name='twitter:description']","content", prev.twDesc);
    };
  }, [title, desc, url]);
}

const DISTRIBUTION_BADGES = [
  { icon: Globe,  label: "Google News" },
  { icon: Bot,    label: "ChatGPT Index" },
  { icon: Bot,    label: "Claude Index" },
  { icon: Bot,    label: "Gemini Index" },
  { icon: Tv2,    label: "Bing News" },
];

const VALUE_POINTS = [
  "AI writes your press release in seconds",
  "One click publishes to Forge Press Network",
  "Permanent URL indexed by Google News",
  "No monthly fee — free forever",
];

export default function PressHub() {
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  usePageOG(PAGE_TITLE, PAGE_DESC, PAGE_URL);

  useEffect(() => {
    fetch(`${basePath}/api/press`)
      .then(r => r.json())
      .then((data: PressRelease[]) => { setReleases(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = releases.filter(r =>
    !search ||
    r.headline.toLowerCase().includes(search.toLowerCase()) ||
    r.companyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* ── Hero / Entry Point ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-background to-background overflow-hidden">
        <div className="px-6 pt-8 pb-6 space-y-5">

          {/* Eyebrow */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Newspaper size={14} className="text-primary" />
            </div>
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Forge Press Network</span>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
              Your own free PR wire.<br />
              <span className="text-primary">No middlemen. No monthly bills.</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              Companies pay $49–$999/month to distribute press releases to Google News.
              We built the same pipeline for free — AI writes the article, one click publishes it here,
              and Google News indexes it directly. You keep the traffic. You keep the authority.
            </p>
          </div>

          {/* Value points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {VALUE_POINTS.map(p => (
              <div key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 size={12} className="text-green-400 shrink-0" />
                {p}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/forge-press">
              <Button size="sm" className="gap-1.5">
                <Zap size={13} />
                Write My Press Release — Free
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
                Create account <ArrowRight size={12} />
              </Button>
            </Link>
          </div>
        </div>

        {/* Distribution row */}
        <div className="border-t border-border/60 px-6 py-3 bg-muted/10 flex flex-wrap gap-x-4 gap-y-1">
          <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wide self-center">Published to</span>
          {DISTRIBUTION_BADGES.map(b => (
            <span key={b.label} className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <b.icon size={10} className="text-primary/60" />
              {b.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Press Release Feed ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Latest Releases
          </h2>
          {releases.length > 0 && (
            <span className="text-[11px] text-muted-foreground">{releases.length} published</span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search releases…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 rounded-xl border border-border bg-muted/10 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl text-muted-foreground space-y-3">
            <Newspaper size={32} className="mx-auto opacity-20" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {search ? "No releases match your search." : "No press releases yet."}
              </p>
              {!search && (
                <p className="text-xs text-muted-foreground/70">
                  Be the first to publish one — takes 60 seconds.
                </p>
              )}
            </div>
            {!search && (
              <Link href="/forge-press">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Zap size={12} /> Write the First One
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <Link key={r.id} href={`/press/${r.slug}`}>
                <div className="group border border-border rounded-xl px-4 py-4 hover:border-primary/40 hover:bg-muted/10 transition-all cursor-pointer space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {r.headline}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Building2 size={10} />
                          {r.companyName}
                        </span>
                        {r.dateline && (
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {r.dateline}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                  </div>
                  {r.boilerplate && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {r.boilerplate}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-4 text-[11px] text-muted-foreground">
        <span>Powered by <span className="text-primary font-medium">13 Moon Forge</span></span>
        <Link href="/forge-press">
          <span className="text-primary hover:underline cursor-pointer">Write a release →</span>
        </Link>
      </div>
    </div>
  );
}
