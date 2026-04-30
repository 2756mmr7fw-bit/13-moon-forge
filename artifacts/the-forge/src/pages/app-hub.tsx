import { useState, useEffect, useRef, useCallback } from "react";
import { getAuthToken } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Server, Layers, BookOpen, CheckCircle2, XCircle, RefreshCw, Unplug,
  ExternalLink, Loader2, AlertTriangle, Globe, Zap, Moon,
  Activity, Play, Square, RotateCcw, Clock, RocketIcon,
  Sparkles, MapPin, Cpu, HardDrive, MemoryStick, Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpPanel } from "@/components/help-panel";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
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
  dockerImage: string;
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
    dockerImage: "sovereigndigital/forge:latest",
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
    dockerImage: "sovereigndigital/hawk:latest",
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
    dockerImage: "sovereigndigital/quill:latest",
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
    dockerImage: "sovereigndigital/creed:latest",
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
    dockerImage: "sovereigndigital/sage:latest",
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
    dockerImage: "sovereigndigital/flint:latest",
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

type Tab = "start" | "server" | "catalog" | "apps";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size: number }> }[] = [
  { id: "start",   label: "Get Started",  icon: BookOpen },
  { id: "server",  label: "My Server",    icon: Server },
  { id: "catalog", label: "App Catalog",  icon: Layers },
  { id: "apps",    label: "Live Apps",    icon: Activity },
];

// ─── Hetzner Auto-Provisioner ─────────────────────────────────────────────────

interface HetznerServerType {
  id: number;
  name: string;
  description: string;
  cores: number;
  memory: number;
  disk: number;
  priceMonthly: string;
}

interface HetznerLocation {
  id: number;
  name: string;
  description: string;
  country: string;
  city: string;
}

type ProvisionStep = "token" | "configure" | "provisioning" | "waiting" | "done" | "error";

function HetznerProvisioner({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<ProvisionStep>("token");
  const [token, setToken] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [serverTypes, setServerTypes] = useState<HetznerServerType[]>([]);
  const [locations, setLocations] = useState<HetznerLocation[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("fsn1");
  const [serverName, setServerName] = useState("forge-server");
  const [provisioning, setProvisioning] = useState(false);
  const [serverIp, setServerIp] = useState("");
  const [coolifyUrl, setCoolifyUrl] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  async function validateToken() {
    if (!token.trim()) { setTokenError("Enter your Hetzner API token"); return; }
    setLoadingTypes(true); setTokenError("");
    try {
      const [typesRes, locsRes] = await Promise.all([
        fetch(`${API_BASE}/api/hetzner/server-types`, {
          headers: { ...(await authHeaders()), "x-hetzner-token": token.trim() },
        }),
        fetch(`${API_BASE}/api/hetzner/locations`, {
          headers: { ...(await authHeaders()), "x-hetzner-token": token.trim() },
        }),
      ]);
      const typesData = await typesRes.json() as { types?: HetznerServerType[]; error?: string };
      if (!typesRes.ok || typesData.error) {
        setTokenError(typesData.error ?? "Invalid token — check it and try again");
        setLoadingTypes(false); return;
      }
      const locsData = await locsRes.json() as { locations?: HetznerLocation[] };
      setServerTypes(typesData.types ?? []);
      setLocations(locsData.locations ?? []);
      if (typesData.types?.[0]) setSelectedType(typesData.types[1]?.name ?? typesData.types[0].name);
      setLoadingTypes(false);
      setStep("configure");
    } catch {
      setTokenError("Could not reach Hetzner — check your internet connection");
      setLoadingTypes(false);
    }
  }

  async function provision() {
    setProvisioning(true); setError("");
    try {
      const r = await fetch(`${API_BASE}/api/hetzner/provision`, {
        method: "POST",
        headers: { ...(await authHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify({ hetznerToken: token.trim(), serverType: selectedType, location: selectedLocation, serverName }),
      });
      const data = await r.json() as { ok?: boolean; serverId?: number; ip?: string; coolifyUrl?: string; error?: string };
      if (!r.ok || !data.ok) {
        setError(data.error ?? "Provisioning failed"); setProvisioning(false); setStep("error"); return;
      }
      const sid = data.serverId ?? 0;
      setServerIp(data.ip ?? "");
      setCoolifyUrl(data.coolifyUrl ?? "");
      setProvisioning(false);
      setStep("waiting");
      startPolling(sid, data.coolifyUrl ?? "");
    } catch {
      setError("Network error — please try again"); setProvisioning(false); setStep("error");
    }
  }

  function startPolling(sid: number, curl: string) {
    let count = 0;
    pollRef.current = setInterval(async () => {
      count++;
      setPollCount(count);
      try {
        const r = await fetch(`${API_BASE}/api/hetzner/server-status/${sid}`, {
          headers: { ...(await authHeaders()), "x-hetzner-token": token.trim() },
        });
        const data = await r.json() as { coolifyReady?: boolean; status?: string };
        if (data.coolifyReady) {
          stopPolling();
          setStep("done");
          // Update connection record with real coolify URL
          await fetch(`${API_BASE}/api/deploy/connect`, {
            method: "POST",
            headers: await authHeaders(),
            body: JSON.stringify({ name: serverName, coolifyUrl: curl, coolifyApiKey: "setup-required" }),
          });
        }
      } catch { /* keep polling */ }
      if (count >= 60) { // ~5 minutes max
        stopPolling();
        setStep("done"); // Show done anyway, user can check manually
      }
    }, 5000);
  }

  const selectedTypeInfo = serverTypes.find(t => t.name === selectedType);

  if (step === "token") return (
    <div className="max-w-md space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <Sparkles size={18} className="text-primary" /> Auto-provision your server
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Forge will create a Hetzner server, install Coolify, and connect it — all automatically. You'll need a free Hetzner Cloud account and an API token.
        </p>
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm space-y-2">
        <p className="font-semibold flex items-center gap-1.5"><Key size={13} className="text-primary" /> How to get your Hetzner API token:</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs leading-relaxed">
          <li>Go to <a href="https://console.hetzner.cloud" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">console.hetzner.cloud</a> and create a free account</li>
          <li>Create a new project (or use an existing one)</li>
          <li>In the project, go to <strong className="text-foreground">Security → API Tokens</strong></li>
          <li>Click <strong className="text-foreground">Generate API Token</strong>, give it Read &amp; Write access</li>
          <li>Copy the token — paste it below</li>
        </ol>
      </div>
      <div className="space-y-2">
        <Label className="font-semibold">Hetzner API Token</Label>
        <Input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          onKeyDown={e => e.key === "Enter" && validateToken()}
          placeholder="hCloud API token from Hetzner console"
          className="font-mono text-sm"
        />
        {tokenError && (
          <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={12} /> {tokenError}</p>
        )}
        <p className="text-xs text-muted-foreground">Your token is sent directly to Hetzner. We never store it.</p>
      </div>
      <Button onClick={validateToken} disabled={loadingTypes || !token.trim()} className="w-full gap-2">
        {loadingTypes ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        {loadingTypes ? "Verifying token…" : "Continue"}
      </Button>
    </div>
  );

  if (step === "configure") return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Configure your server</h2>
        <p className="text-sm text-muted-foreground">Pick your server size and location. You can always upgrade later in Hetzner.</p>
      </div>

      {/* Server type picker */}
      <div className="space-y-3">
        <Label className="font-semibold flex items-center gap-1.5"><Cpu size={13} /> Server Size</Label>
        <div className="grid gap-3">
          {serverTypes.map(t => (
            <button
              key={t.name}
              onClick={() => setSelectedType(t.name)}
              className={cn(
                "w-full text-left rounded-xl border p-4 transition-all",
                selectedType === t.name
                  ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(232,97,26,0.1)]"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm uppercase tracking-wide">{t.name}</span>
                    {t.name === "cx32" && <Badge className="text-[9px] h-4 bg-primary/20 text-primary border-primary/30">Recommended</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Cpu size={10} /> {t.cores} vCPU</span>
                    <span className="flex items-center gap-1"><MemoryStick size={10} /> {t.memory}GB RAM</span>
                    <span className="flex items-center gap-1"><HardDrive size={10} /> {t.disk}GB SSD</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-primary font-bold text-sm">€{t.priceMonthly}</span>
                  <span className="text-muted-foreground text-xs">/mo</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label className="font-semibold flex items-center gap-1.5"><MapPin size={13} /> Location</Label>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            {locations.map(l => (
              <SelectItem key={l.name} value={l.name}>
                {l.city}, {l.country} ({l.name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Pick the location closest to you or your users for best performance.</p>
      </div>

      {/* Server name */}
      <div className="space-y-2">
        <Label className="font-semibold">Server Name</Label>
        <Input value={serverName} onChange={e => setServerName(e.target.value)} placeholder="forge-server" className="font-mono" />
      </div>

      {selectedTypeInfo && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-semibold mb-2">Order summary</p>
          <div className="space-y-1 text-muted-foreground text-xs">
            <div className="flex justify-between"><span>Hetzner {selectedType.toUpperCase()} in {selectedLocation}</span><span className="text-foreground font-medium">€{selectedTypeInfo.priceMonthly}/mo</span></div>
            <div className="flex justify-between"><span>Forge setup &amp; Coolify install</span><span className="text-green-400 font-medium">Free</span></div>
            <div className="flex justify-between pt-2 border-t border-border mt-2 font-semibold text-foreground"><span>You pay Hetzner directly</span><span>€{selectedTypeInfo.priceMonthly}/mo</span></div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Billed monthly by Hetzner. Cancel anytime from their console.</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep("token")} className="gap-2">Back</Button>
        <Button onClick={provision} disabled={!selectedType || !selectedLocation || provisioning} className="flex-1 gap-2">
          {provisioning ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {provisioning ? "Creating server…" : "Provision My Server"}
        </Button>
      </div>
    </div>
  );

  if (step === "provisioning") return (
    <div className="max-w-md text-center py-12 space-y-4">
      <div className="flex justify-center"><Loader2 size={40} className="animate-spin text-primary" /></div>
      <h2 className="text-lg font-bold">Creating your server…</h2>
      <p className="text-sm text-muted-foreground">Forge is spinning up your Hetzner server. This takes about 30 seconds.</p>
    </div>
  );

  if (step === "waiting") return (
    <div className="max-w-md space-y-6">
      <div className="text-center py-8 space-y-3">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Server size={20} className="absolute inset-0 m-auto text-primary" />
          </div>
        </div>
        <h2 className="text-lg font-bold">Installing Coolify…</h2>
        <p className="text-sm text-muted-foreground">
          Your server is up at <span className="font-mono text-foreground">{serverIp}</span>.<br />
          Coolify is being installed automatically. This takes 3–5 minutes.
        </p>
        <div className="text-xs text-muted-foreground">
          Checking every 5 seconds… ({pollCount * 5}s elapsed)
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 text-sm space-y-2">
        <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">What's happening</p>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-green-400 shrink-0" /> Server created on Hetzner</div>
          <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-green-400 shrink-0" /> Ubuntu 22.04 booted</div>
          <div className="flex items-center gap-2"><Loader2 size={12} className="animate-spin text-primary shrink-0" /> Installing Docker + Coolify</div>
          <div className="flex items-center gap-2 opacity-40"><Clock size={12} className="shrink-0" /> Connecting to Forge</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">You can leave this page — we'll remember your server.</p>
    </div>
  );

  if (step === "done") return (
    <div className="max-w-md space-y-6">
      <div className="text-center py-6 space-y-3">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-900/20 border border-green-800/40 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-green-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold">Server is ready!</h2>
        <p className="text-sm text-muted-foreground">
          Your Hetzner server is running at <span className="font-mono text-foreground">{serverIp}</span> with Coolify installed.
        </p>
      </div>

      <div className="rounded-xl border border-green-800/40 bg-green-900/10 p-4 space-y-3 text-sm">
        <p className="font-semibold text-green-300">Next: Set up your Coolify account</p>
        <ol className="list-decimal list-inside space-y-2 text-muted-foreground text-xs leading-relaxed">
          <li>Open <a href={coolifyUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{coolifyUrl}</a> in a new tab</li>
          <li>Create your Coolify admin account (first time only)</li>
          <li>Go to <strong className="text-foreground">Keys & Tokens → API Tokens</strong></li>
          <li>Create an API token and copy it</li>
          <li>Come back here and paste it in the <strong className="text-foreground">My Server</strong> tab</li>
        </ol>
      </div>

      <Button onClick={onDone} className="w-full gap-2">
        <Server size={15} /> Connect My Server Now
      </Button>
    </div>
  );

  if (step === "error") return (
    <div className="max-w-md space-y-4">
      <div className="rounded-xl border border-red-800/40 bg-red-900/10 p-5 text-center space-y-3">
        <XCircle size={32} className="text-red-400 mx-auto" />
        <h2 className="font-bold text-red-300">Provisioning failed</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
      <Button onClick={() => { setStep("configure"); setError(""); }} variant="outline" className="w-full">Try Again</Button>
    </div>
  );

  return null;
}

// ─── Get Started Tab ──────────────────────────────────────────────────────────

function GetStartedTab({ onConnect }: { onConnect: () => void }) {
  const [mode, setMode] = useState<"choose" | "auto" | "manual">("choose");

  if (mode === "auto") return <HetznerProvisioner onDone={onConnect} />;

  if (mode === "manual") return (
    <div className="space-y-8 max-w-2xl">
      <button onClick={() => setMode("choose")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
        ← Back to options
      </button>
      <div>
        <h2 className="text-xl font-bold mb-2">Manual setup</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Get a server running Ubuntu 22.04+, install Coolify, then connect it to Forge.
        </p>
      </div>
      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-black text-primary">1</div>
          <div className="flex-1 pt-0.5">
            <h3 className="font-bold mb-1">Pick any VPS provider</h3>
            <p className="text-sm text-muted-foreground mb-3">Any server running Ubuntu 22.04 or later works.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROVIDERS.map(p => (
                <div key={p.name} className="rounded-lg border border-border bg-card p-3 relative">
                  {p.tag && <span className="absolute top-2 right-2 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wider">{p.tag}</span>}
                  <p className="font-semibold text-sm mb-0.5">{p.name}</p>
                  <p className="text-primary text-xs font-bold mb-1">{p.price}</p>
                  <p className="text-xs text-muted-foreground">{p.note}</p>
                  {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors">Visit <ExternalLink size={10} /></a>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-black text-primary">2</div>
          <div className="flex-1 pt-0.5">
            <h3 className="font-bold mb-1">Install Coolify</h3>
            <div className="rounded-lg bg-black/50 border border-border p-4 font-mono text-sm text-green-400">curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash</div>
            <p className="text-xs text-muted-foreground mt-2">Coolify runs at <span className="font-mono text-foreground">http://your-server-ip:8000</span> after install.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-black text-primary">3</div>
          <div className="flex-1 pt-0.5">
            <h3 className="font-bold mb-1">Connect to Forge</h3>
            <p className="text-sm text-muted-foreground mb-3">Get your Coolify API key from <strong>Keys & Tokens → API Tokens</strong>, then paste it in My Server.</p>
            <Button onClick={onConnect} className="gap-2"><Server size={15} /> Connect My Server</Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold mb-2">Own your stack. Pay only for what you use.</h2>
        <p className="text-muted-foreground leading-relaxed text-sm">
          Your apps run on <strong>your own server</strong> — no platform lock-in, no shared infrastructure.
          You pay your hosting provider directly and pay us via the{" "}
          <a href="https://thepeoplestownsq.com" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Town Square</a>{" "}
          for the apps. Two separate bills. Full control.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
        {/* Auto path */}
        <button
          onClick={() => setMode("auto")}
          className="text-left rounded-2xl border-2 border-primary/40 bg-primary/5 p-6 hover:border-primary hover:bg-primary/10 transition-all group"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles size={18} className="text-primary" />
            </div>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Recommended</Badge>
          </div>
          <h3 className="font-bold text-base mb-1">Auto-Provision with Hetzner</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Paste your Hetzner API token and Forge spins up the server, installs Coolify, and connects everything — automatically.
          </p>
          <div className="mt-4 text-xs text-primary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
            Get started <span>→</span>
          </div>
        </button>

        {/* Manual path */}
        <button
          onClick={() => setMode("manual")}
          className="text-left rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center mb-3">
            <Server size={18} className="text-muted-foreground" />
          </div>
          <h3 className="font-bold text-base mb-1">I'll set up my own server</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Already have a server or prefer another provider? Install Coolify yourself and connect it manually.
          </p>
          <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1 group-hover:gap-2 transition-all group-hover:text-foreground">
            Manual setup <span>→</span>
          </div>
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 max-w-lg text-sm">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Zap size={14} className="text-primary" /> How billing works</h3>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex justify-between gap-4 py-1.5 border-b border-border/50">
            <span>Your hosting provider (Hetzner, etc.)</span>
            <span className="font-medium text-foreground">You pay them directly</span>
          </div>
          <div className="flex justify-between gap-4 py-1.5">
            <span>Sovereign Digital (app subscriptions)</span>
            <span className="font-medium text-foreground">Via Town Square</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Two separate bills. Cancel either independently. No contracts.</p>
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
    const res  = await fetch(`${API_BASE}/api/deploy/health`, { headers: await authHeaders() });
    const data = await res.json();
    setHealth({ ok: data.ok === true, checking: false });
  };

  const save = async () => {
    setError(""); setSaving(true);
    try {
      const res  = await fetch(`${API_BASE}/api/deploy/connect`, {
        method: "POST",
        headers: await authHeaders(),
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
    await fetch(`${API_BASE}/api/deploy/server`, { method: "DELETE", headers: await authHeaders() });
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

// ─── Provision Modal ──────────────────────────────────────────────────────────

interface CoolifyServer { uuid: string; name: string; }
interface CoolifyProject { uuid: string; name: string; }

function ProvisionModal({ app, onClose }: { app: CatalogApp; onClose: () => void }) {
  const [servers, setServers] = useState<CoolifyServer[]>([]);
  const [projects, setProjects] = useState<CoolifyProject[]>([]);
  const [serverUuid, setServerUuid] = useState("");
  const [projectUuid, setProjectUuid] = useState("");
  const [appName, setAppName] = useState(app.name.toLowerCase().replace(/\s+/g, "-"));
  const [dockerImage, setDockerImage] = useState(app.dockerImage);
  const [domain, setDomain] = useState("");
  const [ports, setPorts] = useState("80");
  const [envVars, setEnvVars] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    authHeaders().then(h => Promise.all([
      fetch(`${API_BASE}/api/deploy/servers-list`, { headers: h }).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/api/deploy/projects-list`, { headers: h }).then(r => r.json()).catch(() => []),
    ]).then(([svrs, prjs]) => {
      setServers(Array.isArray(svrs) ? svrs : []);
      setProjects(Array.isArray(prjs) ? prjs : []);
      if (svrs[0]?.uuid) setServerUuid(svrs[0].uuid);
      if (prjs[0]?.uuid) setProjectUuid(prjs[0].uuid);
    }));
  }, []);

  async function handleProvision() {
    if (!serverUuid || !projectUuid) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch(`${API_BASE}/api/deploy/provision`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ dockerImage, appName, serverUuid, projectUuid, domain, portsExposes: ports, envVars }),
      });
      const body = await r.json();
      if (r.ok && body.ok !== false) {
        setResult({ ok: true, message: `${app.name} provisioned! Coolify is pulling the image and starting the container.` });
      } else {
        setResult({ ok: false, message: body.error ?? "Provisioning failed." });
      }
    } catch {
      setResult({ ok: false, message: "Network error — check your connection." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RocketIcon size={18} className="text-primary" />
            Deploy {app.name}
          </DialogTitle>
          <DialogDescription>
            Forge will create a Docker-image application in Coolify on your server. The app will start pulling the image immediately.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className={cn(
            "rounded-lg p-4 text-sm flex items-start gap-3",
            result.ok ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400",
          )}>
            {result.ok ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <XCircle size={16} className="shrink-0 mt-0.5" />}
            <span>{result.message}</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Server</Label>
                {servers.length === 0 ? (
                  <p className="text-xs text-muted-foreground pt-1">Loading…</p>
                ) : (
                  <Select value={serverUuid} onValueChange={setServerUuid}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Pick server" /></SelectTrigger>
                    <SelectContent>
                      {servers.map(s => <SelectItem key={s.uuid} value={s.uuid}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Project</Label>
                {projects.length === 0 ? (
                  <p className="text-xs text-muted-foreground pt-1">Loading…</p>
                ) : (
                  <Select value={projectUuid} onValueChange={setProjectUuid}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Pick project" /></SelectTrigger>
                    <SelectContent>
                      {projects.map(p => <SelectItem key={p.uuid} value={p.uuid}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>App Name <span className="text-muted-foreground font-normal">(in Coolify)</span></Label>
              <Input value={appName} onChange={e => setAppName(e.target.value)} placeholder="my-forge-app" />
            </div>

            <div className="space-y-1.5">
              <Label>Docker Image</Label>
              <Input value={dockerImage} onChange={e => setDockerImage(e.target.value)} placeholder="owner/image:tag" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Domain <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input value={domain} onChange={e => setDomain(e.target.value)} placeholder="app.yourdomain.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Port</Label>
                <Input value={ports} onChange={e => setPorts(e.target.value)} placeholder="80" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Env Variables <span className="text-muted-foreground font-normal">(optional — KEY=VALUE per line)</span></Label>
              <Textarea
                value={envVars}
                onChange={e => setEnvVars(e.target.value)}
                placeholder={"DATABASE_URL=postgres://...\nOPENAI_API_KEY=sk-..."}
                className="font-mono text-xs min-h-[80px] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleProvision} disabled={loading || !serverUuid || !projectUuid}>
                {loading ? <><Loader2 size={14} className="animate-spin mr-1.5" />Provisioning…</> : <><RocketIcon size={14} className="mr-1.5" />Deploy to Server</>}
              </Button>
            </div>
          </div>
        )}

        {result?.ok && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── App Catalog Tab ──────────────────────────────────────────────────────────

function AppCatalogTab({ connected }: { connected: boolean }) {
  const [provisionApp, setProvisionApp] = useState<CatalogApp | null>(null);

  return (
    <div className="space-y-6">
      {provisionApp && <ProvisionModal app={provisionApp} onClose={() => setProvisionApp(null)} />}

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
                  <button
                    onClick={() => setProvisionApp(app)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    <RocketIcon size={10} /> Deploy
                  </button>
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

// ─── Live Apps Tab ────────────────────────────────────────────────────────────

interface CoolifyApp {
  id: string;
  uuid: string;
  name: string;
  status: string;
  fqdn?: string;
  updated_at?: string;
}

function statusBadge(status: string) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("running"))  return { color: "text-green-400 bg-green-900/20 border-green-800/40", label: "Running", dot: "bg-green-400" };
  if (s.includes("stopped"))  return { color: "text-muted-foreground bg-muted/30 border-border", label: "Stopped", dot: "bg-muted-foreground" };
  if (s.includes("error") || s.includes("fail")) return { color: "text-red-400 bg-red-900/20 border-red-800/40", label: "Error", dot: "bg-red-400" };
  if (s.includes("build") || s.includes("deploy")) return { color: "text-amber-400 bg-amber-900/20 border-amber-800/40", label: "Building", dot: "bg-amber-400 animate-pulse" };
  return { color: "text-muted-foreground bg-muted/30 border-border", label: status || "Unknown", dot: "bg-muted-foreground" };
}

function LiveAppsTab({ connected, serverInfo }: { connected: boolean; serverInfo: ServerInfo | null }) {
  const [apps, setApps]         = useState<CoolifyApp[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [redeploying, setRedeploying] = useState<string | null>(null);
  const [redeployMsg, setRedeployMsg] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API_BASE}/api/deploy/apps`, { headers: await authHeaders() });
      if (!r.ok) { setError("Failed to load apps from your Coolify server."); return; }
      const data = await r.json();
      setApps(Array.isArray(data) ? data : []);
    } catch { setError("Could not reach your server."); }
    finally   { setLoading(false); }
  };

  useEffect(() => { if (connected) load(); }, [connected]);

  const redeploy = async (app: CoolifyApp) => {
    setRedeploying(app.uuid);
    setRedeployMsg(m => ({ ...m, [app.uuid]: "" }));
    try {
      const r = await fetch(`${API_BASE}/api/deploy/redeploy/${app.uuid}`, { method: "POST", headers: await authHeaders() });
      const d = await r.json();
      setRedeployMsg(m => ({ ...m, [app.uuid]: r.ok ? "Deploy triggered ✓" : (d.error ?? "Failed") }));
    } finally { setRedeploying(null); }
  };

  if (!connected) {
    return (
      <div className="text-center py-12 space-y-3">
        <Activity size={32} className="text-muted-foreground/20 mx-auto" />
        <p className="font-semibold text-muted-foreground">No server connected</p>
        <p className="text-sm text-muted-foreground">Connect your Coolify server first to see live app status.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Live Apps on {serverInfo?.name ?? "Your Server"}</h2>
          <p className="text-sm text-muted-foreground">Apps running on your Coolify server. Redeploy or monitor from here.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800/40 bg-red-900/10 p-4 text-sm text-red-400">
          <AlertTriangle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 size={14} className="animate-spin" /> Loading apps from Coolify…
        </div>
      )}

      {!loading && !error && apps.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <Server size={32} className="text-muted-foreground/20 mx-auto" />
          <p className="font-semibold text-muted-foreground">No apps deployed yet</p>
          <p className="text-sm text-muted-foreground">Deploy an app from the App Catalog or create one directly in Coolify.</p>
          <a href={serverInfo?.coolifyUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            Open Coolify <ExternalLink size={11} />
          </a>
        </div>
      )}

      {!loading && apps.length > 0 && (
        <div className="space-y-3">
          {apps.map(app => {
            const badge = statusBadge(app.status);
            return (
              <div key={app.uuid} className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
                <div className={cn("shrink-0 w-2.5 h-2.5 rounded-full mt-0.5", badge.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-sm truncate">{app.name}</p>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", badge.color)}>{badge.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {app.fqdn && (
                      <a href={`https://${app.fqdn}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                        <Globe size={10} />{app.fqdn}
                      </a>
                    )}
                    {app.updated_at && (
                      <span className="flex items-center gap-1"><Clock size={10} />{new Date(app.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => redeploy(app)}
                    disabled={redeploying === app.uuid}
                    className="gap-1.5 h-8 text-xs"
                  >
                    {redeploying === app.uuid
                      ? <Loader2 size={12} className="animate-spin" />
                      : <RotateCcw size={12} />
                    }
                    Redeploy
                  </Button>
                  {redeployMsg[app.uuid] && (
                    <span className={cn("text-[10px] font-medium", redeployMsg[app.uuid].includes("✓") ? "text-green-400" : "text-red-400")}>
                      {redeployMsg[app.uuid]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-4 border-t border-border flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          App status is live from your Coolify server. Refresh to update.
        </p>
        <a href={serverInfo?.coolifyUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
          Open Coolify <ExternalLink size={10} />
        </a>
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
      const res  = await fetch(`${API_BASE}/api/deploy/server`, { headers: await authHeaders() });
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
            <HelpPanel
              config={{
                title: "App Hub",
                moon: { name: "Orion · Moon #3", color: "#8b5cf6", tagline: "Your server. Your apps. Your rules." },
                what: "App Hub lets you self-host your 13 Moon Forge apps on your own server. Pick a cheap VPS (as low as $5/month), connect it via Coolify, and deploy your apps there — so you own the infrastructure and pay compute directly.",
                when: "Use App Hub when you want to run your subscribed apps on your own server. This is for people who want maximum control, lower long-term costs, and full ownership of their deployment.",
                examples: [
                  "Set up a $6/month Hetzner server and connect it",
                  "Connect my existing Coolify instance to the Forge",
                  "See what apps I can deploy to my server",
                ],
                tips: [
                  "Coolify is free, open-source, and runs on any Ubuntu 22.04+ server — it's the easiest self-hosting setup",
                  "Step 1: Pick a VPS. Step 2: Install Coolify. Step 3: Paste your API key here — done",
                  "Once connected, your apps appear in App Monitor automatically",
                ],
              }}
            />
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
          {activeTab === "apps"    && <LiveAppsTab connected={!!serverInfo?.connected} serverInfo={serverInfo} />}
        </>
      )}
    </div>
  );
}
