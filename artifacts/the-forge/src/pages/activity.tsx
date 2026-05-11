import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Activity, GitBranch, Github, Upload, CheckCircle2, XCircle,
  Clock, Loader2, RefreshCw, Lock, Globe2, ArrowRight, Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type EventType = "repo_created" | "import_started" | "import_done" | "import_error";

interface ActivityEvent {
  id: string;
  type: EventType;
  title: string;
  subtitle: string | null;
  status: string | null;
  timestamp: string;
  meta: Record<string, unknown>;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function EventIcon({ type }: { type: EventType }) {
  const base = "w-8 h-8 rounded-full flex items-center justify-center shrink-0";
  if (type === "repo_created") return <div className={cn(base, "bg-primary/10")}><GitBranch className="w-4 h-4 text-primary" /></div>;
  if (type === "import_done") return <div className={cn(base, "bg-green-500/10")}><CheckCircle2 className="w-4 h-4 text-green-400" /></div>;
  if (type === "import_error") return <div className={cn(base, "bg-red-500/10")}><XCircle className="w-4 h-4 text-red-400" /></div>;
  if (type === "import_started") return <div className={cn(base, "bg-amber-500/10")}><Loader2 className="w-4 h-4 text-amber-400 animate-spin" /></div>;
  return <div className={cn(base, "bg-muted")}><Clock className="w-4 h-4 text-muted-foreground" /></div>;
}

function EventCard({ event }: { event: ActivityEvent }) {
  const label = {
    repo_created: "Repo created",
    import_started: "Import in progress",
    import_done: "Import complete",
    import_error: "Import failed",
  }[event.type];

  const sourceIcon = event.meta.source === "github"
    ? <Github className="w-3 h-3" />
    : event.meta.source === "zip"
    ? <Upload className="w-3 h-3" />
    : null;

  return (
    <div className="flex gap-4 items-start py-4 border-b border-border last:border-0">
      <EventIcon type={event.type} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate max-w-[200px]">{event.title}</span>
          {event.type === "repo_created" && Boolean(event.meta.visibility) && (
            <Badge variant="outline" className={cn(
              "text-[10px]",
              event.meta.visibility === "private"
                ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                : "border-sky-500/30 text-sky-400 bg-sky-500/10"
            )}>
              {event.meta.visibility === "private"
                ? <><Lock className="w-2.5 h-2.5 mr-0.5" />Private</>
                : <><Globe2 className="w-2.5 h-2.5 mr-0.5" />Public</>}
            </Badge>
          )}
          {sourceIcon && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
              {sourceIcon}
              {String(event.meta.source ?? "").charAt(0).toUpperCase() + String(event.meta.source ?? "").slice(1)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {event.subtitle && (
          <p className="text-xs text-muted-foreground/60 mt-0.5 truncate max-w-sm">{event.subtitle}</p>
        )}
        {event.type === "import_error" && Boolean(event.meta.errorMessage) && (
          <p className="text-xs text-red-400 mt-1 line-clamp-2">{String(event.meta.errorMessage)}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">{timeAgo(event.timestamp)}</span>
        {event.type === "repo_created" && Boolean(event.meta.repoId) && (
          <Link href="/vault">
            <button className="flex items-center gap-1 text-[10px] text-primary hover:underline">
              View in Vault <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}

function groupByDate(events: ActivityEvent[]) {
  const groups: Record<string, ActivityEvent[]> = {};
  for (const ev of events) {
    const d = new Date(ev.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

    if (!groups[label]) groups[label] = [];
    groups[label].push(ev);
  }
  return groups;
}

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/activity`, { credentials: "include" });
      const data = await r.json() as { events?: ActivityEvent[] };
      setEvents(Array.isArray(data.events) ? data.events : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const groups = groupByDate(events);

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Activity</h1>
          </div>
          <p className="text-muted-foreground text-sm">Everything that's happened across your Forge — repos, imports, and deployments.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-1.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading activity…
        </div>
      ) : events.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl py-20 text-center">
          <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">No activity yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Create a project or import a repo to see activity here.</p>
          <div className="flex justify-center gap-2 mt-4">
            <Link href="/vault">
              <Button size="sm" variant="outline"><GitBranch className="w-4 h-4 mr-1.5" /> Go to Vault</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([date, dayEvents]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{date}</span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground/50">{dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="bg-card border border-border rounded-xl px-5">
                {dayEvents.map(ev => <EventCard key={ev.id} event={ev} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
