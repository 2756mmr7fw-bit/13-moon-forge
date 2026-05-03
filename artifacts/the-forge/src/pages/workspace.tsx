import { useState, useEffect, useRef, useCallback, DragEvent } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { HelpPanel } from "@/components/help-panel";
import { ForgeAgentPanel } from "@/components/forge-agent-panel";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useLocation } from "wouter";
import {
  Folder, FolderOpen, FileText, Target, Calendar, Briefcase,
  LayoutTemplate, File, Plus, Trash2, ChevronRight, ChevronDown,
  Printer, Pencil, Check, X, Loader2, Flame, Send, Star, MoreHorizontal,
  FolderPlus, FilePlus, PackageOpen, Code2, Download, Search, Upload,
  Link, Bot, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface WItem {
  id: number;
  type: string;
  name: string;
  content: string;
  parentId: number | null;
  icon: string;
  color: string;
  pinned: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ size: number; color?: string }>> = {
  folder: Folder,
  document: FileText,
  plan: Calendar,
  blueprint: LayoutTemplate,
  portfolio: Briefcase,
  goal: Target,
  code: Code2,
  pdf: File,
};

const QUICK_CREATES = [
  { label: "New Folder", icon: FolderPlus, prompt: null, type: "folder" },
  { label: "Document", icon: FilePlus, prompt: null, type: "document" },
  { label: "Plan", icon: Calendar, prompt: "Create a project plan template", type: "plan" },
  { label: "Blueprint", icon: LayoutTemplate, prompt: "Create a technical blueprint template", type: "blueprint" },
  { label: "Portfolio", icon: Briefcase, prompt: "Create a portfolio document", type: "portfolio" },
  { label: "Goal Sheet", icon: Target, prompt: "Create a goals and milestones document", type: "goal" },
];

function ItemIcon({ item, open, size = 16 }: { item: WItem; open?: boolean; size?: number }) {
  if (item.type === "folder") {
    const Ic = open ? FolderOpen : Folder;
    return <Ic size={size} color={item.color} />;
  }
  const Ic = TYPE_ICONS[item.type] ?? File;
  return <Ic size={size} color={item.color} />;
}

export default function Workspace() {
  
  const { toast } = useToast();

  const [items, setItems] = useState<WItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WItem | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [forgeInput, setForgeInput] = useState("");
  const [forging, setForging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [activeParent, setActiveParent] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState<number | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [forgingPdf, setForgingPdf] = useState(false);
  const [showAgent, setShowAgent] = useState(false);
  const [agentInitialFileId, setAgentInitialFileId] = useState<number | undefined>();
  const [dragOver, setDragOver] = useState(false);
  const [urlImportMode, setUrlImportMode] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [importingUrl, setImportingUrl] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const multiPdfRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: number; name: string; type: string; snippet: string; parentId: number | null }[]>([]);
  const [searching, setSearching] = useState(false);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    return { "Content-Type": "application/json" };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/workspace`, { headers: await authHeaders(), credentials: "include" });
      if (res.ok) setItems(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (renamingId !== null) renameRef.current?.focus();
  }, [renamingId]);

  // Search
  useEffect(() => {
    if (!searchQ.trim() || searchQ.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API_BASE}/api/workspace/search?q=${encodeURIComponent(searchQ)}`, { headers });
        if (res.ok) setSearchResults(await res.json());
      } catch { /* silent */ }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQ, authHeaders]);

  // Build tree
  const roots = items.filter(i => !i.parentId);
  const children = (parentId: number) => items.filter(i => i.parentId === parentId);

  async function forgeCreate() {
    if (!forgeInput.trim() || forging) return;

    // Detect leaving / export intent — Forge helps you take everything
    const leavingKeywords = /\b(leave|leaving|export|download|take my|pack|backup|back.?up|migrate|move my|get my files|i'm done|im done|switching away)\b/i;
    if (leavingKeywords.test(forgeInput)) {
      setForgeInput("");
      toast({
        title: "Forge has your back",
        description: "Downloading your entire workspace as a ZIP — all your files, folders, and documents.",
      });
      await exportAll();
      return;
    }

    setForging(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/workspace/forge`, {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: forgeInput.trim(), parentId: activeParent }),
      });
      if (!res.ok) throw new Error("Failed");
      const item: WItem = await res.json();
      setItems(prev => [...prev, item]);
      setSelected(item);
      setForgeInput("");
      if (item.parentId) setExpanded(prev => new Set([...prev, item.parentId!]));
      toast({ title: `${item.name} created`, description: `Forge built your ${item.type}.` });
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Forge couldn't create that. Try again." });
    } finally { setForging(false); }
  }

  async function uploadPdf(file: File) {
    if (!file || file.type !== "application/pdf") return;
    setUploadingPdf(true);
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/workspace/upload-pdf`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: file.name, dataUri, parentId: activeParent }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const item: WItem = await res.json();
      setItems(prev => [...prev, item]);
      setSelected(item);
      if (item.parentId) setExpanded(prev => new Set([...prev, item.parentId!]));
      toast({ title: `${file.name} saved`, description: "PDF is in your Workspace. Click 'Forge It!' to analyze it." });
    } catch {
      toast({ variant: "destructive", title: "Upload failed", description: "Could not save PDF. Try again." });
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  }

  async function uploadMultiplePdfs(files: FileList | File[]) {
    const pdfs = Array.from(files).filter(f => f.type === "application/pdf");
    if (pdfs.length === 0) return;
    setUploadingPdf(true);
    let uploaded = 0;
    for (const file of pdfs) {
      try {
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const headers = await authHeaders();
        const res = await fetch(`${API_BASE}/api/workspace/upload-pdf`, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: file.name, dataUri, parentId: activeParent }),
        });
        if (res.ok) {
          const item: WItem = await res.json();
          setItems(prev => [...prev, item]);
          if (pdfs.length === 1) setSelected(item);
          uploaded++;
        }
      } catch { /* continue */ }
    }
    setUploadingPdf(false);
    if (uploaded > 0) {
      toast({ title: `${uploaded} PDF${uploaded > 1 ? "s" : ""} uploaded`, description: "Open any PDF and click 'Forge It!' to analyze it." });
    }
    if (multiPdfRef.current) multiPdfRef.current.value = "";
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  }

  async function importFromUrl() {
    const url = urlInput.trim();
    if (!url || importingUrl) return;
    setImportingUrl(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/workspace/import-url`, {
        method: "POST",
        headers,
        body: JSON.stringify({ url, parentId: activeParent }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error ?? "Import failed");
      }
      const item: WItem = await res.json();
      setItems(prev => [...prev, item]);
      setSelected(item);
      setUrlInput("");
      setUrlImportMode(false);
      toast({ title: `Imported: ${item.name}`, description: "PDF saved to your Workspace. Click 'Forge It!' to analyze it." });
    } catch (err) {
      toast({ variant: "destructive", title: "Import failed", description: err instanceof Error ? err.message : "Could not fetch that URL." });
    } finally { setImportingUrl(false); }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragOver(true); }
  }
  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
  }
  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) await uploadMultiplePdfs(files);
  }

  async function forgePdf(item: WItem) {
    if (forgingPdf) return;
    setForgingPdf(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/workspace/${item.id}/forge-pdf`, {
        method: "POST",
        headers,
        body: JSON.stringify({ parentId: item.parentId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed");
      }
      const newDoc: WItem = await res.json();
      setItems(prev => [...prev, newDoc]);
      setSelected(newDoc);
      if (newDoc.parentId) setExpanded(prev => new Set([...prev, newDoc.parentId!]));
      toast({ title: "Forge analysis ready!", description: `"${newDoc.name}" created in your Workspace.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't read PDF", description: err instanceof Error ? err.message : "Try again." });
    } finally {
      setForgingPdf(false);
    }
  }

  async function quickCreate(type: string, prompt: string | null) {
    const name = type === "folder" ? "New Folder"
      : type === "document" ? "New Document"
      : prompt ?? `New ${type}`;

    if (prompt) {
      setForgeInput(prompt);
      return;
    }

    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/workspace`, {
        method: "POST",
        headers,
        body: JSON.stringify({ type, name, parentId: activeParent }),
      });
      if (!res.ok) throw new Error();
      const item: WItem = await res.json();
      setItems(prev => [...prev, item]);
      setSelected(item);
      setRenamingId(item.id);
      setRenameVal(item.name);
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Could not create item." });
    }
  }

  async function saveContent() {
    if (!selected) return;
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/workspace/${selected.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error();
      const updated: WItem = await res.json();
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      setSelected(updated);
      setEditing(false);
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Could not save." });
    }
  }

  async function renameItem(id: number) {
    if (!renameVal.trim()) { setRenamingId(null); return; }
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/workspace/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ name: renameVal.trim() }),
      });
      if (!res.ok) throw new Error();
      const updated: WItem = await res.json();
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      if (selected?.id === id) setSelected(updated);
    } catch { /* silent */ }
    finally { setRenamingId(null); }
  }

  async function deleteItem(id: number) {
    try {
      const headers = await authHeaders();
      await fetch(`${API_BASE}/api/workspace/${id}`, { method: "DELETE", headers });
      setItems(prev => prev.filter(i => i.id !== id && i.parentId !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Could not delete." });
    }
    setShowMenu(null);
  }

  async function togglePin(item: WItem) {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/workspace/${item.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ pinned: !item.pinned }),
      });
      const updated: WItem = await res.json();
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch { /* silent */ }
    setShowMenu(null);
  }

  function exportPDF() {
    if (!selected || selected.type === "folder") return;
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`<!DOCTYPE html><html><head><title>${selected.name}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.7; }
  h1,h2,h3 { font-weight: 700; margin-top: 1.5em; }
  h1 { font-size: 2em; border-bottom: 2px solid #e8611a; padding-bottom: 0.3em; }
  h2 { font-size: 1.4em; color: #333; }
  pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; }
  code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; font-size: 0.9em; }
  ul,ol { padding-left: 1.5em; }
  table { border-collapse: collapse; width: 100%; }
  th,td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f9f9f9; font-weight: 600; }
  blockquote { border-left: 4px solid #e8611a; padding-left: 1em; color: #555; margin: 1em 0; }
  .header { margin-bottom: 2em; }
  .meta { color: #888; font-size: 0.85em; margin-top: 4px; }
  @media print { body { margin: 20px auto; } }
</style></head><body>
<div class="header">
  <h1>${selected.name}</h1>
  <p class="meta">Created by 13 Moon Forge · ${new Date(selected.createdAt).toLocaleDateString()}</p>
</div>
${markdownToHtml(selected.content ?? "")}
</body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 300);
  }

  function markdownToHtml(md: string): string {
    return md
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)+/g, "<ul>$&</ul>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(?!<[hbupol])/gm, "<p>")
      .replace(/<p>(<[hbupol])/g, "$1");
  }

  function TreeItem({ item, depth }: { item: WItem; depth: number }) {
    const isOpen = expanded.has(item.id);
    const kids = children(item.id);
    const isFolder = item.type === "folder";
    const isSelected = selected?.id === item.id;
    const isRenaming = renamingId === item.id;

    return (
      <div>
        <div
          className={cn(
            "group flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer text-sm transition-colors relative",
            isSelected ? "bg-primary/15 text-foreground" : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => {
            if (isFolder) {
              setExpanded(prev => {
                const next = new Set(prev);
                next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                return next;
              });
              setActiveParent(item.id);
            } else {
              setSelected(item);
              setEditing(false);
              setActiveParent(item.parentId);
            }
          }}
        >
          {isFolder && (
            <span className="shrink-0">
              {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          )}
          {!isFolder && <span className="w-3 shrink-0" />}

          <ItemIcon item={item} open={isOpen} size={14} />

          {isRenaming ? (
            <input
              ref={renameRef}
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") renameItem(item.id);
                if (e.key === "Escape") setRenamingId(null);
              }}
              onBlur={() => renameItem(item.id)}
              className="flex-1 bg-background border border-primary/40 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 truncate text-xs font-medium">
              {item.name}
              {item.pinned && <Star size={9} className="inline ml-1 fill-yellow-400 text-yellow-400" />}
            </span>
          )}

          <div className="opacity-0 group-hover:opacity-100 shrink-0" onClick={e => { e.stopPropagation(); setShowMenu(showMenu === item.id ? null : item.id); }}>
            <MoreHorizontal size={12} />
          </div>

          {showMenu === item.id && (
            <div className="absolute right-0 top-full mt-0.5 z-30 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[140px] text-xs">
              <button className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                onClick={e => { e.stopPropagation(); setRenamingId(item.id); setRenameVal(item.name); setShowMenu(null); }}>
                <Pencil size={11} /> Rename
              </button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                onClick={e => { e.stopPropagation(); togglePin(item); }}>
                <Star size={11} /> {item.pinned ? "Unpin" : "Pin"}
              </button>
              {item.type !== "folder" && (
                <button className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                  onClick={e => { e.stopPropagation(); setSelected(item); exportPDF(); setShowMenu(null); }}>
                  <Printer size={11} /> Export PDF
                </button>
              )}
              {item.type !== "folder" && item.content && !item.content.startsWith("data:") && (
                <>
                  <div className="border-t border-border my-1" />
                  <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Send to Moon</p>
                  {[
                    { label: "Flint · Brainstorm", href: "/brainstorm" },
                    { label: "Sage · Learn", href: "/sage" },
                    { label: "Hawk · Find", href: "/hawk" },
                  ].map(moon => (
                    <button key={moon.href}
                      className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-primary/80"
                      onClick={e => {
                        e.stopPropagation();
                        localStorage.setItem("forge:workspace:pending", JSON.stringify({
                          moonId: moon.label,
                          content: item.content,
                          filename: item.name,
                        }));
                        navigate(moon.href);
                        setShowMenu(null);
                      }}>
                      <Flame size={11} /> {moon.label}
                    </button>
                  ))}
                </>
              )}
              <div className="border-t border-border my-1" />
              <button className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center gap-2"
                onClick={e => { e.stopPropagation(); deleteItem(item.id); }}>
                <Trash2 size={11} /> Delete
              </button>
            </div>
          )}
        </div>

        {isFolder && isOpen && kids.map(k => <TreeItem key={k.id} item={k} depth={depth + 1} />)}
      </div>
    );
  }

  const pinnedItems = items.filter(i => i.pinned);

  async function exportAll() {
    if (items.filter(i => i.type !== "folder").length === 0) {
      toast({ title: "Nothing to export yet", description: "Create some files first and they'll be included in the download." });
      return;
    }
    const zip = new JSZip();
    for (const item of items) {
      if (item.type === "folder") continue;
      const parent = items.find(i => i.id === item.parentId);
      const dir = parent ? `${parent.name}/` : "";

      // Binary files stored as data URIs (e.g. emailed PDFs/ZIPs)
      if (item.type === "file" && item.content?.startsWith("data:")) {
        const base64 = item.content.split(",")[1] ?? "";
        zip.file(`${dir}${item.name}`, base64, { base64: true });
        continue;
      }

      const ext = "md";
      const filename = `${dir}${item.name}.${ext}`;
      const header = `# ${item.name}\n_Type: ${item.type} · Created: ${new Date(item.createdAt).toLocaleDateString()}_\n\n`;
      zip.file(filename, header + (item.content ?? ""));
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const date = new Date().toISOString().slice(0, 10);
    saveAs(blob, `forge-workspace-${date}.zip`);
    toast({ title: "Downloaded!", description: `${items.filter(i => i.type !== "folder").length} files packed into your ZIP.` });
  }

  return (
    <div
      className={cn("flex gap-0 -mx-4 -mt-4 h-[calc(100vh-80px)] overflow-hidden rounded-xl border transition-colors",
        dragOver ? "border-primary/60 bg-primary/5" : "border-border",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-over overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none rounded-xl bg-primary/10 border-2 border-dashed border-primary/60">
          <Upload size={40} className="text-primary mb-3 opacity-80" />
          <p className="text-lg font-bold text-primary">Drop PDFs here</p>
          <p className="text-sm text-muted-foreground mt-1">Multiple files supported</p>
        </div>
      )}

      {/* ── Left: File Tree ──────────────────────────────────────────────── */}
      <div className="w-64 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm">Workspace</h2>
            <div className="flex items-center gap-1">
              <HelpPanel
                config={{
                  title: "Your Workspace",
                  moon: { name: "Cypress · Moon #8", color: "#10b981", tagline: "Build it. Save it. Own it." },
                  what: "The Workspace is your secure vault. Every document, plan, or output you save here is stored in your account. Use it to organize your work across sessions — notes, project plans, AI outputs, uploaded PDFs, anything.",
                  when: "Use the Workspace whenever you want to save, organize, or revisit your work. Files persist between sessions. You can upload PDFs, analyze them with AI, and pack your whole Workspace as a ZIP any time.",
                  examples: [
                    "Save a business plan for a food truck business I'm planning",
                    "Upload a PDF contract and have the AI summarize the key risks",
                    "Start a new project plan for my e-commerce idea",
                  ],
                  tips: [
                    "Use Quick Creates (New Doc, New Plan, etc.) in the sidebar to start something fast",
                    "Upload PDF then hit 'Forge It!' to get an AI summary of any document",
                    "'Pack My Bags' (box icon) downloads your entire Workspace as a ZIP",
                  ],
                }}
              />
              <button
                onClick={exportAll}
                title="Pack My Bags — download everything as a ZIP"
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
              >
                <PackageOpen size={14} />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Your failsafe safe — we hold it, you own it</p>
          {/* Search */}
          <div className="relative mt-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search files…"
              className="w-full bg-muted border border-border rounded-md pl-7 pr-3 py-1.5 text-xs outline-none focus:border-primary/50 placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Quick creates */}
        <div className="px-2 py-2 border-b border-border">
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files?.length) uploadMultiplePdfs(e.target.files); }}
          />
          <input
            ref={multiPdfRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files?.length) uploadMultiplePdfs(e.target.files); }}
          />
          <div className="grid grid-cols-3 gap-1">
            {QUICK_CREATES.map(q => (
              <button
                key={q.label}
                onClick={() => quickCreate(q.type, q.prompt)}
                className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                <q.icon size={14} />
                <span className="text-[9px] leading-tight">{q.label}</span>
              </button>
            ))}
            <button
              onClick={() => pdfInputRef.current?.click()}
              disabled={uploadingPdf}
              className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-primary/10 text-primary/70 hover:text-primary transition-colors text-center disabled:opacity-50"
              title="Upload PDFs from your computer (multiple supported)"
            >
              {uploadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              <span className="text-[9px] leading-tight">Upload PDF</span>
            </button>
            <button
              onClick={() => setUrlImportMode(v => !v)}
              className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-primary/10 text-primary/70 hover:text-primary transition-colors text-center"
              title="Import a PDF from a URL"
            >
              <Link size={14} />
              <span className="text-[9px] leading-tight">From URL</span>
            </button>
            <button
              onClick={() => { setShowAgent(true); setSelected(null); }}
              className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-primary/10 text-primary/70 hover:text-primary transition-colors text-center"
              title="Open Forge Agent — AI that takes full control"
            >
              <Bot size={14} />
              <span className="text-[9px] leading-tight">Forge Agent</span>
            </button>
          </div>

          {/* URL import input */}
          {urlImportMode && (
            <div className="mt-2 space-y-1.5">
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && importFromUrl()}
                placeholder="https://example.com/doc.pdf"
                className="w-full bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/60"
                autoFocus
              />
              <div className="flex gap-1">
                <button
                  onClick={importFromUrl}
                  disabled={!urlInput.trim() || importingUrl}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary text-white text-[10px] font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {importingUrl ? <Loader2 size={10} className="animate-spin" /> : <Link size={10} />}
                  Import
                </button>
                <button
                  onClick={() => { setUrlImportMode(false); setUrlInput(""); }}
                  className="px-2.5 py-1.5 rounded-lg border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tree / Search results */}
        <div className="flex-1 overflow-y-auto px-1 py-2" onClick={() => setShowMenu(null)}>
          {searchQ.trim().length >= 2 ? (
            /* ── Search results ── */
            searching ? (
              <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" size={16} /></div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8 px-3">
                <Search size={20} className="text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs text-muted-foreground">No files match "{searchQ}"</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {searchResults.map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      const found = items.find(i => i.id === r.id);
                      if (found) { setSelected(found); setSearchQ(""); }
                    }}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <FileText size={10} className="text-muted-foreground shrink-0" />
                      <span className="text-xs font-medium truncate">{r.name}</span>
                    </div>
                    {r.snippet && (
                      <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 pl-4">{r.snippet}</p>
                    )}
                  </button>
                ))}
              </div>
            )
          ) : loading ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" size={18} /></div>
          ) : (
            <>
              {pinnedItems.length > 0 && (
                <div className="mb-2">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground px-2 mb-1">Pinned</p>
                  {pinnedItems.map(item => <TreeItem key={item.id} item={item} depth={0} />)}
                  <div className="border-b border-border my-2" />
                </div>
              )}
              {roots.length === 0 && (
                <div className="text-center py-8 px-3">
                  <Flame size={24} className="text-primary mx-auto mb-2 opacity-60" />
                  <p className="text-xs text-muted-foreground mb-1">Tell Forge what to create below</p>
                  <p className="text-[10px] text-muted-foreground/60 leading-relaxed">Your failsafe safe — we hold onto everything until you decide to delete it</p>
                </div>
              )}
              {roots.map(item => <TreeItem key={item.id} item={item} depth={0} />)}
            </>
          )}
        </div>

        {/* Forge input */}
        <div className="border-t border-border p-2 bg-card/80">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Flame size={11} className="text-primary shrink-0" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Ask Forge</span>
            </div>
            <textarea
              value={forgeInput}
              onChange={e => setForgeInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); forgeCreate(); } }}
              placeholder="Create a 90-day business plan… build a client portfolio… make a folder for Client Work…"
              rows={3}
              className="w-full text-xs bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/60 text-foreground"
              disabled={forging}
            />
            <div className="flex items-center justify-between mt-1">
              {activeParent && (
                <span className="text-[9px] text-muted-foreground">
                  in: {items.find(i => i.id === activeParent)?.name}
                  <button className="ml-1 hover:text-foreground" onClick={() => setActiveParent(null)}>✕</button>
                </span>
              )}
              <button
                onClick={forgeCreate}
                disabled={!forgeInput.trim() || forging}
                className="ml-auto p-1.5 rounded-lg bg-primary text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {forging ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Document Viewer / Forge Agent ─────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Forge Agent Panel */}
        {showAgent ? (
          <ForgeAgentPanel
            items={items}
            initialFileId={agentInitialFileId}
            onFileCreated={item => {
              setItems(prev => {
                const exists = prev.find(i => i.id === item.id);
                return exists ? prev.map(i => i.id === item.id ? item : i) : [...prev, item];
              });
            }}
            onOpenFile={item => { setSelected(item); setShowAgent(false); if (item.parentId) setExpanded(prev => new Set([...prev, item.parentId!])); }}
            onClose={() => { setShowAgent(false); setAgentInitialFileId(undefined); }}
          />
        ) : selected && selected.type !== "folder" ? (
          <>
            {/* Doc toolbar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-card shrink-0">
              <ItemIcon item={selected} size={18} />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm truncate">{selected.name}</h3>
                <p className="text-[10px] text-muted-foreground capitalize">{selected.type} · {new Date(selected.updatedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {(selected.type === "pdf" || selected.type === "file") && selected.content?.startsWith("data:") ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = selected.content ?? "";
                      a.download = selected.name;
                      a.click();
                    }}
                  >
                    <Download size={13} className="mr-1" /> Download
                  </Button>
                ) : editing ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(false); }}>
                      <X size={13} className="mr-1" /> Cancel
                    </Button>
                    <Button size="sm" className="bg-primary text-white" onClick={saveContent}>
                      <Check size={13} className="mr-1" /> Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(true); setEditContent(selected.content ?? ""); }}>
                      <Pencil size={13} className="mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportPDF}>
                      <Printer size={13} className="mr-1" /> PDF
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Doc content */}
            <div className="flex-1 overflow-y-auto">
              {(selected.type === "pdf" || selected.type === "file") && selected.content?.startsWith("data:") ? (
                // Binary / PDF file — viewer with Forge analysis option
                (() => {
                  const mime = selected.content.split(";")[0].replace("data:", "");
                  const isPdf = mime.includes("pdf") || selected.type === "pdf";
                  return (
                    <div className="flex flex-col h-full">
                      {isPdf && (
                        <iframe
                          src={selected.content}
                          className="w-full flex-1 border-0"
                          title={selected.name}
                        />
                      )}
                      <div className={`flex flex-col items-center gap-4 p-6 ${isPdf ? "border-t border-border bg-card/60" : "justify-center flex-1"}`}>
                        {!isPdf && (
                          <>
                            <div className="text-5xl">📁</div>
                            <div className="text-center">
                              <h3 className="font-bold text-lg">{selected.name}</h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                {mime.includes("zip") ? "ZIP Archive" : mime.includes("word") || mime.includes("docx") ? "Word Document" : "Binary File"}
                                {" · "}{selected.type === "pdf" ? "Uploaded" : "Received via email"}
                              </p>
                            </div>
                          </>
                        )}
                        <div className="flex items-center gap-3 flex-wrap justify-center">
                          {isPdf && (
                            <>
                              <Button
                                onClick={() => forgePdf(selected)}
                                disabled={forgingPdf}
                                className="bg-primary text-white gap-2 text-sm px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-60"
                              >
                                {forgingPdf
                                  ? <><Loader2 size={15} className="animate-spin mr-1" /> Forge is reading…</>
                                  : <><Flame size={15} className="mr-1" /> Forge It! — Analyze This PDF</>
                                }
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setAgentInitialFileId(selected.id); setShowAgent(true); }}
                                className="gap-2"
                              >
                                <Bot size={13} />
                                Ask Forge About This
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const a = document.createElement("a");
                              a.href = selected.content ?? "";
                              a.download = selected.name;
                              a.click();
                            }}
                            className="gap-2"
                          >
                            <Download size={13} />
                            Download
                          </Button>
                        </div>
                        {isPdf && !forgingPdf && (
                          <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
                            Forge will read the full document and create a summary, key points, and analysis — saved right here in your Workspace.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : editing ? (
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full h-full p-6 text-sm font-mono bg-background text-foreground resize-none focus:outline-none leading-relaxed"
                  placeholder="Write markdown here…"
                  autoFocus
                />
              ) : (
                <div className="p-6 max-w-3xl mx-auto">
                  {selected.content ? (
                    <div className="prose prose-invert prose-sm max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-base prose-p:leading-relaxed prose-li:leading-relaxed prose-pre:bg-muted prose-code:bg-muted prose-code:px-1 prose-code:rounded">
                      <ReactMarkdown>{selected.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <ItemIcon item={selected} size={40} />
                      <p className="text-muted-foreground text-sm mt-4">This document is empty. Click Edit to start writing.</p>
                      <Button className="mt-4 bg-primary text-white" size="sm" onClick={() => { setEditing(true); setEditContent(""); }}>
                        <Pencil size={13} className="mr-1" /> Start writing
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : selected?.type === "folder" ? (
          <div className="flex-1 flex items-center justify-center text-center p-12">
            <div>
              <FolderOpen size={48} className="mx-auto mb-4 opacity-40" style={{ color: selected.color }} />
              <h3 className="font-bold text-lg">{selected.name}</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4">
                {children(selected.id).length === 0
                  ? "This folder is empty. Ask Forge to create something inside it."
                  : `${children(selected.id).length} item${children(selected.id).length !== 1 ? "s" : ""} inside`}
              </p>
              <Button
                size="sm"
                className="bg-primary text-white"
                onClick={() => setForgeInput(`Create a document inside ${selected.name}: `)}
              >
                <Plus size={13} className="mr-1" /> Add to folder
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-12">
            <div className="max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Flame size={28} className="text-primary" />
              </div>
              <h3 className="font-bold text-xl mb-2">Forge Workspace</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Your failsafe safe. Forge creates, analyzes, and organizes everything — you own it forever.
              </p>

              {/* Forge Agent CTA */}
              <button
                onClick={() => setShowAgent(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/30 hover:border-primary/60 hover:bg-primary/15 transition-all mb-4 text-left"
              >
                <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm text-primary">Open Forge Agent</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Import, analyze, create — Forge takes action</p>
                </div>
              </button>

              {/* Getting PDFs */}
              <div className="rounded-xl bg-muted/40 border border-border p-3 mb-4 text-left space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Getting PDFs here</p>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Upload size={11} className="shrink-0 mt-0.5 text-primary/70" />
                  <span><strong className="text-foreground">Computer:</strong> Drag PDFs here, or click Upload PDF (multiple OK)</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Link size={11} className="shrink-0 mt-0.5 text-primary/70" />
                  <span><strong className="text-foreground">URL:</strong> Click "From URL" in the sidebar to import any public PDF</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Smartphone size={11} className="shrink-0 mt-0.5 text-primary/70" />
                  <span><strong className="text-foreground">Phone:</strong> Install the mobile app → share PDFs from Files or email</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left">
                {[
                  "Create a 90-day business plan",
                  "Make a client portfolio folder",
                  "Build a technical blueprint for my app",
                  "Create a goals sheet for Q3",
                ].map(example => (
                  <button
                    key={example}
                    onClick={() => setForgeInput(example)}
                    className="text-left text-xs px-3 py-2.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
