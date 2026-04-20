import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  Github, CheckCircle2, Loader2, Unlink, Search, Lock, Globe,
  AlertTriangle, ChevronRight, ExternalLink, GitBranch, RefreshCw,
  Download, FileCode2, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

function getUserId() {
  let id = localStorage.getItem("13moonforge_user_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("13moonforge_user_id", id); }
  return id;
}
function h() {
  return { "Content-Type": "application/json", "x-user-id": getUserId() };
}

// ─── Platform config ──────────────────────────────────────────────────────────

type Platform = "github" | "gitlab" | "bitbucket";

interface PlatformConfig {
  id: Platform;
  label: string;
  tagline: string;
  color: string;
  badge: string;
  tokenLabel: string;
  tokenPlaceholder: string;
  requiresUsername: boolean;
  tokenUrl: string;
  instructions: string[];
  endpoint: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "github",
    label: "GitHub",
    tagline: "The most common place Replit apps live. Push from Replit → import here.",
    color: "text-foreground",
    badge: "bg-muted border-border",
    tokenLabel: "Personal Access Token",
    tokenPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    requiresUsername: false,
    tokenUrl: "https://github.com/settings/tokens/new?scopes=repo&description=Forge+Builder",
    instructions: [
      "Go to GitHub → Settings → Developer settings → Personal access tokens",
      'Click "Generate new token (classic)"',
      'Give it a name like "Forge Builder"',
      'Check the "repo" scope (full control of private repos)',
      'Click "Generate token" and copy it here',
    ],
    endpoint: "/api/github",
  },
  {
    id: "gitlab",
    label: "GitLab",
    tagline: "Full read and write access — import code and commit fixes back directly.",
    color: "text-orange-400",
    badge: "bg-orange-900/20 border-orange-800/40 text-orange-300",
    tokenLabel: "Personal Access Token",
    tokenPlaceholder: "glpat-xxxxxxxxxxxxxxxxxxxx",
    requiresUsername: false,
    tokenUrl: "https://gitlab.com/-/user_settings/personal_access_tokens",
    instructions: [
      "Go to GitLab → User Settings → Access Tokens",
      'Click "Add new token"',
      'Name it "Forge Builder" with no expiry',
      'Select "api" scope (full read + write)',
      'Click "Create personal access token" and copy it here',
    ],
    endpoint: "/api/gitlab",
  },
  {
    id: "bitbucket",
    label: "Bitbucket",
    tagline: "Connect with your Bitbucket username and an app password.",
    color: "text-sky-400",
    badge: "bg-sky-900/20 border-sky-800/40 text-sky-300",
    tokenLabel: "App Password",
    tokenPlaceholder: "xxxxxxxxxxxxxxxxxxxx",
    requiresUsername: true,
    tokenUrl: "https://bitbucket.org/account/settings/app-passwords/",
    instructions: [
      "Go to Bitbucket → Personal settings → App passwords",
      'Click "Create app password"',
      'Give it a label like "Forge Builder"',
      'Check: Repositories (Read), Pull requests (Read)',
      "Copy the password here along with your Bitbucket username",
    ],
    endpoint: "/api/bitbucket",
  },
];

const KEY_FILES = ["package.json", ".env.example", ".env.sample", "schema.ts", "drizzle/schema.ts", "src/schema.ts", "db/schema.ts", "shared/schema.ts"];
const SOURCE_PATTERNS = ["src/index.ts", "src/main.ts", "server/index.ts", "index.ts", "src/auth.ts", "server/auth.ts", "src/storage.ts", "server/storage.ts"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnStatus { connected: boolean; username?: string; displayName?: string; avatarUrl?: string }
interface Repo { id: string | number; fullName: string; name: string; private: boolean; language: string | null; description: string | null; updatedAt: string; defaultBranch: string; htmlUrl: string }
interface FileNode { path: string; size: number }

// ─── Component ───────────────────────────────────────────────────────────────

export default function CodeSources() {
  const [, navigate] = useLocation();
  const [active, setActive] = useState<Platform>("github");

  // Connection statuses for all platforms
  const [statuses, setStatuses] = useState<Record<Platform, ConnStatus | null>>({ github: null, gitlab: null, bitbucket: null });

  // Connect form state
  const [token, setToken] = useState("");
  const [bbUser, setBbUser] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  // Repo browser state (reset on platform switch)
  const [repos, setRepos] = useState<Repo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");

  const cfg = PLATFORMS.find(p => p.id === active)!;
  const status = statuses[active];

  // Load all 3 statuses on mount
  useEffect(() => {
    (["github", "gitlab", "bitbucket"] as Platform[]).forEach(async p => {
      try {
        const r = await fetch(`${API}/api/${p}/status`, { headers: h() });
        if (r.ok) {
          const data = await r.json();
          setStatuses(s => ({ ...s, [p]: data }));
        }
      } catch { /* ignore */ }
    });
  }, []);

  // When switching platforms, reset browser state and load repos if connected
  useEffect(() => {
    setToken(""); setBbUser(""); setConnectError("");
    setRepos([]); setSelectedRepo(null); setFiles([]);
    if (statuses[active]?.connected) loadRepos();
  }, [active]);

  // When connection status changes, reload repos
  useEffect(() => {
    if (statuses[active]?.connected && repos.length === 0) loadRepos();
  }, [statuses[active]]);

  const loadRepos = async () => {
    setReposLoading(true);
    setSelectedRepo(null); setFiles([]);
    try {
      const r = await fetch(`${API}${cfg.endpoint}/repos`, { headers: h() });
      if (r.ok) setRepos(await r.json());
    } finally { setReposLoading(false); }
  };

  const connect = async () => {
    setConnecting(true); setConnectError("");
    try {
      const body = cfg.requiresUsername
        ? { username: bbUser.trim(), appPassword: token.trim() }
        : { token: token.trim() };
      const r = await fetch(`${API}${cfg.endpoint}/connect`, { method: "POST", headers: h(), body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) { setConnectError(data.error ?? "Connection failed"); return; }
      setStatuses(s => ({ ...s, [active]: { connected: true, username: data.username ?? bbUser, displayName: data.displayName, avatarUrl: data.avatarUrl } }));
      setToken(""); setBbUser("");
    } finally { setConnecting(false); }
  };

  const disconnect = async () => {
    await fetch(`${API}${cfg.endpoint}/disconnect`, { method: "DELETE", headers: h() });
    setStatuses(s => ({ ...s, [active]: { connected: false } }));
    setRepos([]); setSelectedRepo(null); setFiles([]);
  };

  const selectRepo = async (repo: Repo) => {
    setSelectedRepo(repo); setFiles([]); setFilesLoading(true);
    try {
      const r = await fetch(`${API}${cfg.endpoint}/tree?repo=${encodeURIComponent(repo.fullName)}&branch=${repo.defaultBranch}`, { headers: h() });
      if (r.ok) setFiles(await r.json());
    } finally { setFilesLoading(false); }
  };

  const fetchFile = async (repo: Repo, path: string): Promise<string | null> => {
    try {
      const r = await fetch(`${API}${cfg.endpoint}/file`, {
        method: "POST", headers: h(),
        body: JSON.stringify({ repo: repo.fullName, path, branch: repo.defaultBranch }),
      });
      if (!r.ok) return null;
      const d = await r.json();
      return d.content ?? null;
    } catch { return null; }
  };

  const launchWizard = async () => {
    if (!selectedRepo) return;
    setImporting(true);

    setImportStatus("Fetching package.json…");
    const packageJson = await fetchFile(selectedRepo, "package.json") ?? "";

    setImportStatus("Fetching env file…");
    let envContent = "";
    for (const p of [".env.example", ".env.sample", ".env.template"]) {
      const c = await fetchFile(selectedRepo, p);
      if (c) { envContent = c; break; }
    }

    setImportStatus("Fetching schema…");
    let schemaFile = "";
    const schemaCandidates = files.map(f => f.path).filter(p => KEY_FILES.slice(1).some(() => p.endsWith("/schema.ts") || p === "schema.ts"));
    for (const p of schemaCandidates.slice(0, 3)) {
      const c = await fetchFile(selectedRepo, p);
      if (c) schemaFile += `// ${p}\n${c}\n\n`;
    }

    setImportStatus("Fetching source files…");
    let sourceFiles = "";
    const srcCandidates = files.map(f => f.path).filter(p =>
      SOURCE_PATTERNS.includes(p) || (p.startsWith("src/") && p.endsWith(".ts") && !p.includes("test")),
    ).slice(0, 5);
    for (const p of srcCandidates) {
      const c = await fetchFile(selectedRepo, p);
      if (c) sourceFiles += `// ${p}\n${c}\n\n`;
    }

    localStorage.setItem("wizard_import", JSON.stringify({
      platform: active === "github" ? "replit" : "other",
      appName: selectedRepo.name,
      packageJson, envContent, schemaFile, sourceFiles,
      repoFullName: selectedRepo.fullName,
      branch: selectedRepo.defaultBranch,
      codeSource: active,
      importedAt: Date.now(),
    }));

    setImporting(false);
    navigate("/wizard");
  };

  const filtered = repos.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? "").toLowerCase().includes(search.toLowerCase()),
  );
  const hasPackageJson = files.some(f => f.path === "package.json");
  const sourceFound    = files.filter(f => SOURCE_PATTERNS.includes(f.path) || (f.path.startsWith("src/") && f.path.endsWith(".ts")));
  const schemaFound    = files.filter(f => f.path.endsWith("/schema.ts") || f.path === "schema.ts");
  const envFound       = files.find(f => [".env.example", ".env.sample"].includes(f.path));

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="bg-muted/40 rounded-xl p-3 shrink-0 border border-border">
          <Layers className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Code Sources</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect GitHub, GitLab, or Bitbucket — then import any repo directly into the Migration Wizard. Every coding tool pushes to one of these three.
          </p>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl border border-border mb-6">
        {PLATFORMS.map(p => {
          const st = statuses[p.id];
          const isConnected = st?.connected;
          return (
            <button
              key={p.id}
              onClick={() => setActive(p.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                active === p.id ? "bg-card shadow-sm border border-border text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.id === "github"    && <Github size={15} />}
              {p.id === "gitlab"    && <span className="text-base leading-none">🦊</span>}
              {p.id === "bitbucket" && <span className="text-base leading-none">🪣</span>}
              {p.label}
              {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Active platform content */}
      <div className="space-y-5">
        {/* Loading initial status */}
        {status === null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 size={15} className="animate-spin" /> Checking {cfg.label} connection…
          </div>
        )}

        {/* ── Not connected ── */}
        {status !== null && !status.connected && (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-6 max-w-xl space-y-4">
              <div>
                <h2 className="font-bold mb-1">Connect {cfg.label}</h2>
                <p className="text-sm text-muted-foreground">{cfg.tagline}</p>
              </div>

              {cfg.requiresUsername && (
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">Bitbucket Username</Label>
                  <Input value={bbUser} onChange={e => setBbUser(e.target.value)} placeholder="your-username" className="bg-muted/20" />
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold mb-1.5 block">{cfg.tokenLabel}</Label>
                <Input
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && connect()}
                  placeholder={cfg.tokenPlaceholder}
                  className="bg-muted/20 font-mono text-sm"
                />
              </div>

              {connectError && (
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle size={14} /> {connectError}
                </p>
              )}

              <Button
                onClick={connect}
                disabled={!token.trim() || (cfg.requiresUsername && !bbUser.trim()) || connecting}
                className="w-full gap-2"
              >
                {connecting ? <Loader2 size={14} className="animate-spin" /> : null}
                {connecting ? "Connecting…" : `Connect ${cfg.label}`}
              </Button>
            </div>

            {/* Instructions */}
            <div className="rounded-xl border border-border bg-card/50 p-5 max-w-xl space-y-3">
              <p className="font-semibold text-sm">How to get {cfg.requiresUsername ? "an app password" : "a token"}</p>
              <ol className="space-y-2">
                {cfg.instructions.map((step, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-black mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <a href={cfg.tokenUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                Open {cfg.label} token page <ExternalLink size={11} />
              </a>
            </div>
          </div>
        )}

        {/* ── Connected ── */}
        {status?.connected && (
          <div className="space-y-5">
            {/* Connected badge */}
            <div className="flex items-center justify-between rounded-xl border border-green-800/40 bg-green-900/10 p-4">
              <div className="flex items-center gap-3">
                {status.avatarUrl && (
                  <img src={status.avatarUrl} alt={status.username} className="w-9 h-9 rounded-full border border-border" />
                )}
                <div>
                  <p className="font-bold flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-green-400" />
                    Connected to {cfg.label} as <span className="text-green-300">@{status.username}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Forge can read and write to your repos.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={loadRepos} className="gap-1.5 h-8"><RefreshCw size={13} /> Refresh</Button>
                <Button variant="ghost" size="sm" onClick={disconnect} className="gap-1.5 h-8 text-muted-foreground hover:text-destructive"><Unlink size={13} /> Disconnect</Button>
              </div>
            </div>

            {/* Repo browser */}
            {!selectedRepo && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search your ${cfg.label} repos…`} className="pl-9 bg-card" />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{repos.length} repos</span>
                </div>

                {reposLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 size={14} className="animate-spin" /> Loading repos…
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                    {filtered.map(repo => (
                      <button
                        key={repo.id}
                        onClick={() => selectRepo(repo)}
                        className="w-full text-left rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 p-4 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              {repo.private ? <Lock size={11} className="text-amber-400 shrink-0" /> : <Globe size={11} className="text-muted-foreground shrink-0" />}
                              <span className="font-semibold text-sm truncate">{repo.name}</span>
                              {repo.language && <Badge variant="secondary" className="text-[10px] shrink-0">{repo.language}</Badge>}
                            </div>
                            {repo.description && <p className="text-xs text-muted-foreground truncate">{repo.description}</p>}
                          </div>
                          <ChevronRight size={15} className="text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                        </div>
                      </button>
                    ))}
                    {filtered.length === 0 && !reposLoading && (
                      <p className="text-sm text-muted-foreground text-center py-6">No repos found.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* File overview */}
            {selectedRepo && (
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setSelectedRepo(null); setFiles([]); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← All repos</button>
                  <span className="text-muted-foreground">/</span>
                  <span className="font-bold text-sm">{selectedRepo.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    <GitBranch size={9} className="mr-1" />{selectedRepo.defaultBranch}
                  </Badge>
                  <a href={selectedRepo.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 ml-1">
                    <ExternalLink size={10} />
                  </a>
                </div>

                {filesLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" /> Reading file tree…
                  </div>
                )}

                {!filesLoading && files.length > 0 && (
                  <>
                    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                      <p className="font-bold text-sm">What Forge will import</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { label: "package.json", found: hasPackageJson, note: hasPackageJson ? "Found at root" : "Not found — audit limited", critical: true },
                          { label: "Environment file", found: !!envFound, note: envFound ? envFound.path : "No .env.example found", critical: false },
                          { label: "Schema files", found: schemaFound.length > 0, note: schemaFound.length > 0 ? `${schemaFound.length} found` : "None detected", critical: false },
                        ].map(item => (
                          <div key={item.label} className={cn(
                            "rounded-lg border p-3",
                            item.found ? "border-green-800/40 bg-green-900/10" : item.critical ? "border-amber-800/40 bg-amber-900/10" : "border-border bg-muted/20",
                          )}>
                            <div className="flex items-center gap-2 mb-1">
                              {item.found
                                ? <CheckCircle2 size={13} className="text-green-400 shrink-0" />
                                : <AlertTriangle size={13} className={cn("shrink-0", item.critical ? "text-amber-400" : "text-muted-foreground")} />
                              }
                              <span className="text-xs font-bold">{item.label}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{item.note}</p>
                          </div>
                        ))}
                      </div>

                      {sourceFound.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                            <FileCode2 size={12} className="text-primary" /> Source files Forge will read ({sourceFound.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {sourceFound.slice(0, 10).map(f => (
                              <code key={f.path} className="text-[10px] bg-muted/40 border border-border px-2 py-0.5 rounded">{f.path}</code>
                            ))}
                            {sourceFound.length > 10 && <span className="text-[10px] text-muted-foreground px-1">+{sourceFound.length - 10} more</span>}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
                        <strong className="text-foreground">{files.length} total files</strong> in this repo — Forge imports the key files automatically.
                      </p>
                    </div>

                    {active === "github" && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                        <p className="font-semibold mb-1">Bringing this from Replit?</p>
                        <p className="text-muted-foreground text-xs">Connect your Replit project to GitHub first: in Replit, go to your project → Git → Connect to GitHub. Once it's pushed, it appears here.</p>
                      </div>
                    )}

                    <Button onClick={launchWizard} disabled={importing || !hasPackageJson} size="lg" className="w-full gap-2">
                      {importing
                        ? <><Loader2 size={16} className="animate-spin" />{importStatus}</>
                        : <><Download size={16} />Import {selectedRepo.name} → Migration Wizard</>
                      }
                    </Button>
                    {!hasPackageJson && (
                      <p className="text-xs text-amber-400 text-center flex items-center gap-1.5 justify-center">
                        <AlertTriangle size={12} /> package.json not found — required for the audit.
                      </p>
                    )}
                  </>
                )}

                {!filesLoading && files.length === 0 && (
                  <p className="text-sm text-muted-foreground">No files found in this repo.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="mt-10 pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Every coding tool connects here.</strong> VS Code, Cursor, Windsurf, Gitpod, StackBlitz, CodeSandbox — they all push to GitHub, GitLab, or Bitbucket. Connect those three and Forge can reach any code you write, anywhere.
        </p>
      </div>
    </div>
  );
}
