import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Send, Save, CheckCircle2, AlertTriangle, ExternalLink, Loader2,
  Settings, Eye, EyeOff, Copy, Sparkles, Globe, Mail, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AppFamily } from "@/components/app-family";

type PlatformId = "devto" | "medium" | "hashnode" | "substack";

type PlatformResult = {
  platform: PlatformId;
  status: "success" | "error" | "skipped";
  url?: string;
  message: string;
};

type Credentials = {
  devtoToken: string;
  mediumToken: string;
  hashnodeToken: string;
  hashnodePublicationId: string;
  hashnodeHost: string;
  substackPublishEmail: string;
};

const EMPTY_CREDS: Credentials = {
  devtoToken: "",
  mediumToken: "",
  hashnodeToken: "",
  hashnodePublicationId: "",
  hashnodeHost: "",
  substackPublishEmail: "",
};

const STORAGE_KEY = "forge:multi-post:creds:v1";

const PLATFORMS: Array<{
  id: PlatformId;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  note: string;
}> = [
  {
    id: "devto",
    name: "Dev.to",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    note: "Official API. Reliable. Generate token at dev.to/settings/extensions.",
  },
  {
    id: "hashnode",
    name: "Hashnode",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    note: "GraphQL API. Reliable. Generate token at hashnode.com/settings/developer.",
  },
  {
    id: "medium",
    name: "Medium",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    note: "Legacy API only. New accounts can't get tokens — Medium deprecated public publishing API in 2021.",
  },
  {
    id: "substack",
    name: "Substack",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    note: "Substack has no API. We email the post to your Substack publish address — it becomes a draft you review and publish.",
  },
];

export default function MultiPostPage() {
  const { toast } = useToast();

  // ── Composer state ─────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");

  // ── Platform toggles ───────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Record<PlatformId, boolean>>({
    devto: true,
    medium: false,
    hashnode: true,
    substack: true,
  });
  const [publishImmediately, setPublishImmediately] = useState(false);

  // ── Credentials (persisted to localStorage) ────────────────────────────────
  const [creds, setCreds] = useState<Credentials>(EMPTY_CREDS);
  const [showSettings, setShowSettings] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Credentials>;
        setCreds({ ...EMPTY_CREDS, ...parsed });
      }
    } catch { /* ignore */ }
  }, []);

  function saveCreds(next: Credentials) {
    setCreds(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  // ── State: in-flight + results ─────────────────────────────────────────────
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<PlatformResult[] | null>(null);

  const tags = useMemo(
    () => tagsRaw.split(",").map(t => t.trim()).filter(Boolean),
    [tagsRaw],
  );

  const canPublish = useMemo(() => {
    if (!title.trim() || !markdown.trim()) return false;
    return Object.entries(selected).some(([k, v]) => {
      if (!v) return false;
      const id = k as PlatformId;
      if (id === "devto") return !!creds.devtoToken;
      if (id === "medium") return !!creds.mediumToken;
      if (id === "hashnode") return !!creds.hashnodeToken && !!creds.hashnodePublicationId;
      if (id === "substack") return !!creds.substackPublishEmail;
      return false;
    });
  }, [title, markdown, selected, creds]);

  async function handlePublish() {
    if (!canPublish) {
      toast({ title: "Not ready", description: "Fill in title, body, and at least one platform with credentials." });
      return;
    }

    setPublishing(true);
    setResults(null);

    const payload: Record<string, unknown> = {
      title: title.trim(),
      markdown,
      tags,
      ...(canonicalUrl.trim() ? { canonicalUrl: canonicalUrl.trim() } : {}),
    };

    if (selected.devto && creds.devtoToken) {
      payload.devto = { token: creds.devtoToken, publish: publishImmediately };
    }
    if (selected.medium && creds.mediumToken) {
      payload.medium = { token: creds.mediumToken, publish: publishImmediately };
    }
    if (selected.hashnode && creds.hashnodeToken && creds.hashnodePublicationId) {
      payload.hashnode = {
        token: creds.hashnodeToken,
        publicationId: creds.hashnodePublicationId,
        publish: publishImmediately,
      };
    }
    if (selected.substack && creds.substackPublishEmail) {
      payload.substack = { publishEmail: creds.substackPublishEmail };
    }

    try {
      const res = await fetch("/api/multi-post/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await res.json() as { results?: PlatformResult[]; error?: string };
      if (!res.ok) {
        toast({ title: "Publish failed", description: data.error ?? `HTTP ${res.status}` });
        setPublishing(false);
        return;
      }
      setResults(data.results ?? []);
      const success = (data.results ?? []).filter(r => r.status === "success").length;
      const errs = (data.results ?? []).filter(r => r.status === "error").length;
      toast({
        title: errs === 0 ? "All platforms ok" : `Done — ${success} ok, ${errs} failed`,
        description: errs === 0 ? "See results below for links." : "Check results below for details.",
      });
    } catch (err) {
      toast({ title: "Network error", description: err instanceof Error ? err.message : "unknown" });
    } finally {
      setPublishing(false);
    }
  }

  async function lookupHashnodePublication() {
    if (!creds.hashnodeToken || !creds.hashnodeHost) {
      toast({ title: "Missing info", description: "Enter your Hashnode token and blog host first." });
      return;
    }
    try {
      const r = await fetch("/api/multi-post/hashnode-publication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: creds.hashnodeToken, host: creds.hashnodeHost }),
        credentials: "include",
      });
      const data = await r.json() as { id?: string; title?: string; error?: string };
      if (!r.ok || !data.id) {
        toast({ title: "Lookup failed", description: data.error ?? `HTTP ${r.status}` });
        return;
      }
      saveCreds({ ...creds, hashnodePublicationId: data.id });
      toast({ title: "Found it", description: `Publication: ${data.title} (id saved)` });
    } catch (err) {
      toast({ title: "Lookup failed", description: err instanceof Error ? err.message : "unknown" });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <AppFamily />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
              <Link href="/" className="hover:text-slate-200">Home</Link>
              <span>/</span>
              <span>Multi-Post</span>
            </div>
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
              <Send className="h-7 w-7 text-cyan-400" />
              Write Once, Post Everywhere
            </h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Compose one article. Publish to Dev.to, Hashnode, Medium, and Substack in a single click — no third-party tools, no monthly fees.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowSettings(s => !s)}
            className="border-slate-700 bg-slate-900 hover:bg-slate-800"
            data-testid="button-toggle-settings"
          >
            <Settings className="mr-2 h-4 w-4" />
            {showSettings ? "Hide" : "Show"} Platform Tokens
          </Button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="mb-8 rounded-lg border border-slate-800 bg-slate-900/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Platform Credentials</h2>
              <button
                type="button"
                onClick={() => setShowSecrets(s => !s)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
              >
                {showSecrets ? <><EyeOff className="h-3 w-3" /> Hide values</> : <><Eye className="h-3 w-3" /> Show values</>}
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Tokens are stored in your browser only (localStorage). They never leave your device until you click Publish.
            </p>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Dev.to */}
              <div>
                <label className="mb-1 block text-sm font-medium text-purple-300">Dev.to API Key</label>
                <Input
                  type={showSecrets ? "text" : "password"}
                  value={creds.devtoToken}
                  onChange={e => saveCreds({ ...creds, devtoToken: e.target.value })}
                  placeholder="paste from dev.to/settings/extensions"
                  className="bg-slate-950 border-slate-800"
                  data-testid="input-devto-token"
                />
                <a href="https://dev.to/settings/extensions" target="_blank" rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
                  Get token <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Medium */}
              <div>
                <label className="mb-1 block text-sm font-medium text-green-300">Medium Integration Token</label>
                <Input
                  type={showSecrets ? "text" : "password"}
                  value={creds.mediumToken}
                  onChange={e => saveCreds({ ...creds, mediumToken: e.target.value })}
                  placeholder="legacy tokens only (deprecated 2021)"
                  className="bg-slate-950 border-slate-800"
                  data-testid="input-medium-token"
                />
                <a href="https://medium.com/me/settings/security" target="_blank" rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
                  Settings → Security → Integration tokens <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Hashnode */}
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-blue-300">Hashnode Personal Access Token</label>
                <Input
                  type={showSecrets ? "text" : "password"}
                  value={creds.hashnodeToken}
                  onChange={e => saveCreds({ ...creds, hashnodeToken: e.target.value })}
                  placeholder="paste from hashnode.com/settings/developer"
                  className="bg-slate-950 border-slate-800"
                  data-testid="input-hashnode-token"
                />
                <a href="https://hashnode.com/settings/developer" target="_blank" rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                  Get token <ExternalLink className="h-3 w-3" />
                </a>

                <div className="mt-3 grid gap-3 md:grid-cols-[1fr,1fr,auto]">
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Blog host</label>
                    <Input
                      value={creds.hashnodeHost}
                      onChange={e => saveCreds({ ...creds, hashnodeHost: e.target.value })}
                      placeholder="yourhandle.hashnode.dev"
                      className="bg-slate-950 border-slate-800"
                      data-testid="input-hashnode-host"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Publication ID</label>
                    <Input
                      type={showSecrets ? "text" : "password"}
                      value={creds.hashnodePublicationId}
                      onChange={e => saveCreds({ ...creds, hashnodePublicationId: e.target.value })}
                      placeholder="auto-filled when you click Find"
                      className="bg-slate-950 border-slate-800"
                      data-testid="input-hashnode-pub-id"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={lookupHashnodePublication}
                      className="border-slate-700 bg-slate-900 hover:bg-slate-800"
                      data-testid="button-find-hashnode-pub"
                    >
                      Find
                    </Button>
                  </div>
                </div>
              </div>

              {/* Substack */}
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-orange-300">Substack Publish-by-Email Address</label>
                <Input
                  type="email"
                  value={creds.substackPublishEmail}
                  onChange={e => saveCreds({ ...creds, substackPublishEmail: e.target.value })}
                  placeholder="something@substack.com (from Substack → Settings → Publishing → Email-to-post)"
                  className="bg-slate-950 border-slate-800"
                  data-testid="input-substack-email"
                />
                <div className="mt-1 flex items-start gap-1 text-xs text-orange-300/80">
                  <Mail className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    Substack doesn't have a publishing API. We email your draft to this address — it lands in your Substack as a draft you review and publish.
                    Find the address in Substack → Settings → Publishing → "Post by email".
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          {/* Left: editor */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-300">Title</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="The headline readers will see everywhere"
                className="bg-slate-950 border-slate-800 text-lg"
                data-testid="input-title"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-300">Body (Markdown)</label>
              <Textarea
                value={markdown}
                onChange={e => setMarkdown(e.target.value)}
                rows={18}
                placeholder={"# Optional H1\n\nWrite your post in Markdown. Headings, **bold**, _italic_, `code`, lists, links — all standard.\n\nDev.to, Hashnode, and Medium handle Markdown natively. Substack receives a simple HTML-converted version via email."}
                className="bg-slate-950 border-slate-800 font-mono text-sm"
                data-testid="textarea-markdown"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>{markdown.length.toLocaleString()} characters · ~{Math.max(1, Math.round(markdown.split(/\s+/).filter(Boolean).length / 220))} min read</span>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(markdown);
                    toast({ title: "Copied", description: "Markdown copied to clipboard." });
                  }}
                  className="inline-flex items-center gap-1 hover:text-slate-300"
                >
                  <Copy className="h-3 w-3" /> Copy markdown
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Tags (comma-separated)</label>
                <Input
                  value={tagsRaw}
                  onChange={e => setTagsRaw(e.target.value)}
                  placeholder="indiehackers, selfhosting, devtools"
                  className="bg-slate-950 border-slate-800"
                  data-testid="input-tags"
                />
                <p className="mt-1 text-xs text-slate-500">Max 4 used on Dev.to, 5 on Medium/Hashnode.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Canonical URL (optional)</label>
                <Input
                  value={canonicalUrl}
                  onChange={e => setCanonicalUrl(e.target.value)}
                  placeholder="https://13moonforge.substack.com/p/your-post"
                  className="bg-slate-950 border-slate-800"
                  data-testid="input-canonical"
                />
                <p className="mt-1 text-xs text-slate-500">Tells Google which version is the original. Protects your SEO.</p>
              </div>
            </div>
          </div>

          {/* Right: platforms + publish */}
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Globe className="h-4 w-4 text-cyan-400" />
                Publish to
              </h3>
              <div className="space-y-2">
                {PLATFORMS.map(p => {
                  const hasCreds =
                    p.id === "devto" ? !!creds.devtoToken :
                    p.id === "medium" ? !!creds.mediumToken :
                    p.id === "hashnode" ? !!(creds.hashnodeToken && creds.hashnodePublicationId) :
                    !!creds.substackPublishEmail;

                  return (
                    <label
                      key={p.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition",
                        selected[p.id] && hasCreds ? `${p.bgColor} ${p.borderColor}` : "border-slate-800 bg-slate-950 hover:bg-slate-900",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected[p.id]}
                        onChange={e => setSelected({ ...selected, [p.id]: e.target.checked })}
                        className="mt-1"
                        data-testid={`checkbox-platform-${p.id}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-medium", p.color)}>{p.name}</span>
                          {!hasCreds && selected[p.id] && (
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                              No token
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">{p.note}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={publishImmediately}
                  onChange={e => setPublishImmediately(e.target.checked)}
                  data-testid="checkbox-publish-immediately"
                />
                <span className="font-medium text-slate-200">Publish immediately</span>
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Off = save as drafts on Dev.to and Medium (recommended for first run). On = go live immediately on Dev.to, Medium, and Hashnode.
                Substack always lands as a draft (emailed to your publish address). Hashnode's API only supports publishing live, so Hashnode is skipped when this is off.
              </p>
            </div>

            <Button
              size="lg"
              onClick={handlePublish}
              disabled={!canPublish || publishing}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50"
              data-testid="button-publish"
            >
              {publishing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Publishing…</>
              ) : publishImmediately ? (
                <><Send className="mr-2 h-5 w-5" /> Publish to selected</>
              ) : (
                <><Save className="mr-2 h-5 w-5" /> Save drafts to selected</>
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900/40 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              Results
            </h2>
            <div className="space-y-3">
              {results.map(r => {
                const platform = PLATFORMS.find(p => p.id === r.platform);
                return (
                  <div
                    key={r.platform}
                    className={cn(
                      "flex items-start gap-3 rounded-md border p-3",
                      r.status === "success" ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5",
                    )}
                  >
                    {r.status === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className={cn("font-medium", platform?.color)}>{platform?.name ?? r.platform}</div>
                      <div className="mt-0.5 text-sm text-slate-300">{r.message}</div>
                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          {r.url} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5 text-cyan-400" />
            How this works (first-time setup)
          </h2>
          <ol className="ml-5 list-decimal space-y-2 text-sm text-slate-300">
            <li>Click <em>Show Platform Tokens</em> at the top.</li>
            <li>For each platform you want to use, follow the link to get an API token and paste it in. Tokens stay in your browser.</li>
            <li>For Hashnode, type your blog host (e.g. <code className="rounded bg-slate-800 px-1">yourhandle.hashnode.dev</code>) and click <em>Find</em> — we'll fetch your publication ID automatically.</li>
            <li>For Substack, find your "Post by email" address in Substack settings and paste it here.</li>
            <li>Write your post, pick platforms, hit <em>Save drafts</em>. Review each platform's draft, then publish.</li>
          </ol>
          <p className="mt-3 text-xs text-slate-500">
            Tip: Set the canonical URL to your Substack post so Google credits Substack as the original. This protects your Substack SEO while still reaching readers on the other platforms.
          </p>
        </div>
      </div>
    </div>
  );
}
