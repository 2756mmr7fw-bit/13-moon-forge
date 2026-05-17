import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, CheckCircle2, ArrowUpCircle, Github, Globe, Phone, Mail, ExternalLink, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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

interface SiteBuildRequest {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  tier: string;
  description: string;
  status: "active" | "waitlist" | "completed";
  waitlistPosition: number | null;
  hasGithub: boolean;
  githubUsername: string | null;
  hasDomain: boolean;
  domain: string | null;
  repoUrl: string | null;
  hostingUrl: string | null;
  adminNotes: string | null;
  notifiedEmail: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface Payload {
  requests: SiteBuildRequest[];
  capacity: number;
  active: number;
}

const TIER_LABEL: Record<string, string> = {
  starter: "Starter $199",
  standard: "Standard $499",
  custom: "Custom",
  hardship: "Hardship · Free",
};

export default function AdminBuildRequests() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/build-requests");
      if (!res.ok) {
        if (res.status === 403) {
          toast({ title: "Forbidden", description: "Admin access required.", variant: "destructive" });
        }
        return;
      }
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function complete(id: number) {
    if (!confirm("Mark this site as completed? The next waitlist person will be promoted automatically.")) return;
    setBusyId(id);
    try {
      const res = await authFetch(`/api/admin/build-requests/${id}/complete`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Couldn't complete", description: json.error ?? "Try again", variant: "destructive" });
      } else {
        toast({ title: "Marked complete", description: json.promoted ? `Promoted ${json.promoted.name} into active slot.` : "No one on waitlist." });
        load();
      }
    } finally { setBusyId(null); }
  }

  async function promote(id: number) {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/admin/build-requests/${id}/promote`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Couldn't promote", description: json.error ?? "Try again", variant: "destructive" });
      } else {
        toast({ title: "Promoted to active" });
        load();
      }
    } finally { setBusyId(null); }
  }

  async function savePatch(id: number, patch: { repoUrl?: string; hostingUrl?: string; adminNotes?: string }) {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/admin/build-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Couldn't save", description: json.error ?? "Try again", variant: "destructive" });
      } else {
        toast({ title: "Saved" });
        load();
      }
    } finally { setBusyId(null); }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        <Loader2 className="animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-center text-muted-foreground">Couldn't load build requests.</div>;
  }

  const active = data.requests.filter((r) => r.status === "active");
  const waitlist = data.requests.filter((r) => r.status === "waitlist");
  const completed = data.requests.filter((r) => r.status === "completed");

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Site Build Requests</h1>
          <p className="text-muted-foreground mt-1">
            {data.active} of {data.capacity} active slots filled · {waitlist.length} on waitlist · {completed.length} completed
          </p>
        </div>
        <Button onClick={load} variant="outline" disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin mr-2" : "mr-2"} /> Refresh
        </Button>
      </div>

      <Section title={`Active (${active.length}/${data.capacity})`} accent="emerald">
        {active.length === 0 ? <Empty>No active builds.</Empty> : active.map((r) => (
          <RequestCard key={r.id} req={r} busy={busyId === r.id} onComplete={() => complete(r.id)} onSave={(p) => savePatch(r.id, p)} />
        ))}
      </Section>

      <Section title={`Waitlist (${waitlist.length})`} accent="amber">
        {waitlist.length === 0 ? <Empty>No one waiting.</Empty> : waitlist.map((r) => (
          <RequestCard key={r.id} req={r} busy={busyId === r.id} onPromote={() => promote(r.id)} onSave={(p) => savePatch(r.id, p)} />
        ))}
      </Section>

      <Section title={`Completed (${completed.length})`} accent="slate">
        {completed.length === 0 ? <Empty>No completed builds yet.</Empty> : completed.map((r) => (
          <RequestCard key={r.id} req={r} busy={busyId === r.id} onSave={(p) => savePatch(r.id, p)} compact />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: "emerald" | "amber" | "slate"; children: React.ReactNode }) {
  const bar = accent === "emerald" ? "bg-emerald-500" : accent === "amber" ? "bg-amber-500" : "bg-slate-400";
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-block w-1 h-5 rounded ${bar}`} />
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{children}</div>;
}

function RequestCard({
  req, busy, onComplete, onPromote, onSave, compact,
}: {
  req: SiteBuildRequest;
  busy: boolean;
  onComplete?: () => void;
  onPromote?: () => void;
  onSave: (patch: { repoUrl?: string; hostingUrl?: string; adminNotes?: string }) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(!compact);
  const [repoUrl, setRepoUrl] = useState(req.repoUrl ?? "");
  const [hostingUrl, setHostingUrl] = useState(req.hostingUrl ?? "");
  const [notes, setNotes] = useState(req.adminNotes ?? "");

  const dirty = repoUrl !== (req.repoUrl ?? "") || hostingUrl !== (req.hostingUrl ?? "") || notes !== (req.adminNotes ?? "");

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-lg">{req.name}</h3>
            <Badge variant="outline">{TIER_LABEL[req.tier] ?? req.tier}</Badge>
            {req.status === "waitlist" && req.waitlistPosition && <Badge variant="secondary">Waitlist #{req.waitlistPosition}</Badge>}
            {!req.notifiedEmail && <Badge variant="destructive">Email failed</Badge>}
          </div>
          <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
            {req.email && <span className="inline-flex items-center gap-1"><Mail size={14} /> <a href={`mailto:${req.email}`} className="hover:underline">{req.email}</a></span>}
            {req.phone && <span className="inline-flex items-center gap-1"><Phone size={14} /> <a href={`tel:${req.phone}`} className="hover:underline">{req.phone}</a></span>}
            <span className="inline-flex items-center gap-1">
              <Github size={14} /> {req.hasGithub ? (req.githubUsername || "yes") : <span className="text-amber-600">needs help</span>}
            </span>
            <span className="inline-flex items-center gap-1">
              <Globe size={14} /> {req.hasDomain ? (req.domain || "yes") : <span className="text-amber-600">needs help</span>}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {onPromote && <Button size="sm" variant="outline" onClick={onPromote} disabled={busy}><ArrowUpCircle size={14} className="mr-1" /> Promote</Button>}
          {onComplete && <Button size="sm" onClick={onComplete} disabled={busy}><CheckCircle2 size={14} className="mr-1" /> Mark Complete</Button>}
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>{open ? "Hide" : "Details"}</Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-4 pt-4 border-t border-border">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">What they need</div>
            <p className="text-sm whitespace-pre-wrap">{req.description}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">GitHub repo URL</label>
              <Input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/their-user/their-repo" className="mt-1" />
              {req.repoUrl && <a href={req.repoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"><ExternalLink size={12} /> open</a>}
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Live hosting URL</label>
              <Input value={hostingUrl} onChange={(e) => setHostingUrl(e.target.value)} placeholder="https://theirsite.com" className="mt-1" />
              {req.hostingUrl && <a href={req.hostingUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"><ExternalLink size={12} /> open</a>}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Admin notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Private notes about this build…" rows={3} className="mt-1" />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Submitted {new Date(req.createdAt).toLocaleString()}{req.completedAt && ` · Completed ${new Date(req.completedAt).toLocaleString()}`}</span>
            <Button size="sm" onClick={() => onSave({ repoUrl, hostingUrl, adminNotes: notes })} disabled={busy || !dirty}>
              <Save size={14} className="mr-1" /> Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
