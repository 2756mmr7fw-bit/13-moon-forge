import { useState } from "react";
import { LayoutTemplate, X, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOON_TEMPLATES } from "@/lib/templates";

interface TemplatesPanelProps {
  moonId: string;
  onSelect: (prompt: string) => void;
}

export function TemplatesPanel({ moonId, onSelect }: TemplatesPanelProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const templates = MOON_TEMPLATES[moonId] ?? [];
  const filtered = search.trim()
    ? templates.filter(t => t.label.toLowerCase().includes(search.toLowerCase()) || t.prompt.toLowerCase().includes(search.toLowerCase()))
    : templates;

  if (templates.length === 0) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs border-border/60 hover:border-primary/40"
        onClick={() => setOpen(true)}
      >
        <LayoutTemplate size={12} />
        Templates
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="relative w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-black text-sm">Forge Templates</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Pick one to pre-fill your prompt</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            {templates.length > 4 && (
              <div className="px-5 py-3 border-b border-border">
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="w-full bg-muted/40 border border-border rounded-lg pl-8 pr-3 py-2 text-xs placeholder:text-muted-foreground outline-none focus:border-primary/40"
                    placeholder="Search templates…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Templates list */}
            <div className="overflow-y-auto max-h-[400px] divide-y divide-border/50">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">No templates match your search.</div>
              ) : (
                filtered.map(t => (
                  <button
                    key={t.id}
                    className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-muted/40 transition-colors group"
                    onClick={() => { onSelect(t.prompt); setOpen(false); setSearch(""); }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold group-hover:text-primary transition-colors">{t.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{t.prompt}</p>
                    </div>
                    <ChevronRight size={14} className="shrink-0 text-muted-foreground group-hover:text-primary mt-0.5 transition-colors" />
                  </button>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-border bg-muted/20">
              <p className="text-[10px] text-muted-foreground">Replace the <span className="font-mono bg-muted px-1 rounded">[brackets]</span> with your own details after selecting.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
