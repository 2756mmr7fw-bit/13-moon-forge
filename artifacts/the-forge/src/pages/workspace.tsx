import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/react";
import {
  Folder, FolderOpen, FileText, Target, Calendar, Briefcase,
  LayoutTemplate, File, Plus, Trash2, ChevronRight, ChevronDown,
  Printer, Pencil, Check, X, Loader2, Flame, Send, Star, MoreHorizontal,
  FolderPlus, FilePlus,
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
  const { getToken } = useAuth();
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
  const renameRef = useRef<HTMLInputElement>(null);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  }, [getToken]);

  const load = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/workspace`, { headers });
      if (res.ok) setItems(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (renamingId !== null) renameRef.current?.focus();
  }, [renamingId]);

  // Build tree
  const roots = items.filter(i => !i.parentId);
  const children = (parentId: number) => items.filter(i => i.parentId === parentId);

  async function forgeCreate() {
    if (!forgeInput.trim() || forging) return;
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

  return (
    <div className="flex gap-0 -mx-4 -mt-4 h-[calc(100vh-80px)] overflow-hidden rounded-xl border border-border">
      {/* ── Left: File Tree ──────────────────────────────────────────────── */}
      <div className="w-64 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-border">
          <h2 className="font-bold text-sm">Workspace</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Forge organizes your files</p>
        </div>

        {/* Quick creates */}
        <div className="px-2 py-2 border-b border-border">
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
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto px-1 py-2" onClick={() => setShowMenu(null)}>
          {loading ? (
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
                  <p className="text-xs text-muted-foreground">Tell Forge what to create below</p>
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

      {/* ── Right: Document Viewer ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {selected && selected.type !== "folder" ? (
          <>
            {/* Doc toolbar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-card shrink-0">
              <ItemIcon item={selected} size={18} />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm truncate">{selected.name}</h3>
                <p className="text-[10px] text-muted-foreground capitalize">{selected.type} · {new Date(selected.updatedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {editing ? (
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
              {editing ? (
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
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Tell Forge what to create — folders, plans, blueprints, portfolios, goal sheets, anything. He'll build it and organize it for you.
              </p>
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
