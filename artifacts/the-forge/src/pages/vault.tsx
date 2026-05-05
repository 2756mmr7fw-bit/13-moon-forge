import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Vault, Plus, Github, Upload, ExternalLink, Trash2, Loader2,
  GitBranch, Lock, Globe2, RefreshCw, CheckCircle2, XCircle, Clock,
  FolderGit2, ArrowUpFromLine, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Repo {
  id: number;
  name: string;
  description: string | null;
  visibility: string;
  cloneUrl: string | null;
  forgejoFullName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ImportRecord {
  id: number;
  repoId: number | null;
  source: string;
  sourceUrl: string | null;
  sourceRepoName: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

interface VaultStatus {
  configured: boolean;
  online: boolean;
  forgejoUrl?: string;
  message?: string;
}

function useVault() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [r, i, s] = await Promise.all([
        fetch(`${API_BASE}/api/vault/repos`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API_BASE}/api/vault/imports`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API_BASE}/api/vault/status`, { credentials: "include" }).then(r => r.json()),
      ]);
      setRepos(Array.isArray(r) ? r : []);
      setImports(Array.isArray(i) ? i : []);
      setStatus(s);
    } finally {
      setLoading(false);
    }
  };

  return { repos, imports, status, loading, refresh, setRepos };
}

// ── Modal base ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── New Repo modal ─────────────────────────────────────────────────────────
function NewRepoModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: Repo) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/vault/repos`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() || undefined, visibility }),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: "Error", description: data.error, variant: "destructive" }); return; }
      toast({ title: "Repo created", description: `${name} is ready in your Vault` });
      onCreated(data);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="New Repository" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Repository name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="my-awesome-project" className="font-mono" />
          <p className="text-xs text-muted-foreground mt-1">Letters, numbers, dashes, dots, and underscores only.</p>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
          <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What this project does…" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Visibility</label>
          <div className="flex gap-2">
            {(["private", "public"] as const).map(v => (
              <button key={v} onClick={() => setVisibility(v)} className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors",
                visibility === v ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              )}>
                {v === "private" ? <Lock className="w-3.5 h-3.5" /> : <Globe2 className="w-3.5 h-3.5" />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <Button className="w-full" onClick={submit} disabled={saving || !name.trim()}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Create Repository
        </Button>
      </div>
    </Modal>
  );
}

// ── GitHub Import modal ────────────────────────────────────────────────────
function GithubImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [repoName, setRepoName] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!url.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/vault/import/github`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubUrl: url.trim(),
          githubToken: token.trim() || undefined,
          repoName: repoName.trim() || undefined,
          visibility,
        }),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: "Import failed", description: data.error, variant: "destructive" }); return; }
      toast({ title: "Import started", description: "Your code is being pulled into the Vault. This is private — no one else can see it." });
      onImported();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Import from GitHub" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-400">
          Your code goes straight from GitHub to <strong>your private server</strong>. GitHub never knows where it ended up.
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">GitHub repo URL</label>
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/you/your-repo" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Personal access token <span className="text-muted-foreground font-normal">(for private repos)</span></label>
          <Input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" />
          <p className="text-xs text-muted-foreground mt-1">Only needed for private GitHub repos. Never stored.</p>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Vault repo name <span className="text-muted-foreground font-normal">(optional — auto-detected)</span></label>
          <Input value={repoName} onChange={e => setRepoName(e.target.value)} placeholder="my-repo" className="font-mono" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Visibility in Vault</label>
          <div className="flex gap-2">
            {(["private", "public"] as const).map(v => (
              <button key={v} onClick={() => setVisibility(v)} className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors",
                visibility === v ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              )}>
                {v === "private" ? <Lock className="w-3.5 h-3.5" /> : <Globe2 className="w-3.5 h-3.5" />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <Button className="w-full" onClick={submit} disabled={saving || !url.trim()}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Github className="w-4 h-4 mr-2" />}
          Import to Vault
        </Button>
      </div>
    </Modal>
  );
}

// ── ZIP Upload modal ───────────────────────────────────────────────────────
function ZipUploadModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [repoName, setRepoName] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("repoName", repoName.trim() || file.name.replace(/\.zip$/i, "").replace(/[^a-zA-Z0-9_.-]/g, "-"));
      fd.append("visibility", visibility);
      const r = await fetch(`${API_BASE}/api/vault/import/zip`, {
        method: "POST", credentials: "include", body: fd,
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: "Upload failed", description: data.error, variant: "destructive" }); return; }
      toast({ title: "Upload started", description: "Extracting and committing your code to the Vault." });
      onImported();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Upload ZIP" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 text-sm text-sky-400">
          Export your Replit project as a ZIP (three-dot menu → Download as ZIP), then upload it here. Your code lands directly in your Vault — it never passes through Replit's servers again.
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">ZIP file</label>
          <div
            onClick={() => fileRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              file ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/50"
            )}
          >
            <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-primary">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium text-sm">{file.name}</span>
              </div>
            ) : (
              <div className="text-muted-foreground">
                <ArrowUpFromLine className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm">Click to choose a ZIP file</p>
                <p className="text-xs mt-1">Max 100 MB</p>
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Repo name <span className="text-muted-foreground font-normal">(optional)</span></label>
          <Input value={repoName} onChange={e => setRepoName(e.target.value)} placeholder="my-project" className="font-mono" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Visibility</label>
          <div className="flex gap-2">
            {(["private", "public"] as const).map(v => (
              <button key={v} onClick={() => setVisibility(v)} className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors",
                visibility === v ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              )}>
                {v === "private" ? <Lock className="w-3.5 h-3.5" /> : <Globe2 className="w-3.5 h-3.5" />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <Button className="w-full" onClick={submit} disabled={saving || !file}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
          Upload to Vault
        </Button>
      </div>
    </Modal>
  );
}

// ── Import status badge ───────────────────────────────────────────────────
function ImportBadge({ status }: { status: string }) {
  if (status === "done") return <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 className="w-3 h-3" /> Done</span>;
  if (status === "error") return <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="w-3 h-3" /> Error</span>;
  if (status === "importing") return <span className="flex items-center gap-1 text-amber-400 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Importing…</span>;
  return <span className="flex items-center gap-1 text-muted-foreground text-xs"><Clock className="w-3 h-3" /> Pending</span>;
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function VaultPage() {
  const { toast } = useToast();
  const { repos, imports, status, loading, refresh, setRepos } = useVault();
  const [modal, setModal] = useState<"new" | "github" | "zip" | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (repo: Repo) => {
    if (!confirm(`Delete "${repo.name}"? This cannot be undone.`)) return;
    setDeletingId(repo.id);
    try {
      const r = await fetch(`${API_BASE}/api/vault/repos/${repo.id}`, { method: "DELETE", credentials: "include" });
      if (r.ok) {
        setRepos(prev => prev.filter(x => x.id !== repo.id));
        toast({ title: "Repo deleted" });
      } else {
        const d = await r.json();
        toast({ title: "Delete failed", description: d.error, variant: "destructive" });
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Load on mount
  useState(() => { refresh(); });

  const vaultNotConfigured = status && !status.configured;
  const recentImports = imports.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Vault className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">The Vault</h1>
            {status && (
              <Badge variant="outline" className={cn(
                "text-xs",
                status.configured && status.online ? "border-green-500/30 text-green-400 bg-green-500/10" :
                status.configured ? "border-amber-500/30 text-amber-400 bg-amber-500/10" :
                "border-muted text-muted-foreground"
              )}>
                {status.configured && status.online ? "Online" : status.configured ? "Offline" : "Not set up"}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">Your private code — yours to own, nobody else's to train on.</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-1.5", loading && "animate-spin")} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setModal("github")}>
            <Github className="w-4 h-4 mr-1.5" /> From GitHub
          </Button>
          <Button variant="outline" size="sm" onClick={() => setModal("zip")}>
            <Upload className="w-4 h-4 mr-1.5" /> Upload ZIP
          </Button>
          <Button size="sm" onClick={() => setModal("new")}>
            <Plus className="w-4 h-4 mr-1.5" /> New Repo
          </Button>
        </div>
      </div>

      {/* Setup banner */}
      {vaultNotConfigured && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
          <h3 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" /> One step to activate The Vault
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            The Vault runs on <strong className="text-foreground">Forgejo</strong> — a fully private, self-hosted Git platform on your own server. No GitHub. No corporate surveillance. Just yours.
          </p>
          <ol className="text-sm space-y-2 text-muted-foreground">
            <li><span className="text-primary font-bold">1.</span> Go to your Coolify dashboard at <code className="bg-muted px-1 rounded text-xs">http://5.78.154.21:8000</code></li>
            <li><span className="text-primary font-bold">2.</span> Click <strong className="text-foreground">New Resource → Docker Compose</strong></li>
            <li><span className="text-primary font-bold">3.</span> Paste the compose config below and set domain <code className="bg-muted px-1 rounded text-xs">git.13moonforge.ai</code></li>
            <li><span className="text-primary font-bold">4.</span> Deploy, then come back here and add <code className="bg-muted px-1 rounded text-xs">FORGEJO_URL</code> and <code className="bg-muted px-1 rounded text-xs">FORGEJO_TOKEN</code> to your API secrets</li>
          </ol>
          <details className="mt-3">
            <summary className="text-xs text-primary cursor-pointer font-medium">Show Docker Compose config</summary>
            <pre className="mt-2 bg-muted rounded-lg p-3 text-xs overflow-x-auto text-foreground whitespace-pre">{`services:
  forgejo:
    image: codeberg.org/forgejo/forgejo:10
    environment:
      - USER_UID=1000
      - USER_GID=1000
      - FORGEJO__database__DB_TYPE=sqlite3
      - FORGEJO__server__DOMAIN=git.13moonforge.ai
      - FORGEJO__server__ROOT_URL=https://git.13moonforge.ai
      - FORGEJO__server__HTTP_PORT=3000
      - FORGEJO__service__DISABLE_REGISTRATION=false
    volumes:
      - forgejo-data:/data
    ports:
      - "3000"

volumes:
  forgejo-data:`}</pre>
          </details>
        </div>
      )}

      {/* Repos grid */}
      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">Repositories ({repos.length})</h2>
        {loading && repos.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : repos.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-16 text-center">
            <FolderGit2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No repos yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Create one, import from GitHub, or upload a ZIP.</p>
            <div className="flex justify-center gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={() => setModal("github")}><Github className="w-4 h-4 mr-1.5" /> From GitHub</Button>
              <Button size="sm" onClick={() => setModal("new")}><Plus className="w-4 h-4 mr-1.5" /> New Repo</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {repos.map(repo => (
              <Card key={repo.id} className="group hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <GitBranch className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-semibold text-sm truncate">{repo.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className={cn(
                        "text-[10px]",
                        repo.visibility === "private"
                          ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                          : "border-sky-500/30 text-sky-400 bg-sky-500/10"
                      )}>
                        {repo.visibility === "private" ? <><Lock className="w-2.5 h-2.5 mr-0.5" />Private</> : <><Globe2 className="w-2.5 h-2.5 mr-0.5" />Public</>}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4 min-h-[2rem]">
                    {repo.description ?? "No description."}
                  </p>

                  <div className="flex items-center gap-2 justify-between">
                    <span className="text-[10px] text-muted-foreground/60">
                      Updated {new Date(repo.updatedAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {status?.configured && status.online && repo.forgejoFullName && (
                        <a
                          href={`${status.forgejoUrl}/${repo.forgejoFullName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          title="Open in Forgejo"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(repo)}
                        disabled={deletingId === repo.id}
                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                        title="Delete repo"
                      >
                        {deletingId === repo.id
                          ? <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent imports */}
      {recentImports.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">Recent Imports</h2>
          <div className="space-y-2">
            {recentImports.map(imp => (
              <div key={imp.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg text-sm">
                {imp.source === "github" && <Github className="w-4 h-4 text-muted-foreground shrink-0" />}
                {imp.source === "zip"    && <Upload className="w-4 h-4 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{imp.sourceRepoName ?? imp.sourceUrl ?? "Unknown"}</p>
                  {imp.sourceUrl && <p className="text-xs text-muted-foreground truncate">{imp.sourceUrl}</p>}
                  {imp.errorMessage && <p className="text-xs text-red-400 truncate">{imp.errorMessage}</p>}
                </div>
                <div className="shrink-0"><ImportBadge status={imp.status} /></div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(imp.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {modal === "new"    && <NewRepoModal    onClose={() => setModal(null)} onCreated={r => { setRepos(prev => [r, ...prev]); }} />}
      {modal === "github" && <GithubImportModal onClose={() => setModal(null)} onImported={refresh} />}
      {modal === "zip"    && <ZipUploadModal    onClose={() => setModal(null)} onImported={refresh} />}
    </div>
  );
}
