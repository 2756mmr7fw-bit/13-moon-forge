import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Calendar, Building2, Globe, Share2, Copy, Check, Zap } from "lucide-react";
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

function setMeta(sel: string, attr: string, val: string) {
  let el = document.querySelector(sel);
  if (!el) { el = document.createElement("meta"); document.head.appendChild(el); }
  el.setAttribute(attr, val);
}

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

  // Per-article OG + JSON-LD schema for Google News
  useEffect(() => {
    if (!article) return;

    const prevTitle = document.title;
    const desc = article.boilerplate
      ? article.boilerplate.slice(0, 200)
      : article.body.split("\n").find(l => l.trim().length > 40)?.slice(0, 200) ?? article.headline;
    const url = window.location.href;
    const ogImage = window.location.origin + "/opengraph.jpg";

    document.title = article.headline + " — Forge Press Network";
    setMeta("meta[name='description']",        "content", desc);
    setMeta("meta[property='og:title']",       "content", article.headline);
    setMeta("meta[property='og:description']", "content", desc);
    setMeta("meta[property='og:url']",         "content", url);
    setMeta("meta[property='og:type']",        "content", "article");
    setMeta("meta[property='og:image']",       "content", ogImage);
    setMeta("meta[name='twitter:card']",       "content", "summary_large_image");
    setMeta("meta[name='twitter:title']",      "content", article.headline);
    setMeta("meta[name='twitter:description']","content", desc);
    setMeta("meta[name='twitter:image']",      "content", ogImage);

    // JSON-LD NewsArticle schema
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
        "logo": { "@type": "ImageObject", "url": window.location.origin + "/favicon.svg" },
        "url": window.location.origin,
      },
      "description": desc,
      "keywords": article.keywords ?? "",
      "url": url,
      "image": ogImage,
      "isAccessibleForFree": true,
    });
    document.head.appendChild(script);

    return () => {
      document.title = prevTitle;
      document.getElementById("news-article-schema")?.remove();
    };
  }, [article]);

  const copy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {[80, 95, 70, 85].map((w, i) => (
        <div key={i} className="h-5 rounded bg-muted/30 animate-pulse" style={{ width: `${w}%` }} />
      ))}
    </div>
  );

  if (notFound || !article) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
      <p className="font-semibold">Article not found</p>
      <Link href="/press">
        <span className="text-sm text-primary hover:underline cursor-pointer">← Back to Forge Press Network</span>
      </Link>
    </div>
  );

  const paragraphs = article.body.split(/\n+/).filter(Boolean);
  const publishDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

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
          {article.dateline ? (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {article.dateline}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {publishDate}
            </span>
          )}
          {article.websiteUrl && (
            <a
              href={article.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
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
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            About {article.companyName}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{article.boilerplate}</p>
        </div>
      )}

      {/* Share */}
      <div className="flex items-center gap-2 border-t border-border pt-4 flex-wrap">
        <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
          {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Link</>}
        </Button>
        <a
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.headline)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="sm" variant="outline" className="gap-1.5">
            <Share2 size={12} /> Share
          </Button>
        </a>
        <span className="text-[11px] text-muted-foreground ml-auto">
          Published via <Link href="/press"><span className="text-primary cursor-pointer hover:underline">Forge Press</span></Link>
        </span>
      </div>

      {/* CTA for new visitors */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Write your own press release — free</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            AI writes it in seconds. Publish it here for free. Indexed by Google News, ChatGPT, and Gemini. No monthly fees.
          </p>
        </div>
        <Link href="/forge-press">
          <Button size="sm" className="gap-1.5">
            <Zap size={12} /> Get Started Free
          </Button>
        </Link>
      </div>
    </div>
  );
}
