import { useGetDashboardSummary, useGetRecentProjects, getGetDashboardSummaryQueryKey, getGetRecentProjectsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileCode, CheckCircle2, ArrowRight, Loader2,
  Sparkles, Code2, Wand2, Layers, Scale, Crosshair,
  PlusCircle, FolderOpen, MonitorPlay, Monitor, Swords, GraduationCap,
  Zap, TrendingUp,
} from "lucide-react";
import { useUser, useAuth } from "@clerk/react";
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface QuotaData {
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  plan: string;
  resetDate: string;
}

function useQuota() {
  const { getToken } = useAuth();
  const [quota, setQuota] = useState<QuotaData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE}/api/quota`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) setQuota(await res.json() as QuotaData);
      } catch { /* silent */ }
    })();
  }, [getToken]);

  return quota;
}

interface MoonStatus {
  id: string;
  label: string;
  desc: string;
  color: string;
  active: boolean;
  messagesRemaining: number | null;
  subscribeUrl: string;
}
interface MoonUsageData {
  hasAnyActive: boolean;
  moons: MoonStatus[];
  updatedAt: string | null;
}

function useMoonUsage() {
  const [data, setData] = useState<MoonUsageData | null>(null);
  useEffect(() => {
    fetch(`${API_BASE}/api/moon/usage`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, []);
  return data;
}

function MoonUsageWidget({ data }: { data: MoonUsageData }) {
  const activeMoons = data.moons.filter(m => m.active);
  if (activeMoons.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Your Moons</h2>
        <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">{activeMoons.length} active</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {activeMoons.map(moon => (
          <div key={moon.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: moon.color, boxShadow: `0 0 6px ${moon.color}` }} />
            <span className="text-xs font-semibold">{moon.label}</span>
            {moon.messagesRemaining !== null && (
              <span className="text-[10px] text-muted-foreground">
                {moon.messagesRemaining} msg left
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const quota = useQuota();
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: recentProjects, isLoading: isLoadingRecent } = useGetRecentProjects({
    query: { queryKey: getGetRecentProjectsQueryKey() }
  });

  const firstName = isLoaded ? (user?.firstName ?? user?.username) : null;
  const moonUsage = useMoonUsage();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-base">
            What would you like to build today?
          </p>
        </div>
        <div className="flex items-center gap-3">
          {quota && <QuotaWidget quota={quota} />}
          <Link href="/projects/new">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2">
              <PlusCircle className="h-5 w-5" />
              Start New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoadingSummary ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="bg-card border-border animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 bg-muted rounded w-2/3" /></CardHeader>
              <CardContent><div className="h-8 bg-muted rounded w-1/3 mt-1" /></CardContent>
            </Card>
          ))
        ) : summary ? (
          <>
            <StatCard label="Total Projects"  value={summary.totalProjects}   icon={<FolderKanbanIcon className="h-4 w-4 text-muted-foreground" />} />
            <StatCard label="Published"        value={summary.publishedProjects} icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} highlight />
            <StatCard label="Drafts"           value={summary.draftProjects}   icon={<FileCode className="h-4 w-4 text-primary" />} />
            <StatCard label="Total Pages"      value={summary.totalPages}      icon={<FileTextIcon className="h-4 w-4 text-muted-foreground" />} />
          </>
        ) : null}
      </div>

      {/* Flagship: Get Help Tools */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Get Tech Help</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              href: "/screen-coach",
              label: "Screen Coach",
              desc: "Share your screen and let Forge watch, listen, and talk you through any computer problem — step by step.",
              icon: MonitorPlay,
              color: "text-orange-400",
              bg: "bg-orange-400/10",
              border: "border-orange-400/20 hover:border-orange-400/50",
              badge: "Most Popular",
            },
            {
              href: "/computer-advisor",
              label: "Computer Advisor",
              desc: "Describe your computer and goals. Get a free software plan, upgrade costs, and side-by-side comparisons.",
              icon: Monitor,
              color: "text-blue-400",
              bg: "bg-blue-400/10",
              border: "border-blue-400/20 hover:border-blue-400/50",
              badge: null,
            },
            {
              href: "/game-studio",
              label: "Game Studio",
              desc: "Build a real video game in your browser. No downloads, no experience needed. Forge writes the code.",
              icon: Swords,
              color: "text-purple-400",
              bg: "bg-purple-400/10",
              border: "border-purple-400/20 hover:border-purple-400/50",
              badge: null,
            },
          ].map(({ href, label, desc, icon: Icon, color, bg, border, badge }) => (
            <Link key={href} href={href}>
              <div className={`relative flex flex-col gap-3 p-4 rounded-xl border ${border} bg-card hover:bg-card/80 transition-all cursor-pointer group h-full`}>
                {badge && (
                  <span className="absolute top-3 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider">
                    {badge}
                  </span>
                )}
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${bg} shrink-0`}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <p className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">{label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold mt-auto pt-1 ${color}`}>
                  Open <ArrowRight size={11} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Build & Create</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { href: "/brainstorm",  label: "Brainstorm",     desc: "Plan your idea",       icon: Sparkles,      color: "text-violet-400"  },
            { href: "/code-forge",  label: "Write Code",     desc: "Generate with AI",     icon: Code2,         color: "text-sky-400"     },
            { href: "/hawk",        label: "Ask Hawk",       desc: "Quick answers",        icon: Crosshair,     color: "text-cyan-400"    },
            { href: "/sage",        label: "Learn",          desc: "AI tutor",             icon: GraduationCap, color: "text-green-400"   },
            { href: "/legal",       label: "Legal",          desc: "Plain-English law",    icon: Scale,         color: "text-amber-400"   },
            { href: "/wizard",      label: "Move My App",    desc: "Leave Replit/Heroku",  icon: Wand2,         color: "text-emerald-400" },
            { href: "/app-hub",     label: "Deploy Apps",    desc: "Push to server",       icon: Layers,        color: "text-orange-400"  },
            { href: "/game-tools",  label: "Game Design",    desc: "Build game docs",      icon: Swords,        color: "text-pink-400"    },
          ].map(({ href, label, desc, icon: Icon, color }) => (
            <Link key={href} href={href}>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group text-center h-full">
                <Icon size={18} className={`${color} group-hover:scale-110 transition-transform mt-1`} />
                <span className="text-[11px] font-semibold text-foreground/80 group-hover:text-foreground transition-colors leading-tight">{label}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{desc}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Moon Usage */}
      {moonUsage && <MoonUsageWidget data={moonUsage} />}

      {/* Recent Projects */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Recent Projects</h2>
          <Link href="/projects" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoadingRecent ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : recentProjects && recentProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentProjects.map(project => (
              <Card key={project.id} className="bg-card border-border hover:border-primary transition-all group overflow-hidden">
                <CardContent className="p-0">
                  <div className="h-1.5 bg-gradient-to-r from-primary/80 to-accent" />
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-base line-clamp-1 group-hover:text-primary transition-colors">{project.name}</h3>
                      <Badge variant="outline" className={
                        project.status === 'published' ? 'border-green-500/30 text-green-500 bg-green-500/10 text-[10px]' :
                        project.status === 'draft'     ? 'border-primary/30 text-primary bg-primary/10 text-[10px]' :
                                                          'border-muted text-muted-foreground text-[10px]'
                      }>
                        {project.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-5 min-h-[2.5rem]">
                      {project.description || "No description yet."}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{project.pageCount} {project.pageCount === 1 ? "page" : "pages"}</span>
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="secondary" size="sm">Open Project</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyProjects />
        )}
      </div>
    </div>
  );
}

// ─── Quota widget ─────────────────────────────────────────────────────────────

function QuotaWidget({ quota }: { quota: QuotaData }) {
  const barColor =
    quota.percent >= 90 ? "bg-red-500" :
    quota.percent >= 70 ? "bg-amber-400" :
    "bg-primary";

  const textColor =
    quota.percent >= 90 ? "text-red-400" :
    quota.percent >= 70 ? "text-amber-400" :
    "text-muted-foreground";

  const reset = new Date(quota.resetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="flex flex-col gap-1.5 min-w-[160px] px-3 py-2 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Zap size={12} className={quota.percent >= 70 ? (quota.percent >= 90 ? "text-red-400" : "text-amber-400") : "text-primary"} />
          <span className="text-[11px] font-semibold text-foreground">AI Messages</span>
        </div>
        <span className={`text-[11px] font-bold ${textColor}`}>{quota.used}/{quota.limit}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${quota.percent}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{quota.remaining} left · resets {reset}</span>
        {quota.percent >= 70 && (
          <Link href="/pricing">
            <span className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5">
              Upgrade <TrendingUp size={9} />
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyProjects() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
        <FolderOpen className="w-7 h-7 text-primary/60" />
      </div>
      <h3 className="text-lg font-bold mb-2">No projects yet</h3>
      <p className="text-muted-foreground text-sm mb-2 max-w-sm mx-auto">
        Create your first project to start building. You can brainstorm ideas, generate code, and ship to your own server — all from here.
      </p>
      <p className="text-muted-foreground text-xs mb-7 max-w-sm mx-auto">
        Not sure where to start? Try <Link href="/brainstorm" className="text-primary hover:underline">Brainstorm</Link> — just describe your idea and Forge will help you plan it out.
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Link href="/projects/new">
          <Button className="gap-2">
            <PlusCircle size={15} />
            Create My First Project
          </Button>
        </Link>
        <Link href="/brainstorm">
          <Button variant="outline" className="gap-2">
            <Sparkles size={15} />
            Help Me Think of an Idea
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, highlight }: {
  label: string; value: number; icon: React.ReactNode; highlight?: boolean;
}) {
  return (
    <Card className={`bg-card border-border hover:border-primary/50 transition-colors ${highlight ? "hover:border-green-500/40" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black">{value}</div>
      </CardContent>
    </Card>
  );
}

// ─── Inline icon helpers ──────────────────────────────────────────────────────

function FolderKanbanIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <path d="M8 10v4" /><path d="M12 10v2" /><path d="M16 10v6" />
    </svg>
  );
}

function FileTextIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
    </svg>
  );
}
