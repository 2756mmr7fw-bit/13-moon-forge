import { useState, useEffect } from "react";
import { BarChart2, Globe, TrendingUp, Eye, Clock, Copy, Check, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@workspace/api-client-react";
import { Link } from "wouter";

interface DomainStats {
  domain: string;
  total: number;
  today: number;
  yesterday: number;
  days: { day: string; pageViews: number }[];
}

interface HitRow {
  id: number;
  path: string;
  referrer: string | null;
  createdAt: string;
}

function Sparkline({ days }: { days: { day: string; pageViews: number }[] }) {
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day)).slice(-14);
  if (!sorted.length) return <div className="h-12 flex items-center text-xs text-muted-foreground">No data yet</div>;
  const max = Math.max(...sorted.map(d => d.pageViews), 1);
  return (
    <div className="flex items-end gap-0.5 h-12">
      {sorted.map((d) => (
        <div
          key={d.day}
          className="flex-1 bg-primary/60 rounded-sm min-h-[2px]"
          style={{ height: `${Math.max((d.pageViews / max) * 100, 4)}%` }}
          title={`${d.day}: ${d.pageViews} views`}
        />
      ))}
    </div>
  );
}

function SnippetBox({ domain }: { domain: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script>fetch('/api/analytics/hit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domain:'${domain}',path:location.pathname})});</script>`;

  function copy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Tracking snippet — paste before &lt;/body&gt;</span>
        <Button size="sm" variant="ghost" onClick={copy} className="h-6 px-2 text-xs gap-1">
          {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <code className="text-xs text-muted-foreground break-all">{snippet}</code>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<{ domains: DomainStats[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ days: { day: string; pageViews: number }[]; recent: HitRow[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getAuthToken();
      const res = await fetch("/api/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { domains: DomainStats[] };
      setData(json);
      setLoading(false);
    })();
  }, []);

  async function loadDetail(domain: string) {
    if (selected === domain) { setSelected(null); setDetail(null); return; }
    setSelected(domain);
    setDetailLoading(true);
    const token = await getAuthToken();
    const res = await fetch(`/api/analytics/${encodeURIComponent(domain)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setDetail(json);
    setDetailLoading(false);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const domains = data?.domains ?? [];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-primary" />
          Analytics
        </h1>
        <p className="text-muted-foreground text-sm">
          Page-view tracking for your hosted domains. Add the snippet to your app and data appears here within seconds.
        </p>
      </div>

      {domains.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent className="space-y-4">
            <Globe className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="font-medium">No domains tracked yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Connect a custom domain in{" "}
              <Link href="/domain-hub" className="text-primary underline underline-offset-2">Domain Hub</Link>,
              then add the tracking snippet to your app to start collecting data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {domains.map((d) => (
            <div key={d.domain} className="space-y-3">
              <Card
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => loadDetail(d.domain)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{d.domain}</span>
                        <a
                          href={`https://${d.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                        </a>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-muted-foreground">
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          {d.total.toLocaleString()} total
                        </span>
                        <span className="text-muted-foreground">
                          <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                          {d.today} today
                        </span>
                        <span className="text-muted-foreground">
                          {d.yesterday} yesterday
                        </span>
                      </div>
                    </div>
                    <div className="w-32 shrink-0">
                      <Sparkline days={d.days} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selected === d.domain && (
                <div className="ml-4 space-y-3">
                  <SnippetBox domain={d.domain} />
                  {detailLoading ? (
                    <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                  ) : detail && (
                    <>
                      {detail.recent.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> Recent hits
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="divide-y">
                              {detail.recent.slice(0, 10).map(h => (
                                <div key={h.id} className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
                                  <span className="font-mono">{h.path}</span>
                                  <span>{new Date(h.createdAt).toLocaleTimeString()}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-medium">How tracking works</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Add your domain in <Link href="/domain-hub" className="text-primary underline underline-offset-2">Domain Hub</Link></li>
            <li>Copy the tracking snippet (click any domain above)</li>
            <li>Paste it before <code className="text-xs bg-muted px-1 rounded">&lt;/body&gt;</code> in your app</li>
            <li>Data appears here within seconds of your first visitor</li>
          </ol>
          <p className="text-xs text-muted-foreground/70">No cookies, no third parties — all data stays in Forge.</p>
        </CardContent>
      </Card>
    </div>
  );
}
