import { useState, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetProject, 
  useListPages, 
  useUpdateProject, 
  useDeleteProject,
  useCreatePage,
  useDeletePage,
  getGetProjectQueryKey,
  getListPagesQueryKey,
  getListProjectsQueryKey,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, ArrowLeft, Settings, Trash2, Plus, FileText, 
  MoreVertical, Edit3, Globe, Archive, Clock, Flame, CheckCircle2, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

type GenerateStatus = "idle" | "generating" | "done" | "error";
interface GenerateEvent {
  type: "thinking" | "page_start" | "page_done" | "done" | "error";
  content?: string;
  message?: string;
  pageId?: number;
  pageTitle?: string;
}

function useForgeGenerate(projectId: number, onDone: () => void) {
  const [status, setStatus] = useState<GenerateStatus>("idle");
  const [log, setLog] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const generate = async (prompt: string) => {
    if (status === "generating") return;
    setStatus("generating");
    setLog([]);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/forge/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, prompt }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Failed to connect to Forge");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: GenerateEvent = JSON.parse(line.slice(6));
            if (event.type === "thinking" && event.content) {
              setLog(prev => [...prev, event.content!]);
            } else if (event.type === "page_start" && event.pageTitle) {
              setLog(prev => [...prev, `Forging "${event.pageTitle}"...`]);
            } else if (event.type === "page_done" && event.pageTitle) {
              setLog(prev => {
                const updated = [...prev];
                const idx = updated.findLastIndex(l => l.includes(`"${event.pageTitle}"`));
                if (idx >= 0) updated[idx] = `"${event.pageTitle}" — done`;
                return updated;
              });
            } else if (event.type === "error" && event.message) {
              setLog(prev => [...prev, `Error: ${event.message}`]);
              setStatus("error");
              return;
            } else if (event.type === "done") {
              setStatus("done");
              onDone();
              return;
            }
          } catch { /* ignore parse errors */ }
        }
      }
      setStatus("done");
      onDone();
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setLog(prev => [...prev, "Forge could not complete the work. Try again."]);
        setStatus("error");
      }
    }
  };

  const reset = () => { setStatus("idle"); setLog([]); };
  return { status, log, generate, reset };
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const projectId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);
  
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [forgePrompt, setForgePrompt] = useState("");

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, { 
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } 
  });
  
  const { data: pages, isLoading: pagesLoading } = useListPages(projectId, {
    query: { enabled: !!projectId, queryKey: getListPagesQueryKey(projectId) }
  });

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createPage = useCreatePage();
  const deletePage = useDeletePage();

  const forge = useForgeGenerate(projectId, () => {
    queryClient.invalidateQueries({ queryKey: getListPagesQueryKey(projectId) });
    queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    toast({ title: "Site forged", description: "All pages have been generated. Open the editor to preview." });
  });

  const handleOpenSettings = () => {
    if (project) {
      setEditName(project.name);
      setEditDesc(project.description || "");
      setIsSettingsModalOpen(true);
    }
  };

  const handleSaveSettings = () => {
    if (!editName.trim()) return;
    updateProject.mutate({ id: projectId, data: { name: editName, description: editDesc } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetProjectQueryKey(projectId), data);
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setIsSettingsModalOpen(false);
        toast({ title: "Project updated" });
      }
    });
  };

  const handleStatusChange = (status: "draft" | "published" | "archived") => {
    updateProject.mutate({ id: projectId, data: { status } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetProjectQueryKey(projectId), data);
        toast({ title: "Status updated", description: `Project is now ${status}.` });
      }
    });
  };

  const handleDeleteProject = () => {
    deleteProject.mutate({ id: projectId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: "Project destroyed" });
        setLocation("/projects");
      }
    });
  };

  const handleCreatePage = () => {
    if (!newPageTitle.trim() || !newPageSlug.trim()) return;
    createPage.mutate({ id: projectId, data: { title: newPageTitle, slug: newPageSlug, content: "" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPagesQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        setIsNewPageModalOpen(false);
        setNewPageTitle("");
        setNewPageSlug("");
        toast({ title: "Page forged" });
      }
    });
  };

  const handleDeletePage = (pageId: number) => {
    deletePage.mutate({ id: projectId, pageId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPagesQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        toast({ title: "Page removed" });
      }
    });
  };

  if (projectLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Inspecting the artifact...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Artifact Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">This project does not exist or has been destroyed.</p>
        <Link href="/projects"><Button>Return to Arsenal</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
      </div>

      {/* Project Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
            <Badge variant="outline" className={
              project.status === 'published' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
              project.status === 'draft' ? 'border-primary/30 text-primary bg-primary/10' : 'border-muted text-muted-foreground'
            }>
              {project.status}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">{project.description || "No description."}</p>
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
            <span className="capitalize border border-border px-2 py-0.5 rounded-sm bg-muted/50">{project.template} template</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={project.status} onValueChange={(val: "draft" | "published" | "archived") => handleStatusChange(val)} disabled={updateProject.isPending}>
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft"><div className="flex items-center"><Edit3 className="w-4 h-4 mr-2 text-primary" /> Draft</div></SelectItem>
              <SelectItem value="published"><div className="flex items-center"><Globe className="w-4 h-4 mr-2 text-green-500" /> Publish</div></SelectItem>
              <SelectItem value="archived"><div className="flex items-center"><Archive className="w-4 h-4 mr-2 text-muted-foreground" /> Archive</div></SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleOpenSettings} className="bg-background">
            <Settings className="w-4 h-4 mr-2" /> Settings
          </Button>
        </div>
      </div>

      {/* Forge Generation Panel */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-primary/15 shrink-0 mt-0.5">
              <Flame className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground mb-1">Generate with Forge</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Describe your site and Forge will craft complete HTML for every page — ready to preview instantly.
                {pages && pages.length === 0 && <span className="text-amber-500 ml-1">Add at least one page below first.</span>}
              </p>
              
              {forge.status === "idle" || forge.status === "error" ? (
                <div className="space-y-3">
                  <Textarea
                    value={forgePrompt}
                    onChange={(e) => setForgePrompt(e.target.value)}
                    placeholder={`Describe your ${project.template.toLowerCase()} site — style, purpose, audience, feel. The more vivid, the better Forge can shape it.`}
                    className="min-h-[100px] bg-background/60 border-border resize-none"
                    disabled={!pages || pages.length === 0}
                  />
                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={() => forge.generate(forgePrompt)}
                      disabled={!forgePrompt.trim() || !pages || pages.length === 0}
                      className="bg-primary text-primary-foreground"
                    >
                      <Flame className="w-4 h-4 mr-2" /> Forge the Site
                    </Button>
                    {forge.status === "error" && (
                      <span className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Something went wrong
                      </span>
                    )}
                  </div>
                </div>
              ) : forge.status === "generating" ? (
                <div className="space-y-3">
                  <div className="bg-background/60 rounded-lg border border-border p-4 space-y-2 min-h-[80px]">
                    {forge.log.map((line, i) => (
                      <div key={i} className={cn("text-sm flex items-start gap-2", i === forge.log.length - 1 ? "text-foreground" : "text-muted-foreground")}>
                        {i === forge.log.length - 1 ? (
                          <Loader2 className="w-3 h-3 mt-0.5 shrink-0 animate-spin text-primary" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-primary/60" />
                        )}
                        {line}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Forge is working — this takes a moment per page...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-background/60 rounded-lg border border-border p-4 space-y-2">
                    {forge.log.map((line, i) => (
                      <div key={i} className="text-sm flex items-start gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-green-500" />
                        {line}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/projects/${projectId}/editor`}>
                      <Button className="bg-primary text-primary-foreground">
                        Open Editor to Preview
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={forge.reset}>
                      Generate again
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pages Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight flex items-center">
            <FileText className="w-6 h-6 mr-2 text-primary" />
            Pages
          </h2>
          <Dialog open={isNewPageModalOpen} onOpenChange={setIsNewPageModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" /> Add Page
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Forge New Page</DialogTitle>
                <DialogDescription>Create a new page for your project.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Page Title</Label>
                  <Input 
                    id="title" 
                    value={newPageTitle} 
                    onChange={(e) => {
                      setNewPageTitle(e.target.value);
                      setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                    }} 
                    placeholder="e.g. About Us" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input 
                    id="slug" 
                    value={newPageSlug} 
                    onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                    placeholder="e.g. about-us" 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewPageModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCreatePage} disabled={!newPageTitle || !newPageSlug || createPage.isPending}>
                  {createPage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Page"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {pagesLoading ? (
          <div className="grid gap-4">
            {[1, 2].map(i => <div key={i} className="h-20 bg-card border border-border rounded-lg animate-pulse" />)}
          </div>
        ) : pages && pages.length > 0 ? (
          <div className="grid gap-4">
            {pages.sort((a,b) => a.order - b.order).map((page) => (
              <Card key={page.id} className="bg-card border-border hover:border-primary/50 transition-colors group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-muted p-2 rounded-md text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{page.title}</h3>
                      <p className="text-sm text-muted-foreground">/{page.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/projects/${projectId}/editor?pageId=${page.id}`}>
                      <Button variant="secondary" size="sm" className="hidden sm:flex">
                        <Edit3 className="w-4 h-4 mr-2" /> Edit
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/projects/${projectId}/editor?pageId=${page.id}`}>
                          <DropdownMenuItem className="cursor-pointer sm:hidden">
                            <Edit3 className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive cursor-pointer"
                          onClick={() => handleDeletePage(page.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-border rounded-lg bg-card/50">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No pages yet</h3>
            <p className="text-muted-foreground mt-2 mb-6">Add pages, then let Forge generate them.</p>
            <Button variant="outline" onClick={() => setIsNewPageModalOpen(true)}>Add First Page</Button>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
            <DialogDescription>Modify the core attributes of your creation.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Input id="edit-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => { setIsSettingsModalOpen(false); setIsDeleteModalOpen(true); }}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete Project
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsSettingsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveSettings} disabled={!editName.trim() || updateProject.isPending}>Save Changes</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px] border-destructive">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center">
              <Trash2 className="w-5 h-5 mr-2" /> Confirm Destruction
            </DialogTitle>
            <DialogDescription className="text-foreground pt-4">
              Are you sure you want to melt down <strong>{project.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Nevermind</Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={deleteProject.isPending}>
              {deleteProject.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Destroy Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
