import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Command } from "cmdk";
import {
  Flame, BookOpen, Crosshair, Scale, Wand2, Zap, Code2, Layers,
  Monitor, Swords, FolderOpen, MessageSquare, Settings, LayoutDashboard,
  ChevronRight, Clock, Search, BookMarked, FileText,
} from "lucide-react";
import { useSavedPrompts } from "@/hooks/useSavedPrompts";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelectPrompt?: (prompt: string) => void;
}

const MOON_ROUTES = [
  { id: "forge",    label: "Forge",          desc: "Builder AI",        icon: Flame,      href: "/brainstorm",   color: "#f97316" },
  { id: "flint",    label: "Flint",          desc: "Code Sparker",      icon: Code2,      href: "/code-forge",   color: "#ef4444" },
  { id: "sage",     label: "Sage",           desc: "Learn & Teach",     icon: BookOpen,   href: "/sage",         color: "#22c55e" },
  { id: "hawk",     label: "Hawk",           desc: "The Finder",        icon: Crosshair,  href: "/hawk",         color: "#eab308" },
  { id: "quill",    label: "Quill",          desc: "Writer / Legal",    icon: Scale,      href: "/legal",        color: "#8b5cf6" },
  { id: "creed",    label: "Creed",          desc: "Strategy / Launch", icon: Zap,        href: "/launch",       color: "#3b82f6" },
];

const NAV_ROUTES = [
  { label: "Dashboard",       icon: LayoutDashboard, href: "/dashboard" },
  { label: "Projects",        icon: FolderOpen,      href: "/projects" },
  { label: "Workspace",       icon: Layers,          href: "/workspace" },
  { label: "Game Studio",     icon: Swords,          href: "/game-studio" },
  { label: "Screen Coach",    icon: Monitor,         href: "/screen-coach" },
  { label: "Computer Advisor",icon: Wand2,           href: "/computer-advisor" },
  { label: "DIY Code Editor", icon: Code2,           href: "/diy-code" },
  { label: "Snippet Vault",   icon: FileText,        href: "/snippets" },
  { label: "Mailbox",         icon: MessageSquare,   href: "/mailbox" },
  { label: "Account",         icon: Settings,        href: "/account" },
];

export function CommandPalette({ open, onClose, onSelectPrompt }: CommandPaletteProps) {
  const [, navigate] = useLocation();
  const { prompts } = useSavedPrompts();

  const go = useCallback((href: string) => {
    navigate(href);
    onClose();
  }, [navigate, onClose]);

  const usePrompt = useCallback((prompt: string) => {
    if (onSelectPrompt) onSelectPrompt(prompt);
    onClose();
  }, [onSelectPrompt, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl mx-4 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        <Command className="[&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-border">
          <div className="flex items-center px-3 border-b border-border">
            <Search size={15} className="text-muted-foreground shrink-0 mr-2" />
            <Command.Input
              placeholder="Search Moons, pages, saved prompts…"
              className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="text-[10px] text-muted-foreground bg-muted/50 border border-border rounded px-1.5 py-0.5 shrink-0">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[360px] overflow-y-auto p-2 space-y-0.5">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Moons */}
            <Command.Group heading={<span className="px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Moons</span>}>
              {MOON_ROUTES.map(m => {
                const Icon = m.icon;
                return (
                  <Command.Item
                    key={m.id}
                    value={`moon ${m.label} ${m.desc}`}
                    onSelect={() => go(m.href)}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer text-sm aria-selected:bg-primary/10 aria-selected:text-foreground text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: `${m.color}22`, boxShadow: `0 0 8px ${m.color}44` }}>
                      <Icon size={14} style={{ color: m.color }} />
                    </div>
                    <span className="flex-1 font-medium">{m.label}</span>
                    <span className="text-xs text-muted-foreground/60">{m.desc}</span>
                    <ChevronRight size={12} className="text-muted-foreground/40" />
                  </Command.Item>
                );
              })}
            </Command.Group>

            {/* Saved Prompts */}
            {prompts.length > 0 && (
              <Command.Group heading={<span className="px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-2 block">Saved Prompts</span>}>
                {prompts.slice(0, 8).map(p => (
                  <Command.Item
                    key={p.id}
                    value={`prompt ${p.title} ${p.prompt}`}
                    onSelect={() => usePrompt(p.prompt)}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer text-sm aria-selected:bg-primary/10 aria-selected:text-foreground text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                      <BookMarked size={13} className="text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground/60 truncate">{p.prompt.slice(0, 60)}</p>
                    </div>
                    {p.moonId && (
                      <span className="text-[10px] text-muted-foreground/50 bg-muted/40 rounded px-1.5 py-0.5">{p.moonId}</span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Navigation */}
            <Command.Group heading={<span className="px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-2 block">Navigate</span>}>
              {NAV_ROUTES.map(r => {
                const Icon = r.icon;
                return (
                  <Command.Item
                    key={r.href}
                    value={`nav ${r.label}`}
                    onSelect={() => go(r.href)}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer text-sm aria-selected:bg-primary/10 aria-selected:text-foreground text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                      <Icon size={13} />
                    </div>
                    <span className="flex-1 font-medium">{r.label}</span>
                    <ChevronRight size={12} className="text-muted-foreground/40" />
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>

          <div className="px-3 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground/50">
            <span className="flex items-center gap-1">
              <kbd className="bg-muted/50 border border-border rounded px-1">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-muted/50 border border-border rounded px-1">↵</kbd> select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-muted/50 border border-border rounded px-1">ESC</kbd> close
            </span>
            <span className="ml-auto flex items-center gap-1">
              <kbd className="bg-muted/50 border border-border rounded px-1">⌘K</kbd>
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}

// Global keyboard listener — mount in App/Layout
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}
