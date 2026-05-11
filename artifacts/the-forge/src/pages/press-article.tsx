import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Calendar, Building2, Globe, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PressRelease {
  id: number;
  slug: string;
  companyName: string;
  authorName: string | null;
  headline: string;
  dateline: string | null;
  body: string;
  boilerplate: string | null;
  keywords: string | null;
  websiteUrl: string | null;
  publishedAt: string;
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function PressArticle() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<PressRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`${basePath}/api/press/${slug}`)
      .then(r => { if (!r.ok) throw new Error("not found"); return r.json(); })
      .then((data: PressRelease) => { setArticle(data); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  // Inject JSON-LD NewsArticle schema for Google News
  useEffect(() => {
    if (!article) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "news-article-schema";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": article.headline,
      "datePublished": article.publishedAt,
      "dateModified": article.publishedAt,
      "author": {
        "@type": "Person",
        "name": article.authorName ?? article.companyName,
      },
      "publisher": {
        "@type": "Organization",
        "name": "13 Moon Forge Press Network",
        "url": window.location.origin,
      },
      "description": article.boilerplate ?? article.headline,
      "keywords": article.keywords ?? "",
      "url": window.location.href,
    });
    document.head.appendChild(script);
    return () => { document.getElementById("news-article-schema")?.remove(); };
  }, [article]);

  const copy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="h-6 rounded bg-muted/30 animate-pulse" style={{ width: `${70 + i * 7}%` }} />)}
    </div>
  );

  if (notFound || !article) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-3">
      <p className="font-semibold">Article not found</p>
      <Link href="/press"><span className="text-sm text-primary hover:underline cursor-pointer">← Back to Forge Press Network</span></Link>
    </div>
  );

  const paragraphs = article.body.split(/\n+/).filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <Link href="/press">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
          <ArrowLeft size={12} /> Forge Press Network
        </span>
      </Link>

      {/* Article header */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold leading-tight">{article.headline}</h1>

        <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Building2 size={11} />
            {article.companyName}
          </span>
          {article.dateline && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {article.dateline}
            </span>
          )}
          {article.websiteUrl && (
            <a href={article.websiteUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors">
              <Globe size={11} />
              {article.websiteUrl.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>

        {article.keywords && (
          <div className="flex flex-wrap gap-1.5">
            {article.keywords.split(",").map(k => k.trim()).filter(Boolean).map(k => (
              <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {k}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <hr className="border-border" />

      {/* Body */}
      <div className="space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-foreground/90">{p}</p>
        ))}
      </div>

      {/* Boilerplate */}
      {article.boilerplate && (
        <div className="border-t border-border pt-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">About {article.companyName}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{article.boilerplate}</p>
        </div>
      )}

      {/* Share */}
      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
          {copied ? <><Check size={12} />Copied!</> : <><Copy size={12} />Copy Link</>}
        </Button>
        <a
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.headline)}`}
          target="_blank" rel="noopener noreferrer"
        >
          <Button size="sm" variant="outline" className="gap-1.5">
            <Share2 size={12} /> Share
          </Button>
        </a>
        <span className="text-[11px] text-muted-foreground ml-auto">
          Published via <span className="text-primary">Forge Press</span>
        </span>
      </div>
    </div>
  );
}
