import { useListFilmProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Film, Plus, MoreVertical, LayoutGrid, List as ListIcon } from "lucide-react";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m ${seconds % 60}s`;
}

export default function Projects() {
  const { data: projects, isLoading } = useListFilmProjects();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  if (isLoading) {
    return <div className="p-8 text-muted-foreground animate-pulse">Loading projects...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your film projects</p>
        </div>
        <div className="flex items-center gap-4">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "grid" | "list")}>
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutGrid className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <ListIcon className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      {projects?.length === 0 ? (
        <div className="py-24 text-center text-muted-foreground border border-dashed border-border/40 rounded-lg flex flex-col items-center justify-center">
          <Film className="w-12 h-12 mb-4 opacity-20" />
          <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
          <p className="max-w-md mx-auto mb-6">Create your first film project to start editing in the 13 Moon Editor.</p>
          <Button asChild>
            <Link href="/projects/new">Create Project</Link>
          </Button>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col gap-4"}>
          {projects?.map((project) => (
            <Card key={project.id} className={`group overflow-hidden bg-card/40 border-border/30 hover:border-primary/50 transition-colors ${viewMode === 'list' ? 'flex flex-row items-center h-24' : ''}`}>
              <div className={`${viewMode === 'grid' ? 'aspect-video' : 'w-40 h-full'} bg-muted relative flex shrink-0 items-center justify-center border-border/40 overflow-hidden ${viewMode === 'grid' ? 'border-b' : 'border-r'}`}>
                {project.thumbnailUrl ? (
                  <img src={project.thumbnailUrl} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <Film className="w-8 h-8 text-muted-foreground/30" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button asChild variant="secondary" size="sm" className="pointer-events-auto">
                    <Link href={`/projects/${project.id}`}>Open</Link>
                  </Button>
                </div>
              </div>
              <div className={`p-4 flex-1 flex ${viewMode === 'list' ? 'items-center justify-between' : 'flex-col'}`}>
                <div>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base truncate">{project.title}</CardTitle>
                    {viewMode === 'grid' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/projects/${project.id}`}>Open Editor</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/projects/${project.id}/settings`}>Settings</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2 mt-1 mb-3 text-xs min-h-[32px]">
                    {project.description || "No description"}
                  </CardDescription>
                </div>
                <div className={`flex items-center gap-2 text-xs text-muted-foreground ${viewMode === 'list' ? 'w-64 shrink-0' : 'mt-auto'}`}>
                  <Badge variant="outline" className="capitalize text-[10px]">{project.status.replace("_", " ")}</Badge>
                  <span>•</span>
                  <span>{formatDuration(project.totalDurationMs)}</span>
                  <span>•</span>
                  <span>{project.clipCount} clips</span>
                </div>
                {viewMode === 'list' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 ml-4">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${project.id}`}>Open Editor</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${project.id}/settings`}>Settings</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
