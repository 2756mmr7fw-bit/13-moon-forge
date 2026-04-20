import { useGetDashboardSummary, useGetRecentProjects, getGetDashboardSummaryQueryKey, getGetRecentProjectsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Anvil, FileCode, CheckCircle2, Archive, ArrowRight, Loader2,
  Sparkles, Code2, Wand2, Layers, Scale, Crosshair,
} from "lucide-react";
import { useUser } from "@clerk/react";

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });
  
  const { data: recentProjects, isLoading: isLoadingRecent } = useGetRecentProjects({
    query: { queryKey: getGetRecentProjectsQueryKey() }
  });

  const greeting = (() => {
    if (!isLoaded) return "Welcome back.";
    const name = user?.firstName ?? user?.username;
    if (name) return `Welcome back, ${name}.`;
    return "Welcome back.";
  })();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">The Anvil</h1>
          <p className="text-muted-foreground mt-2 text-lg">{greeting} The forge is hot and ready for your ideas.</p>
        </div>
        <Link href="/projects/new">
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
            <Anvil className="mr-2 h-5 w-5" />
            Strike New Project
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingSummary ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="bg-card border-border animate-pulse">
              <CardHeader className="pb-2"><div className="h-5 bg-muted rounded w-1/2"></div></CardHeader>
              <CardContent><div className="h-8 bg-muted rounded w-1/3"></div></CardContent>
            </Card>
          ))
        ) : summary ? (
          <>
            <Card className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
                <FolderKanbanIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.totalProjects}</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{summary.publishedProjects}</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
                <FileCode className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.draftProjects}</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Pages</CardTitle>
                <FileTextIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.totalPages}</div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-muted-foreground uppercase text-xs tracking-widest">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { href: "/brainstorm",  label: "Brainstorm",       icon: Sparkles,  color: "text-violet-400" },
            { href: "/code-forge",  label: "Code Forge",       icon: Code2,     color: "text-sky-400"    },
            { href: "/hawk",        label: "Ask Hawk",         icon: Crosshair, color: "text-cyan-400"   },
            { href: "/legal",       label: "Legal Decoder",    icon: Scale,     color: "text-amber-400"  },
            { href: "/wizard",      label: "Migration Wizard", icon: Wand2,     color: "text-emerald-400"},
            { href: "/app-hub",     label: "App Hub",          icon: Layers,    color: "text-orange-400" },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href}>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group text-center">
                <Icon size={20} className={`${color} group-hover:scale-110 transition-transform`} />
                <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight">{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Recent Work</h2>
          <Link href="/projects" className="text-sm text-primary hover:text-primary/80 flex items-center">
            View all <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>

        {isLoadingRecent ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : recentProjects && recentProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProjects.map(project => (
              <Card key={project.id} className="bg-card border-border hover:border-primary transition-all group overflow-hidden">
                <CardContent className="p-0">
                  <div className="h-2 bg-gradient-to-r from-primary/80 to-accent"></div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">{project.name}</h3>
                      <Badge variant="outline" className={
                        project.status === 'published' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                        project.status === 'draft' ? 'border-primary/30 text-primary bg-primary/10' : 'border-muted text-muted-foreground'
                      }>
                        {project.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-6 h-10">
                      {project.description || "No description provided."}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{project.pageCount} pages</span>
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="secondary" size="sm">Enter Project</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-border rounded-lg bg-card/50">
            <Anvil className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium">The anvil is empty</h3>
            <p className="text-muted-foreground mt-2 mb-6">You haven't forged any projects yet.</p>
            <Link href="/projects/new">
              <Button>Start Forging</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function FolderKanbanIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <path d="M8 10v4" />
      <path d="M12 10v2" />
      <path d="M16 10v6" />
    </svg>
  )
}

function FileTextIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  )
}
