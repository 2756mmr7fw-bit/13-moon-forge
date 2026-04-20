import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Wand2, Hammer, Compass, X, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const FLAG = "13moonforge_onboarded";

const PATHS = [
  {
    id: "migrate",
    icon: Wand2,
    color: "text-violet-400",
    border: "border-violet-800/40 hover:border-violet-500/60",
    bg: "bg-violet-900/10 hover:bg-violet-900/20",
    title: "Migrate an existing app",
    body: "I have code on Replit, Heroku, Railway, or Render and I need to move it to my own server.",
    cta: "Start Migration Wizard",
    href: "/wizard",
  },
  {
    id: "build",
    icon: Hammer,
    color: "text-orange-400",
    border: "border-orange-800/40 hover:border-orange-500/60",
    bg: "bg-orange-900/10 hover:bg-orange-900/20",
    title: "Build something new",
    body: "I want to create a new project — brainstorm, prototype, code, and ship it.",
    cta: "Create New Project",
    href: "/projects/new",
  },
  {
    id: "explore",
    icon: Compass,
    color: "text-sky-400",
    border: "border-sky-800/40 hover:border-sky-500/60",
    bg: "bg-sky-900/10 hover:bg-sky-900/20",
    title: "Explore the tools",
    body: "I want to see what Forge can do — legal decoder, code gen, game docs, sovereign stack, and more.",
    cta: "Open the Anvil",
    href: "/",
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!localStorage.getItem(FLAG)) setOpen(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(FLAG, "1");
    setOpen(false);
  };

  const choose = (href: string) => {
    localStorage.setItem(FLAG, "1");
    setOpen(false);
    navigate(href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={18} />
        </button>

        <div className="p-7">
          <div className="flex items-center gap-3 mb-2">
            <Flame size={22} className="text-primary" />
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Welcome to 13 Moon Forge</p>
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-1">What are you here to do?</h2>
          <p className="text-sm text-muted-foreground mb-7">Pick a path and Forge will take you straight there.</p>

          <div className="space-y-3">
            {PATHS.map(p => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => choose(p.href)}
                  className={cn(
                    "w-full text-left rounded-xl border p-5 transition-all group",
                    p.border, p.bg,
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("shrink-0 mt-0.5", p.color)}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <p className="font-bold mb-0.5">{p.title}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                      <p className={cn("text-xs font-bold mt-2 group-hover:underline", p.color)}>{p.cta} →</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
