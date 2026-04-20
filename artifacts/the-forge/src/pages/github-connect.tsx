import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import {
  Github, CheckCircle2, Loader2, Unlink, Search, Lock, Globe,
  FileCode2, Wand2, AlertTriangle, ChevronRight, ExternalLink, GitBranch,
  RefreshCw, FolderOpen, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

function getUserId() {
  let id = localStorage.getItem("13moonforge_user_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("13moonforge_user_id", id); }
  return id;
}

function headers() {
  return { "Content-Type": "application/json", "x-user-id": getUserId() };
}

interface GitHubStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
}

interface Repo {
  id: number;
  fullName: string;
  name: string;
  private: boolean;
  language: string | null;
  description: string | null;
  updatedAt: string;
  defaultBranch: string;
  htmlUrl: string;
}

interface FileNode {
  path: string;
  size: number;
}

const KEY_FILES = [
  "package.json",
  ".env.example",
  ".env.sample",
  "schema.ts",
  "schema.sql",
  "drizzle/schema.ts",
  "src/schema.ts",
  "db/schema.ts",
  "server/schema.ts",
  "lib/schema.ts",
  "shared/schema.ts",
];

const SOURCE_PATTERNS = [
  "src/index.ts", "src/main.ts", "server/index.ts", "index.ts",
  "src/auth.ts", "server/auth.ts",
  "src/storage.ts", "server/storage.ts",
  "src/routes.ts", "server/routes.ts",
];

export default function GitHubConnect() {
  const [, navigate] = useLocation();

  // Connection state
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  // Repo browser state
  const [repos, setRepos] = useState<Repo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);

  // File loading state
  const [files, setFiles] = useState<FileNode[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");

  useEffect(() => { loadStatus(); }, []);

  const loadStatus = async () => {
    try {
      const r = await fetch(`${API}/api/github/status`, { headers: headers() });
      const data = await r.json();
      setStatus(data);
      if (data.connected) loadRepos();
    } catch { /* ignore */ }
  };

  const connect = async () => {
    if (!token.trim()) return;
    setConnecting(true);
    setConnectError("");
    try {
      const r = await fetch(`${API}/api/github/connect`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await r.json();
      if (!r.ok) { setConnectError(data.error ?? "Connection failed"); return; }
      setToken("");
      setStatus({ connected: true, username: data.username, avatarUrl: data.avatarUrl });
      loadRepos();
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    await fetch(`${API}/api/github/disconnect`, { method: "DELETE", headers: headers() });
    setStatus({ connected: false });
    setRepos([]);
    setSelectedRepo(null);
    setFiles([]);
  };

  const loadRepos = async () => {
    setReposLoading(true);
    try {
      const r = await fetch(`${API}/api/github/repos`, { headers: headers() });
      if (!r.ok) return;
      setRepos(await r.json());
    } finally {
      setReposLoading(false);
    }
  };

  const selectRepo = async (repo: Repo) => {
    setSelectedRepo(repo);
    setFiles([]);
    setFilesLoading(true);
    try {
      const r = await fetch(
        `${API}/api/github/tree?repo=${encodeURIComponent(repo.fullName)}&branch=${repo.defaultBranch}`,
        { headers: headers() },
      );
      if (!r.ok) return;
      setFiles(await r.json());
    } finally {
      setFilesLoading(false);
    }
  };

  const launchWizard = async () => {
    if (!selectedRepo) return;
    setImporting(true);
    setImportStatus("Fetching package.json…");

    const branch = selectedRepo.defaultBranch;
    const fetchFile = async (path: string): Promise<string | null> => {
      try {
        const r = await fetch(`${API}/api/github/file`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ repo: selectedRepo.fullName, path, branch }),
        });
        if (!r.ok) return null;
        const data = await r.json();
        return data.content ?? null;
      } catch { return null; }
    };

    // Always fetch package.json
    const packageJson = await fetchFile("package.json") ?? "";

    // Try each env file pattern
    setImportStatus("Fetching .env.example…");
    let envContent = "";
    for (const p of [".env.example", ".env.sample", ".env.template"]) {
      const c = await fetchFile(p);
      if (c) { envContent = c; break; }
    }

    // Try each schema pattern
    setImportStatus("Fetching schema…");
    let schemaFile = "";
    const schemaPatterns = files
      .map(f => f.path)
      .filter(p => KEY_FILES.slice(2).some(k => p === k || p.endsWith("/schema.ts") || p.endsWith("/schema.sql")));
    for (const p of schemaPatterns.slice(0, 3)) {
      const c = await fetchFile(p);
      if (c) { schemaFile += `// ${p}\n${c}\n\n`; }
    }

    // Try common source files
    setImportStatus("Fetching source files…");
    let sourceFiles = "";
    const srcCandidates = files
      .map(f => f.path)
      .filter(p =>
        SOURCE_PATTERNS.includes(p) ||
        (p.startsWith("src/") && p.endsWith(".ts") && !p.includes("test") && !p.includes("spec")),
      )
      .slice(0, 5);
    for (const p of srcCandidates) {
      const c = await fetchFile(p);
      if (c) { sourceFiles += `// ${p}\n${c}\n\n`; }
    }

    // Save to localStorage for wizard to pick up
    localStorage.setItem("wizard_import", JSON.stringify({
      platform: "replit",
      appName: selectedRepo.name,
      packageJson,
      envContent,
      schemaFile,
      sourceFiles,
      repoFullName: selectedRepo.fullName,
      branch,
      importedAt: Date.now(),
    }));

    setImporting(false);
    navigate("/wizard");
  };

  const filteredRepos = repos.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const keyFilesFound   = files.filter(f => KEY_FILES.some(k => f.path === k || f.path.endsWith("/schema.ts")));
  const sourceFound     = files.filter(f => SOURCE_PATTERNS.includes(f.path) || (f.path.startsWith("src/") && f.path.endsWith(".ts")));
  const hasPackageJson  = files.some(f => f.path === "package.json");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="bg-muted/40 rounded-xl p-3 shrink-0 border border-border">
          <Github className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">GitHub Connect</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your GitHub account and import any repo directly into the Migration Wizard — no copying or pasting required.
          </p>
        </div>
      </div>

      {/* ── NOT CONNECTED ── */}
      {status && !status.connected && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 max-w-xl">
            <h2 className="font-bold mb-1">Connect your GitHub account</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Use a Personal Access Token. Forge only needs <code className="text-xs bg-muted px-1 py-0.5 rounded">repo</code> scope to read and write your repositories.
            </p>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Personal Access Token</Label>
                <Input
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && connect()}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="bg-muted/20 font-mono text-sm"
                />
              </div>

              {connectError && (
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle size={14} /> {connectError}
                </p>
              )}

              <Button onClick={connect} disabled={!token.trim() || connecting} className="gap-2 w-full">
                {connecting ? <Loader2 size={15} className="animate-spin" /> : <Github size={15} />}
                {connecting ? "Connecting…" : "Connect GitHub"}
              </Button>
            </div>
          </div>

          {/* How to get a token */}
          <div className="rounded-xl border border-border bg-card/50 p-5 max-w-xl space-y-3">
            <p className="font-semibold text-sm flex items-center gap-2">
              <FolderOpen size={14} className="text-primary" />
              How to get a token
            </p>
            <ol className="text-sm text-muted-foreground space-y-2">
              {[
                "Go to GitHub \u2192 Settings \u2192 Developer settings \u2192 Personal access tokens",
                'Click "Generate new token (classic)"',
                'Give it a name like "Forge Builder"',
                'Check the "repo" scope (full control of private repos)',
                'Click "Generate token" and copy it here',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=Forge+Builder"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              Open GitHub token page <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}

      {/* ── CONNECTED ── */}
      {status?.connected && (
        <div className="space-y-6">
          {/* Connected badge */}
          <div className="flex items-center justify-between rounded-xl border border-green-800/40 bg-green-900/10 p-4">
            <div className="flex items-center gap-3">
              {status.avatarUrl && (
                <img src={status.avatarUrl} alt={status.username} className="w-9 h-9 rounded-full border border-border" />
              )}
              <div>
                <p className="font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-green-400" />
                  Connected as <span className="text-green-300">@{status.username}</span>
                </p>
                <p className="text-xs text-muted-foreground">Forge can read and write to your repos.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={loadRepos} className="gap-1.5 h-8">
                <RefreshCw size={13} /> Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={disconnect} className="gap-1.5 h-8 text-muted-foreground hover:text-destructive">
                <Unlink size={13} /> Disconnect
              </Button>
            </div>
          </div>

          {/* Repo selector */}
          {!selectedRepo && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search your repos…"
                    className="pl-9 bg-card"
                  />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {repos.length} repos
                </span>
              </div>

              {reposLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 size={15} className="animate-spin" /> Loading repos…
                </div>
              )}

              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {filteredRepos.map(repo => (
                  <button
                    key={repo.id}
                    onClick={() => selectRepo(repo)}
                    className="w-full text-left rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 p-4 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {repo.private
                            ? <Lock size={12} className="text-amber-400 shrink-0" />
                            : <Globe size={12} className="text-muted-foreground shrink-0" />
                          }
                          <span className="font-semibold truncate">{repo.name}</span>
                          {repo.language && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">{repo.language}</Badge>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-xs text-muted-foreground truncate">{repo.description}</p>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                    </div>
                  </button>
                ))}
                {!reposLoading && filteredRepos.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No repos found.</p>
                )}
              </div>
            </div>
          )}

          {/* File overview for selected repo */}
          {selectedRepo && (
            <div className="space-y-5">
              {/* Repo header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => { setSelectedRepo(null); setFiles([]); }}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ← All repos
                    </button>
                    <span className="text-muted-foreground">/</span>
                    <span className="font-bold">{selectedRepo.name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      <GitBranch size={9} className="mr-1" />{selectedRepo.defaultBranch}
                    </Badge>
                  </div>
                  <a
                    href={selectedRepo.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    {selectedRepo.fullName} <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {filesLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" /> Reading file tree…
                </div>
              )}

              {!filesLoading && files.length > 0 && (
                <>
                  {/* What Forge will import */}
                  <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                    <p className="font-bold text-sm">What Forge will import</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          label: "package.json",
                          found: hasPackageJson,
                          note: hasPackageJson ? "Found at root" : "Not found — audit will be limited",
                          critical: true,
                        },
                        {
                          label: "Environment vars",
                          found: files.some(f => [".env.example", ".env.sample", ".env.template"].includes(f.path)),
                          note: files.some(f => [".env.example", ".env.sample"].includes(f.path))
                            ? files.find(f => [".env.example", ".env.sample"].includes(f.path))!.path
                            : "No .env.example found",
                          critical: false,
                        },
                        {
                          label: "Schema files",
                          found: keyFilesFound.length > 0,
                          note: keyFilesFound.length > 0 ? `${keyFilesFound.length} found` : "None detected",
                          critical: false,
                        },
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
                          <FileCode2 size={12} className="text-primary" />
                          Source files Forge will read ({sourceFound.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {sourceFound.slice(0, 10).map(f => (
                            <code key={f.path} className="text-[10px] bg-muted/40 border border-border px-2 py-0.5 rounded">
                              {f.path}
                            </code>
                          ))}
                          {sourceFound.length > 10 && (
                            <span className="text-[10px] text-muted-foreground px-2 py-0.5">
                              +{sourceFound.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
                      <strong className="text-foreground">{files.length} total files</strong> in this repo — Forge imports the key files automatically. You can add more in the wizard.
                    </div>
                  </div>

                  {/* Replit tip */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                    <p className="font-semibold mb-1">Bringing this from Replit?</p>
                    <p className="text-muted-foreground text-xs">
                      Make sure you've connected your Replit project to GitHub first: in Replit, go to your project → Git → Connect to GitHub. Once it's pushed, it shows up here automatically.
                    </p>
                  </div>

                  {/* Launch button */}
                  <Button
                    onClick={launchWizard}
                    disabled={importing || !hasPackageJson}
                    size="lg"
                    className="w-full gap-2"
                  >
                    {importing
                      ? <><Loader2 size={16} className="animate-spin" /> {importStatus}</>
                      : <><Download size={16} /> Import {selectedRepo.name} → Migration Wizard</>
                    }
                  </Button>
                  {!hasPackageJson && (
                    <p className="text-xs text-amber-400 text-center flex items-center gap-1.5 justify-center">
                      <AlertTriangle size={12} /> package.json not found — wizard requires it to run the audit.
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

      {/* Loading initial status */}
      {!status && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 size={15} className="animate-spin" /> Checking GitHub connection…
        </div>
      )}
    </div>
  );
}
