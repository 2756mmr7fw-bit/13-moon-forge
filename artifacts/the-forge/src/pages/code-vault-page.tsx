import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Archive, Plus, Trash2, Download, Loader2, GitBranch,
  Clock, FileCode2, RefreshCw, Search, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@workspace/api-client-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

interface Snapshot {
  id: number;
  appName: string;
  repoFullName: string;
  branch: string;
  commitSha?: string | null;
  commitMessage?: string | null;
  fileCount?: number | null;
  downloadUrl?: string | null;
  source: string;
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function SourceBadge({ source }: { source: string }) {
  return (
    <Badge variant="outline" className={cn(
      "text-[10px]",
      source === "webhook" ? "text-blue-400 border-blue-400/30" : "text-muted-foreground"
    )}>
      {source === "webhook" ? "Auto" : "Manual"}
    </Badge>
  );
}

function SaveSnapshotDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (s: Snapshot) => void }) {
  const [appName, setAppName]         = useState("");
  const [repoFullName, setRepoFullName] = useState("");
  const [branch, setBranch]           = useState("main");
  const [commitSha, setCommitSha]     = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  async function save() {
    if (!appName || !repoFullName) { setError("App name and repo are required"); return; }
    setSaving(true); setError("");
    try {
      const h = await authHeaders();
      const r = await fetch(`${API_BASE}/api/code-vault/snapshot`, {
        method: "POST", headers: h, credentials: "include",
        body: JSON.stringify({ appName, repoFullName, branch, commitSha: commitSha || null, commitMessage: commitMessage || null }),
      });
      if (!r.ok) throw new Error("Failed");
      const s = await r.json() as Snapshot;
      onSaved(s);
      onClose();
    } catch { setError("Failed to save snapshot."); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Archive size={18} />Save Code Snapshot</DialogTitle>
          <DialogDescription>Manually capture a snapshot of your code from Forgejo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>App name *</Label>
              <Input value={appName} onChange={e => setAppName(e.target.value)} placeholder="13 Moon Antivirus" className="mt-1" />
            </div>
            <div>
              <Label>Branch</Label>
              <Input value={branch} onChange={e => setBranch(e.target.value)} placeholder="main" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Forgejo repo path *</Label>
            <Input value={repoFullName} onChange={e => setRepoFullName(e.target.value)} placeholder="Ezekiel/13-moon-antivirus" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Commit SHA</Label>
              <Input value={commitSha} onChange={e => setCommitSha(e.target.value)} placeholder="abc123" className="mt-1" />
            </div>
            <div>
              <Label>Commit message</Label>
              <Input value={commitMessage} onChange={e => setCommitMessage(e.target.value)} placeholder="Optional note" className="mt-1" />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? <><Loader2 size={14} className="animate-spin mr-1" />Saving…</> : "Save Snapshot"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SnapshotCard({ snapshot, onDelete }: { snapshot: Snapshot; onDelete: (id: number) => void }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <FileCode2 size={18} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-semibold text-sm">{snapshot.appName}</span>
          <SourceBadge source={snapshot.source} />
          {snapshot.commitSha && (
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
              {snapshot.commitSha}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <GitBranch size={11} />{snapshot.repoFullName} @ {snapshot.branch}
          </span>
          {snapshot.fileCount != null && (
            <span className="flex items-center gap-1">
              <FileCode2 size={11} />{snapshot.fileCount} files
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={11} />{timeAgo(snapshot.createdAt)}
          </span>
        </div>
        {snapshot.commitMessage && (
          <p className="text-xs text-muted-foreground mt-1 truncate italic">"{snapshot.commitMessage}"</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {snapshot.downloadUrl && (
          <a
            href={snapshot.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Download snapshot zip"
          >
            <Download size={14} />
          </a>
        )}
        <button
          onClick={() => onDelete(snapshot.id)}
          className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
          title="Delete snapshot"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function CodeVaultPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [search, setSearch]       = useState("");
  const [filterApp, setFilterApp] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const h = await authHeaders();
      const r = await fetch(`${API_BASE}/api/code-vault`, { headers: h, credentials: "include" });
      if (r.ok) setSnapshots(await r.json() as Snapshot[]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number) {
    const h = await authHeaders();
    await fetch(`${API_BASE}/api/code-vault/${id}`, { method: "DELETE", headers: h, credentials: "include" });
    setSnapshots(prev => prev.filter(s => s.id !== id));
  }

  const apps = ["all", ...Array.from(new Set(snapshots.map(s => s.appName)))];

  const filtered = snapshots.filter(s => {
    const matchApp = filterApp === "all" || s.appName === filterApp;
    const matchSearch = !search || s.appName.toLowerCase().includes(search.toLowerCase()) ||
      s.repoFullName.toLowerCase().includes(search.toLowerCase()) ||
      (s.commitMessage ?? "").toLowerCase().includes(search.toLowerCase());
    return matchApp && matchSearch;
  });

  const autoCount   = snapshots.filter(s => s.source === "webhook").length;
  const manualCount = snapshots.filter(s => s.source === "manual").length;
  const appCount    = new Set(snapshots.map(s => s.appName)).size;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Archive size={22} className="text-primary" />
            <h1 className="text-2xl font-bold">Code Vault</h1>
          </div>
          <p className="text-muted-foreground text-sm">Every version of your code — automatically saved on every push, forever available to download or restore.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw size={14} className="mr-1" />Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} className="mr-1" />Save Snapshot
          </Button>
        </div>
      </div>

      {/* Stats */}
      {snapshots.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total snapshots", value: snapshots.length },
            { label: "Apps protected",  value: appCount },
            { label: "Auto-saved",      value: autoCount },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Webhook setup info */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><GitBranch size={15} />Auto-Save Setup</h3>
        <p className="text-xs text-muted-foreground mb-2">
          Add this webhook to your Forgejo repos to automatically save a snapshot on every push:
        </p>
        <div className="rounded-md bg-muted/40 border border-border p-2 font-mono text-xs flex items-center justify-between gap-2">
          <span className="truncate">{API_BASE}/api/code-vault/webhook</span>
          <button
            onClick={() => navigator.clipboard.writeText(`${API_BASE}/api/code-vault/webhook`)}
            className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <Download size={12} />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          In Forgejo: repo → Settings → Webhooks → Add Webhook → Gitea → paste URL → Push Events → Save.
        </p>
      </div>

      {/* Filters */}
      {snapshots.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search snapshots…" className="pl-9" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {apps.map(app => (
              <button key={app} onClick={() => setFilterApp(app)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                  filterApp === app
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}>
                {app === "all" ? "All apps" : app}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Snapshot list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Archive size={40} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium mb-1">No snapshots yet</p>
          <p className="text-sm mb-4">Save a manual snapshot or set up the Forgejo webhook to auto-save on every push.</p>
          <Button onClick={() => setShowAdd(true)}><Plus size={14} className="mr-1" />Save First Snapshot</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">No snapshots match your filter.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <SnapshotCard key={s.id} snapshot={s} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showAdd && (
        <SaveSnapshotDialog
          onClose={() => setShowAdd(false)}
          onSaved={s => setSnapshots(prev => [s, ...prev])}
        />
      )}
    </div>
  );
}
