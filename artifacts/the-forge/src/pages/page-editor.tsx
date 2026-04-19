import { useState, useEffect, useRef, useMemo } from "react";
import { getUserId } from "@/lib/userId";
import { useRoute, Link, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProject,
  useListPages,
  useUpdatePage,
  getGetProjectQueryKey,
  getListPagesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, ArrowLeft, Save, FileText, CheckCircle2,
  AlertCircle, PanelLeft, Eye, Code2, RefreshCw, History,
  Flame, RotateCcw, ChevronDown, ChevronUp, Search
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Revision {
  id: number;
  pageId: number;
  content: string;
  createdAt: string;
}

type RegenStatus = "idle" | "generating" | "done" | "error";
type RightPanel = "regen" | "history" | null;

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useRegenPage(projectId: number, pageId: number | undefined, onDone: (html: string) => void) {
  const [status, setStatus] = useState<RegenStatus>("idle");
  const [log, setLog] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const regen = async (prompt: string, instructions?: string) => {
    if (!pageId || status === "generating") return;
    setStatus("generating");
    setLog([]);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/forge/regenerate-page", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ projectId, pageId, prompt, instructions: instructions || undefined }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Connection failed");
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
            const event = JSON.parse(line.slice(6));
            if (event.type === "subscription_required") {
              const msg = event.error ?? "You need an active Forge subscription.";
              const url = event.subscribeUrl ?? "https://thepeoplestownsq.com/moons/forge?ref=forge";
              setLog(prev => [...prev, `🔒 ${msg} → ${url}`]);
              setStatus("error");
              return;
            } else if (event.type === "thinking") setLog(prev => [...prev, event.content]);
            else if (event.type === "done" && event.html) { setStatus("done"); onDone(event.html); return; }
            else if (event.type === "error") { setLog(prev => [...prev, event.message]); setStatus("error"); return; }
          } catch { /* ignore */ }
        }
      }
      setStatus("done");
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") { setStatus("error"); }
    }
  };

  return { status, log, regen, reset: () => { setStatus("idle"); setLog([]); } };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PageEditor() {
  const [, params] = useRoute("/projects/:id/editor");
  const searchStr = useSearch();
  const pageIdParam = new URLSearchParams(searchStr).get("pageId");

  const projectId = params?.id ? parseInt(params.id) : 0;
  const activePageId = pageIdParam ? parseInt(pageIdParam) : null;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  const [seoOpen, setSeoOpen] = useState(false);
  const [regenInstructions, setRegenInstructions] = useState("");
  const [regenPrompt, setRegenPrompt] = useState("");
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);

  const initializedForPageId = useRef<number | null>(null);
  const lastSaved = useRef({ title: "", content: "", metaTitle: "", metaDescription: "" });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });

  const { data: pages, isLoading: pagesLoading } = useListPages(projectId, {
    query: { enabled: !!projectId, queryKey: getListPagesQueryKey(projectId) },
  });

  const activePage = useMemo(
    () => pages?.find(p => p.id === activePageId) || pages?.[0],
    [pages, activePageId]
  );

  const updatePage = useUpdatePage();

  const regen = useRegenPage(projectId, activePage?.id, (html) => {
    setContent(html);
    setViewMode("preview");
    queryClient.invalidateQueries({ queryKey: getListPagesQueryKey(projectId) });
    toast({ title: "Page reforged", description: "Fresh content is ready — check the preview." });
  });

  useEffect(() => {
    if (activePage && initializedForPageId.current !== activePage.id) {
      initializedForPageId.current = activePage.id;
      setTitle(activePage.title);
      setContent(activePage.content || "");
      setMetaTitle((activePage as { metaTitle?: string | null }).metaTitle || "");
      setMetaDescription((activePage as { metaDescription?: string | null }).metaDescription || "");
      lastSaved.current = {
        title: activePage.title,
        content: activePage.content || "",
        metaTitle: (activePage as { metaTitle?: string | null }).metaTitle || "",
        metaDescription: (activePage as { metaDescription?: string | null }).metaDescription || "",
      };
      setSaveStatus("idle");
      setViewMode("edit");
      setRightPanel(null);
      regen.reset();
    }
  }, [activePage]);

  const handleSave = () => {
    if (!activePage) return;
    setSaveStatus("saving");
    updatePage.mutate({
      id: projectId,
      pageId: activePage.id,
      data: { title, content, ...(metaTitle !== undefined && { metaTitle }), ...(metaDescription !== undefined && { metaDescription }) } as Parameters<typeof updatePage.mutate>[0]["data"],
    }, {
      onSuccess: (updated) => {
        lastSaved.current = { title, content, metaTitle, metaDescription };
        setSaveStatus("saved");
        queryClient.setQueryData(getListPagesQueryKey(projectId), (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return old.map((p: { id: number }) => p.id === activePage.id ? { ...p, ...updated } : p);
        });
        setTimeout(() => setSaveStatus("idle"), 2000);
      },
      onError: () => {
        setSaveStatus("error");
        toast({ variant: "destructive", title: "Save failed" });
      },
    });
  };

  useEffect(() => {
    if (initializedForPageId.current !== activePage?.id) return;
    const changed = title !== lastSaved.current.title || content !== lastSaved.current.content ||
      metaTitle !== lastSaved.current.metaTitle || metaDescription !== lastSaved.current.metaDescription;
    if (changed) {
      setSaveStatus("idle");
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(handleSave, 1800);
    }
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [title, content, metaTitle, metaDescription, activePage?.id]);

  const loadRevisions = async () => {
    if (!activePage) return;
    setRevisionsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages/${activePage.id}/revisions`);
      const data = await res.json();
      setRevisions(Array.isArray(data) ? data : []);
    } catch { setRevisions([]); }
    setRevisionsLoading(false);
  };

  const handleOpenHistory = () => {
    setRightPanel(p => p === "history" ? null : "history");
    loadRevisions();
  };

  const handleRestoreRevision = async (rev: Revision) => {
    if (!activePage) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/pages/${activePage.id}/revisions/${rev.id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setContent(updated.content);
      lastSaved.current = { ...lastSaved.current, content: updated.content };
      queryClient.invalidateQueries({ queryKey: getListPagesQueryKey(projectId) });
      toast({ title: "Revision restored" });
      loadRevisions();
    } catch {
      toast({ variant: "destructive", title: "Could not restore revision" });
    }
  };

  const isHtml = content.trimStart().startsWith("<!") || content.trimStart().startsWith("<html") || content.includes("<body");

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
      {/* Left Sidebar */}
      <div className={cn(
        "w-64 bg-sidebar border-r border-border flex flex-col transition-all duration-300 shrink-0",
        isSidebarOpen ? "translate-x-0 ml-0" : "-translate-x-full -ml-64"
      )}>
        <div className="p-4 border-b border-border">
          <Link href={`/projects/${projectId}`} className="text-sm font-semibold hover:text-primary transition-colors flex items-center">
            <ArrowLeft className="w-3 h-3 mr-2 shrink-0" />
            <span className="truncate">{project.name}</span>
          </Link>
        </div>
        <div className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">Pages</div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {pages.sort((a, b) => a.order - b.order).map(page => (
            <Link key={page.id} href={`/projects/${projectId}/editor?pageId=${page.id}`}>
              <button className={cn(
                "w-full flex items-center text-left px-3 py-2 rounded-md text-sm transition-colors",
                activePage?.id === page.id
                  ? "bg-primary/20 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-muted"
              )}>
                <FileText className={cn("w-4 h-4 mr-2 shrink-0", activePage?.id === page.id ? "text-primary" : "text-muted-foreground")} />
                <span className="truncate">{page.title}</span>
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden relative min-w-0">
        {/* Toolbar */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <PanelLeft className="w-4 h-4" />
            </Button>
            <div className="text-sm text-muted-foreground">
              {saveStatus === "saving" && <span className="flex items-center"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving…</span>}
              {saveStatus === "saved" && <span className="flex items-center text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Saved</span>}
              {saveStatus === "error" && <span className="flex items-center text-destructive"><AlertCircle className="w-3 h-3 mr-1" /> Error</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-md p-0.5">
              <button
                onClick={() => setViewMode("edit")}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                  viewMode === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              ><Code2 className="w-3 h-3" /> Edit</button>
              <button
                onClick={() => setViewMode("preview")}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                  viewMode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              ><Eye className="w-3 h-3" /> Preview</button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setRightPanel(p => p === "regen" ? null : "regen")}
              className={cn("bg-background", rightPanel === "regen" && "border-primary/50 text-primary")}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reforge
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenHistory}
              className={cn(rightPanel === "history" && "text-primary bg-primary/10")}
              title="Revision history"
            >
              <History className="w-4 h-4" />
            </Button>

            <Button size="sm" onClick={handleSave} disabled={updatePage.isPending}>
              {updatePage.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>

        {/* Editor / Preview Canvas */}
        {!activePage ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <FileText className="w-12 h-12 opacity-20 mb-4" />
            <p>Select a page to start editing</p>
          </div>
        ) : viewMode === "preview" ? (
          <div className="flex-1 overflow-hidden">
            {isHtml ? (
              <iframe
                key={activePage.id + content.length}
                className="w-full h-full border-0"
                srcDoc={content}
                title={`Preview: ${activePage.title}`}
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center h-full">
                <Eye className="w-12 h-12 opacity-20 mb-4" />
                <p className="text-lg font-medium mb-2">Nothing to preview yet</p>
                <p className="text-sm max-w-sm">Use "Reforge" in the toolbar or "Generate with Forge" on the project page to create HTML for this page.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-8 md:p-12">
              <div className="space-y-6">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent border-none text-4xl md:text-5xl font-bold focus:outline-none focus:ring-0 placeholder:text-muted p-0 text-foreground"
                  placeholder="Page Title"
                />
                <div className="flex items-center text-sm text-muted-foreground border-b border-border/50 pb-4">
                  <span className="bg-muted px-2 py-1 rounded font-mono text-xs">/{activePage.slug}</span>
                  {isHtml && (
                    <><span className="mx-3">•</span><span className="text-primary text-xs font-medium">HTML — use Preview to render</span></>
                  )}
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full min-h-[400px] resize-none bg-transparent border-none focus-visible:ring-0 p-0 text-base leading-relaxed text-foreground font-mono text-sm"
                  placeholder="The page begins here. Pour your thoughts onto the anvil — or use Reforge to generate…"
                />

                {/* SEO Section */}
                <div className="border-t border-border/50 pt-4">
                  <button
                    onClick={() => setSeoOpen(!seoOpen)}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                  >
                    <Search className="w-4 h-4" />
                    SEO Settings
                    {seoOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                  </button>
                  {seoOpen && (
                    <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1.5">Meta Title</label>
                        <Input
                          value={metaTitle}
                          onChange={(e) => setMetaTitle(e.target.value)}
                          placeholder={title || "Page title for search engines"}
                          className="bg-background border-border text-sm"
                          maxLength={60}
                        />
                        <p className="text-xs text-muted-foreground mt-1">{metaTitle.length}/60 characters</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1.5">Meta Description</label>
                        <Textarea
                          value={metaDescription}
                          onChange={(e) => setMetaDescription(e.target.value)}
                          placeholder="A brief description of this page for search results…"
                          className="bg-background border-border text-sm resize-none"
                          rows={3}
                          maxLength={160}
                        />
                        <p className="text-xs text-muted-foreground mt-1">{metaDescription.length}/160 characters</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">Preview</p>
                        <p className="text-blue-400 font-medium truncate">{metaTitle || title || "Page Title"}</p>
                        <p className="text-green-600 text-xs">13moonforge.ai/{activePage.slug}</p>
                        <p className="mt-0.5 truncate">{metaDescription || "No description set."}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Reforge */}
      {rightPanel === "regen" && (
        <div className="w-80 border-l border-border bg-card flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-200">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Reforge Page</span>
            </div>
            <button onClick={() => setRightPanel(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Site Brief</label>
              <Textarea
                value={regenPrompt}
                onChange={(e) => setRegenPrompt(e.target.value)}
                placeholder="Remind Forge of your site's purpose, audience, style…"
                className="text-sm bg-background border-border resize-none min-h-[80px]"
                disabled={regen.status === "generating"}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Refinement Notes <span className="text-muted-foreground/60">(optional)</span></label>
              <Textarea
                value={regenInstructions}
                onChange={(e) => setRegenInstructions(e.target.value)}
                placeholder="e.g. Make it darker, add a testimonials section, use more whitespace…"
                className="text-sm bg-background border-border resize-none min-h-[80px]"
                disabled={regen.status === "generating"}
              />
            </div>

            {(regen.status === "generating" || regen.log.length > 0) && (
              <div className="bg-background rounded-lg border border-border p-3 space-y-2">
                {regen.log.map((line, i) => (
                  <div key={i} className={cn("text-xs flex items-start gap-2", i === regen.log.length - 1 && regen.status === "generating" ? "text-foreground" : "text-muted-foreground")}>
                    {regen.status === "generating" && i === regen.log.length - 1
                      ? <Loader2 className="w-3 h-3 mt-0.5 shrink-0 animate-spin text-primary" />
                      : <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-primary/60" />}
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-border">
            {regen.status === "done" ? (
              <div className="space-y-2">
                <p className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Done — check the preview</p>
                <Button variant="outline" size="sm" className="w-full" onClick={regen.reset}>Reforge again</Button>
              </div>
            ) : (
              <Button
                className="w-full bg-primary text-primary-foreground"
                disabled={regen.status === "generating" || !regenPrompt.trim()}
                onClick={() => regen.regen(regenPrompt, regenInstructions)}
              >
                {regen.status === "generating" ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Forging…</> : <><Flame className="w-3.5 h-3.5 mr-2" /> Reforge this Page</>}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Right Panel: History */}
      {rightPanel === "history" && (
        <div className="w-80 border-l border-border bg-card flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-200">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Revision History</span>
            </div>
            <button onClick={() => setRightPanel(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {revisionsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : revisions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-8 h-8 opacity-30 mx-auto mb-3" />
                <p className="text-sm">No saved revisions yet.</p>
                <p className="text-xs mt-1">Revisions are saved automatically when content changes.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {revisions.map((rev, i) => (
                  <div key={rev.id} className="bg-background border border-border rounded-lg p-3 group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {i === 0 ? "Latest save" : `${i + 1} versions ago`}
                      </span>
                      <span className="text-xs text-muted-foreground/60">
                        {new Date(rev.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-3 font-mono">
                      {rev.content.slice(0, 80)}…
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={() => handleRestoreRevision(rev)}
                    >
                      <RotateCcw className="w-3 h-3 mr-1.5" /> Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
