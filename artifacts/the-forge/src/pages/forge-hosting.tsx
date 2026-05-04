import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import {
  Server, Globe, GitBranch, Plus, RefreshCw, ExternalLink,
  Loader2, Trash2, RotateCcw, Github, Zap, Database,
  CheckCircle2, AlertCircle, Clock, X, ChevronRight,
  Package, Code2, Flame, Container, ArrowRight,
} from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface UserApp {
  id: number;
  name: string;
  subdomain: string;
  githubRepo: string | null;
  githubBranch: string;
  stack: string;
  status: string;
  url: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Repo {
  id: number;
  fullName: string;
  name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  defaultBranch: string;
  updatedAt: string;
}

interface GitHubStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
}

const STACK_ICONS: Record<string, React.ReactNode> = {
  node: <Code2 size={14} className="text-green-400" />,
  python: <Code2 size={14} className="text-blue-400" />,
  go: <Code2 size={14} className="text-cyan-400" />,
  ruby: <Code2 size={14} className="text-red-400" />,
  static: <Globe size={14} className="text-purple-400" />,
  docker: <Container size={14} className="text-sky-400" />,
  compose: <Container size={14} className="text-sky-400" />,
  auto: <Package size={14} className="text-zinc-400" />,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  live:      { label: "Live",      color: "text-green-400",  dot: "bg-green-400" },
  deploying: { label: "Deploying", color: "text-yellow-400", dot: "bg-yellow-400 animate-pulse" },
  pending:   { label: "Pending",   color: "text-zinc-400",   dot: "bg-zinc-400" },
  stopped:   { label: "Stopped",   color: "text-zinc-500",   dot: "bg-zinc-500" },
  error:     { label: "Error",     color: "text-red-400",    dot: "bg-red-400" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium", cfg.color)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export default function ForgeHosting() {
  const [apps, setApps] = useState<UserApp[]>([]);
  const [githubStatus, setGithubStatus] = useState<GitHubStatus>({ connected: false });
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeploy, setShowDeploy] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [appName, setAppName] = useState("");
  const [branch, setBranch] = useState("main");
  const [detecting, setDetecting] = useState(false);
  const [detectedStack, setDetectedStack] = useState<{ stack: string; port: number } | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [redeployingId, setRedeployingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [appsRes, ghRes] = await Promise.all([
        fetch(`${API}/api/launch/apps`, { credentials: "include" }),
        fetch(`${API}/api/github/status`, { credentials: "include" }),
      ]);
      if (appsRes.ok) setApps(await appsRes.json().then(d => d.apps ?? []));
      if (ghRes.ok) setGithubStatus(await ghRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (githubStatus.connected && showDeploy && repos.length === 0) {
      fetch(`${API}/api/github/repos`, { credentials: "include" })
        .then(r => r.json())
        .then(data => setRepos(Array.isArray(data) ? data : []));
    }
  }, [githubStatus.connected, showDeploy, repos.length]);

  useEffect(() => {
    if (selectedRepo) {
      setBranch(selectedRepo.defaultBranch);
      setAppName(selectedRepo.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
      setDetectedStack(null);
      setDetecting(true);
      fetch(`${API}/api/launch/detect`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: selectedRepo.fullName, branch: selectedRepo.defaultBranch }),
      })
        .then(r => r.json())
        .then(d => setDetectedStack(d))
        .finally(() => setDetecting(false));
    }
  }, [selectedRepo]);

  const handleDeploy = async () => {
    if (!selectedRepo || !appName.trim()) return;
    setDeploying(true);
    setDeployError("");
    try {
      const res = await fetch(`${API}/api/launch/deploy`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: selectedRepo.fullName, branch, name: appName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setDeployError(data.error ?? "Deploy failed"); return; }
      setApps(prev => [...prev, data.app]);
      setShowDeploy(false);
      setSelectedRepo(null);
      setAppName("");
      setDetectedStack(null);
    } finally {
      setDeploying(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`${API}/api/launch/apps/${id}`, { method: "DELETE", credentials: "include" });
      setApps(prev => prev.filter(a => a.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleRedeploy = async (id: number) => {
    setRedeployingId(id);
    try {
      await fetch(`${API}/api/launch/apps/${id}/redeploy`, { method: "POST", credentials: "include" });
      setApps(prev => prev.map(a => a.id === id ? { ...a, status: "deploying" } : a));
    } finally {
      setRedeployingId(null);
    }
  };

  const filteredRepos = repos.filter(r =>
    r.fullName.toLowerCase().includes(repoSearch.toLowerCase()) ||
    (r.description ?? "").toLowerCase().includes(repoSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <Loader2 className="animate-spin text-zinc-500" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame size={20} className="text-orange-400" />
            <h1 className="text-2xl font-bold text-white">Forge Hosting</h1>
          </div>
          <p className="text-sm text-zinc-400">Deploy any app from GitHub in minutes. Runs on your server.</p>
        </div>
        <Button
          onClick={() => setShowDeploy(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
          size="sm"
        >
          <Plus size={14} className="mr-1.5" /> Deploy App
        </Button>
      </div>

      {/* GitHub not connected warning */}
      {!githubStatus.connected && (
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-300 mb-1">GitHub not connected</p>
            <p className="text-xs text-zinc-400 mb-3">Connect GitHub to deploy your repos to this server.</p>
            <Link href="/github">
              <Button size="sm" variant="outline" className="border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10">
                <Github size={13} className="mr-1.5" /> Connect GitHub
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Platform stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Apps deployed", value: String(apps.length), icon: <Server size={14} className="text-orange-400" /> },
          { label: "Live now", value: String(apps.filter(a => a.status === "live").length), icon: <Zap size={14} className="text-green-400" /> },
          { label: "Your server", value: "forge-server-1", icon: <Database size={14} className="text-blue-400" /> },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center gap-1.5 mb-1">{stat.icon}<span className="text-xs text-zinc-500">{stat.label}</span></div>
            <p className="text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Apps list */}
      {apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/20 p-12 text-center">
          <Server size={32} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-400 mb-1">No apps deployed yet</p>
          <p className="text-xs text-zinc-600 mb-4">Click "Deploy App" to launch your first app from GitHub.</p>
          <Button onClick={() => setShowDeploy(true)} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus size={13} className="mr-1.5" /> Deploy your first app
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map(app => (
            <div key={app.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white text-sm">{app.name}</span>
                  <StatusBadge status={app.status} />
                  <span className="text-zinc-600">{STACK_ICONS[app.stack] ?? STACK_ICONS.auto}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  {app.url && (
                    <a href={app.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-orange-400 transition-colors">
                      <Globe size={11} /> {app.subdomain}.13moonforge.ai
                    </a>
                  )}
                  {app.githubRepo && (
                    <span className="flex items-center gap-1">
                      <GitBranch size={11} /> {app.githubRepo} / {app.githubBranch}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {new Date(app.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {app.url && (
                  <a href={app.url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white h-8 w-8 p-0">
                      <ExternalLink size={13} />
                    </Button>
                  </a>
                )}
                <Button
                  size="sm" variant="ghost"
                  className="text-zinc-400 hover:text-blue-400 h-8 w-8 p-0"
                  onClick={() => handleRedeploy(app.id)}
                  disabled={redeployingId === app.id}
                >
                  {redeployingId === app.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="text-zinc-400 hover:text-red-400 h-8 w-8 p-0"
                  onClick={() => handleDelete(app.id)}
                  disabled={deletingId === app.id}
                >
                  {deletingId === app.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Links to other tools */}
      <div className="mt-8 grid grid-cols-2 gap-3">
        {[
          { href: "/github", label: "Connect GitHub", desc: "Link your repos", icon: <Github size={15} /> },
          { href: "/sovereign", label: "Sovereign Stack", desc: "Certification checker", icon: <CheckCircle2 size={15} /> },
          { href: "/secrets", label: "App Secrets", desc: "Manage env vars", icon: <Server size={15} /> },
          { href: "/monitor", label: "Monitor", desc: "Uptime & health", icon: <Zap size={15} /> },
        ].map(link => (
          <Link key={link.href} href={link.href}>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors cursor-pointer flex items-center gap-3">
              <span className="text-orange-400">{link.icon}</span>
              <div>
                <p className="text-xs font-semibold text-zinc-200">{link.label}</p>
                <p className="text-[11px] text-zinc-500">{link.desc}</p>
              </div>
              <ChevronRight size={14} className="text-zinc-600 ml-auto" />
            </div>
          </Link>
        ))}
      </div>

      {/* Deploy Modal */}
      {showDeploy && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div>
                <h2 className="font-bold text-white">Deploy from GitHub</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Pick a repo, we'll detect the stack and deploy it.</p>
              </div>
              <button onClick={() => { setShowDeploy(false); setSelectedRepo(null); setDeployError(""); }} className="text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {!githubStatus.connected ? (
                <div className="text-center py-6">
                  <Github size={28} className="text-zinc-500 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400 mb-4">Connect GitHub first to deploy from your repos.</p>
                  <Link href="/github">
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">Connect GitHub</Button>
                  </Link>
                </div>
              ) : (
                <>
                  {/* Step 1: Pick repo */}
                  <div>
                    <Label className="text-xs text-zinc-400 mb-2 block">1. Pick a repository</Label>
                    <Input
                      placeholder="Search repos..."
                      value={repoSearch}
                      onChange={e => setRepoSearch(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white mb-2 h-8 text-sm"
                    />
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {filteredRepos.length === 0 ? (
                        <div className="text-center py-4">
                          <Loader2 size={16} className="animate-spin text-zinc-500 mx-auto mb-1" />
                          <p className="text-xs text-zinc-500">Loading repos...</p>
                        </div>
                      ) : filteredRepos.map(repo => (
                        <button
                          key={repo.id}
                          onClick={() => setSelectedRepo(repo)}
                          className={cn(
                            "w-full text-left px-3 py-2.5 rounded-lg border transition-colors",
                            selectedRepo?.id === repo.id
                              ? "border-orange-500/50 bg-orange-500/10"
                              : "border-zinc-800 hover:border-zinc-700 bg-zinc-800/40"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-200">{repo.fullName}</span>
                            {repo.private && <span className="text-[10px] text-zinc-500 border border-zinc-700 rounded px-1">private</span>}
                          </div>
                          {repo.description && <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{repo.description}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            {repo.language && <span className="text-[10px] text-zinc-500">{repo.language}</span>}
                            <span className="text-[10px] text-zinc-600 flex items-center gap-0.5"><GitBranch size={9} />{repo.defaultBranch}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Config */}
                  {selectedRepo && (
                    <>
                      <div>
                        <Label className="text-xs text-zinc-400 mb-1.5 block">2. App name (becomes your subdomain)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={appName}
                            onChange={e => setAppName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                            className="bg-zinc-800 border-zinc-700 text-white h-8 text-sm"
                            placeholder="my-app"
                          />
                          <span className="text-xs text-zinc-500 whitespace-nowrap">.13moonforge.ai</span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-zinc-400 mb-1.5 block">3. Branch</Label>
                        <Input
                          value={branch}
                          onChange={e => setBranch(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-white h-8 text-sm"
                        />
                      </div>

                      {/* Stack detection */}
                      <div className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-3">
                        {detecting ? (
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <Loader2 size={13} className="animate-spin" /> Detecting stack...
                          </div>
                        ) : detectedStack ? (
                          <div className="flex items-center gap-2 text-xs">
                            <CheckCircle2 size={13} className="text-green-400" />
                            <span className="text-zinc-300">Detected: <strong className="text-white capitalize">{detectedStack.stack}</strong></span>
                            <span className="text-zinc-500">· port {detectedStack.port}</span>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}

                  {deployError && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex items-center gap-2 text-xs text-red-400">
                      <AlertCircle size={13} /> {deployError}
                    </div>
                  )}

                  <Button
                    onClick={handleDeploy}
                    disabled={!selectedRepo || !appName.trim() || deploying}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {deploying ? (
                      <><Loader2 size={14} className="animate-spin mr-2" /> Deploying...</>
                    ) : (
                      <><ArrowRight size={14} className="mr-2" /> Deploy App</>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
