import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Newspaper, ExternalLink, Calendar, Building2, Search } from "lucide-react";
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

export default function PressHub() {
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Newspaper size={16} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold">Forge Press Network</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Official press releases from apps and companies in the 13 Moon Forge ecosystem.
          Each article is indexed for Google News and AI search engines.
        </p>
      </div>

      {/* Google News badge */}
      <div className="flex flex-wrap gap-2 text-[11px]">
        {["Google News", "ChatGPT Index", "Claude Index", "Gemini Index", "Bing News"].map(s => (
          <span key={s} className="px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
            {s}
          </span>
        ))}
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

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-24 rounded-xl border border-border bg-muted/10 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Newspaper size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? "No releases match your search." : "No press releases published yet. Be the first."}</p>
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
                  <ExternalLink size={13} className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
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

      {/* Footer */}
      <p className="text-[11px] text-muted-foreground text-center pt-4 border-t border-border">
        Powered by <span className="text-primary font-medium">13 Moon Forge</span> · Press releases are written by AI and published by verified Forge users
      </p>
    </div>
  );
}
