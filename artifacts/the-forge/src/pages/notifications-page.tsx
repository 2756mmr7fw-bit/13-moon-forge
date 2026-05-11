import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function authFetch(path: string, opts?: RequestInit) {
  const token = await getAuthToken();
  return fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...opts,
  });
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  deploy:   "bg-green-500/15 text-green-400",
  domain:   "bg-yellow-500/15 text-yellow-400",
  alert:    "bg-red-500/15 text-red-400",
  info:     "bg-blue-500/15 text-blue-400",
  system:   "bg-zinc-500/15 text-zinc-400",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/notifications");
      if (res.ok) setItems(await res.json() as Notification[]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: number) {
    await authFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    setMarkingAll(true);
    await authFetch("/api/notifications/read-all", { method: "POST" });
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    setMarkingAll(false);
  }

  async function remove(id: number) {
    await authFetch(`/api/notifications/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(n => n.id !== id));
  }

  const unread = items.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center relative">
            <Bell size={20} className="text-primary" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={markingAll}>
            {markingAll ? <Loader2 size={14} className="animate-spin mr-1" /> : <CheckCheck size={14} className="mr-1" />}
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-card border rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <Bell size={36} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="font-medium mb-1">No notifications yet</p>
          <p className="text-sm text-muted-foreground">We'll alert you when your apps deploy, domains need attention, and more.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={cn(
                "group relative rounded-xl border p-4 transition-all cursor-pointer",
                n.read
                  ? "bg-card opacity-70 hover:opacity-100"
                  : "bg-card border-primary/20 shadow-sm"
              )}
            >
              {!n.read && (
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
              <div className={cn("flex items-start gap-3", !n.read && "pl-4")}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{n.title}</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider", TYPE_COLORS[n.type] ?? TYPE_COLORS.info)}>
                      {n.type}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug">{n.message}</p>
                  {n.link && (
                    <Link href={n.link} className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5">
                      View details <ExternalLink size={10} />
                    </Link>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); remove(n.id); }}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 text-muted-foreground transition-all shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
