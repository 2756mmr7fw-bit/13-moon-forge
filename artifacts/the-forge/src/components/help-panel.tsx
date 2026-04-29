import { useState } from "react";
import { HelpCircle, X, Flame, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HelpConfig {
  title: string;
  moon: { name: string; color: string; tagline: string };
  what: string;
  when: string;
  examples: string[];
  tips?: string[];
}

interface HelpPanelProps {
  config: HelpConfig;
  onTryExample?: (example: string) => void;
}

export function HelpPanel({ config, onTryExample }: HelpPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted border border-border/50 hover:border-border"
        title="How does this work?"
      >
        <HelpCircle size={13} />
        <span>How it works</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-card border-l border-border shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <Flame size={16} style={{ color: config.moon.color }} />
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: config.moon.color }}>
                    {config.moon.name}
                  </span>
                </div>
                <h2 className="font-bold text-lg mt-0.5">{config.title}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 p-5 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">What it does</p>
                <p className="text-sm leading-relaxed text-foreground">{config.what}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">When to use it</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{config.when}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Try these</p>
                <div className="space-y-2">
                  {config.examples.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => { onTryExample?.(ex); setOpen(false); }}
                      className={cn(
                        "w-full text-left text-sm px-3 py-2.5 rounded-xl border border-border bg-background",
                        "hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground",
                        onTryExample ? "cursor-pointer" : "cursor-default"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <ChevronRight size={13} className="mt-0.5 shrink-0 text-primary/60" />
                        <span>{ex}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {config.tips && config.tips.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Pro tips</p>
                  <ul className="space-y-1.5">
                    {config.tips.map((tip, i) => (
                      <li key={i} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                        <span className="text-primary mt-0.5 shrink-0">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-border">
              <p className="text-xs text-muted-foreground/60 italic">"{config.moon.tagline}"</p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
