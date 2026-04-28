import { useState } from "react";
import { useSavedPrompts } from "@/hooks/useSavedPrompts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BookMarked, Plus, Trash2, ChevronDown, ChevronUp, Loader2, Check, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SavedPromptsPanelProps {
  moonId?: string;
  currentPrompt?: string;
  onUsePrompt: (prompt: string) => void;
  className?: string;
}

export function SavedPromptsPanel({
  moonId,
  currentPrompt,
  onUsePrompt,
  className,
}: SavedPromptsPanelProps) {
  const { prompts, loading, save, remove } = useSavedPrompts();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTitle, setSavingTitle] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);

  const filtered = moonId
    ? prompts.filter(p => !p.moonId || p.moonId === moonId)
    : prompts;

  async function handleSave() {
    const title = savingTitle.trim() || currentPrompt?.slice(0, 60) || "Saved prompt";
    if (!currentPrompt?.trim()) {
      toast({ variant: "destructive", description: "Write a prompt first, then save it." });
      return;
    }
    setSaving(true);
    await save(title, currentPrompt, moonId);
    setSaving(false);
    setSavingTitle("");
    setShowSaveForm(false);
    setOpen(true);
    toast({ description: "Prompt saved to your library." });
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors text-sm"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <BookMarked size={14} className="text-purple-400" />
          <span className="font-medium text-muted-foreground">Saved Prompts</span>
          {filtered.length > 0 && (
            <span className="text-[10px] bg-purple-500/15 text-purple-400 rounded-full px-1.5 py-0.5 font-medium">
              {filtered.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {currentPrompt?.trim() && (
            <button
              onClick={e => { e.stopPropagation(); setShowSaveForm(s => !s); setOpen(true); }}
              className="text-[10px] flex items-center gap-0.5 text-purple-400 hover:text-purple-300 transition-colors bg-purple-500/10 rounded px-1.5 py-0.5"
            >
              <Plus size={10} /> Save current
            </button>
          )}
          {open ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border">
          {/* Save form */}
          {showSaveForm && (
            <div className="px-3 py-2.5 border-b border-border bg-muted/20 space-y-2">
              <p className="text-[11px] text-muted-foreground">Name this prompt (optional)</p>
              <div className="flex gap-2">
                <Input
                  value={savingTitle}
                  onChange={e => setSavingTitle(e.target.value)}
                  placeholder={currentPrompt?.slice(0, 50) ?? "Prompt name…"}
                  className="text-xs h-7 flex-1"
                  onKeyDown={e => e.key === "Enter" && handleSave()}
                  autoFocus
                />
                <Button size="sm" className="h-7 text-xs px-2" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setShowSaveForm(false)}>
                  <X size={11} />
                </Button>
              </div>
            </div>
          )}

          {/* List */}
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={14} className="animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-5 text-center text-xs text-muted-foreground/60">
                No saved prompts yet.
                {currentPrompt?.trim() && (
                  <button
                    onClick={() => setShowSaveForm(true)}
                    className="block mx-auto mt-1 text-purple-400 hover:underline"
                  >
                    Save current prompt →
                  </button>
                )}
              </div>
            ) : (
              filtered.map(p => (
                <div
                  key={p.id}
                  className="group flex items-start gap-2 px-3 py-2 hover:bg-muted/30 transition-colors border-b border-border/40 last:border-0"
                >
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => onUsePrompt(p.prompt)}
                  >
                    <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {p.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                      {p.prompt.slice(0, 70)}
                    </p>
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive text-muted-foreground/40"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
