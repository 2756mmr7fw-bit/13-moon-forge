import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import {
  CheckCircle2, XCircle, Trash2, ExternalLink, Loader2, Shield,
  Clock, Package, RefreshCw, Github, Container, Users, DollarSign,
  AlertTriangle, TrendingUp, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type RegistryApp = {
  id: number;
  name: string;
  tagline: string;
  description: string;
  stack: string;
  githubUrl: string | null;
  dockerImage: string | null;
  submittedByUserId: string;
  submittedByName: string | null;
  status: "pending" | "approved" | "rejected";
  sovereignCertified: boolean;
  minRam: number;
  createdAt: string;
};

type Tab = "pending" | "approved" | "rejected";

interface AdminStats {
  planDistribution: Record<string, number>;
  totalPaid: number;
  pendingCount: number;
  approvedCount: number;
  oldestPendingDays: number | null;
  oldestPendingName: string | null;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-red-500/15 text-red-400 border-red-500/30">Rejected</Badge>;
  return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Pending</Badge>;
}

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>("pending");
  
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery<RegistryApp[]>({
    queryKey: ["admin-registry"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/admin/registry`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (r.status === 403) throw new Error("forbidden");
      if (!r.ok) throw new Error("Failed to load registry");
      return r.json();
    },
    retry: false,
  });

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/admin/stats`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) throw new Error("Failed to load stats");
      return r.json();
    },
    staleTime: 60_000,
    retry: false,
  });

  const approveMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${API_BASE}/api/admin/registry/${id}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) throw new Error("Failed to approve");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-registry"] }); toast({ title: "App approved" }); },
    onError: () => toast({ title: "Failed to approve", variant: "destructive" }),
  });

  const rejectMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${API_BASE}/api/admin/registry/${id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) throw new Error("Failed to reject");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-registry"] }); toast({ title: "App rejected" }); },
    onError: () => toast({ title: "Failed to reject", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${API_BASE}/api/admin/registry/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) throw new Error("Failed to delete");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-registry"] }); toast({ title: "App deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (isError) {
    const isForbidden = (error as Error).message === "forbidden";
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center">
        <Shield size={48} className="text-muted-foreground/40" />
        <div>
          <h2 className="text-xl font-bold mb-1">{isForbidden ? "Access Denied" : "Error"}</h2>
          <p className="text-muted-foreground text-sm">
            {isForbidden
              ? "You don't have permission to access the admin panel. Contact Sovereign Digital if this is a mistake."
              : "Failed to load admin data. Try refreshing."}
          </p>
        </div>
        {!isForbidden && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw size={14} className="mr-2" /> Retry
          </Button>
        )}
      </div>
    );
  }

  const apps = data ?? [];
  const filtered = apps.filter((a) => a.status === tab);
  const counts = {
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  const tabs: { key: Tab; label: string; icon: React.ComponentType<any> }[] = [
    { key: "pending", label: "Pending", icon: Clock },
    { key: "approved", label: "Approved", icon: CheckCircle2 },
    { key: "rejected", label: "Rejected", icon: XCircle },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
          <Shield size={22} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Review and approve community registry submissions</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => refetch()}
          title="Refresh"
        >
          <RefreshCw size={16} />
        </Button>
      </div>

      {/* Platform stats */}
      {stats && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={15} className="text-muted-foreground" />
            <span className="text-sm font-bold">Platform Overview</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <DollarSign size={11} /> Paying customers
              </div>
              <div className="text-2xl font-bold">{stats.totalPaid}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Package size={11} /> Awaiting review
              </div>
              <div className={cn("text-2xl font-bold", stats.pendingCount > 0 ? "text-amber-400" : "")}>
                {stats.pendingCount}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 size={11} /> Approved apps
              </div>
              <div className="text-2xl font-bold text-emerald-400">{stats.approvedCount}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp size={11} /> Active plans
              </div>
              <div className="text-2xl font-bold">{Object.keys(stats.planDistribution).length}</div>
            </div>
          </div>

          {/* Plan distribution bars */}
          {stats.totalPaid > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue by Plan</p>
              {[
                { key: "creator", label: "Creator", color: "bg-sky-500" },
                { key: "pro",     label: "Pro",     color: "bg-violet-500" },
                { key: "studio",  label: "Studio",  color: "bg-orange-500" },
              ].map(({ key, label, color }) => {
                const count = stats.planDistribution[key] ?? 0;
                const pct = stats.totalPaid > 0 ? Math.round((count / stats.totalPaid) * 100) : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-16 text-xs text-muted-foreground text-right shrink-0">{label}</div>
                    <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-12 text-xs text-right tabular-nums shrink-0">
                      {count} <span className="text-muted-foreground/60">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Oldest pending alert */}
          {stats.oldestPendingDays !== null && stats.oldestPendingDays >= 3 && (
            <div className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-sm",
              stats.oldestPendingDays >= 7
                ? "border-red-500/30 bg-red-500/8"
                : "border-amber-500/25 bg-amber-500/5"
            )}>
              <AlertTriangle size={14} className={cn("shrink-0 mt-0.5", stats.oldestPendingDays >= 7 ? "text-red-400" : "text-amber-400")} />
              <div>
                <p className={cn("font-medium", stats.oldestPendingDays >= 7 ? "text-red-300" : "text-amber-300")}>
                  Oldest pending submission is {stats.oldestPendingDays} days old
                </p>
                {stats.oldestPendingName && (
                  <p className="text-xs text-muted-foreground mt-0.5">"{stats.oldestPendingName}" is waiting for review</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Registry counts */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{counts.pending}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Awaiting Review</div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{counts.approved}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Approved</div>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{counts.rejected}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Rejected</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={15} />
            {label}
            {counts[key] > 0 && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                key === "pending" ? "bg-amber-500/20 text-amber-400" :
                key === "approved" ? "bg-emerald-500/20 text-emerald-400" :
                "bg-red-500/20 text-red-400"
              )}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* App List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Package size={40} className="text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">No {tab} submissions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onApprove={() => approveMut.mutate(app.id)}
              onReject={() => rejectMut.mutate(app.id)}
              onDelete={() => deleteMut.mutate(app.id)}
              loading={
                (approveMut.isPending && approveMut.variables === app.id) ||
                (rejectMut.isPending && rejectMut.variables === app.id) ||
                (deleteMut.isPending && deleteMut.variables === app.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AppCard({
  app,
  onApprove,
  onReject,
  onDelete,
  loading,
}: {
  app: RegistryApp;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <Package size={18} className="text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base">{app.name}</h3>
              <StatusBadge status={app.status} />
              {app.sovereignCertified && (
                <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                  Sovereign Certified
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{app.tagline}</p>

            <div className="flex flex-wrap gap-2 mt-3">
              {app.stack.split(",").map((s) => (
                <span
                  key={s}
                  className="rounded-md bg-muted/60 border border-border/50 px-2 py-0.5 text-[11px] font-mono text-muted-foreground"
                >
                  {s.trim()}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>By: <span className="text-foreground/70">{app.submittedByName ?? app.submittedByUserId}</span></span>
          <span>RAM: <span className="text-foreground/70">{app.minRam} GB</span></span>
          <span>Submitted: <span className="text-foreground/70">{new Date(app.createdAt).toLocaleDateString()}</span></span>
          {app.githubUrl && (
            <a
              href={app.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Github size={12} /> GitHub
            </a>
          )}
          {app.dockerImage && (
            <span className="flex items-center gap-1">
              <Container size={12} />
              <code className="font-mono text-[11px]">{app.dockerImage}</code>
            </span>
          )}
        </div>

        {/* Description toggle */}
        {app.description && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline"
            >
              {expanded ? "Hide description" : "Show description"}
            </button>
            {expanded && (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed border-l-2 border-border/60 pl-3">
                {app.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-border/50 bg-muted/10 px-5 py-3 flex items-center gap-2 flex-wrap">
        {app.status !== "approved" && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onApprove}
            disabled={loading}
          >
            {loading ? <Loader2 size={13} className="animate-spin mr-1" /> : <CheckCircle2 size={13} className="mr-1" />}
            Approve
          </Button>
        )}
        {app.status !== "rejected" && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={onReject}
            disabled={loading}
          >
            {loading ? <Loader2 size={13} className="animate-spin mr-1" /> : <XCircle size={13} className="mr-1" />}
            Reject
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-muted-foreground hover:text-red-400"
          onClick={onDelete}
          disabled={loading}
          title="Delete permanently"
        >
          <Trash2 size={13} />
        </Button>
        {app.githubUrl && (
          <a href={app.githubUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" className="text-muted-foreground">
              <ExternalLink size={13} className="mr-1" /> View Repo
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
