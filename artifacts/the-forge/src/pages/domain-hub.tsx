import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Globe, Plus, Trash2, RefreshCw, Loader2, ExternalLink,
  AlertTriangle, CheckCircle2, Clock, XCircle, Shield, Copy, Check,
  Server, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@workspace/api-client-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

interface Domain {
  id: number;
  domain: string;
  registrar?: string | null;
  expiresAt?: string | null;
  reminderDaysBefore?: number | null;
  connectedAppName?: string | null;
  connectedAppUrl?: string | null;
  expectedIp?: string | null;
  resolvedIp?: string | null;
  dnsStatus: string;
  sslStatus: string;
  notes?: string | null;
  lastCheckedAt?: string | null;
  createdAt: string;
}

function DnsStatusDot({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    live:        { color: "bg-green-400",  label: "Live" },
    mismatch:    { color: "bg-yellow-400", label: "DNS mismatch" },
    propagating: { color: "bg-orange-400", label: "Propagating" },
    not_found:   { color: "bg-red-400",    label: "Not found" },
    error:       { color: "bg-red-400",    label: "Error" },
    unreachable: { color: "bg-red-400",    label: "Unreachable" },
    unknown:     { color: "bg-zinc-500",   label: "Not checked" },
  };
  const s = map[status] ?? map.unknown;
  return (
    <span className="flex items-center gap-1.5" title={s.label}>
      <span className={cn("w-2.5 h-2.5 rounded-full", s.color)} />
      <span className="text-xs text-muted-foreground">{s.label}</span>
    </span>
  );
}

function SslBadge({ status }: { status: string }) {
  if (status === "ok") return <Badge variant="outline" className="text-green-400 border-green-400/30 text-[10px]"><Shield size={10} className="mr-1" />SSL OK</Badge>;
  if (status === "unreachable") return <Badge variant="outline" className="text-red-400 border-red-400/30 text-[10px]"><Shield size={10} className="mr-1" />No SSL</Badge>;
  return <Badge variant="outline" className="text-zinc-500 border-zinc-700 text-[10px]"><Shield size={10} className="mr-1" />SSL ?</Badge>;
}

function expiryWarning(expiresAt: string | null | undefined): { label: string; color: string } | null {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { label: "Expired!", color: "text-red-400" };
  if (days <= 14) return { label: `Expires in ${days}d`, color: "text-red-400" };
  if (days <= 30) return { label: `Expires in ${days}d`, color: "text-orange-400" };
  if (days <= 60) return { label: `Expires in ${days}d`, color: "text-yellow-400" };
  return { label: `Expires ${new Date(expiresAt).toLocaleDateString()}`, color: "text-muted-foreground" };
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

function AddDomainDialog({ onClose, onAdded }: { onClose: () => void; onAdded: (d: Domain) => void }) {
  const [domain, setDomain]     = useState("");
  const [registrar, setRegistrar] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [reminderDays, setReminderDays] = useState("30");
  const [appName, setAppName]   = useState("");
  const [appUrl, setAppUrl]     = useState("");
  const [expectedIp, setExpectedIp] = useState("");
  const [notes, setNotes]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  async function save() {
    if (!domain.trim()) { setError("Domain is required"); return; }
    setSaving(true); setError("");
    try {
      const h = await authHeaders();
      const r = await fetch(`${API_BASE}/api/domains`, {
        method: "POST", headers: h, credentials: "include",
        body: JSON.stringify({
          domain: domain.trim(), registrar: registrar || null,
          expiresAt: expiresAt || null,
          reminderDaysBefore: Number(reminderDays) || 30,
          connectedAppName: appName || null,
          connectedAppUrl: appUrl || null, expectedIp: expectedIp || null, notes: notes || null,
        }),
      });
      if (!r.ok) throw new Error("Failed");
      const d = await r.json() as Domain;
      onAdded(d);
      onClose();
    } catch { setError("Failed to save domain. Try again."); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Globe size={18} />Add Domain</DialogTitle>
          <DialogDescription>Track a domain — get expiry alerts, DNS status, and SSL monitoring.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div>
            <Label>Domain name *</Label>
            <Input value={domain} onChange={e => setDomain(e.target.value)} placeholder="13moonforge.ai" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Registrar</Label>
              <Input value={registrar} onChange={e => setRegistrar(e.target.value)} placeholder="GoDaddy" className="mt-1" />
            </div>
            <div>
              <Label>Expiry date</Label>
              <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Remind me (days before expiry)</Label>
            <Input type="number" min="1" max="365" value={reminderDays} onChange={e => setReminderDays(e.target.value)} placeholder="30" className="mt-1" />
            <p className="text-[11px] text-muted-foreground mt-1">Alert shows in Domain Hub this many days before the domain expires.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Connected app</Label>
              <Input value={appName} onChange={e => setAppName(e.target.value)} placeholder="13 Moon Forge" className="mt-1" />
            </div>
            <div>
              <Label>Expected IP</Label>
              <Input value={expectedIp} onChange={e => setExpectedIp(e.target.value)} placeholder="5.78.154.21" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>App URL</Label>
            <Input value={appUrl} onChange={e => setAppUrl(e.target.value)} placeholder="https://13moonforge.ai" className="mt-1" />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..." className="mt-1" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? <><Loader2 size={14} className="animate-spin mr-1" />Saving…</> : "Add Domain"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DomainCard({ domain, onDelete, onCheck }: {
  domain: Domain;
  onDelete: (id: number) => void;
  onCheck: (id: number) => Promise<void>;
}) {
  const [checking, setChecking] = useState(false);
  const expiry = expiryWarning(domain.expiresAt);

  async function runCheck() {
    setChecking(true);
    await onCheck(domain.id);
    setChecking(false);
  }

  const registrarLinks: Record<string, string> = {
    godaddy: "https://dcc.godaddy.com/manage/dns",
    namecheap: "https://ap.www.namecheap.com/domains/list",
    cloudflare: "https://dash.cloudflare.com",
  };
  const registrarLower = (domain.registrar ?? "").toLowerCase();
  const registrarLink = Object.entries(registrarLinks).find(([k]) => registrarLower.includes(k))?.[1];

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{domain.domain}</span>
            <SslBadge status={domain.sslStatus} />
          </div>
          {domain.connectedAppName && (
            <div className="flex items-center gap-1 mt-0.5">
              <Server size={11} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{domain.connectedAppName}</span>
              {domain.connectedAppUrl && (
                <a href={domain.connectedAppUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={runCheck} disabled={checking} title="Run DNS + SSL check"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            {checking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
          <a href={`https://${domain.domain}`} target="_blank" rel="noreferrer"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink size={14} />
          </a>
          <button onClick={() => onDelete(domain.id)} title="Remove domain"
            className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <DnsStatusDot status={domain.dnsStatus} />
        {domain.resolvedIp && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>→ {domain.resolvedIp}</span>
            <CopyBtn text={domain.resolvedIp} />
          </span>
        )}
        {expiry && (
          <span className={cn("flex items-center gap-1 text-xs", expiry.color)}>
            <Calendar size={11} />{expiry.label}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {domain.registrar && (
          <span className="flex items-center gap-1">
            Registrar: {registrarLink
              ? <a href={registrarLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">{domain.registrar}</a>
              : domain.registrar}
          </span>
        )}
        {domain.expectedIp && (
          <span className="flex items-center gap-1">
            Expected: {domain.expectedIp}
            <CopyBtn text={domain.expectedIp} />
          </span>
        )}
        {domain.lastCheckedAt && (
          <span>Checked: {new Date(domain.lastCheckedAt).toLocaleString()}</span>
        )}
      </div>

      {domain.expectedIp && domain.resolvedIp && domain.resolvedIp !== domain.expectedIp && (
        <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 p-2 text-xs text-yellow-400 flex items-start gap-2">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>DNS mismatch — resolved to <strong>{domain.resolvedIp}</strong> but expected <strong>{domain.expectedIp}</strong>. Update your A record at your registrar.</span>
        </div>
      )}

      {expiry && (expiry.color === "text-red-400" || expiry.color === "text-orange-400") && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400 flex items-start gap-2">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>{expiry.label} — renew at {registrarLink
            ? <a href={registrarLink} target="_blank" rel="noreferrer" className="underline">{domain.registrar ?? "your registrar"}</a>
            : (domain.registrar ?? "your registrar")
          } to prevent downtime.</span>
        </div>
      )}

      {domain.notes && (
        <p className="text-xs text-muted-foreground italic">{domain.notes}</p>
      )}
    </div>
  );
}

export default function DomainHub() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [reminders, setReminders] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const h = await authHeaders();
      const [domainsRes, remindersRes] = await Promise.all([
        fetch(`${API_BASE}/api/domains`, { headers: h, credentials: "include" }),
        fetch(`${API_BASE}/api/domains/reminders`, { headers: h, credentials: "include" }),
      ]);
      if (domainsRes.ok) setDomains(await domainsRes.json() as Domain[]);
      if (remindersRes.ok) setReminders(await remindersRes.json() as Domain[]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCheck(id: number) {
    const h = await authHeaders();
    const r = await fetch(`${API_BASE}/api/domains/${id}/check`, { method: "POST", headers: h, credentials: "include" });
    if (r.ok) {
      const updated = await r.json() as Domain;
      setDomains(prev => prev.map(d => d.id === id ? updated : d));
    }
  }

  async function handleDelete(id: number) {
    const h = await authHeaders();
    await fetch(`${API_BASE}/api/domains/${id}`, { method: "DELETE", headers: h, credentials: "include" });
    setDomains(prev => prev.filter(d => d.id !== id));
  }

  async function checkAll() {
    setCheckingAll(true);
    await Promise.all(domains.map(d => handleCheck(d.id)));
    setCheckingAll(false);
  }

  const live    = domains.filter(d => d.dnsStatus === "live");
  const warning = domains.filter(d => ["mismatch", "error", "not_found"].includes(d.dnsStatus));
  const unknown = domains.filter(d => d.dnsStatus === "unknown" || d.dnsStatus === "propagating" || d.dnsStatus === "unreachable");

  const expiringSoon = domains.filter(d => {
    if (!d.expiresAt) return false;
    const days = Math.ceil((new Date(d.expiresAt).getTime() - Date.now()) / 86400000);
    return days <= 60;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Renewal reminder banner */}
      {reminders.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-red-400 text-sm mb-1">
                {reminders.length === 1 ? "1 domain needs renewal" : `${reminders.length} domains need renewal`}
              </p>
              <ul className="space-y-1">
                {reminders.map(d => {
                  const days = d.expiresAt
                    ? Math.ceil((new Date(d.expiresAt).getTime() - Date.now()) / 86400000)
                    : null;
                  const registrarLinks: Record<string, string> = {
                    godaddy: "https://dcc.godaddy.com/manage/dns",
                    namecheap: "https://ap.www.namecheap.com/domains/list",
                    cloudflare: "https://dash.cloudflare.com",
                  };
                  const regLower = (d.registrar ?? "").toLowerCase();
                  const regLink = Object.entries(registrarLinks).find(([k]) => regLower.includes(k))?.[1];
                  return (
                    <li key={d.id} className="text-xs text-red-300 flex items-center gap-2 flex-wrap">
                      <span className="font-mono">{d.domain}</span>
                      {days !== null && (
                        <span className={days < 0 ? "text-red-400 font-semibold" : "text-orange-400"}>
                          {days < 0 ? "EXPIRED" : `expires in ${days}d`}
                        </span>
                      )}
                      {(d.registrar || regLink) && (
                        <span className="text-muted-foreground">
                          — renew at{" "}
                          {regLink
                            ? <a href={regLink} target="_blank" rel="noreferrer" className="text-primary underline">{d.registrar ?? "registrar"}</a>
                            : d.registrar}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={22} className="text-primary" />
            <h1 className="text-2xl font-bold">Domain Hub</h1>
          </div>
          <p className="text-muted-foreground text-sm">Track all your domains — DNS status, SSL health, expiry alerts, and which app each one points to.</p>
        </div>
        <div className="flex gap-2">
          {domains.length > 0 && (
            <Button variant="outline" size="sm" onClick={checkAll} disabled={checkingAll}>
              {checkingAll ? <><Loader2 size={14} className="animate-spin mr-1" />Checking…</> : <><RefreshCw size={14} className="mr-1" />Check All</>}
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} className="mr-1" />Add Domain
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      {domains.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total domains", value: domains.length, icon: Globe, color: "text-foreground" },
            { label: "Live",          value: live.length,    icon: CheckCircle2, color: "text-green-400" },
            { label: "Issues",        value: warning.length, icon: XCircle,      color: warning.length ? "text-red-400" : "text-muted-foreground" },
            { label: "Expiring soon", value: expiringSoon.length, icon: Clock,  color: expiringSoon.length ? "text-orange-400" : "text-muted-foreground" },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-3 text-center">
              <s.icon size={18} className={cn("mx-auto mb-1", s.color)} />
              <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* DNS setup card */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Server size={15} />DNS Setup Reference</h3>
        <p className="text-xs text-muted-foreground mb-3">For any app on the VPS at <strong>5.78.154.21</strong>, use these records:</p>
        <div className="rounded-md bg-muted/40 border border-border p-3 font-mono text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-14">Type</span>
            <span className="text-muted-foreground w-16">Name</span>
            <span className="text-muted-foreground flex-1">Value</span>
          </div>
          <div className="border-t border-border pt-1 flex items-center gap-2">
            <span className="w-14 text-primary">A</span>
            <span className="w-16">@</span>
            <span className="flex-1 flex items-center gap-1">5.78.154.21 <CopyBtn text="5.78.154.21" /></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14 text-primary">A</span>
            <span className="w-16">www</span>
            <span className="flex-1 flex items-center gap-1">5.78.154.21 <CopyBtn text="5.78.154.21" /></span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">⚠️ If using Cloudflare, set proxy to "DNS only" (grey cloud) on both records — the orange proxy blocks SSL certificate generation.</p>
      </div>

      {/* Domain cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : domains.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Globe size={40} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium mb-1">No domains tracked yet</p>
          <p className="text-sm mb-4">Add your first domain to start monitoring DNS, SSL, and expiry dates.</p>
          <Button onClick={() => setShowAdd(true)}><Plus size={14} className="mr-1" />Add Domain</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map(d => (
            <DomainCard key={d.id} domain={d} onDelete={handleDelete} onCheck={handleCheck} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddDomainDialog
          onClose={() => setShowAdd(false)}
          onAdded={d => { setDomains(prev => [...prev, d]); }}
        />
      )}
    </div>
  );
}
