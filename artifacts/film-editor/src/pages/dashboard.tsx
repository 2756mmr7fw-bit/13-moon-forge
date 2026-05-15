import { useListFilmProjects, useGetRecentFilmProjects, useCreateFilmProject, getListFilmProjectsQueryKey, getGetRecentFilmProjectsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Film, Clock, Layers, Plus, Sparkles, Clapperboard, Smartphone, Monitor, Video, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppFamily } from "@/components/app-family";

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

const STARTERS = [
  {
    icon: Clapperboard,
    label: "Documentary",
    desc: "16:9 · 24fps · Long-form storytelling",
    color: "blue",
    config: { title: "My Documentary", aspectRatio: "16:9", frameRate: 24, description: "Long-form documentary project" },
  },
  {
    icon: Smartphone,
    label: "Social Reel",
    desc: "9:16 · 30fps · Short-form vertical",
    color: "pink",
    config: { title: "Social Reel", aspectRatio: "9:16", frameRate: 30, description: "Short-form vertical content" },
  },
  {
    icon: Monitor,
    label: "Short Film",
    desc: "21:9 · 24fps · Cinematic ultrawide",
    color: "purple",
    config: { title: "My Short Film", aspectRatio: "21:9", frameRate: 24, description: "Cinematic short film project" },
  },
  {
    icon: Video,
    label: "Tutorial",
    desc: "16:9 · 60fps · High-frame instructional",
    color: "green",
    config: { title: "Tutorial Video", aspectRatio: "16:9", frameRate: 60, description: "Instructional tutorial video" },
  },
] as const;

const COLOR = {
  blue: "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:border-blue-400/50 hover:bg-blue-500/15",
  pink: "bg-pink-500/10 border-pink-500/20 text-pink-400 hover:border-pink-400/50 hover:bg-pink-500/15",
  purple: "bg-purple-500/10 border-purple-500/20 text-purple-400 hover:border-purple-400/50 hover:bg-purple-500/15",
  green: "bg-green-500/10 border-green-500/20 text-green-400 hover:border-green-400/50 hover:bg-green-500/15",
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allProjects, isLoading: isLoadingAll } = useListFilmProjects();
  const { data: recentProjects, isLoading: isLoadingRecent } = useGetRecentFilmProjects();
  const createProject = useCreateFilmProject();

  const totalDuration = allProjects?.reduce((acc, p) => acc + (p.totalDurationMs || 0), 0) || 0;

  function quickCreate(config: typeof STARTERS[number]["config"]) {
    createProject.mutate(
      { data: config },
      {
        onSuccess: (project) => {
          queryClient.invalidateQueries({ queryKey: getListFilmProjectsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetRecentFilmProjectsQueryKey() });
          navigate(`/projects/${project.id}`);
        },
        onError: () => toast({ variant: "destructive", title: "Couldn't create project" }),
      }
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-2">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Your editing workspace</p>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/projects/new">
            <Plus className="w-3.5 h-3.5" /> New Project
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Projects", value: allProjects?.length ?? "—", icon: Layers },
          { label: "Total Footage", value: totalDuration ? formatDuration(totalDuration) : "0s", icon: Clock },
          { label: "AI Co-Director", value: "Ready", icon: Sparkles },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="bg-card/30 border-border/30">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="w-3.5 h-3.5 text-primary/60" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold">{isLoadingAll ? "…" : value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Starters */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground/90">Quick Start</h2>
          <span className="text-xs text-muted-foreground">Pick a template to begin</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STARTERS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                onClick={() => quickCreate(s.config)}
                disabled={createProject.isPending}
                className={`text-left p-4 rounded-xl border transition-all ${COLOR[s.color]} disabled:opacity-50`}
              >
                <Icon size={18} className="mb-2.5" />
                <div className="font-semibold text-sm text-white/90">{s.label}</div>
                <div className="text-[11px] text-white/40 mt-0.5 leading-snug">{s.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground/90">Recent Projects</h2>
          <Link href="/projects" className="text-xs text-primary/70 hover:text-primary transition-colors">
            View all →
          </Link>
        </div>

        {isLoadingRecent ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : recentProjects?.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-border/30 rounded-xl flex flex-col items-center gap-4">
            <Film className="w-10 h-10 text-muted-foreground/20" />
            <div>
              <p className="text-sm font-medium text-foreground/70">No projects yet</p>
              <p className="text-xs text-muted-foreground mt-1">Pick a quick start above or create a blank project</p>
            </div>
            <Button asChild size="sm" variant="outline" className="border-border/40">
              <Link href="/projects/new">Create blank project</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProjects?.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="group rounded-xl border border-border/30 bg-card/30 hover:border-primary/40 hover:bg-card/50 transition-all overflow-hidden cursor-pointer">
                  <div className="aspect-video bg-black/60 flex items-center justify-center border-b border-border/20 relative">
                    {project.thumbnailUrl ? (
                      <img src={project.thumbnailUrl} alt={project.title} className="w-full h-full object-cover" />
                    ) : (
                      <Film className="w-8 h-8 text-white/10" />
                    )}
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs font-medium text-white/80 bg-black/60 px-3 py-1.5 rounded-full">Open Editor</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="font-medium text-sm text-white/90 truncate">{project.title}</div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-white/35 font-mono">
                      <span className="capitalize">{project.status.replace("_", " ")}</span>
                      <span>·</span>
                      <span>{formatDuration(project.totalDurationMs)}</span>
                      <span>·</span>
                      <span>{project.clipCount} clips</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <AppFamily currentAppId="film-editor" />
      </div>
    </div>
  );
}
