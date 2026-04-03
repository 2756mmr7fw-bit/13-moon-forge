import { useState, useEffect, useRef, useMemo } from "react";
import { useRoute, Link, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetProject, 
  useListPages, 
  useUpdatePage,
  getGetProjectQueryKey,
  getListPagesQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, ArrowLeft, Save, FileText, CheckCircle2, 
  AlertCircle, Sidebar, Eye, PenTool
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PageEditor() {
  const [, params] = useRoute("/projects/:id/editor");
  const searchStr = useSearch();
  const searchParams = new URLSearchParams(searchStr);
  const pageIdParam = searchParams.get("pageId");
  
  const projectId = params?.id ? parseInt(params.id) : 0;
  const activePageId = pageIdParam ? parseInt(pageIdParam) : null;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  
  // Guard references to prevent infinite loops and track auto-save
  const initializedForPageId = useRef<number | null>(null);
  const lastSaved = useRef({ title: "", content: "" });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, { 
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } 
  });
  
  const { data: pages, isLoading: pagesLoading } = useListPages(projectId, {
    query: { enabled: !!projectId, queryKey: getListPagesQueryKey(projectId) }
  });

  const activePage = useMemo(() => {
    return pages?.find(p => p.id === activePageId) || pages?.[0];
  }, [pages, activePageId]);

  const updatePage = useUpdatePage();

  // Initialization effect
  useEffect(() => {
    if (activePage && initializedForPageId.current !== activePage.id) {
      initializedForPageId.current = activePage.id;
      setTitle(activePage.title);
      setContent(activePage.content || "");
      lastSaved.current = { title: activePage.title, content: activePage.content || "" };
      setSaveStatus("idle");
    }
  }, [activePage]);

  // Manual save handler
  const handleSave = () => {
    if (!activePage) return;
    
    setSaveStatus("saving");
    updatePage.mutate({ 
      id: projectId, 
      pageId: activePage.id,
      data: { title, content } 
    }, {
      onSuccess: (data) => {
        lastSaved.current = { title, content };
        setSaveStatus("saved");
        
        // Patch cache directly to avoid refetch loops
        queryClient.setQueryData(getListPagesQueryKey(projectId), (old: any) => {
          if (!old) return old;
          return old.map((p: any) => p.id === activePage.id ? { ...p, title, content } : p);
        });
        
        setTimeout(() => setSaveStatus("idle"), 2000);
      },
      onError: () => {
        setSaveStatus("error");
        toast({ variant: "destructive", title: "Save Failed", description: "Could not persist your changes." });
      }
    });
  };

  // Auto-save effect
  useEffect(() => {
    if (initializedForPageId.current !== activePage?.id) return;
    
    const hasChanged = title !== lastSaved.current.title || content !== lastSaved.current.content;
    
    if (hasChanged) {
      setSaveStatus("idle"); // reset status on edit
      
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 1500); // Auto-save after 1.5s of inactivity
    }
    
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [title, content, activePage?.id]);

  if (projectLoading || pagesLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project || !pages || pages.length === 0) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background text-center p-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Editor Unavailable</h2>
        <p className="text-muted-foreground mb-6">Project not found or has no pages.</p>
        <Link href={`/projects/${projectId}`}><Button>Return to Project</Button></Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] border border-border rounded-xl overflow-hidden bg-background mt-4 relative z-50">
      {/* Sidebar */}
      <div className={cn(
        "w-64 bg-sidebar border-r border-border flex flex-col transition-all duration-300",
        isSidebarOpen ? "translate-x-0 ml-0" : "-translate-x-full -ml-64"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link href={`/projects/${projectId}`} className="text-sm font-semibold hover:text-primary transition-colors line-clamp-1 flex items-center">
            <ArrowLeft className="w-3 h-3 mr-2" /> {project.name}
          </Link>
        </div>
        <div className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">Pages</div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {pages.sort((a,b) => a.order - b.order).map(page => (
            <Link key={page.id} href={`/projects/${projectId}/editor?pageId=${page.id}`}>
              <button 
                className={cn(
                  "w-full flex items-center text-left px-3 py-2 rounded-md text-sm transition-colors",
                  activePage?.id === page.id 
                    ? "bg-primary/20 text-primary font-medium" 
                    : "text-sidebar-foreground hover:bg-muted"
                )}
              >
                <FileText className={cn("w-4 h-4 mr-2", activePage?.id === page.id ? "text-primary" : "text-muted-foreground")} />
                <span className="truncate">{page.title}</span>
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
        {/* Editor Toolbar */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Sidebar className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center text-sm ml-2 space-x-2">
              {saveStatus === "saving" && <span className="flex items-center text-muted-foreground"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving...</span>}
              {saveStatus === "saved" && <span className="flex items-center text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Saved</span>}
              {saveStatus === "error" && <span className="flex items-center text-destructive"><AlertCircle className="w-3 h-3 mr-1" /> Error</span>}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="hidden md:flex">
              <Eye className="w-4 h-4 mr-2" /> Preview
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updatePage.isPending}>
              {updatePage.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Now
            </Button>
          </div>
        </div>

        {/* Editor Canvas */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8 md:p-12">
            {!activePage ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText className="w-12 h-12 opacity-20 mb-4" />
                <p>Select a page to start editing</p>
              </div>
            ) : (
              <div className="space-y-6">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent border-none text-4xl md:text-5xl font-bold focus:outline-none focus:ring-0 placeholder:text-muted p-0 text-foreground"
                  placeholder="Page Title"
                />
                
                <div className="flex items-center text-sm text-muted-foreground border-b border-border/50 pb-4">
                  <span className="bg-muted px-2 py-1 rounded">/{activePage.slug}</span>
                  <span className="mx-3">•</span>
                  <span className="flex items-center"><PenTool className="w-3 h-3 mr-1" /> Rich text mode</span>
                </div>
                
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full min-h-[500px] resize-none bg-transparent border-none focus-visible:ring-0 p-0 text-lg leading-relaxed text-foreground"
                  placeholder="The page begins here. Pour your thoughts onto the anvil..."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}