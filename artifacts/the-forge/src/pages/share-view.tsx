import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { Loader2, Flame, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const MOON_COLORS: Record<string, string> = {
  forge: "#f97316", flint: "#ef4444", sage: "#22c55e",
  hawk: "#eab308", quill: "#8b5cf6", creed: "#3b82f6",
  brainstorm: "#f59e0b", legal: "#8b5cf6", launch: "#3b82f6",
};

interface SharedOutput {
  id: string;
  moonId: string;
  title: string;
  content: string;
  createdAt: string;
}

export default function ShareView() {
  const [, params] = useRoute("/share/:id");
  const id = params?.id;
  const [data, setData] = useState<SharedOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/api/share/${id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(d => { if (d) setData(d as SharedOutput); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  async function copy() {
    await navigator.clipboard.writeText(data?.content ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const color = MOON_COLORS[data?.moonId ?? ""] ?? "#f97316";

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-primary" />
    </div>
  );

  if (notFound || !data) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-4">
      <div className="text-6xl">🔥</div>
      <h1 className="text-2xl font-bold">This share link doesn't exist</h1>
      <p className="text-muted-foreground text-sm">It may have been deleted or the link is wrong.</p>
      <Link href="/">
        <Button>Back to Forge</Button>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header bar */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Flame size={18} className="text-primary" />
            <span className="font-bold text-sm">13 Moon Forge</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={copy}>
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy text"}
            </Button>
            <Link href="/dashboard">
              <Button size="sm" className="h-7 text-xs gap-1.5">
                Open Forge <ExternalLink size={11} />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
              style={{ background: `${color}22`, color }}
            >
              {data.moonId} Moon
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(data.createdAt).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
        </div>

        <div className="prose prose-invert prose-sm max-w-none rounded-xl border border-border bg-card p-6 leading-relaxed">
          <ReactMarkdown>{data.content}</ReactMarkdown>
        </div>

        <div className="mt-8 text-center space-y-2">
          <p className="text-xs text-muted-foreground">Created with 13 Moon Forge</p>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Flame size={12} className="text-primary" /> Try Forge for free
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
