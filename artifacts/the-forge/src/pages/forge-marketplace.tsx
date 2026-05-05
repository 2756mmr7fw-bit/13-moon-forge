import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Store, Loader2, X, ExternalLink, Trash2, CheckCircle2,
  AlertCircle, Clock, Copy, Check, Eye, EyeOff, Search,
} from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface MarketplaceApp {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  icon: string;
  links: { docs?: string; github?: string };
}

interface Install {
  id: number;
  appSlug: string;
  appName: string;
  subdomain: string;
  url: string | null;
  status: string;
  adminEmail: string | null;
  adminPassword: string | null;
  createdAt: string;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-zinc-500 hover:text-white p-1 transition-colors">
      {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
    </button>
  );
}

const CATEGORIES = ["All", "CMS", "Analytics", "Automation", "Backend", "Database", "DevTools", "Security", "Search"];

export default function ForgeMarketplace() {
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [installs, setInstalls] = useState<Install[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [installResult, setInstallResult] = useState<{ credentials: Record<string, string>; install: Install } | null>(null);
  const [selectedApp, setSelectedApp] = useState<MarketplaceApp | null>(null);
  const [installEmail, setInstallEmail] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"browse" | "installed">("browse");
  const [showPassword, setShowPassword] = useState(false);

  const fetchData = useCallback(async () => {
    const [appsRes, installsRes] = await Promise.all([
      fetch(`${API}/api/marketplace/apps`),
      fetch(`${API}/api/marketplace/installs`, { credentials: "include" }),
    ]);
    if (appsRes.ok) setApps(await appsRes.json().then(d => d.apps ?? []));
    if (installsRes.ok) setInstalls(await installsRes.json().then(d => d.installs ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInstall = async () => {
    if (!selectedApp) return;
    setInstalling(selectedApp.slug);
    try {
      const r = await fetch(`${API}/api/marketplace/install`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: selectedApp.slug, adminEmail: installEmail || undefined }),
      });
      if (r.ok) {
        const data = await r.json();
        setInstalls(prev => [data.install, ...prev]);
        setInstallResult({ credentials: data.credentials, install: data.install });
        setSelectedApp(null);
        setInstallEmail("");
        setActiveTab("installed");
      }
    } finally { setInstalling(null); }
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API}/api/marketplace/installs/${id}`, { method: "DELETE", credentials: "include" });
    setInstalls(prev => prev.filter(i => i.id !== id));
  };

  const filtered = apps.filter(app =>
    (category === "All" || app.category === category) &&
    (search === "" || app.name.toLowerCase().includes(search.toLowerCase()) || app.tagline.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Store size={22} className="text-orange-400" />
        <div>
          <h1 className="text-xl font-bold">App Marketplace</h1>
          <p className="text-xs text-zinc-500">One-click installs for popular open-source apps on your server.</p>
        </div>
      </div>

      {/* Install result */}
      {installResult && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-green-400" />
            <p className="text-sm font-semibold text-green-400">{installResult.install.appName} is being installed!</p>
            <button onClick={() => setInstallResult(null)} className="text-zinc-500 hover:text-white ml-auto"><X size={14} /></button>
          </div>
          <div className="space-y-2">
            {installResult.install.url && (
              <div className="flex items-center gap-2 bg-black rounded border border-zinc-800 px-3 py-1.5">
                <span className="text-[11px] text-zinc-500 w-16">URL</span>
                <span className="text-[11px] font-mono text-zinc-300 flex-1">{installResult.install.url}</span>
                <CopyBtn text={installResult.install.url} />
              </div>
            )}
            {installResult.credentials.adminEmail && (
              <div className="flex items-center gap-2 bg-black rounded border border-zinc-800 px-3 py-1.5">
                <span className="text-[11px] text-zinc-500 w-16">Email</span>
                <span className="text-[11px] font-mono text-zinc-300 flex-1">{installResult.credentials.adminEmail}</span>
              </div>
            )}
            {installResult.credentials.adminPassword && (
              <div className="flex items-center gap-2 bg-black rounded border border-zinc-800 px-3 py-1.5">
                <span className="text-[11px] text-zinc-500 w-16">Password</span>
                <span className="text-[11px] font-mono text-orange-300 flex-1">
                  {showPassword ? installResult.credentials.adminPassword : "••••••••••••••••"}
                </span>
                <button onClick={() => setShowPassword(s => !s)} className="text-zinc-500 hover:text-white p-1">
                  {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                </button>
                <CopyBtn text={installResult.credentials.adminPassword} />
              </div>
            )}
          </div>
          <p className="text-[11px] text-orange-400/80 mt-2">⚠️ Save your credentials — they won't be shown again.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-800 mb-6">
        {([
          { id: "browse", label: "Browse Apps" },
          { id: "installed", label: `My Installs (${installs.length})` },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id ? "border-orange-500 text-orange-400" : "border-transparent text-zinc-500 hover:text-zinc-300")}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-zinc-500" /></div>
      ) : activeTab === "browse" ? (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search apps..." className="bg-zinc-800 border-zinc-700 text-white h-8 text-xs pl-8" />
            </div>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-white h-8 text-xs rounded-md px-3">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(app => {
              const installed = installs.some(i => i.appSlug === app.slug);
              return (
                <div key={app.slug} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{app.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-zinc-100">{app.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">{app.category}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{app.tagline}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">{app.description}</p>
                  <div className="flex items-center gap-2 mt-auto">
                    {installed ? (
                      <span className="flex items-center gap-1 text-[11px] text-green-400">
                        <CheckCircle2 size={11} /> Installed
                      </span>
                    ) : (
                      <Button
                        onClick={() => setSelectedApp(app)}
                        disabled={installing === app.slug}
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white h-7 text-xs"
                      >
                        {installing === app.slug ? <Loader2 size={11} className="animate-spin mr-1" /> : null}
                        Install
                      </Button>
                    )}
                    {app.links.docs && (
                      <a href={app.links.docs} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                        Docs <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        installs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
            <Store size={28} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-400 mb-4">Nothing installed yet</p>
            <Button onClick={() => setActiveTab("browse")} className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-8">
              Browse Apps
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {installs.map(install => {
              const app = apps.find(a => a.slug === install.appSlug);
              return (
                <div key={install.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{app?.icon ?? "📦"}</span>
                      <div>
                        <p className="text-sm font-bold text-zinc-100">{install.appName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono",
                            install.status === "ready" || install.status === "running" ? "bg-green-500/10 text-green-400" :
                            install.status === "installing" ? "bg-orange-500/10 text-orange-400" :
                            install.status === "error" ? "bg-red-500/10 text-red-400" :
                            "bg-zinc-700 text-zinc-400"
                          )}>{install.status}</span>
                          {install.url && (
                            <a href={install.url} target="_blank" rel="noopener noreferrer"
                              className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1">
                              {install.subdomain} <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(install.id)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 rounded transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-2">
                    Installed {new Date(install.createdAt).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Install modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedApp.icon}</span>
                <div>
                  <h2 className="font-bold text-white">Install {selectedApp.name}</h2>
                  <p className="text-xs text-zinc-500">{selectedApp.tagline}</p>
                </div>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-zinc-400">{selectedApp.description}</p>
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">Admin email (optional)</Label>
                <Input value={installEmail} onChange={e => setInstallEmail(e.target.value)}
                  placeholder="you@example.com" type="email"
                  className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm" />
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/20 p-3 text-[11px] text-zinc-500">
                A subdomain will be assigned automatically. Admin credentials will be generated and shown once.
              </div>
              <Button onClick={handleInstall} disabled={installing === selectedApp.slug}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                {installing === selectedApp.slug ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                Install {selectedApp.name}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
