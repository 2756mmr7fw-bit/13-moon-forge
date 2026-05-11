import { useState, useEffect } from "react";
import { HardDrive, Download, RefreshCw, Plus, AlertCircle, CheckCircle, Clock, Trash2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAuthToken } from "@workspace/api-client-react";

interface Backup {
  id: number;
  label: string;
  size: number | null;
  status: "pending" | "running" | "complete" | "error";
  storagePath: string | null;
  createdAt: string;
  completedAt: string | null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function BackupRestorePage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const token = await getAuthToken();
    const res = await fetch("/api/backups", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const json = await res.json() as Backup[];
      setBackups(json);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createBackup() {
    setCreating(true);
    setError(null);
    const token = await getAuthToken();
    const res = await fetch("/api/backups", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ label: `Manual backup — ${new Date().toLocaleString()}` }),
    });
    if (res.ok) {
      const b = await res.json() as Backup;
      setBackups(prev => [b, ...prev]);
    } else {
      const j = await res.json() as { error?: string };
      setError(j.error ?? "Failed to create backup");
    }
    setCreating(false);
  }

  async function deleteBackup(id: number) {
    const token = await getAuthToken();
    await fetch(`/api/backups/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setBackups(prev => prev.filter(b => b.id !== id));
  }

  async function downloadBackup(id: number) {
    const token = await getAuthToken();
    const res = await fetch(`/api/backups/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${id}.sql`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function restore(id: number) {
    if (!confirm("Restore this backup? This will overwrite the current database state.")) return;
    const token = await getAuthToken();
    const res = await fetch(`/api/backups/${id}/restore`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const j = await res.json() as { error?: string };
      setError(j.error ?? "Restore failed");
    }
    await load();
  }

  const statusIcon = (status: Backup["status"]) => {
    if (status === "complete") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === "error") return <AlertCircle className="w-4 h-4 text-destructive" />;
    if (status === "running") return <RefreshCw className="w-4 h-4 text-primary animate-spin" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-primary" />
            Backup & Restore
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and restore database snapshots for your Forge data.
          </p>
        </div>
        <Button onClick={createBackup} disabled={creating} size="sm" className="gap-1">
          {creating
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : <Plus className="w-3.5 h-3.5" />
          }
          {creating ? "Creating…" : "Back up now"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4 flex gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Backups capture your Forge platform data (projects, settings, secrets). For hosted app databases,
            use your Coolify server's built-in backup tools or pg_dump from your app's environment.
          </p>
        </CardContent>
      </Card>

      {backups.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent className="space-y-3">
            <HardDrive className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="font-medium">No backups yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Create a backup at any time. Backups are stored securely and can be downloaded or restored in one click.
            </p>
            <Button size="sm" onClick={createBackup} disabled={creating} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Create your first backup
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {backups.map(b => (
            <Card key={b.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="shrink-0">{statusIcon(b.status)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{b.label}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{new Date(b.createdAt).toLocaleString()}</span>
                    {b.size && <span>{formatBytes(b.size)}</span>}
                    <Badge
                      variant={b.status === "complete" ? "outline" : b.status === "error" ? "destructive" : "secondary"}
                      className="text-xs capitalize"
                    >
                      {b.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {b.status === "complete" && (
                    <>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => downloadBackup(b.id)}
                        className="h-8 w-8 p-0" title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => restore(b.id)}
                        className="h-8 w-8 p-0" title="Restore"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => deleteBackup(b.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
