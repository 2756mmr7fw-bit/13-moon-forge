import { useState } from "react";
import { Link } from "wouter";
import { useListProjects, getListProjectsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Anvil, Search, Filter, Loader2, PlusCircle, ArrowRight, Clock, Layers } from "lucide-react";

export default function Projects() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);

  const { data: projects, isLoading } = useListProjects({
    query: { queryKey: getListProjectsQueryKey() }
  });

  const filteredProjects = projects?.filter(p => {
    if (filter && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">The Arsenal</h1>
          <p className="text-muted-foreground mt-2">All the weapons you've forged.</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-primary text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Creation
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search your creations..." 
            className="pl-10 bg-background border-border focus-visible:ring-primary w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <Button 
            variant={filter === null ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter(null)}
            className="whitespace-nowrap"
          >
            All
          </Button>
          <Button 
            variant={filter === "published" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter("published")}
            className="whitespace-nowrap"
          >
            Published
          </Button>
          <Button 
            variant={filter === "draft" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter("draft")}
            className="whitespace-nowrap"
          >
            Drafts
          </Button>
          <Button 
            variant={filter === "archived" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter("archived")}
            className="whitespace-nowrap"
          >
            Archived
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-24">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : filteredProjects && filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project, index) => (
            <Card 
              key={project.id} 
              className="bg-card border-border hover:border-primary/60 transition-all group overflow-hidden flex flex-col"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-0 flex-1 flex flex-col">
                <div className="h-1.5 w-full bg-gradient-to-r from-muted to-muted group-hover:from-primary group-hover:to-accent transition-all duration-500"></div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-xl line-clamp-1 group-hover:text-primary transition-colors">{project.name}</h3>
                    <Badge variant="outline" className={
                      project.status === 'published' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                      project.status === 'draft' ? 'border-primary/30 text-primary bg-primary/10' : 'border-muted text-muted-foreground'
                    }>
                      {project.status}
                    </Badge>
                  </div>
                  
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-6 flex-1">
                    {project.description || "A mysterious artifact with no description."}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Template</span>
                      <span className="text-sm font-medium capitalize">{project.template}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Pages</span>
                      <span className="text-sm font-medium flex items-center">
                        <Layers className="w-3 h-3 mr-1 text-muted-foreground" />
                        {project.pageCount}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                    <span className="text-xs text-muted-foreground flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="ghost" size="sm" className="group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        Inspect <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 border border-dashed border-border rounded-lg bg-card/30 flex flex-col items-center justify-center">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <Anvil className="h-10 w-10 text-primary opacity-80" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No creations found</h3>
          <p className="text-muted-foreground mt-2 mb-6 max-w-md">
            {search || filter ? "The forge yields no results for your current filters. Clear them to see all your work." : "The anvil sits cold. It is time to start your first creation."}
          </p>
          {(search || filter) ? (
            <Button variant="outline" onClick={() => { setSearch(""); setFilter(null); }}>
              Clear Filters
            </Button>
          ) : (
            <Link href="/projects/new">
              <Button className="bg-primary text-primary-foreground">
                Start Forging
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}