import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Layers, Check, Loader2,
  Flame, BookOpen, Crosshair, Scale, Zap, Code2, GitMerge,
} from "lucide-react";
import { ShareCard } from "@/components/share-card";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const MOONS = [
  { id: "brainstorm", label: "Flint · Brainstorm", icon: Flame,    href: "/brainstorm",  color: "#f97316" },
  { id: "sage",       label: "Sage · Learn",        icon: BookOpen, href: "/sage",         color: "#22c55e" },
  { id: "hawk",       label: "Hawk · Find",          icon: Crosshair,href: "/hawk",         color: "#eab308" },
  { id: "legal",      label: "Quill · Legal",        icon: Scale,   href: "/legal",         color: "#8b5cf6" },
  { id: "launch",     label: "Creed · Launch",       icon: Zap,     href: "/launch",        color: "#3b82f6" },
  { id: "code-forge", label: "Flint · Code",         icon: Code2,   href: "/code-forge",    color: "#ef4444" },
];

interface MoonOutputActionsProps {
  content: string;
  moonId: string;
  title?: string;
  className?: string;
}

export function MoonOutputActions({ content, moonId, title, className }: MoonOutputActionsProps) {
  const [, navigate] = useLocation();
  const { getToken } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getToken();
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }, [getToken]);

  async function saveToWorkspace() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const headers = await authHeaders();
      const name = title || `${moonId} — ${new Date().toLocaleDateString()}`;
      await fetch(`${API}/api/workspace`, {
        method: "POST",
        headers,
        body: JSON.stringify({ type: "note", name, content }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* silent */ }
    finally { setSaving(false); }
  }

  async function shareOutput() {
    if (!content.trim()) return;
    setSharing(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API}/api/share`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          moonId,
          title: title || `${moonId} output — ${new Date().toLocaleDateString()}`,
          content,
        }),
      });
      const data = await res.json() as { url: string; id?: string };
      const id = data.id ?? data.url?.split("/").pop() ?? null;
      setShareId(id);
    } catch { /* silent */ }
    finally { setSharing(false); }
  }

  function sendToMoon(href: string) {
    localStorage.setItem("forge:workspace:pending", JSON.stringify({
      content,
      filename: title || `${moonId} output`,
    }));
    navigate(href);
  }

  if (!content.trim()) return null;

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className ?? ""}`}>
      {/* Save to Workspace */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={saveToWorkspace}
        disabled={saving}
        title="Save this output to your Workspace as a note"
      >
        {saving ? <Loader2 size={12} className="animate-spin" />
          : saved ? <Check size={12} className="text-green-400" />
          : <Layers size={12} />}
        {saved ? "Saved!" : "Save to Workspace"}
      </Button>

      {/* Share card */}
      {!shareId ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={shareOutput}
          disabled={sharing}
          title="Create a shareable card anyone can view"
        >
          {sharing ? <Loader2 size={12} className="animate-spin" /> : null}
          {sharing ? "Creating…" : "Share"}
        </Button>
      ) : (
        <ShareCard moonId={moonId} title={title ?? `${moonId} output`} content={content} shareId={shareId} />
      )}

      {/* Send to Moon */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" title="Send this output to another Moon">
            <GitMerge size={12} /> Chain to Moon
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Send output to…
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {MOONS.filter(m => m.id !== moonId).map(m => {
            const Icon = m.icon;
            return (
              <DropdownMenuItem
                key={m.id}
                onClick={() => sendToMoon(m.href)}
                className="gap-2 text-xs cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${m.color}22` }}>
                  <Icon size={11} style={{ color: m.color }} />
                </div>
                {m.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
