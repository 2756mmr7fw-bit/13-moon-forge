import { useState, useEffect, useCallback, useRef } from "react";
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
  Package, Code2, Flame, Container, ArrowRight, Terminal,
  Key, Settings, ChevronDown, ChevronUp, Copy, Check,
  Webhook, Eye, EyeOff, Lock, HardDrive, Download,
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
  customDomain: string | null;
  autoDeployEnabled: boolean;
  webhookSecret: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EnvVar {
  uuid: string;
  key: string;
  value: string;
  is_build_time?: boolean;
}

interface UserDatabase {
  id: number;
  name: string;
  dbName: string;
  dbUser: string;
  status: string;
  connectionString: string | null;
  appId: number | null;
  createdAt: string;
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
  node:    <Code2 size={13} className="text-green-400" />,
  python:  <Code2 size={13} className="text-blue-400" />,
  go:      <Code2 size={13} className="text-cyan-400" />,
  ruby:    <Code2 size={13} className="text-red-400" />,
  static:  <Globe size={13} className="text-purple-400" />,
  docker:  <Container size={13} className="text-sky-400" />,
  compose: <Container size={13} className="text-sky-400" />,
  auto:    <Package size={13} className="text-zinc-400" />,
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
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

type DetailTab = "logs" | "env" | "domain" | "autodeploy" | "database";

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

  // Detail panel state
  const [expandedAppId, setExpandedAppId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("logs");
  const [logs, setLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [envLoading, setEnvLoading] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");
  const [showEnvValue, setShowEnvValue] = useState(false);
  const [addingEnv, setAddingEnv] = useState(false);
  const [deletingEnvId, setDeletingEnvId] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);
  const [domainSaved, setDomainSaved] = useState(false);
  const [togglingAutoDeploy, setTogglingAutoDeploy] = useState(false);
  const [databases, setDatabases] = useState<UserDatabase[]>([]);
  const [provisioningDb, setProvisioningDb] = useState(false);
  const [newDbName, setNewDbName] = useState("");
  const [showDbConn, setShowDbConn] = useState<number | null>(null);
  const [cliToken, setCliToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [cliTokenCopied, setCliTokenCopied] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDatabases = useCallback(async () => {
    const r = await fetch(`${API}/api/launch/databases`, { credentials: "include" });
    if (r.ok) setDatabases(await r.json().then(d => d.databases ?? []));
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [appsRes, ghRes] = await Promise.all([
        fetch(`${API}/api/launch/apps`, { credentials: "include" }),
        fetch(`${API}/api/github/status`, { credentials: "include" }),
        fetchDatabases(),
      ]);
      if (appsRes.ok) setApps(await appsRes.json().then(d => d.apps ?? []));
      if (ghRes.ok) setGithubStatus(await ghRes.json());
    } finally {
      setLoading(false);
    }
  }, [fetchDatabases]);

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

  const fetchLogs = useCallback(async (appId: number) => {
    setLogsLoading(true);
    try {
      const r = await fetch(`${API}/api/launch/apps/${appId}/logs`, { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setLogs(data.logs ?? []);
        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const fetchEnvVars = useCallback(async (appId: number) => {
    setEnvLoading(true);
    try {
      const r = await fetch(`${API}/api/launch/apps/${appId}/env`, { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setEnvVars(data.vars ?? []);
      }
    } finally {
      setEnvLoading(false);
    }
  }, []);

  const syncStatus = useCallback(async (appId: number) => {
    const r = await fetch(`${API}/api/launch/apps/${appId}/status`, { credentials: "include" });
    if (r.ok) {
      const { status } = await r.json();
      setApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    }
  }, []);

  useEffect(() => {
    if (logsIntervalRef.current) clearInterval(logsIntervalRef.current);
    if (!expandedAppId) return;

    const app = apps.find(a => a.id === expandedAppId);
    if (!app) return;

    setCustomDomain(app.customDomain ?? "");

    if (activeTab === "logs") {
      fetchLogs(expandedAppId);
      syncStatus(expandedAppId);
      const iv = setInterval(() => {
        fetchLogs(expandedAppId);
        syncStatus(expandedAppId);
      }, 6000);
      logsIntervalRef.current = iv;
    } else if (activeTab === "env") {
      fetchEnvVars(expandedAppId);
    }

    return () => {
      if (logsIntervalRef.current) clearInterval(logsIntervalRef.current);
    };
  }, [expandedAppId, activeTab]);

  const toggleExpand = (appId: number) => {
    if (expandedAppId === appId) {
      setExpandedAppId(null);
      if (logsIntervalRef.current) clearInterval(logsIntervalRef.current);
    } else {
      setExpandedAppId(appId);
      setActiveTab("logs");
      setLogs([]);
      setEnvVars([]);
    }
  };

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
      setExpandedAppId(data.app.id);
      setActiveTab("logs");
    } finally {
      setDeploying(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`${API}/api/launch/apps/${id}`, { method: "DELETE", credentials: "include" });
      setApps(prev => prev.filter(a => a.id !== id));
      if (expandedAppId === id) setExpandedAppId(null);
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

  const handleAddEnv = async () => {
    if (!expandedAppId || !newEnvKey.trim()) return;
    setAddingEnv(true);
    try {
      const r = await fetch(`${API}/api/launch/apps/${expandedAppId}/env`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newEnvKey.trim(), value: newEnvValue }),
      });
      if (r.ok) {
        setNewEnvKey("");
        setNewEnvValue("");
        setShowEnvValue(false);
        await fetchEnvVars(expandedAppId);
      }
    } finally {
      setAddingEnv(false);
    }
  };

  const handleDeleteEnv = async (envUuid: string) => {
    if (!expandedAppId) return;
    setDeletingEnvId(envUuid);
    try {
      await fetch(`${API}/api/launch/apps/${expandedAppId}/env/${envUuid}`, {
        method: "DELETE",
        credentials: "include",
      });
      setEnvVars(prev => prev.filter(v => v.uuid !== envUuid));
    } finally {
      setDeletingEnvId(null);
    }
  };

  const handleSaveDomain = async () => {
    if (!expandedAppId || !customDomain.trim()) return;
    setSavingDomain(true);
    try {
      const r = await fetch(`${API}/api/launch/apps/${expandedAppId}/domain`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: customDomain.trim() }),
      });
      if (r.ok) {
        setApps(prev => prev.map(a => a.id === expandedAppId ? { ...a, customDomain: customDomain.trim() } : a));
        setDomainSaved(true);
        setTimeout(() => setDomainSaved(false), 2000);
      }
    } finally {
      setSavingDomain(false);
    }
  };

  const handleProvisionDb = async (appId: number) => {
    if (!newDbName.trim()) return;
    setProvisioningDb(true);
    try {
      const r = await fetch(`${API}/api/launch/databases`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDbName.trim(), appId }),
      });
      if (r.ok) {
        const data = await r.json();
        setDatabases(prev => [...prev, data.database]);
        setNewDbName("");
      }
    } finally {
      setProvisioningDb(false);
    }
  };

  const handleInjectDb = async (dbId: number, appId: number) => {
    const r = await fetch(`${API}/api/launch/databases/${dbId}/inject`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId }),
    });
    if (r.ok) {
      setDatabases(prev => prev.map(d => d.id === dbId ? { ...d, appId } : d));
    }
  };

  const handleDeleteDb = async (dbId: number) => {
    await fetch(`${API}/api/launch/databases/${dbId}`, { method: "DELETE", credentials: "include" });
    setDatabases(prev => prev.filter(d => d.id !== dbId));
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    try {
      const r = await fetch(`${API}/api/cli/token`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "CLI" }),
      });
      if (r.ok) {
        const data = await r.json();
        setCliToken(data.token);
      }
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleToggleAutoDeploy = async (app: UserApp) => {
    setTogglingAutoDeploy(true);
    try {
      const r = await fetch(`${API}/api/launch/apps/${app.id}/autodeploy`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !app.autoDeployEnabled }),
      });
      if (r.ok) {
        const data = await r.json();
        setApps(prev => prev.map(a =>
          a.id === app.id ? { ...a, autoDeployEnabled: data.enabled } : a
        ));
      }
    } finally {
      setTogglingAutoDeploy(false);
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

  const expandedApp = apps.find(a => a.id === expandedAppId);

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

      {/* Stats */}
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
        <div className="space-y-2">
          {apps.map(app => (
            <div key={app.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
              {/* App row */}
              <div
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                onClick={() => toggleExpand(app.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm">{app.name}</span>
                    <StatusBadge status={app.status} />
                    <span className="text-zinc-600">{STACK_ICONS[app.stack] ?? STACK_ICONS.auto}</span>
                    {app.autoDeployEnabled && (
                      <span className="text-[10px] text-blue-400 border border-blue-400/30 rounded px-1.5 py-0.5">auto-deploy</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    {app.customDomain ? (
                      <span className="flex items-center gap-1 text-orange-400/80">
                        <Globe size={11} /> {app.customDomain}
                      </span>
                    ) : app.url ? (
                      <span className="flex items-center gap-1">
                        <Globe size={11} /> {app.subdomain}.13moonforge.ai
                      </span>
                    ) : null}
                    {app.githubRepo && (
                      <span className="flex items-center gap-1">
                        <GitBranch size={11} /> {app.githubRepo.split("/")[1]} / {app.githubBranch}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {new Date(app.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {app.url && (
                    <a href={app.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white h-8 w-8 p-0">
                        <ExternalLink size={13} />
                      </Button>
                    </a>
                  )}
                  <Button
                    size="sm" variant="ghost"
                    className="text-zinc-400 hover:text-blue-400 h-8 w-8 p-0"
                    onClick={e => { e.stopPropagation(); handleRedeploy(app.id); }}
                    disabled={redeployingId === app.id}
                  >
                    {redeployingId === app.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className="text-zinc-400 hover:text-red-400 h-8 w-8 p-0"
                    onClick={e => { e.stopPropagation(); handleDelete(app.id); }}
                    disabled={deletingId === app.id}
                  >
                    {deletingId === app.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </Button>
                  <span className="text-zinc-600 ml-1">
                    {expandedAppId === app.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </div>
              </div>

              {/* Detail panel */}
              {expandedAppId === app.id && (
                <div className="border-t border-zinc-800">
                  {/* Tabs */}
                  <div className="flex gap-0 border-b border-zinc-800 px-4">
                    {([
                      { id: "logs",       label: "Logs",        icon: <Terminal size={12} /> },
                      { id: "env",        label: "Env Vars",    icon: <Key size={12} /> },
                      { id: "domain",     label: "Domain",      icon: <Globe size={12} /> },
                      { id: "autodeploy", label: "Auto-Deploy", icon: <Webhook size={12} /> },
                      { id: "database",   label: "Database",    icon: <HardDrive size={12} /> },
                    ] as { id: DetailTab; label: string; icon: React.ReactNode }[]).map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors",
                          activeTab === tab.id
                            ? "border-orange-500 text-orange-400"
                            : "border-transparent text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        {tab.icon} {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab: Logs */}
                  {activeTab === "logs" && (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-zinc-500">Live logs · refreshes every 6s</span>
                        <Button size="sm" variant="ghost" className="h-6 text-xs text-zinc-500 hover:text-white px-2" onClick={() => fetchLogs(app.id)}>
                          <RefreshCw size={11} className="mr-1" /> Refresh
                        </Button>
                      </div>
                      <div className="rounded-lg bg-black border border-zinc-800 p-3 h-64 overflow-y-auto font-mono text-[11px] leading-relaxed">
                        {logsLoading && logs.length === 0 ? (
                          <div className="flex items-center gap-2 text-zinc-500">
                            <Loader2 size={12} className="animate-spin" /> Fetching logs...
                          </div>
                        ) : logs.length === 0 ? (
                          <p className="text-zinc-600">No logs yet. Logs appear here once the app starts building.</p>
                        ) : (
                          logs.map((line, i) => (
                            <div key={i} className={cn(
                              "whitespace-pre-wrap break-all",
                              line.toLowerCase().includes("error") ? "text-red-400" :
                              line.toLowerCase().includes("warn") ? "text-yellow-400" :
                              line.toLowerCase().includes("success") || line.toLowerCase().includes("done") ? "text-green-400" :
                              "text-zinc-300"
                            )}>
                              {line}
                            </div>
                          ))
                        )}
                        <div ref={logsEndRef} />
                      </div>
                    </div>
                  )}

                  {/* Tab: Env Vars */}
                  {activeTab === "env" && (
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-zinc-500">Environment variables injected into your app at runtime. Changes take effect after a redeploy.</p>

                      {envLoading ? (
                        <div className="flex items-center gap-2 text-xs text-zinc-500 py-3">
                          <Loader2 size={12} className="animate-spin" /> Loading...
                        </div>
                      ) : envVars.length === 0 ? (
                        <p className="text-xs text-zinc-600 py-2">No environment variables set yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {envVars.map(v => (
                            <div key={v.uuid} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2">
                              <Lock size={11} className="text-zinc-600 shrink-0" />
                              <span className="text-xs font-mono text-zinc-300 font-semibold w-48 truncate">{v.key}</span>
                              <span className="text-xs font-mono text-zinc-600 flex-1 truncate">{"•".repeat(Math.min(v.value?.length ?? 8, 16))}</span>
                              <CopyButton text={`${v.key}=${v.value}`} />
                              <button
                                onClick={() => handleDeleteEnv(v.uuid)}
                                disabled={deletingEnvId === v.uuid}
                                className="text-zinc-600 hover:text-red-400 transition-colors"
                              >
                                {deletingEnvId === v.uuid ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add new env var */}
                      <div className="rounded-lg border border-zinc-700 bg-zinc-800/20 p-3 space-y-2">
                        <p className="text-[11px] font-semibold text-zinc-400">Add variable</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="KEY"
                            value={newEnvKey}
                            onChange={e => setNewEnvKey(e.target.value.toUpperCase().replace(/\s/g, "_"))}
                            className="bg-zinc-800 border-zinc-700 text-white h-8 text-xs font-mono w-40"
                          />
                          <div className="relative flex-1">
                            <Input
                              placeholder="value"
                              value={newEnvValue}
                              type={showEnvValue ? "text" : "password"}
                              onChange={e => setNewEnvValue(e.target.value)}
                              className="bg-zinc-800 border-zinc-700 text-white h-8 text-xs font-mono pr-8"
                            />
                            <button
                              onClick={() => setShowEnvValue(p => !p)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                            >
                              {showEnvValue ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                          </div>
                          <Button
                            size="sm"
                            onClick={handleAddEnv}
                            disabled={!newEnvKey.trim() || addingEnv}
                            className="bg-orange-500 hover:bg-orange-600 text-white h-8 px-3 text-xs"
                          >
                            {addingEnv ? <Loader2 size={12} className="animate-spin" /> : "Add"}
                          </Button>
                        </div>
                      </div>

                      {envVars.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-zinc-700 text-zinc-400 hover:text-white text-xs h-7"
                          onClick={() => handleRedeploy(app.id)}
                          disabled={redeployingId === app.id}
                        >
                          <RotateCcw size={11} className="mr-1.5" />
                          {redeployingId === app.id ? "Redeploying..." : "Redeploy to apply changes"}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Tab: Domain */}
                  {activeTab === "domain" && (
                    <div className="p-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-zinc-300 mb-1">Forge subdomain</p>
                        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2">
                          <Globe size={12} className="text-zinc-500" />
                          <span className="text-xs font-mono text-zinc-300">{app.subdomain}.13moonforge.ai</span>
                          <CopyButton text={`https://${app.subdomain}.13moonforge.ai`} />
                          <a href={`https://${app.subdomain}.13moonforge.ai`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-zinc-300">
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-zinc-300 mb-1">Custom domain</p>
                        <p className="text-[11px] text-zinc-500 mb-2">Point your domain to your Forge app. Traefik handles SSL automatically.</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="myapp.com or app.mysite.com"
                            value={customDomain}
                            onChange={e => { setCustomDomain(e.target.value); setDomainSaved(false); }}
                            className="bg-zinc-800 border-zinc-700 text-white h-8 text-xs font-mono"
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveDomain}
                            disabled={!customDomain.trim() || savingDomain}
                            className="bg-orange-500 hover:bg-orange-600 text-white h-8 px-3 text-xs shrink-0"
                          >
                            {savingDomain ? <Loader2 size={12} className="animate-spin" /> : domainSaved ? <Check size={12} /> : "Save"}
                          </Button>
                        </div>
                      </div>

                      {customDomain && (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-800/20 p-3 space-y-2">
                          <p className="text-[11px] font-semibold text-zinc-400">DNS setup</p>
                          <p className="text-[11px] text-zinc-500">Add this record in your DNS provider:</p>
                          <div className="rounded border border-zinc-700 bg-black p-2 font-mono text-[11px]">
                            <div className="flex gap-4 text-zinc-400">
                              <span className="text-zinc-600 w-16">Type</span>
                              <span className="text-zinc-600 w-36">Name</span>
                              <span className="text-zinc-600">Value</span>
                            </div>
                            <div className="flex gap-4 text-zinc-300 mt-1">
                              <span className="w-16">A</span>
                              <span className="w-36 truncate">{customDomain.includes(".") ? customDomain.split(".")[0] : "@"}</span>
                              <span>5.78.154.21</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-600">SSL certificate is issued automatically within a few minutes of DNS propagation.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab: Auto-Deploy */}
                  {activeTab === "autodeploy" && (
                    <div className="p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-zinc-300 mb-1">Auto-deploy on push</p>
                          <p className="text-[11px] text-zinc-500">Redeploy automatically every time you push to <span className="font-mono text-zinc-300">{app.githubBranch}</span>.</p>
                        </div>
                        <button
                          onClick={() => handleToggleAutoDeploy(app)}
                          disabled={togglingAutoDeploy}
                          className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200",
                            app.autoDeployEnabled ? "bg-orange-500" : "bg-zinc-700"
                          )}
                        >
                          <span className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200",
                            app.autoDeployEnabled ? "translate-x-4" : "translate-x-0"
                          )} />
                        </button>
                      </div>

                      {app.autoDeployEnabled && app.webhookSecret && (
                        <div className="space-y-3">
                          <div className="rounded-lg border border-zinc-800 bg-zinc-800/20 p-3 space-y-2">
                            <p className="text-[11px] font-semibold text-zinc-400">GitHub webhook setup</p>
                            <p className="text-[11px] text-zinc-500">In your GitHub repo → Settings → Webhooks → Add webhook:</p>
                            <div className="space-y-2">
                              <div>
                                <p className="text-[10px] text-zinc-600 mb-1">Payload URL</p>
                                <div className="flex items-center gap-2 bg-black rounded border border-zinc-700 px-2 py-1.5">
                                  <span className="text-[11px] font-mono text-zinc-300 flex-1 break-all">
                                    {`https://13moonforge.ai/api/launch/webhook/${app.webhookSecret}`}
                                  </span>
                                  <CopyButton text={`https://13moonforge.ai/api/launch/webhook/${app.webhookSecret}`} />
                                </div>
                              </div>
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <p className="text-[10px] text-zinc-600 mb-1">Content type</p>
                                  <div className="bg-black rounded border border-zinc-700 px-2 py-1.5 text-[11px] font-mono text-zinc-300">application/json</div>
                                </div>
                                <div className="flex-1">
                                  <p className="text-[10px] text-zinc-600 mb-1">Events</p>
                                  <div className="bg-black rounded border border-zinc-700 px-2 py-1.5 text-[11px] font-mono text-zinc-300">Just the push event</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-green-400">
                            <CheckCircle2 size={12} /> Webhook active — pushes to <span className="font-mono">{app.githubBranch}</span> will trigger a redeploy
                          </div>
                        </div>
                      )}

                      {!app.autoDeployEnabled && (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-800/20 p-3 text-[11px] text-zinc-500">
                          Enable auto-deploy to get a webhook URL you can add to your GitHub repo. Every push to <span className="font-mono text-zinc-300">{app.githubBranch}</span> will redeploy automatically.
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "database" && (
                    <div className="p-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-zinc-300 mb-1">Provision a Postgres database</p>
                        <p className="text-[11px] text-zinc-500 mb-3">Spins up a dedicated Postgres instance on your Hetzner server and injects <span className="font-mono text-zinc-300">DATABASE_URL</span> into this app automatically.</p>

                        <div className="flex gap-2">
                          <Input
                            placeholder="db name (e.g. myapp)"
                            value={newDbName}
                            onChange={e => setNewDbName(e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white h-8 text-xs flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleProvisionDb(app.id)}
                            disabled={provisioningDb || !newDbName.trim()}
                            className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs"
                          >
                            {provisioningDb ? <Loader2 size={12} className="animate-spin" /> : <><HardDrive size={12} className="mr-1" />Provision</>}
                          </Button>
                        </div>
                      </div>

                      {/* Databases list */}
                      {databases.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Your databases</p>
                          {databases.map(database => (
                            <div key={database.id} className="rounded-lg border border-zinc-800 bg-zinc-800/20 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <HardDrive size={12} className={database.status === "ready" ? "text-green-400" : database.status === "provisioning" ? "text-orange-400 animate-pulse" : "text-zinc-500"} />
                                  <span className="text-xs font-semibold text-zinc-200">{database.name}</span>
                                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono",
                                    database.status === "ready" ? "bg-green-500/10 text-green-400" :
                                    database.status === "provisioning" ? "bg-orange-500/10 text-orange-400" :
                                    "bg-zinc-700 text-zinc-400"
                                  )}>{database.status}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {!database.appId && (
                                    <button
                                      onClick={() => handleInjectDb(database.id, app.id)}
                                      className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                    >
                                      Inject to app
                                    </button>
                                  )}
                                  {database.appId === app.id && (
                                    <span className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircle2 size={10} />Linked</span>
                                  )}
                                  <button onClick={() => setShowDbConn(showDbConn === database.id ? null : database.id)} className="text-zinc-500 hover:text-zinc-300 p-1">
                                    {showDbConn === database.id ? <EyeOff size={12} /> : <Eye size={12} />}
                                  </button>
                                  <button onClick={() => handleDeleteDb(database.id)} className="text-zinc-600 hover:text-red-400 p-1">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              {showDbConn === database.id && database.connectionString && (
                                <div className="flex items-center gap-2 bg-black rounded border border-zinc-700 px-2 py-1.5 mt-1">
                                  <span className="text-[10px] font-mono text-zinc-400 flex-1 break-all">{database.connectionString}</span>
                                  <CopyButton text={database.connectionString} />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {databases.filter(d => d.appId === app.id).length === 0 && databases.length === 0 && (
                        <div className="rounded-lg border border-dashed border-zinc-800 p-4 text-center">
                          <HardDrive size={18} className="text-zinc-600 mx-auto mb-2" />
                          <p className="text-[11px] text-zinc-500">No databases yet. Provision one above and it'll be linked to this app.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-2 gap-3">
        {[
          { href: "/github",    label: "Connect GitHub",   desc: "Link your repos",      icon: <Github size={15} /> },
          { href: "/sovereign", label: "Sovereign Stack",  desc: "Certification checker", icon: <CheckCircle2 size={15} /> },
          { href: "/secrets",   label: "App Secrets",      desc: "Manage env vars",       icon: <Key size={15} /> },
          { href: "/monitor",   label: "Monitor",          desc: "Uptime & health",        icon: <Zap size={15} /> },
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

      {/* CLI Section */}
      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Terminal size={18} className="text-orange-400" />
            <div>
              <p className="text-sm font-bold text-white">Forge CLI</p>
              <p className="text-[11px] text-zinc-500">Deploy and manage apps from your terminal</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Install */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">1. Install</p>
            <div className="flex items-center gap-2 bg-black rounded-lg border border-zinc-800 px-3 py-2">
              <span className="text-xs font-mono text-zinc-300 flex-1">curl -fsSL https://13moonforge.ai/api/cli/install | bash</span>
              <CopyButton text="curl -fsSL https://13moonforge.ai/api/cli/install | bash" />
            </div>
          </div>

          {/* Authenticate */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">2. Authenticate</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-black rounded-lg border border-zinc-800 px-3 py-2">
                <span className="text-xs font-mono text-zinc-300 flex-1">forge login</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateToken}
                  disabled={generatingToken}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-8 text-xs"
                >
                  {generatingToken ? <Loader2 size={12} className="animate-spin mr-1" /> : <Key size={12} className="mr-1" />}
                  Generate CLI Token
                </Button>
                {cliToken && (
                  <div className="flex items-center gap-2 flex-1 bg-black rounded-lg border border-orange-500/30 px-3 py-1.5">
                    <span className="text-xs font-mono text-orange-300 flex-1 truncate">{cliToken}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(cliToken); setCliTokenCopied(true); setTimeout(() => setCliTokenCopied(false), 2000); }}
                      className="text-zinc-500 hover:text-white"
                    >
                      {cliTokenCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                )}
              </div>
              {cliToken && (
                <p className="text-[11px] text-orange-400/80">Copy this token — it won't be shown again. Paste it when <span className="font-mono">forge login</span> prompts you.</p>
              )}
            </div>
          </div>

          {/* Commands */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">3. Ship it</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { cmd: "forge apps",              desc: "List your apps" },
                { cmd: "forge deploy user/repo",  desc: "Deploy from GitHub" },
                { cmd: "forge logs <app>",        desc: "Stream logs" },
                { cmd: "forge db create mydb",    desc: "Provision Postgres" },
                { cmd: "forge env <app> set K V", desc: "Set env var" },
                { cmd: "forge redeploy <app>",    desc: "Redeploy app" },
              ].map(({ cmd, desc }) => (
                <div key={cmd} className="rounded-lg bg-black border border-zinc-800 px-3 py-2 flex items-center gap-2">
                  <span className="text-[11px] font-mono text-orange-300 flex-1">{cmd}</span>
                  <span className="text-[10px] text-zinc-600 hidden sm:block">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
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
