import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sparkles, BookOpen, Crosshair, Flame, X, ArrowRight, Brain, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@workspace/replit-auth-web";

const FLAG = "13moonforge_onboarded";
const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const PATHS = [
  {
    id: "brainstorm",
    icon: Sparkles,
    color: "#f59e0b",
    title: "I have an idea",
    sub: "Help me brainstorm and shape it",
    href: "/brainstorm",
    prompt: "I have an idea I want to develop. Help me think through it, sharpen what makes it different, and find the angle nobody else is looking at.",
  },
  {
    id: "learn",
    icon: BookOpen,
    color: "#22c55e",
    title: "I want to learn something",
    sub: "Teach me a concept, skill, or how something works",
    href: "/sage",
    prompt: "I want to learn something new. Ask me what topic I want to understand, then teach it from the ground up — no jargon, real examples, the kind of explanation that actually sticks.",
  },
  {
    id: "research",
    icon: Crosshair,
    color: "#eab308",
    title: "I need to find something",
    sub: "Research a topic, find suppliers, prices, or competitors",
    href: "/hawk",
    prompt: "I need help researching something. Ask me what I'm looking for, then find real information — actual options, prices, sources — not vague suggestions.",
  },
  {
    id: "build",
    icon: Flame,
    color: "#ef4444",
    title: "I want to build something",
    sub: "Give me a plan and walk me through building it",
    href: "/build-with-me",
    prompt: "",
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [chosen, setChosen] = useState<typeof PATHS[number] | null>(null);
  const [name, setName] = useState("");
  const [building, setBuilding] = useState("");
  const [saving, setSaving] = useState(false);
  const [, navigate] = useLocation();
  

  useEffect(() => {
    try {
      if (!localStorage.getItem(FLAG)) setOpen(true);
    } catch { /* silent */ }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(FLAG, "1"); } catch {}
    setOpen(false);
  };

  const choose = (path: typeof PATHS[number]) => {
    setChosen(path);
    setStep(2);
  };

  const finish = async () => {
    setSaving(true);
    try {
      if (name.trim() || building.trim()) {
        
        await fetch(`${API}/api/user/memory`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: name.trim() || undefined, building: building.trim() || undefined }),
        });
      }
    } catch { /* non-fatal */ }

    try { localStorage.setItem(FLAG, "1"); } catch {}
    setOpen(false);

    if (chosen) {
      if (chosen.prompt) {
        try {
          localStorage.setItem("forge:workspace:pending", JSON.stringify({
            content: chosen.prompt,
            filename: "Getting Started",
          }));
        } catch { /* silent */ }
      }
      setTimeout(() => navigate(chosen.href), 80);
    }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Step dots */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {[1, 2].map(s => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${s === step ? "w-6 bg-primary" : s < step ? "w-4 bg-primary/50" : "w-4 bg-muted"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="p-7 pt-10 space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
                <Flame size={22} className="text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Welcome to Forge.</h2>
              <p className="text-sm text-muted-foreground">What do you want to do first?</p>
            </div>

            <div className="space-y-2">
              {PATHS.map(path => {
                const Icon = path.icon;
                return (
                  <button
                    key={path.id}
                    onClick={() => choose(path)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 text-left transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${path.color}22` }}>
                      <Icon size={16} style={{ color: path.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{path.title}</p>
                      <p className="text-xs text-muted-foreground">{path.sub}</p>
                    </div>
                    <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                  </button>
                );
              })}
            </div>

            <button onClick={dismiss} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
              I'll explore on my own
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="p-7 pt-10 space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
                <Brain size={22} className="text-primary" />
              </div>
              <h2 className="text-xl font-black tracking-tight">One more thing.</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Help Forge remember you — so every response feels personal from the start.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Your first name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Marcus" className="h-9 text-sm" autoFocus />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">What are you building?</label>
                <Input value={building} onChange={e => setBuilding(e.target.value)} placeholder="e.g. a plumbing business app, a zombie game" className="h-9 text-sm" />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              Stored privately. Used only to personalize your AI responses.
            </p>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1 gap-2 text-sm font-semibold" onClick={finish} disabled={saving}>
                {saving ? "Saving…" : <><Check size={14} /> Let's go</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
