import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  MoreVertical, Edit3, Globe, Archive, Clock, Eye 
} from "lucide-react";

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

  const handleOpenSettings = () => {
    if (project) {
      setEditName(project.name);
      setEditDesc(project.description || "");
      setIsSettingsModalOpen(true);
    }
  };

  const handleSaveSettings = () => {
    if (!editName.trim()) return;
    
    updateProject.mutate({ 
      id: projectId, 
      data: { name: editName, description: editDesc } 
    }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetProjectQueryKey(projectId), data);
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setIsSettingsModalOpen(false);
        toast({ title: "Project updated", description: "The project details have been refined." });
      }
    });
  };

  const handleStatusChange = (status: "draft" | "published" | "archived") => {
    updateProject.mutate({ 
      id: projectId, 
      data: { status } 
    }, {
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
        toast({ title: "Project destroyed", description: "The artifact has been melted down." });
        setLocation("/projects");
      }
    });
  };

  const handleCreatePage = () => {
    if (!newPageTitle.trim() || !newPageSlug.trim()) return;
    
    createPage.mutate({ 
      id: projectId, 
      data: { title: newPageTitle, slug: newPageSlug, content: "Start writing..." } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPagesQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        setIsNewPageModalOpen(false);
        setNewPageTitle("");
        setNewPageSlug("");
        toast({ title: "Page forged", description: "A new page has been added to your project." });
      }
    });
  };

  const handleDeletePage = (pageId: number) => {
    deletePage.mutate({ id: projectId, pageId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPagesQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        toast({ title: "Page removed", description: "The page has been deleted." });
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
          <Select 
            value={project.status} 
            onValueChange={(val: any) => handleStatusChange(val)}
            disabled={updateProject.isPending}
          >
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
                      if (!newPageSlug || newPageSlug === newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')) {
                        setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                      }
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
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-card border border-border rounded-lg animate-pulse"></div>
            ))}
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
                        <Edit3 className="w-4 h-4 mr-2" /> Edit Content
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
                          disabled={deletePage.isPending}
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
            <h3 className="text-lg font-medium">No pages exist</h3>
            <p className="text-muted-foreground mt-2 mb-6">A project without pages is like a book without paper.</p>
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
            <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setIsDeleteModalOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete Project
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsSettingsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveSettings} disabled={!editName.trim() || updateProject.isPending}>
                Save Changes
              </Button>
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
              Are you sure you want to melt down <strong>{project.name}</strong>? This action cannot be undone. All pages will be lost to the fire.
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