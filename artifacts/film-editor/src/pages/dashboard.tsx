import { useListFilmProjects, useGetRecentFilmProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Film, Clock, Layers, Plus } from "lucide-react";

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
}

export default function Dashboard() {
  const { data: allProjects, isLoading: isLoadingAll } = useListFilmProjects();
  const { data: recentProjects, isLoading: isLoadingRecent } = useGetRecentFilmProjects();

  const totalDuration = allProjects?.reduce((acc, p) => acc + (p.totalDurationMs || 0), 0) || 0;

  if (isLoadingAll || isLoadingRecent) {
    return <div className="p-8 text-muted-foreground animate-pulse">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your editing workspace</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
            <Layers className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allProjects?.length || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Footage Edited</CardTitle>
            <Clock className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4 text-foreground/90">Recent Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentProjects?.map((project) => (
            <Card key={project.id} className="group overflow-hidden bg-card/40 border-border/30 hover:border-primary/50 transition-colors">
              <div className="aspect-video bg-muted relative flex items-center justify-center border-b border-border/40 overflow-hidden">
                {project.thumbnailUrl ? (
                  <img src={project.thumbnailUrl} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <Film className="w-10 h-10 text-muted-foreground/30" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button asChild variant="secondary" size="sm" className="pointer-events-auto">
                    <Link href={`/projects/${project.id}`}>Open Editor</Link>
                  </Button>
                </div>
              </div>
              <CardHeader className="p-4">
                <CardTitle className="text-base truncate">{project.title}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <span className="capitalize">{project.status.replace("_", " ")}</span>
                  <span>•</span>
                  <span>{formatDuration(project.totalDurationMs)}</span>
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
          {recentProjects?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border/40 rounded-lg">
              No recent projects found. Create one to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
