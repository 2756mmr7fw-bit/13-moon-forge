import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Server, Layers, BookOpen, CheckCircle2, XCircle, RefreshCw, Unplug,
  ExternalLink, Loader2, AlertTriangle, Globe, Zap, Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getUserId() {
  let id = localStorage.getItem("13moonforge_user_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("13moonforge_user_id", id); }
  return id;
}

function headers() {
  return { "Content-Type": "application/json", "x-user-id": getUserId() };
}

// ─── App Catalog (static) ────────────────────────────────────────────────────

interface CatalogApp {
  id: string;
  name: string;
  moon: number;
  tagline: string;
  description: string;
  minRam: number;
  tptsSlug: string;
  status: "available" | "soon";
  color: string;
}

const CATALOG: CatalogApp[] = [
  {
    id: "forge",
    name: "Forge Builder",
    moon: 3,
    tagline: "AI invention & building platform",
    description: "The complete AI-powered workspace for inventors, founders, and builders. Projects, brainstorm, code, game docs, legal, launch kit — all in one place.",
    minRam: 4,
    tptsSlug: "forge",
    status: "available",
    color: "text-orange-400",
  },
  {
    id: "hawk",
    name: "Ask Hawk",
    moon: 2,
    tagline: "Research & intelligence assistant",
    description: "Deep research, competitive analysis, market intelligence. Hawk digs through anything and surfaces what matters.",
    minRam: 2,
    tptsSlug: "hawk",
    status: "available",
    color: "text-sky-400",
  },
  {
    id: "quill",
    name: "Quill",
    moon: 5,
    tagline: "AI writing & content creation",
    description: "Long-form writing, copywriting, content strategy, and editorial workflows powered by AI. Built for writers who ship.",
    minRam: 2,
    tptsSlug: "quill",
    status: "available",
    color: "text-emerald-400",
  },
  {
    id: "creed",
    name: "Creed",
    moon: 6,
    tagline: "Values, mission & principles",
    description: "Define your organization's core values, build your mission statement, and align your team around principles that last.",
    minRam: 2,
    tptsSlug: "creed",
    status: "available",
    color: "text-violet-400",
  },
  {
    id: "sage",
    name: "Sage",
    moon: 7,
    tagline: "Learning & knowledge companion",
    description: "AI-powered learning paths, knowledge summaries, and structured study sessions. Learn faster. Retain more.",
    minRam: 2,
    tptsSlug: "sage",
    status: "available",
    color: "text-amber-400",
  },
  {
    id: "flint",
    name: "Flint",
    moon: 13,
    tagline: "Spark generation & creative ignition",
    description: "When you're stuck. Flint throws sparks — unexpected angles, contrarian takes, and creative provocations to unstick your thinking.",
    minRam: 2,
    tptsSlug: "flint",
    status: "available",
    color: "text-red-400",
  },
];

const PROVIDERS = [
  { name: "Hetzner Cloud",    price: "from €4/mo",  note: "Best value in Europe. CX22 (4GB) = €6/mo.",          url: "https://hetzner.com/cloud",    tag: "Best Value" },
  { name: "DigitalOcean",     price: "from $4/mo",  note: "Excellent docs and community. Droplet 2GB = $12/mo.", url: "https://digitalocean.com",      tag: "" },
  { name: "Vultr",            price: "from $2.50/mo",note: "Good global coverage. 2GB = $12/mo.",                url: "https://vultr.com",             tag: "" },
  { name: "Linode / Akamai",  price: "from $5/mo",  note: "Reliable and well-priced. Nanode 1GB = $5/mo.",      url: "https://linode.com",            tag: "" },
  { name: "Any Ubuntu VPS",   price: "varies",      note: "Anything running Ubuntu 22.04+ works.",               url: "",                              tag: "Most Flexible" },
];

// ─── Server Status ────────────────────────────────────────────────────────────

interface ServerInfo {
  connected: boolean;
  name?: string;
  coolifyUrl?: string;
  apiKeyPreview?: string;
  connectedAt?: string;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "start" | "server" | "catalog";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size: number }> }[] = [
  { id: "start",   label: "Get Started",  icon: BookOpen },
  { id: "server",  label: "My Server",    icon: Server },
  { id: "catalog", label: "App Catalog",  icon: Layers },
];

// ─── Get Started Tab ──────────────────────────────────────────────────────────

function GetStartedTab({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="space-y-10">
      {/* Intro */}
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold mb-2">Own your stack. Pay only for what you use.</h2>
        <p className="text-muted-foreground leading-relaxed">
          Your apps run on <strong>your own server</strong> — no platform lock-in, no shared infrastructure.
          You pay your hosting provider directly (month to month, cancel anytime) and pay us via{" "}
          <a href="https://thepeoplestownsq.com" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
            the Town Square
          </a>{" "}
          for the apps you subscribe to. Two separate bills. Full control.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-6">
        {/* Step 1 */}
        <div className="flex gap-4">
          <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-black text-primary">1</div>
          <div className="flex-1 pt-0.5">
            <h3 className="font-bold mb-1">Pick any VPS provider</h3>
            <p className="text-sm text-muted-foreground mb-4">All you need is a server running Ubuntu 22.04 or later. Pick whatever works for you:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PROVIDERS.map(p => (
                <div key={p.name} className="rounded-lg border border-border bg-card p-3 relative">
                  {p.tag && (
                    <span className="absolute top-2 right-2 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      {p.tag}
                    </span>
                  )}
                  <p className="font-semibold text-sm mb-0.5">{p.name}</p>
                  <p className="text-primary text-xs font-bold mb-1">{p.price}</p>
                  <p className="text-xs text-muted-foreground">{p.note}</p>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors">
                      Visit <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-4">
          <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-black text-primary">2</div>
          <div className="flex-1 pt-0.5">
            <h3 className="font-bold mb-1">Install Coolify on your server</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Coolify is free, open source, and installs with one command. It's your self-hosted PaaS — it manages Docker, SSL, domains, and deployments.
            </p>
            <div className="rounded-lg bg-black/50 border border-border p-4 font-mono text-sm text-green-400">
              curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              After install, Coolify runs at <span className="font-mono text-foreground">http://your-server-ip:8000</span>. Open it in your browser and create your admin account.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-4">
          <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-black text-primary">3</div>
          <div className="flex-1 pt-0.5">
            <h3 className="font-bold mb-1">Get your Coolify API key</h3>
            <p className="text-sm text-muted-foreground mb-3">
              In your Coolify dashboard, go to <strong>Keys &amp; Tokens</strong> (or <strong>Settings → API Tokens</strong>) and create a new API key. Copy it — you'll only see it once.
            </p>
            <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
              Your Coolify URL will be something like <span className="font-mono text-foreground">http://123.456.789.0:8000</span> or a custom domain if you've set one up.
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex gap-4">
          <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-black text-primary">4</div>
          <div className="flex-1 pt-0.5">
            <h3 className="font-bold mb-1">Connect your server to Forge</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Paste your Coolify URL and API key into the My Server tab. Forge will verify the connection and then you can deploy apps from the App Catalog.
            </p>
            <Button onClick={onConnect} className="gap-2">
              <Server size={15} />
              Connect My Server
            </Button>
          </div>
        </div>
      </div>

      {/* Pricing clarity */}
      <div className="rounded-xl border border-border bg-card p-6 max-w-lg">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Zap size={16} className="text-primary" /> How the billing works
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4 py-2 border-b border-border/50">
            <span className="text-muted-foreground">Your hosting provider</span>
            <span className="font-medium">Compute — you pay them directly</span>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <span className="text-muted-foreground">Sovereign Digital (us)</span>
            <span className="font-medium">App subscriptions — via the Town Square</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Two separate monthly bills. Cancel either one independently. No contracts.
        </p>
      </div>
    </div>
  );
}

// ─── My Server Tab ────────────────────────────────────────────────────────────

function MyServerTab({
  serverInfo,
  onSaved,
}: {
  serverInfo: ServerInfo | null;
  onSaved: () => void;
}) {
  const [name, setName]         = useState("");
  const [url, setUrl]           = useState("");
  const [apiKey, setApiKey]     = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [health, setHealth]     = useState<{ ok: boolean; checking: boolean }>({ ok: false, checking: false });
  const [disconnecting, setDisconnecting] = useState(false);

  const checkHealth = async () => {
    setHealth({ ok: false, checking: true });
    const res  = await fetch(`${API_BASE}/api/deploy/health`, { headers: headers() });
    const data = await res.json();
    setHealth({ ok: data.ok === true, checking: false });
  };

  const save = async () => {
    setError(""); setSaving(true);
    try {
      const res  = await fetch(`${API_BASE}/api/deploy/connect`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ name, coolifyUrl: url, coolifyApiKey: apiKey }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Connection failed"); setSaving(false); return; }
      setSaving(false);
      setApiKey("");
      onSaved();
    } catch {
      setError("Could not reach the API — try again.");
      setSaving(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("Disconnect your server? You can reconnect at any time.")) return;
    setDisconnecting(true);
    await fetch(`${API_BASE}/api/deploy/server`, { method: "DELETE", headers: headers() });
    setDisconnecting(false);
    onSaved();
  };

  if (serverInfo?.connected) {
    return (
      <div className="max-w-lg space-y-6">
        {/* Connected state */}
        <div className="rounded-xl border border-green-800/50 bg-green-900/10 p-5">
          <div className="flex items-center gap-2 text-green-400 font-bold mb-3">
            <CheckCircle2 size={18} />
            Server Connected
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-3">
              <dt className="text-muted-foreground w-24 shrink-0">Name</dt>
              <dd className="font-medium">{serverInfo.name}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-muted-foreground w-24 shrink-0">Coolify URL</dt>
              <dd className="font-mono text-xs pt-0.5 break-all">{serverInfo.coolifyUrl}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-muted-foreground w-24 shrink-0">API Key</dt>
              <dd className="font-mono text-xs pt-0.5 text-muted-foreground">{serverInfo.apiKeyPreview}</dd>
            </div>
          </dl>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={checkHealth}
            disabled={health.checking}
            className="gap-2"
          >
            {health.checking
              ? <Loader2 size={14} className="animate-spin" />
              : <RefreshCw size={14} />
            }
            Check Health
          </Button>

          {health.ok && (
            <span className="flex items-center gap-1.5 text-sm text-green-400">
              <CheckCircle2 size={14} /> Server is responding
            </span>
          )}
          {!health.checking && health.ok === false && health.ok !== undefined && (
            <span className="flex items-center gap-1.5 text-sm text-red-400">
              <XCircle size={14} /> Not responding
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-border">
          <Button
            variant="ghost"
            className="text-muted-foreground gap-2 hover:text-destructive"
            onClick={disconnect}
            disabled={disconnecting}
          >
            {disconnecting ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
            Disconnect Server
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <p className="font-semibold mb-1 flex items-center gap-2"><Globe size={14} /> Coolify Dashboard</p>
          <p className="text-muted-foreground text-xs mb-2">Manage your deployments, domains, and environment variables directly in Coolify.</p>
          <a
            href={serverInfo.coolifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            Open Coolify <ExternalLink size={11} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h2 className="text-lg font-bold mb-1">Connect your Coolify server</h2>
        <p className="text-sm text-muted-foreground">
          Paste your Coolify URL and API key. Forge will verify the connection and never share your key.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="mb-1.5 block text-sm font-semibold">Server Nickname</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Hetzner VPS" className="bg-card" />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm font-semibold">
            Coolify URL <span className="text-[10px] font-bold text-primary uppercase tracking-wider ml-1">Required</span>
          </Label>
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="http://123.456.789.0:8000" className="bg-card font-mono text-sm" />
          <p className="text-xs text-muted-foreground mt-1">The URL where Coolify is running on your server.</p>
        </div>
        <div>
          <Label className="mb-1.5 block text-sm font-semibold">
            Coolify API Key <span className="text-[10px] font-bold text-primary uppercase tracking-wider ml-1">Required</span>
          </Label>
          <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="••••••••••••••••" className="bg-card font-mono text-sm" />
          <p className="text-xs text-muted-foreground mt-1">
            Found in Coolify → Keys &amp; Tokens → API Tokens. Stored encrypted.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-800/50 bg-red-900/10 p-3 text-sm text-red-400">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <Button onClick={save} disabled={!url.trim() || !apiKey.trim() || saving} className="gap-2 w-full">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Server size={15} />}
          {saving ? "Verifying connection…" : "Connect Server"}
        </Button>
      </div>
    </div>
  );
}

// ─── App Catalog Tab ──────────────────────────────────────────────────────────

function AppCatalogTab({ connected }: { connected: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Sovereign Digital App Catalog</h2>
        <p className="text-sm text-muted-foreground">
          Subscribe to apps on the Town Square, then deploy them to your server.{" "}
          {!connected && (
            <span className="text-amber-400">Connect your server first to enable deployment.</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATALOG.map(app => (
          <div
            key={app.id}
            className={cn(
              "rounded-xl border border-border bg-card p-5 flex flex-col gap-3",
              app.status === "soon" && "opacity-60",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Moon size={12} className={app.color} />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Moon #{app.moon}
                  </span>
                  {app.status === "soon" && (
                    <Badge variant="secondary" className="text-[9px] h-4">Coming Soon</Badge>
                  )}
                </div>
                <h3 className="font-bold text-base">{app.name}</h3>
                <p className={cn("text-xs font-medium mt-0.5", app.color)}>{app.tagline}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed flex-1">{app.description}</p>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Server size={11} /> Min {app.minRam}GB RAM
              </span>
              <div className="flex gap-2">
                <a
                  href={`https://thepeoplestownsq.com/moons/${app.tptsSlug}?ref=forge-hub`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted transition-colors"
                >
                  Subscribe <ExternalLink size={10} />
                </a>
                {connected && app.status === "available" && (
                  <a
                    href="javascript:void(0)"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                    title="Coming soon — manage deployments directly from Forge"
                  >
                    Deploy
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-5 text-sm text-muted-foreground max-w-2xl">
        <p className="font-semibold text-foreground mb-1">How subscription and deployment work together</p>
        <p>
          Subscribe on the Town Square to get your Moon subscription and access credentials. Then use Forge to deploy that app to your own server — your subscription gives you the license, your server provides the compute. You keep ownership of both.
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AppHub() {
  const [activeTab, setActiveTab] = useState<Tab>("start");
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading]       = useState(true);

  const fetchServerInfo = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/deploy/server`, { headers: headers() });
      const data = await res.json();
      setServerInfo(data);
    } catch {
      setServerInfo({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServerInfo(); }, []);

  const handleSaved = () => fetchServerInfo();

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-primary/10 rounded-xl p-3 shrink-0 border border-primary/20">
          <Layers className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight">App Hub</h1>
            <Badge className="text-[10px] font-bold tracking-wider">BRING YOUR OWN SERVER</Badge>
            {!loading && serverInfo?.connected && (
              <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                <CheckCircle2 size={13} /> {serverInfo.name ?? "Server"} connected
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Your apps run on your server. You pay compute to your provider and app subscriptions to us — separately, monthly, no lock-in.
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-0.5 overflow-x-auto pb-px border-b border-border mb-8">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px",
              activeTab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
            )}
          >
            <t.icon size={14} />
            {t.label}
            {t.id === "server" && !loading && serverInfo?.connected && (
              <span className="w-2 h-2 rounded-full bg-green-400 ml-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {activeTab === "start"   && <GetStartedTab onConnect={() => setActiveTab("server")} />}
          {activeTab === "server"  && <MyServerTab serverInfo={serverInfo} onSaved={handleSaved} />}
          {activeTab === "catalog" && <AppCatalogTab connected={!!serverInfo?.connected} />}
        </>
      )}
    </div>
  );
}
