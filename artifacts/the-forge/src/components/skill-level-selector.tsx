import { useState, useEffect } from "react";
import { SKILL_LEVELS, getSkillLevel, setSkillLevel, type SkillLevel } from "@/lib/skillLevel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";

export function useSkillLevel() {
  const [level, setLevel] = useState<SkillLevel>(getSkillLevel);

  useEffect(() => {
    const handler = (e: Event) => setLevel((e as CustomEvent<SkillLevel>).detail);
    window.addEventListener("skillLevelChanged", handler);
    return () => window.removeEventListener("skillLevelChanged", handler);
  }, []);

  return level;
}

interface SkillLevelSelectorProps {
  open: boolean;
  onClose: () => void;
}

export function SkillLevelDialog({ open, onClose }: SkillLevelSelectorProps) {
  const current = useSkillLevel();

  const choose = (level: SkillLevel) => {
    setSkillLevel(level);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>What's your skill level?</DialogTitle>
          <DialogDescription>
            Forge adjusts how it explains things based on where you are. You can change this anytime.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-1">
          {SKILL_LEVELS.map(s => (
            <button
              key={s.id}
              onClick={() => choose(s.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                current === s.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground/40 hover:bg-muted/50"
              )}
            >
              <span className="text-xl w-7 text-center">{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold", current === s.id ? "text-primary" : "")}>{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.tagline}</p>
              </div>
              {current === s.id && <CheckCircle2 size={16} className="text-primary flex-shrink-0" />}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SkillLevelBadge({ onClick }: { onClick: () => void }) {
  const level = useSkillLevel();
  const meta = SKILL_LEVELS.find(s => s.id === level) ?? SKILL_LEVELS[2];

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      title="Change your skill level"
      className="gap-1.5 text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
    >
      <span>{meta.emoji}</span>
      <span className="hidden sm:inline">{meta.label}</span>
    </Button>
  );
}
