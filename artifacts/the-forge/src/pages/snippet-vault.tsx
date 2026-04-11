import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Archive, Plus, Copy, Check, Trash2, Search, Code2, Tag, Calendar,
} from "lucide-react";

const VAULT_KEY = "13moonforge_snippets";

const LANGUAGES = [
  "GDScript", "C#", "C++", "Python", "JavaScript", "TypeScript",
  "Lua", "Rust", "Java", "Ruby", "HTML/CSS", "GLSL", "Shader", "Other",
];

const CATEGORIES = [
  "Movement", "Combat", "Inventory", "UI", "Camera", "Physics",
  "AI / Pathfinding", "Networking", "Audio", "Utilities", "Math", "Input", "Other",
];

interface Snippet {
  id: string;
  title: string;
  description: string;
  code: string;
  language: string;
  category: string;
  tags: string;
  createdAt: string;
}

function newSnippet(): Snippet {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    code: "",
    language: "GDScript",
    category: "Utilities",
    tags: "",
    createdAt: new Date().toISOString(),
  };
}

function loadSnippets(): Snippet[] {
  try { return JSON.parse(localStorage.getItem(VAULT_KEY) ?? "[]"); } catch { return []; }
}

function saveSnippets(snippets: Snippet[]) {
  try { localStorage.setItem(VAULT_KEY, JSON.stringify(snippets)); } catch { /* ignore */ }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" onClick={copy} className="h-7 gap-1.5 text-xs">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function SnippetVault() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [view, setView] = useState<"list" | "add" | "detail">("list");
  const [draft, setDraft] = useState<Snippet>(newSnippet());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterLang, setFilterLang] = useState("all");
  const [filterCat, setFilterCat] = useState("all");

  useEffect(() => { setSnippets(loadSnippets()); }, []);

  const persist = useCallback((updated: Snippet[]) => {
    setSnippets(updated);
    saveSnippets(updated);
  }, []);

  const saveSnippet = () => {
    if (!draft.title.trim() || !draft.code.trim()) return;
    const exists = snippets.find(s => s.id === draft.id);
    const updated = exists
      ? snippets.map(s => s.id === draft.id ? draft : s)
      : [{ ...draft, createdAt: new Date().toISOString() }, ...snippets];
    persist(updated);
    setView("list");
    setDraft(newSnippet());
  };

  const deleteSnippet = (id: string) => {
    persist(snippets.filter(s => s.id !== id));
    if (activeId === id) { setActiveId(null); setView("list"); }
  };

  const editSnippet = (s: Snippet) => { setDraft({ ...s }); setView("add"); };

  const openDetail = (id: string) => { setActiveId(id); setView("detail"); };

  const filtered = snippets.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      || s.tags.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
    const matchLang = filterLang === "all" || s.language === filterLang;
    const matchCat = filterCat === "all" || s.category === filterCat;
    return matchSearch && matchLang && matchCat;
  });

  const active = snippets.find(s => s.id === activeId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-700 flex items-center justify-center shadow-lg shrink-0"
            style={{ boxShadow: "0 0 24px rgba(20, 184, 166, 0.3)" }}>
            <Archive size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
              Snippet Vault
              <Badge variant="secondary" className="text-[10px] font-bold tracking-wider">LOCAL · NO LOGIN</Badge>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your personal code library. Save reusable blocks, find them fast, paste and go.
              {snippets.length > 0 && <span className="ml-2 text-primary font-medium">{snippets.length} snippet{snippets.length !== 1 ? "s" : ""} saved</span>}
            </p>
          </div>
        </div>
        {view !== "add" && (
          <Button onClick={() => { setDraft(newSnippet()); setView("add"); }} className="gap-2 shrink-0">
            <Plus size={15} /> Add Snippet
          </Button>
        )}
      </div>

      {/* Add / Edit form */}
      {view === "add" && (
        <div className="border border-border rounded-xl p-6 space-y-5 bg-muted/5 max-w-2xl">
          <h2 className="text-base font-bold">{snippets.find(s => s.id === draft.id) ? "Edit Snippet" : "New Snippet"}</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Title <span className="text-primary">Required</span></Label>
              <Input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                placeholder="e.g. 2D Character Controller" className="text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Language</Label>
              <Select value={draft.language} onValueChange={v => setDraft(d => ({ ...d, language: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Category</Label>
              <Select value={draft.category} onValueChange={v => setDraft(d => ({ ...d, category: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Description <span className="opacity-60">(optional)</span></Label>
              <Input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                placeholder="What does this do? When would you use it?" className="text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Tags <span className="opacity-60">(comma-separated)</span></Label>
              <Input value={draft.tags} onChange={e => setDraft(d => ({ ...d, tags: e.target.value }))}
                placeholder="jump, physics, player, movement" className="text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Code <span className="text-primary">Required</span></Label>
              <Textarea
                value={draft.code}
                onChange={e => setDraft(d => ({ ...d, code: e.target.value }))}
                placeholder="Paste your code snippet here…"
                className="h-[220px] font-mono text-[13px] resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={saveSnippet} disabled={!draft.title.trim() || !draft.code.trim()} className="gap-2">
              Save to Vault
            </Button>
            <Button variant="ghost" onClick={() => { setView("list"); setDraft(newSnippet()); }}
              className="text-muted-foreground">Cancel</Button>
          </div>
        </div>
      )}

      {/* Detail view */}
      {view === "detail" && active && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setView("list")} className="gap-1.5 text-xs text-muted-foreground">
              ← Back to Vault
            </Button>
          </div>
          <div className="border border-border rounded-xl p-6 space-y-4 bg-muted/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">{active.title}</h2>
                {active.description && <p className="text-sm text-muted-foreground mt-1">{active.description}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{active.language}</Badge>
                  <Badge variant="outline" className="text-[10px]">{active.category}</Badge>
                  {active.tags.split(",").filter(Boolean).map(t => (
                    <span key={t} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {t.trim()}
                    </span>
                  ))}
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar size={10} /> {timeAgo(active.createdAt)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <CopyButton text={active.code} />
                <Button variant="outline" size="sm" onClick={() => editSnippet(active)} className="h-7 text-xs">Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => deleteSnippet(active.id)}
                  className="h-7 text-xs text-destructive hover:text-destructive gap-1.5">
                  <Trash2 size={12} /> Delete
                </Button>
              </div>
            </div>
            <pre className="bg-muted/20 border border-border rounded-lg p-4 text-[13px] font-mono overflow-auto whitespace-pre leading-relaxed max-h-[500px]">
              {active.code}
            </pre>
          </div>
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search snippets…"
                className="h-9 text-sm"
              />
            </div>
            <Select value={filterLang} onValueChange={setFilterLang}>
              <SelectTrigger className="h-9 w-[150px] text-sm"><SelectValue placeholder="Language" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="h-9 w-[150px] text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Empty state */}
          {snippets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed border-border rounded-xl">
              <Archive size={40} className="text-muted-foreground/40" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Your vault is empty</p>
                <p className="text-sm text-muted-foreground mt-1">Save your first snippet and it'll live here — searchable, forever.</p>
              </div>
              <Button onClick={() => { setDraft(newSnippet()); setView("add"); }} className="gap-2">
                <Plus size={15} /> Add Your First Snippet
              </Button>
            </div>
          )}

          {/* No results */}
          {snippets.length > 0 && filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No snippets match your search. Try different filters.
            </div>
          )}

          {/* Grid */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(s => (
                <div key={s.id}
                  className="border border-border rounded-xl p-4 bg-muted/5 hover:bg-muted/10 hover:border-primary/20 transition-all group cursor-pointer space-y-3"
                  onClick={() => openDetail(s.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{s.title}</p>
                      {s.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>
                      )}
                    </div>
                    <div onClick={e => e.stopPropagation()} className="shrink-0">
                      <CopyButton text={s.code} />
                    </div>
                  </div>

                  <pre className="text-[11px] font-mono bg-muted/30 rounded-md p-2 overflow-hidden max-h-[80px] text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                    {s.code.slice(0, 200)}{s.code.length > 200 ? "…" : ""}
                  </pre>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      <Code2 size={9} className="mr-1" />{s.language}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">{s.category}</Badge>
                    {s.tags.split(",").filter(Boolean).slice(0, 2).map(t => (
                      <span key={t} className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Tag size={9} />{t.trim()}
                      </span>
                    ))}
                    <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(s.createdAt)}</span>
                  </div>

                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => editSnippet(s)}
                      className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground">Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteSnippet(s.id)}
                      className="h-6 text-[11px] px-2 text-destructive hover:text-destructive">
                      <Trash2 size={10} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer note */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground">
        <Archive size={14} className="shrink-0 mt-0.5" />
        <span>Snippets are stored in your browser's local storage — no account needed. They stay on this device. Export your code with the Copy button before switching browsers.</span>
      </div>
    </div>
  );
}
