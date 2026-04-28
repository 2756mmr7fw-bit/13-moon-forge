import { BookOpen, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NarrationBannerProps {
  narrationOn: boolean;
  onToggle: () => void;
  moonName?: string;
}

export function NarrationBanner({ narrationOn, onToggle, moonName = "Forge" }: NarrationBannerProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-sm transition-colors ${
        narrationOn
          ? "border-primary/40 bg-primary/8 text-foreground"
          : "border-border bg-card/50 text-muted-foreground"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${narrationOn ? "bg-primary/20" : "bg-muted"}`}>
          <BookOpen size={13} className={narrationOn ? "text-primary" : "text-muted-foreground"} />
        </div>
        <div>
          <p className={`text-xs font-semibold ${narrationOn ? "text-foreground" : "text-muted-foreground"}`}>
            {narrationOn ? `Narration Mode is ON` : "Narration Mode"}
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
            {narrationOn
              ? `${moonName} will explain every step as it works — learn while you build.`
              : `Turn on to see ${moonName} narrate every decision in plain English.`}
          </p>
        </div>
      </div>

      <Button
        size="sm"
        variant={narrationOn ? "default" : "outline"}
        className={`h-7 text-xs gap-1.5 shrink-0 ${narrationOn ? "bg-primary text-primary-foreground" : ""}`}
        onClick={onToggle}
      >
        {narrationOn ? <Mic size={11} /> : <MicOff size={11} />}
        {narrationOn ? "On" : "Off"}
      </Button>
    </div>
  );
}
