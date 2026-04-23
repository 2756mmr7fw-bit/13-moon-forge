import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useListProjects, getListProjectsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Anvil, Search, Loader2, PlusCircle, ArrowRight, Clock, Layers,
  Briefcase, Star, SortAsc, SortDesc, Flame, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "updated" | "name" | "pages";
type SortDir = "asc" | "desc";

function usePinned() {
  const key = "forge_pinned_projects";
  const [pinned, setPinned] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
  });
  const toggle = (id: number) => {
    setPinned(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  };
  return { pinned, toggle };
}

export default function Projects() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("updated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showSort, setShowSort] = useState(false);
  const { pinned, toggle } = usePinned();

  const { data: projects, isLoading } = useListProjects({
    query: { queryKey: getListProjectsQueryKey() }
  });

  const sorted = useMemo(() => {
    if (!projects) return [];
    let list = [...projects].filter(p => {
      if (filter && p.status !== filter) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    list.sort((a, b) => {
      let v = 0;
      if (sort === "updated") v = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      if (sort === "name") v = a.name.localeCompare(b.name);
      if (sort === "pages") v = (a.pageCount ?? 0) - (b.pageCount ?? 0);
      return sortDir === "asc" ? v : -v;
    });

    // Pinned always float to top
    const pinnedList = list.filter(p => pinned.includes(p.id));
    const unpinned = list.filter(p => !pinned.includes(p.id));
    return [...pinnedList, ...unpinned];
  }, [projects, filter, search, sort, sortDir, pinned]);

  const SORT_LABELS: Record<SortKey, string> = { updated: "Last updated", name: "Name", pages: "Page count" };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">The Arsenal</h1>
          <p className="text-muted-foreground mt-1">All the work you've forged. Organize it however you want.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Portfolio quick-create */}
          <Button
            variant="outline"
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => setLocation("/projects/new?type=portfolio")}
          >
            <Briefcase className="w-4 h-4" />
            Build Portfolio
          </Button>
          <Link href="/projects/new">
            <Button className="bg-primary text-primary-foreground gap-2">
              <PlusCircle className="w-4 h-4" />
              New Creation
            </Button>
          </Link>
        </div>
      </div>

      {/* Forge organize banner — shown when 3+ projects */}
      {(projects?.length ?? 0) >= 3 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3">
          <div className="p-1.5 bg-primary/15 rounded-lg shrink-0">
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Let Forge organize this for you</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tell Forge how you want your work grouped — by client, project type, status, or any structure you like.
            </p>
          </div>
          <Link href="/projects/new">
            <Button size="sm" variant="ghost" className="shrink-0 text-primary hover:bg-primary/10 gap-1.5">
              Ask Forge <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Search + Filter + Sort */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your creations…"
            className="pl-10 bg-background border-border focus-visible:ring-primary w-full"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {[null, "published", "draft", "archived"].map(f => (
            <Button
              key={f ?? "all"}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="whitespace-nowrap"
            >
              {f === null ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}

          {/* Sort dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowSort(v => !v)}
            >
              {sortDir === "asc" ? <SortAsc className="w-3.5 h-3.5" /> : <SortDesc className="w-3.5 h-3.5" />}
              {SORT_LABELS[sort]}
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </Button>
            {showSort && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                {(["updated", "name", "pages"] as SortKey[]).map(s => (
                  <button
                    key={s}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors",
                      sort === s && "text-primary font-medium"
                    )}
                    onClick={() => {
                      if (sort === s) setSortDir(d => d === "asc" ? "desc" : "asc");
                      else { setSort(s); setSortDir("desc"); }
                      setShowSort(false);
                    }}
                  >
                    {SORT_LABELS[s]}
                    {sort === s && <span className="ml-2 text-xs text-muted-foreground">{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center p-24">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : sorted.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sorted.map((project, index) => {
            const isPinned = pinned.includes(project.id);
            return (
              <Card
                key={project.id}
                className={cn(
                  "bg-card border-border hover:border-primary/60 transition-all group overflow-hidden flex flex-col relative",
                  isPinned && "border-primary/40 shadow-[0_0_16px_rgba(232,97,26,0.06)]"
                )}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {isPinned && (
                  <div className="absolute top-3 right-3 z-10">
                    <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                  </div>
                )}
                <CardContent className="p-0 flex-1 flex flex-col">
                  <div className="h-1 w-full bg-gradient-to-r from-muted to-muted group-hover:from-primary group-hover:to-accent transition-all duration-500" />
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors pr-6">{project.name}</h3>
                      <Badge variant="outline" className={cn(
                        "shrink-0 text-xs",
                        project.status === "published" ? "border-green-500/30 text-green-500 bg-green-500/10" :
                        project.status === "draft" ? "border-primary/30 text-primary bg-primary/10" : "border-muted text-muted-foreground"
                      )}>
                        {project.status}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
                      {project.description || "No description yet."}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                      <span className="capitalize font-medium text-foreground/70">{project.template}</span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {project.pageCount} page{project.pageCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" /> {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      <button
                        onClick={() => toggle(project.id)}
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          isPinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                        title={isPinned ? "Unpin" : "Pin to top"}
                      >
                        <Star className={cn("w-4 h-4", isPinned && "fill-primary")} />
                      </button>
                      <Link href={`/projects/${project.id}`} className="ml-auto">
                        <Button variant="ghost" size="sm" className="group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          Open <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-24 border border-dashed border-border rounded-xl bg-card/30 flex flex-col items-center justify-center">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <Anvil className="h-10 w-10 text-primary opacity-80" />
          </div>
          <h3 className="text-xl font-bold">
            {search || filter ? "No matches found" : "The anvil sits cold."}
          </h3>
          <p className="text-muted-foreground mt-2 mb-6 max-w-md text-sm">
            {search || filter
              ? "Clear your filters or try a different search."
              : "Just tell Forge what you want to build — he'll set up the whole project for you."}
          </p>
          {search || filter ? (
            <Button variant="outline" onClick={() => { setSearch(""); setFilter(null); }}>
              Clear filters
            </Button>
          ) : (
            <Link href="/projects/new">
              <Button className="bg-primary text-primary-foreground gap-2">
                <Flame className="w-4 h-4" /> Start talking to Forge
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
