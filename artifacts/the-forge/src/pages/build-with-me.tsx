import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Flame, Sparkles, BookOpen, Crosshair, Scale, Zap, Code2,
  ArrowRight, Loader2, ChevronRight, CheckCircle2, Play,
} from "lucide-react";
import { useNarrationMode } from "@/hooks/useNarrationMode";
import { NarrationBanner } from "@/components/narration-banner";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const MOON_META: Record<string, { label: string; icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>; color: string; href: string }> = {
  brainstorm: { label: "Flint · Brainstorm", icon: Sparkles,  color: "#f59e0b", href: "/brainstorm" },
  sage:        { label: "Sage · Learn",       icon: BookOpen,  color: "#22c55e", href: "/sage" },
  hawk:        { label: "Hawk · Research",    icon: Crosshair, color: "#eab308", href: "/hawk" },
  legal:       { label: "Quill · Legal",      icon: Scale,     color: "#8b5cf6", href: "/legal" },
  launch:      { label: "Creed · Launch",     icon: Zap,       color: "#3b82f6", href: "/launch" },
  "code-forge":{ label: "Code Forge",         icon: Code2,     color: "#ef4444", href: "/code-forge" },
};

interface PlanStep {
  step: number;
  title: string;
  moon: string;
  desc: string;
  prompt: string;
}

const EXAMPLES = [
  "a mobile game about space pirates in Godot",
  "a SaaS tool that helps freelancers send invoices",
  "a personal brand website for a fitness coach",
  "a Discord bot that summarizes long messages",
  "an app to track what I eat without counting calories",
];

export default function BuildWithMe() {
  const [, navigate] = useLocation();
  const { narrationOn, toggle } = useNarrationMode();
  const [goal, setGoal] = useState("");
  const [steps, setSteps] = useState<PlanStep[]>([]);
  const [planning, setPlanning] = useState(false);
  const [done, setDone] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function generatePlan() {
    if (!goal.trim() || planning) return;
    setSteps([]);
    setDone(false);
    setActiveStep(null);
    setPlanning(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API}/api/forge/plan-build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ goal }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) throw new Error("No stream");

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "step") {
              setSteps(prev => [...prev, ev.step as PlanStep]);
            } else if (ev.type === "done") {
              setDone(true);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setDone(true);
      }
    } finally {
      setPlanning(false);
    }
  }

  function launchStep(step: PlanStep) {
    setActiveStep(step.step);
    const moon = MOON_META[step.moon];
    if (!moon) return;

    localStorage.setItem("forge:workspace:pending", JSON.stringify({
      content: step.prompt,
      filename: `Build Plan — Step ${step.step}: ${step.title}`,
    }));

    if (narrationOn) {
      localStorage.setItem("forge:narration:on", "true");
    }

    navigate(moon.href);
  }

  const hasPlan = steps.length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Flame size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Build With Me</h1>
            <p className="text-xs text-muted-foreground">Tell Forge what you want to build. Get a step-by-step Moon plan.</p>
          </div>
        </div>
      </div>

      {/* Narration toggle */}
      <NarrationBanner narrationOn={narrationOn} onToggle={toggle} moonName="Forge" />

      {/* Goal input */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          What do you want to build?
        </label>
        <Textarea
          value={goal}
          onChange={e => setGoal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generatePlan(); }}
          placeholder="Describe what you want to build — be as specific or as rough as you want."
          className="min-h-[100px] text-sm resize-none"
          disabled={planning}
        />

        {/* Examples */}
        {!hasPlan && (
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setGoal(ex)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        <Button
          onClick={generatePlan}
          disabled={!goal.trim() || planning}
          className="w-full gap-2"
          size="lg"
        >
          {planning ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Building your plan…
            </>
          ) : hasPlan ? (
            <>
              <Flame size={16} />
              Rebuild Plan
            </>
          ) : (
            <>
              <Flame size={16} />
              Build My Plan
              <span className="text-xs opacity-60 ml-1">⌘↵</span>
            </>
          )}
        </Button>
      </div>

      {/* Plan steps */}
      {steps.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-2">
              Your Build Plan
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-3">
            {steps.map((step, i) => {
              const moon = MOON_META[step.moon] ?? MOON_META["brainstorm"];
              const Icon = moon.icon;
              const isActive = activeStep === step.step;
              const isCompleted = activeStep !== null && step.step < (activeStep ?? 0);

              return (
                <div
                  key={step.step}
                  className={`rounded-xl border p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
                    isActive ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                  }`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start gap-3">
                    {/* Step number / completion */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                      isCompleted ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
                    }`}>
                      {isCompleted ? <CheckCircle2 size={14} /> : step.step}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Moon badge */}
                        <div
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: `${moon.color}22`, color: moon.color }}
                        >
                          <Icon size={9} style={{ color: moon.color }} />
                          {moon.label}
                        </div>
                      </div>

                      <h3 className="font-bold text-sm mb-1">{step.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{step.desc}</p>

                      {/* Prompt preview */}
                      <div className="bg-muted/50 border border-border rounded-lg p-3 mb-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Your prompt →</p>
                        <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">{step.prompt}</p>
                      </div>

                      <Button
                        size="sm"
                        className="gap-2 text-xs h-8"
                        style={isActive ? { background: moon.color, color: "#000" } : {}}
                        onClick={() => launchStep(step)}
                      >
                        <Play size={11} />
                        Start Step {step.step}
                        <ChevronRight size={11} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Done state */}
          {done && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center space-y-2 animate-in fade-in">
              <div className="text-2xl">🔥</div>
              <p className="font-bold text-sm">Your plan is ready.</p>
              <p className="text-xs text-muted-foreground">
                Work through each step in order.
                {narrationOn && " Narration Mode is ON — each Moon will walk you through its thinking as it works."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
