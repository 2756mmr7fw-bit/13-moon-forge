import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  KeyRound, Plus, Trash2, Eye, EyeOff, Download, Upload, Loader2,
  ChevronDown, ChevronRight, Copy, Check, ShieldCheck, Info, AlertTriangle, RotateCcw,
  RefreshCw, Server, Zap, CloudDownload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@workspace/replit-auth-web";
import { Link } from "wouter";
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const MIGRATION_KEY = "13moonforge_secrets_migrated";

function getAnonUserId() {
  let id = localStorage.getItem("13moonforge_user_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("13moonforge_user_id", id); }
  return id;
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return { "Content-Type": "application/json", "x-user-id": getAnonUserId(), ...extra };
}

// ─── Common third-party service providers ─────────────────────────────────────

const KNOWN_PROVIDERS = [
  "Cloudflare", "AWS", "DigitalOcean", "Hetzner", "Stripe", "PayPal", "Twilio",
  "SendGrid", "Mailgun", "Postmark", "GitHub", "GitLab", "Bitbucket",
  "OpenAI", "Anthropic", "Google Cloud", "Azure", "Supabase", "PlanetScale",
  "MongoDB Atlas", "Redis Cloud", "Algolia", "Auth0", "Okta",
  "VPN Provider", "Antivirus / Security", "CDN Provider", "DNS Provider",
  "Monitoring / Analytics", "SMS / Notifications", "Other",
];

interface Secret {
  id: number;
  appName: string;
  serviceName: string;
  keyName: string;
  valuePreview: string;
  notes?: string | null;
  createdAt: string;
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );
}

// ─── Add Secret Modal ─────────────────────────────────────────────────────────

function AddSecretModal({ apps, onClose, onAdded }: {
  apps: string[];
  onClose: () => void;
  onAdded: (s: Secret) => void;
}) {
  const [appName, setAppName] = useState(apps[0] ?? "Default");
  const [newApp, setNewApp] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [customService, setCustomService] = useState("");
  const [keyName, setKeyName] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const finalApp = newApp.trim() || appName;
  const finalService = serviceName === "Other" ? customService : serviceName;

  async function handleSave() {
    if (!finalService.trim() || !keyName.trim() || !value.trim()) {
      setError("Service name, key name, and value are all required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const r = await fetch(`${API_BASE}/api/secrets`, {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({ appName: finalApp, serviceName: finalService, keyName, value, notes }),
      });
      const body = await r.json();
      if (!r.ok) { setError(body.error ?? "Save failed"); return; }
      onAdded(body as Secret);
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={16} className="text-primary" /> Add API Key
          </DialogTitle>
          <DialogDescription>Keys are encrypted at rest with AES-256-GCM.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>App / Project</Label>
            <div className="flex gap-2">
              <select
                value={newApp ? "__new__" : appName}
                onChange={e => { if (e.target.value === "__new__") setNewApp(" "); else { setAppName(e.target.value); setNewApp(""); } }}
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {apps.map(a => <option key={a} value={a}>{a}</option>)}
                <option value="__new__">+ New app…</option>
              </select>
            </div>
            {newApp !== "" && (
              <Input
                autoFocus
                placeholder="App name"
                value={newApp.trim() ? newApp : ""}
                onChange={e => setNewApp(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Service / Provider</Label>
            <select
              value={serviceName}
              onChange={e => setServiceName(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select provider…</option>
              {KNOWN_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {serviceName === "Other" && (
              <Input placeholder="Provider name" value={customService} onChange={e => setCustomService(e.target.value)} />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Key Name <span className="text-muted-foreground font-normal text-xs">(e.g. API_KEY, CLIENT_ID)</span></Label>
            <Input
              placeholder="MY_SERVICE_API_KEY"
              value={keyName}
              onChange={e => setKeyName(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Value <span className="text-muted-foreground font-normal text-xs">(encrypted before saving)</span></Label>
            <Input
              type="password"
              placeholder="sk-••••••••••••••••"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
            <Input placeholder="e.g. Production key, expires 2026-01-01" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={14} className="animate-spin mr-1.5" />Saving…</> : "Save Key"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Import .env Modal ────────────────────────────────────────────────────────

function ImportModal({ apps, onClose, onImported }: {
  apps: string[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [appName, setAppName] = useState(apps[0] ?? "Default");
  const [newApp, setNewApp] = useState("");
  const [serviceName, setServiceName] = useState("Imported");
  const [envText, setEnvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setEnvText(ev.target?.result as string ?? "");
    reader.readAsText(f);
  }

  async function handleImport() {
    if (!envText.trim()) return;
    setLoading(true);
    setResult(null);
    const finalApp = newApp.trim() || appName;
    try {
      const r = await fetch(`${API_BASE}/api/secrets/import`, {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({ appName: finalApp, serviceName, envText }),
      });
      const body = await r.json();
      if (r.ok && body.ok) {
        setResult({ ok: true, message: `Imported ${body.count} key${body.count !== 1 ? "s" : ""} successfully.` });
        onImported();
      } else {
        setResult({ ok: false, message: body.error ?? "Import failed" });
      }
    } catch {
      setResult({ ok: false, message: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={16} className="text-primary" /> Import .env File
          </DialogTitle>
          <DialogDescription>
            Paste the contents of your .env file or upload it. Keys are encrypted before being stored.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>App</Label>
              <select
                value={newApp ? "__new__" : appName}
                onChange={e => { if (e.target.value === "__new__") setNewApp(" "); else { setAppName(e.target.value); setNewApp(""); } }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {apps.map(a => <option key={a} value={a}>{a}</option>)}
                <option value="__new__">+ New app…</option>
              </select>
              {newApp !== "" && <Input placeholder="App name" value={newApp.trim() ? newApp : ""} onChange={e => setNewApp(e.target.value)} />}
            </div>
            <div className="space-y-1.5">
              <Label>Label as service</Label>
              <Input placeholder="e.g. Imported, Stripe, AWS" value={serviceName} onChange={e => setServiceName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Paste .env contents</Label>
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Upload size={11} /> Upload file
              </button>
              <input ref={fileRef} type="file" accept=".env,.txt" className="hidden" onChange={handleFileLoad} />
            </div>
            <Textarea
              className="font-mono text-xs min-h-[140px] resize-none"
              placeholder={"STRIPE_SECRET_KEY=sk_live_...\nOPENAI_API_KEY=sk-...\n# Comments are ignored"}
              value={envText}
              onChange={e => setEnvText(e.target.value)}
            />
          </div>

          {result && (
            <div className={cn(
              "rounded-lg p-3 text-sm flex items-start gap-2",
              result.ok ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400",
            )}>
              {result.message}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{result?.ok ? "Close" : "Cancel"}</Button>
            {!result?.ok && (
              <Button onClick={handleImport} disabled={loading || !envText.trim()}>
                {loading ? <><Loader2 size={14} className="animate-spin mr-1.5" />Importing…</> : "Import"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Secret Row ───────────────────────────────────────────────────────────────

function SecretRow({ secret, onDelete }: { secret: Secret; onDelete: (id: number) => void }) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleReveal() {
    if (revealed) { setRevealed(null); return; }
    setRevealing(true);
    try {
      const r = await fetch(`${API_BASE}/api/secrets/${secret.id}/reveal`, { headers: await headers() });
      const body = await r.json();
      if (r.ok) setRevealed(body.value);
    } finally {
      setRevealing(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/30 group">
        <KeyRound size={13} className="text-muted-foreground shrink-0" />
        <code className="text-xs font-mono font-semibold flex-1 truncate">{secret.keyName}</code>
        <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
          {revealed ?? secret.valuePreview}
        </div>
        {secret.notes && (
          <span title={secret.notes} className="text-muted-foreground/50 cursor-help shrink-0">
            <Info size={11} />
          </span>
        )}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {revealed && <CopyButton text={revealed} />}
          <button
            onClick={handleReveal}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={revealed ? "Hide" : "Reveal"}
          >
            {revealing ? <Loader2 size={13} className="animate-spin" /> : revealed ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1 rounded hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {secret.keyName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the secret. You'll need to re-enter it to get it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={async () => {
                await fetch(`${API_BASE}/api/secrets/${secret.id}`, { method: "DELETE", headers: await headers() });
                onDelete(secret.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Coolify Sync Dialog ──────────────────────────────────────────────────────

function CoolifySyncDialog({ appName, onClose }: { appName: string; onClose: () => void }) {
  const [coolifyUuid, setCoolifyUuid] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ succeeded?: number; total?: number; error?: string } | null>(null);

  async function sync() {
    if (!coolifyUuid.trim()) return;
    setSyncing(true); setResult(null);
    try {
      const r = await fetch(`${API_BASE}/api/secrets/push-app-to-coolify`, {
        method: "POST", headers: await headers(),
        body: JSON.stringify({ appName, coolifyAppUuid: coolifyUuid.trim() }),
      });
      const d = await r.json() as { succeeded?: number; total?: number; error?: string };
      setResult(d);
    } catch { setResult({ error: "Network error — try again." }); }
    finally { setSyncing(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw size={16} /> Push to Coolify — {appName}
          </DialogTitle>
          <DialogDescription>
            Push all secrets for <strong>{appName}</strong> as environment variables to a Coolify app. The app must be redeployed after syncing for changes to take effect.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <Label>Coolify App UUID</Label>
            <Input
              value={coolifyUuid}
              onChange={e => setCoolifyUuid(e.target.value)}
              placeholder="e.g. kerhwzsawrxbvvldfdkvmuem"
              className="mt-1 font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Find this in Coolify → your app → Settings → UUID at the top.
            </p>
          </div>

          {result && !result.error && (
            <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
              <ShieldCheck size={14} className="inline mr-1" />
              {result.succeeded}/{result.total} keys pushed to Coolify. Redeploy the app for changes to apply.
            </div>
          )}
          {result?.error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              <AlertTriangle size={14} className="inline mr-1" />
              {result.error}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={sync} disabled={syncing || !coolifyUuid.trim()} className="flex-1">
              {syncing ? <><Loader2 size={14} className="animate-spin mr-1" />Syncing…</> : "Push to Coolify"}
            </Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── App Group ────────────────────────────────────────────────────────────────

function AppGroup({ appName, secrets, onDelete, onExport }: {
  appName: string;
  secrets: Secret[];
  onDelete: (id: number) => void;
  onExport: (appName: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [showCoolifySync, setShowCoolifySync] = useState(false);

  const byService = secrets.reduce<Record<string, Secret[]>>((acc, s) => {
    if (!acc[s.serviceName]) acc[s.serviceName] = [];
    acc[s.serviceName].push(s);
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="font-semibold text-sm">{appName}</span>
          <Badge variant="secondary" className="text-[10px] h-4">{secrets.length} key{secrets.length !== 1 ? "s" : ""}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); setShowCoolifySync(true); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
            title="Push all secrets for this app to Coolify as env vars"
          >
            <RotateCcw size={12} /> Sync to Coolify
          </button>
          <button
            onClick={e => { e.stopPropagation(); onExport(appName); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
          >
            <Download size={12} /> Export .env
          </button>
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-2 pb-2">
          {Object.entries(byService).map(([service, keys]) => (
            <div key={service} className="mt-3">
              <div className="px-3 mb-1 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{service}</span>
              </div>
              {keys.map(s => <SecretRow key={s.id} secret={s} onDelete={onDelete} />)}
            </div>
          ))}
        </div>
      )}

      {showCoolifySync && (
        <CoolifySyncDialog appName={appName} onClose={() => setShowCoolifySync(false)} />
      )}
    </div>
  );
}

// ─── Coolify Pull Panel ───────────────────────────────────────────────────────

interface SyncStatus {
  coolify: { connected: boolean; url: string | null; name: string | null; appCount: number };
  secrets: { total: number; fromCoolify: number };
}

function CoolifyPullPanel({ onPulled }: { onPulled: () => void }) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ saved: number; skipped: number; totalApps: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/auto-sync/status`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStatus(data as SyncStatus); })
      .catch(() => {});
  }, [result]);

  async function handlePull(force = false) {
    setSyncing(true);
    setError("");
    setResult(null);
    try {
      const r = await fetch(`${API_BASE}/api/auto-sync/pull-coolify-envs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ force }),
      });
      const data = await r.json() as { ok?: boolean; saved?: number; skipped?: number; totalApps?: number; error?: string };
      if (!r.ok) { setError(data.error ?? "Sync failed"); return; }
      setResult({ saved: data.saved ?? 0, skipped: data.skipped ?? 0, totalApps: data.totalApps ?? 0 });
      if ((data.saved ?? 0) > 0) onPulled();
    } catch {
      setError("Network error — try again");
    } finally {
      setSyncing(false);
    }
  }

  if (!status) return null;
  if (!status.coolify.connected) return null;

  return (
    <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-lg bg-blue-500/15 p-2">
          <Server size={16} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-blue-300 flex items-center gap-1.5">
                <Zap size={13} /> Auto-Sync from Coolify
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connected to <span className="text-blue-400 font-medium">{status.coolify.name ?? status.coolify.url}</span>
                {" · "}{status.coolify.appCount} app{status.coolify.appCount !== 1 ? "s" : ""}
                {" · "}{status.secrets.fromCoolify} key{status.secrets.fromCoolify !== 1 ? "s" : ""} already synced
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-blue-500/30 text-blue-300 hover:bg-blue-500/10 text-xs"
                onClick={() => handlePull(false)}
                disabled={syncing}
              >
                {syncing ? <Loader2 size={12} className="animate-spin" /> : <CloudDownload size={12} />}
                Pull New Keys
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-blue-500/20 text-blue-400/70 hover:bg-blue-500/10 text-xs"
                onClick={() => handlePull(true)}
                disabled={syncing}
              >
                <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
                Force Refresh All
              </Button>
            </div>
          </div>

          {result && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
              <Check size={13} className="text-green-400 shrink-0" />
              <span className="text-xs text-green-300">
                Synced {result.totalApps} app{result.totalApps !== 1 ? "s" : ""} —{" "}
                <strong>{result.saved}</strong> key{result.saved !== 1 ? "s" : ""} saved
                {result.skipped > 0 ? `, ${result.skipped} already up-to-date` : ""}
              </span>
            </div>
          )}
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SecretsVault() {
  const { isAuthenticated } = useAuth();
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const apps = [...new Set(secrets.map(s => s.appName))];
  if (!apps.includes("Default")) apps.unshift("Default");

  const loadSecrets = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/secrets`, { headers: await headers() });
      if (r.ok) setSecrets(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      // Migrate localStorage-UUID secrets to Clerk userId on first sign-in
      if (isAuthenticated) {
        
        const anonId = localStorage.getItem("13moonforge_user_id");
        const migrationDone = localStorage.getItem(MIGRATION_KEY);
        if (anonId && !migrationDone) {
          try {
            await fetch(`${API_BASE}/api/secrets/migrate`, {
              method: "POST",
              headers: { "Content-Type": "application/json",  },
              body: JSON.stringify({ anonUserId: anonId }),
            });
            localStorage.setItem(MIGRATION_KEY, "done");
          } catch {
            // best-effort — don't block loading
          }
        }
      }
      await loadSecrets();
    }
    init();
  }, [isAuthenticated]);

  function handleDelete(id: number) {
    setSecrets(prev => prev.filter(s => s.id !== id));
  }

  function handleAdded(s: Secret) {
    setSecrets(prev => [...prev, s]);
  }

  async function handleExport(appName: string) {
    const url = `${API_BASE}/api/secrets/export?appName=${encodeURIComponent(appName)}`;
    const r = await fetch(url, { headers: await headers() });
    const text = await r.text();
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${appName.replace(/\s+/g, "-")}.env`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const byApp = secrets.reduce<Record<string, Secret[]>>((acc, s) => {
    if (!acc[s.appName]) acc[s.appName] = [];
    acc[s.appName].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {showAdd && <AddSecretModal apps={apps} onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
      {showImport && <ImportModal apps={apps} onClose={() => setShowImport(false)} onImported={loadSecrets} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <KeyRound size={28} className="text-primary" /> Secrets Vault
          </h1>
          <p className="text-muted-foreground mt-1">
            Store API keys for the third-party services your apps depend on. Encrypted at rest, exportable as .env.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setShowImport(true)} className="gap-1.5">
            <Upload size={14} /> Import .env
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus size={14} /> Add Key
          </Button>
        </div>
      </div>

      {/* Coolify auto-sync panel */}
      {isAuthenticated && <CoolifyPullPanel onPulled={loadSecrets} />}

      {/* Rotation warnings */}
      {(() => {
        const now = Date.now();
        const critical = secrets.filter(s => now - new Date(s.createdAt).getTime() > 90 * 86_400_000);
        const warning  = secrets.filter(s => {
          const age = now - new Date(s.createdAt).getTime();
          return age > 60 * 86_400_000 && age <= 90 * 86_400_000;
        });
        if (critical.length === 0 && warning.length === 0) return null;
        return (
          <div className="space-y-2">
            {critical.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/8 p-4">
                <AlertTriangle size={15} className="text-red-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-300">
                    {critical.length} key{critical.length !== 1 ? "s" : ""} over 90 days old — rotation recommended
                  </p>
                  <p className="text-xs text-red-400/70 mt-0.5 truncate">
                    {critical.slice(0, 4).map(s => `${s.serviceName} / ${s.keyName}`).join(" · ")}
                    {critical.length > 4 ? ` · +${critical.length - 4} more` : ""}
                  </p>
                </div>
                <RotateCcw size={13} className="text-red-400/60 shrink-0 mt-0.5" />
              </div>
            )}
            {warning.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
                <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-300">
                    {warning.length} key{warning.length !== 1 ? "s" : ""} between 60–90 days old — consider rotating
                  </p>
                  <p className="text-xs text-amber-400/70 mt-0.5 truncate">
                    {warning.slice(0, 4).map(s => `${s.serviceName} / ${s.keyName}`).join(" · ")}
                    {warning.length > 4 ? ` · +${warning.length - 4} more` : ""}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Security notice */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
        <ShieldCheck size={16} className="text-primary mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold">How your keys are protected</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Every value is encrypted with AES-256-GCM before being written to the database.
            The encryption key is derived from your server's session secret and never stored alongside your data.
            You can export any app's keys as a .env file to use directly in Coolify, Docker, or any hosting platform.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : secrets.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/40">
          <KeyRound size={40} className="mx-auto text-muted-foreground opacity-30 mb-4" />
          <h3 className="font-bold text-lg mb-1">No keys stored yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Add API keys for the third-party services your apps use — VPN, antivirus, email, payments, and more.
            You can also paste the contents of an existing .env file to import in bulk.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setShowImport(true)} className="gap-1.5">
              <Upload size={14} /> Import .env
            </Button>
            <Button onClick={() => setShowAdd(true)} className="gap-1.5">
              <Plus size={14} /> Add First Key
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(byApp).map(([appName, appSecrets]) => (
            <AppGroup
              key={appName}
              appName={appName}
              secrets={appSecrets}
              onDelete={handleDelete}
              onExport={handleExport}
            />
          ))}
        </div>
      )}

      {!isAuthenticated && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm flex items-start gap-3">
          <Info size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-300 mb-1">Sign in to persist keys across devices</p>
            <p className="text-muted-foreground text-xs">
              Right now your keys are saved to your current session only.{" "}
              <Link href="/sign-in" className="text-primary hover:underline">Sign in</Link> to have them available everywhere you use Forge.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
