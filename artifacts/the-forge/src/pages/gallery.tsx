import { useState, useEffect, useCallback } from "react";
import { Sparkles, BookOpen, Crosshair, Scale, Zap, Code2, ExternalLink, Clock, Grid3X3, Filter, Flame, Lightbulb, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserId } from "@/lib/userId";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const MOON_META: Record<string, { label: string; icon: React.ComponentType<{ size: number }>; color: string }> = {
  brainstorm: { label: "Brainstorm",  icon: Sparkles,  color: "#f59e0b" },
  sage:        { label: "Sage",        icon: BookOpen,  color: "#22c55e" },
  hawk:        { label: "Hawk",        icon: Crosshair, color: "#eab308" },
  legal:       { label: "Legal",       icon: Scale,     color: "#8b5cf6" },
  launch:      { label: "Launch",      icon: Zap,       color: "#3b82f6" },
  code:        { label: "Code Forge",  icon: Code2,     color: "#ef4444" },
  flint:       { label: "Flint",       icon: Sparkles,  color: "#f59e0b" },
};

interface Reactions { fire: number; useful: number; saved: number; }
interface GalleryItem {
  id: string;
  moonId: string;
  title: string;
  content: string;
  createdAt: string;
  reactions: Reactions;
}

type ReactionKey = keyof Reactions;
const REACTION_DEFS: { key: ReactionKey; Icon: React.ComponentType<{ size: number; className?: string }>; label: string }[] = [
  { key: "fire",   Icon: Flame,      label: "Fire"  },
  { key: "useful", Icon: Lightbulb,  label: "Useful" },
  { key: "saved",  Icon: Bookmark,   label: "Saved"  },
];

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [myReactions, setMyReactions] = useState<Record<string, Set<ReactionKey>>>({});
  const [reacting, setReacting] = useState<string | null>(null);

  const userId = getUserId();

  useEffect(() => {
    fetch(`${API}/api/share/public`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleReact = useCallback(async (itemId: string, reaction: ReactionKey) => {
    if (reacting) return;
    setReacting(`${itemId}-${reaction}`);
    const hasIt = myReactions[itemId]?.has(reaction);
    setMyReactions(prev => {
      const copy = { ...prev };
      const set = new Set(copy[itemId] ?? []);
      hasIt ? set.delete(reaction) : set.add(reaction);
      copy[itemId] = set;
      return copy;
    });
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const delta = hasIt ? -1 : 1;
      return { ...item, reactions: { ...item.reactions, [reaction]: Math.max(0, (item.reactions[reaction] ?? 0) + delta) } };
    }));
    try {
      await fetch(`${API}/api/share/${itemId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ reaction }),
      });
    } catch { /* optimistic only */ }
    setReacting(null);
  }, [reacting, myReactions, userId]);

  const moonIds = ["all", ...Array.from(new Set(items.map(i => i.moonId))).sort()];
  const filtered = filter === "all" ? items : items.filter(i => i.moonId === filter);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Grid3X3 size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Forge Gallery</h1>
            <p className="text-xs text-muted-foreground">Real things people built with 13 Moon Forge.</p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={13} className="text-muted-foreground" />
        {moonIds.map(id => {
          const moon = MOON_META[id];
          const Icon = moon?.icon;
          return (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === id
                  ? "border-primary bg-primary/10 text-foreground font-semibold"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {Icon && <Icon size={10} />}
              {moon?.label ?? "All"}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <div className="text-4xl">🌑</div>
          <p className="font-bold text-sm">Nothing shared yet.</p>
          <p className="text-xs text-muted-foreground">Use any Moon and share your output — it'll show up here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(item => {
            const moon = MOON_META[item.moonId] ?? { label: item.moonId, color: "#888" };
            const Icon = moon.icon as React.ComponentType<{ size: number }> | undefined;
            const isOpen = expanded === item.id;

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-border/80 transition-colors"
              >
                {/* Moon badge + date */}
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: `${moon.color}22`, color: moon.color }}
                  >
                    {Icon && <Icon size={9} />}
                    {moon.label}
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock size={9} />
                    {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-sm leading-snug line-clamp-2">{item.title}</h3>

                {/* Content preview */}
                <p className={`text-xs text-muted-foreground leading-relaxed ${isOpen ? "" : "line-clamp-4"}`}>
                  {item.content}
                </p>

                {/* Reactions */}
                <div className="flex items-center gap-1.5 pt-0.5 border-t border-border/40">
                  {REACTION_DEFS.map(({ key, Icon, label }) => {
                    const active = myReactions[item.id]?.has(key);
                    const count = item.reactions?.[key] ?? 0;
                    return (
                      <button
                        key={key}
                        onClick={() => handleReact(item.id, key)}
                        title={label}
                        className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full transition-all ${
                          active
                            ? "bg-primary/15 text-primary font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                      >
                        <Icon size={11} className={active ? "fill-current" : ""} />
                        {count > 0 && <span>{count}</span>}
                      </button>
                    );
                  })}
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => setExpanded(isOpen ? null : item.id)}
                      className="text-[11px] text-primary hover:underline"
                    >
                      {isOpen ? "Less" : "More"}
                    </button>
                    <a
                      href={`/share/${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <ExternalLink size={10} />
                      View
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
