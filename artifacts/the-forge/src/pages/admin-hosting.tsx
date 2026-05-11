import { useState, useEffect, useCallback } from "react";
import { Server, Users, CheckCircle2, Clock, XCircle, RefreshCw, Loader2, Plus, AlertCircle, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@workspace/api-client-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

async function authFetch(path: string, opts?: RequestInit) {
  const token = await getAuthToken();
  return fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...opts,
  });
}

interface HostedUser {
  id: number;
  userId: string;
  plan: string;
  status: string;
  subdomain: string | null;
  coolifyTeamId: string | null;
  coolifyUrl: string;
  requestNote: string | null;
  notes: string | null;
  requestedAt: string;
  provisionedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  suspended: "bg-red-500/15 text-red-400 border-red-500/30",
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-muted-foreground hover:text-foreground p-1 transition-colors">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

function UserCard({ user, onRefresh }: { user: HostedUser; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [subdomain, setSubdomain] = useState(user.subdomain ?? "");
  const [notes, setNotes] = useState(user.notes ?? "");
  const [error, setError] = useState("");

  async function provision() {
    setProvisioning(true); setError("");
    try {
      const r = await authFetch(`/api/admin/hosted-users/${user.userId}/provision`, {
        method: "POST",
        body: JSON.stringify({ subdomain: subdomain.trim() || undefined, notes: notes.trim() || undefined }),
      });
      const data = await r.json() as { ok?: boolean; error?: string };
      if (!r.ok) { setError(data.error ?? "Failed"); setProvisioning(false); return; }
      onRefresh();
    } catch { setError("Network error"); }
    setProvisioning(false);
  }

  async function updateStatus(action: "suspend" | "activate") {
    try {
      await authFetch(`/api/admin/hosted-users/${user.userId}/${action}`, { method: "POST" });
      onRefresh();
    } catch { /* ignore */ }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Users size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono text-muted-foreground truncate max-w-[200px]">{user.userId}</span>
              <Badge variant="outline" className={cn("text-[10px] border", STATUS_COLORS[user.status] ?? "")}>
                {user.status}
              </Badge>
              <Badge variant="outline" className="text-[10px]">{user.plan}</Badge>
            </div>
            {user.subdomain && <p className="text-xs text-primary">{user.subdomain}.13moonforge.ai</p>}
            {user.requestNote && <p className="text-xs text-muted-foreground mt-0.5 italic">"{user.requestNote}"</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground hidden sm:block">
            {new Date(user.requestedAt).toLocaleDateString()}
          </span>
          <button onClick={() => setExpanded(v => !v)} className="p-1.5 hover:bg-muted rounded transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
          {user.coolifyTeamId && (
            <div className="flex items-center gap-2 text-xs bg-muted/30 rounded-lg p-3">
              <Server size={12} className="text-green-400" />
              <span className="text-muted-foreground">Team ID:</span>
              <span className="font-mono text-foreground">{user.coolifyTeamId}</span>
              <CopyBtn text={user.coolifyTeamId} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Subdomain</Label>
              <div className="flex items-center gap-1">
                <Input
                  value={subdomain}
                  onChange={e => setSubdomain(e.target.value)}
                  placeholder="username"
                  className="h-8 text-xs font-mono"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">.13moonforge.ai</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Admin Notes</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." className="h-8 text-xs" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
              <AlertCircle size={13} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {user.status === "pending" && (
              <Button size="sm" onClick={provision} disabled={provisioning} className="h-8 text-xs">
                {provisioning ? <><Loader2 size={12} className="mr-1.5 animate-spin" />Provisioning...</> : <><CheckCircle2 size={12} className="mr-1.5" />Provision</>}
              </Button>
            )}
            {user.status === "active" && (
              <Button size="sm" variant="outline" onClick={() => updateStatus("suspend")} className="h-8 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10">
                Suspend
              </Button>
            )}
            {user.status === "suspended" && (
              <Button size="sm" variant="outline" onClick={() => updateStatus("activate")} className="h-8 text-xs text-green-400 border-green-500/30 hover:bg-green-500/10">
                Reactivate
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminHostingPage() {
  const [users, setUsers] = useState<HostedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "suspended">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [adminRes, usersRes] = await Promise.all([
        authFetch("/api/admin/check"),
        authFetch("/api/admin/hosted-users"),
      ]);
      const adminData = await adminRes.json() as { isAdmin: boolean };
      setIsAdmin(adminData.isAdmin);
      if (adminData.isAdmin && usersRes.ok) {
        const data = await usersRes.json() as HostedUser[];
        setUsers(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 size={24} className="animate-spin text-primary" />
    </div>
  );

  if (!isAdmin) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="text-center space-y-2">
        <XCircle size={32} className="text-red-400 mx-auto" />
        <p className="font-semibold">Access Denied</p>
        <p className="text-sm text-muted-foreground">Admin access required.</p>
      </div>
    </div>
  );

  const pending = users.filter(u => u.status === "pending");
  const active = users.filter(u => u.status === "active");
  const suspended = users.filter(u => u.status === "suspended");

  const shown = filter === "all" ? users
    : filter === "pending" ? pending
    : filter === "active" ? active
    : suspended;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Server size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Forge Hosting</h1>
            <p className="text-sm text-muted-foreground">Manage users on your Coolify server</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={load} className="h-8 text-xs gap-1.5">
          <RefreshCw size={12} />Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", count: pending.length, color: "text-yellow-400", icon: Clock },
          { label: "Active", count: active.length, color: "text-green-400", icon: CheckCircle2 },
          { label: "Suspended", count: suspended.length, color: "text-red-400", icon: XCircle },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4 text-center">
              <Icon size={20} className={cn("mx-auto mb-1", stat.color)} />
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.count}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5">
        {(["all", "pending", "active", "suspended"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors border",
              filter === f ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"
            )}>
            {f} {f !== "all" && `(${users.filter(u => u.status === f).length})`}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border">
          <Plus size={24} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No {filter === "all" ? "" : filter} hosting users yet.</p>
          {filter === "all" && <p className="text-xs text-muted-foreground/60 mt-1">When users request hosting, they'll appear here.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(user => (
            <UserCard key={user.id} user={user} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}
