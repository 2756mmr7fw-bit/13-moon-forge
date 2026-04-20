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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, Show } from "@clerk/react";
import { Link } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getUserId() {
  let id = localStorage.getItem("13moonforge_user_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("13moonforge_user_id", id); }
  return id;
}

function headers(extra?: Record<string, string>) {
  return { "Content-Type": "application/json", "x-user-id": getUserId(), ...extra };
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
        headers: headers(),
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
        headers: headers(),
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
      const r = await fetch(`${API_BASE}/api/secrets/${secret.id}/reveal`, { headers: headers() });
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
                await fetch(`${API_BASE}/api/secrets/${secret.id}`, { method: "DELETE", headers: headers() });
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

// ─── App Group ────────────────────────────────────────────────────────────────

function AppGroup({ appName, secrets, onDelete, onExport }: {
  appName: string;
  secrets: Secret[];
  onDelete: (id: number) => void;
  onExport: (appName: string) => void;
}) {
  const [open, setOpen] = useState(true);

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
        <button
          onClick={e => { e.stopPropagation(); onExport(appName); }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
        >
          <Download size={12} /> Export .env
        </button>
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
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SecretsVault() {
  const { isSignedIn } = useUser();
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const apps = [...new Set(secrets.map(s => s.appName))];
  if (!apps.includes("Default")) apps.unshift("Default");

  const loadSecrets = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/secrets`, { headers: headers() });
      if (r.ok) setSecrets(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSecrets(); }, []);

  function handleDelete(id: number) {
    setSecrets(prev => prev.filter(s => s.id !== id));
  }

  function handleAdded(s: Secret) {
    setSecrets(prev => [...prev, s]);
  }

  async function handleExport(appName: string) {
    const url = `${API_BASE}/api/secrets/export?appName=${encodeURIComponent(appName)}`;
    const r = await fetch(url, { headers: headers() });
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

      <Show when="signed-out">
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
      </Show>
    </div>
  );
}
