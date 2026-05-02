import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dumbbell, CheckCircle2, Circle, Lock, ChevronRight,
  Zap, Brain, Eye, Hand, TrendingUp, Target,
} from "lucide-react";
import { EXERCISES } from "./exercises";
import { GYM_API, TIER_META, CATEGORY_LABELS, STYLE_META, type LearningProfileData, type LearningStyle, type Tier, type Category } from "./types";
import { getUserId } from "@/lib/userId";

interface Progress {
  exerciseBest: Record<string, { passed: boolean; attempts: number; bestTimeMs: number }>;
  totalPassed:    number;
  totalAttempted: number;
  learningProfile: LearningProfileData | null;
}

const STYLE_ICONS: Record<LearningStyle, React.ComponentType<{ size?: number; className?: string }>> = {
  visual:      Eye,
  "hands-on":  Hand,
  conceptual:  Brain,
  pattern:     TrendingUp,
};

export default function GymHub() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${GYM_API}/api/gym/progress`, {
          headers: { "x-user-id": getUserId() },
        });
        if (res.ok) setProgress(await res.json() as Progress);
      } catch { /* ignore */ }
    })();
  }, []);

  const tiers = [1, 2, 3, 4] as Tier[];
  const categories = ["arrays", "strings", "objects", "functions", "algorithms", "async"] as Category[];

  const filtered = EXERCISES.filter(e => {
    if (selectedTier !== "all" && e.tier !== selectedTier) return false;
    if (selectedCategory !== "all" && e.category !== selectedCategory) return false;
    return true;
  });

  const totalExercises = EXERCISES.length;
  const passedCount    = progress?.totalPassed ?? 0;
  const pct            = Math.round((passedCount / totalExercises) * 100);

  const profile       = progress?.learningProfile;
  const dominantStyle = profile?.dominantStyle as LearningStyle | undefined;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Dumbbell size={20} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Forge's Gym</h1>
            <p className="text-xs text-muted-foreground">Write working code. Pass the tests. No shortcuts.</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="rounded-xl border border-border/40 bg-card/30 p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">{passedCount} of {totalExercises} passed</span>
              <span className="font-bold text-orange-400">{pct}%</span>
            </div>
            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Tiers completed</p>
            <div className="flex gap-1 mt-1">
              {tiers.map(t => {
                const tierEx = EXERCISES.filter(e => e.tier === t);
                const allPassed = tierEx.every(e => progress?.exerciseBest[e.id]?.passed);
                return (
                  <div key={t} className={cn("w-5 h-5 rounded text-xs flex items-center justify-center font-bold",
                    allPassed ? "bg-orange-500/20 text-orange-400" : "bg-muted/20 text-muted-foreground"
                  )}>{t}</div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Learning Profile */}
      {dominantStyle && (
        <div className={cn("rounded-xl border p-4 mb-6 flex items-start gap-4", STYLE_META[dominantStyle].border, STYLE_META[dominantStyle].bg)}>
          {(() => { const Icon = STYLE_ICONS[dominantStyle]; return <Icon size={18} className={cn(STYLE_META[dominantStyle].color, "mt-0.5 shrink-0")} />; })()}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-sm font-bold", STYLE_META[dominantStyle].color)}>{STYLE_META[dominantStyle].label}</span>
              <span className="text-xs text-muted-foreground">· detected from your sessions</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{STYLE_META[dominantStyle].description}</p>
            <p className="text-xs text-foreground/70 mt-1.5 font-medium italic">"{STYLE_META[dominantStyle].tip}"</p>
          </div>
          <div className="hidden sm:flex flex-col gap-1 text-right shrink-0">
            {(["visual", "hands-on", "conceptual", "pattern"] as LearningStyle[]).map(s => (
              <div key={s} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground w-20 text-right">{STYLE_META[s].label.split(" ")[0]}</span>
                <div className="w-16 h-1 bg-muted/30 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", s === "visual" ? "bg-purple-400" : s === "hands-on" ? "bg-orange-400" : s === "conceptual" ? "bg-blue-400" : "bg-green-400")}
                    style={{ width: `${Math.round((profile as Record<string, number>)[`${s === "hands-on" ? "handsOn" : s}Score`] ?? 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!dominantStyle && profile === null && (
        <div className="rounded-xl border border-dashed border-border/40 p-4 mb-6 text-center">
          <p className="text-xs text-muted-foreground">Complete 3+ exercises and your learning profile will appear here — detected automatically from how you work.</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setSelectedTier("all")}
          className={cn("px-3 py-1 rounded-lg border text-xs font-medium transition-colors",
            selectedTier === "all" ? "border-orange-500/50 bg-orange-500/10 text-orange-400" : "border-border/40 text-muted-foreground hover:bg-muted/20"
          )}>All Tiers</button>
        {tiers.map(t => (
          <button key={t} onClick={() => setSelectedTier(selectedTier === t ? "all" : t)}
            className={cn("px-3 py-1 rounded-lg border text-xs font-medium transition-colors",
              selectedTier === t ? cn("border-opacity-50", TIER_META[t].color, "bg-muted/30") : "border-border/40 text-muted-foreground hover:bg-muted/20"
            )}>
            {TIER_META[t].label}
          </button>
        ))}
        <div className="w-px h-6 bg-border/40 self-center" />
        {categories.map(c => (
          <button key={c} onClick={() => setSelectedCategory(selectedCategory === c ? "all" : c)}
            className={cn("px-3 py-1 rounded-lg border text-xs font-medium transition-colors",
              selectedCategory === c ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400" : "border-border/40 text-muted-foreground hover:bg-muted/20"
            )}>
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Exercise list grouped by tier */}
      {(selectedTier === "all" ? tiers : [selectedTier]).map(tier => {
        const tierExercises = filtered.filter(e => e.tier === tier);
        if (tierExercises.length === 0) return null;
        return (
          <div key={tier} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className={cn("text-xs font-black tracking-wider uppercase", TIER_META[tier].color)}>{TIER_META[tier].label}</span>
              <span className="text-xs text-muted-foreground">— {TIER_META[tier].description}</span>
            </div>
            <div className="grid gap-2">
              {tierExercises.map(ex => {
                const best = progress?.exerciseBest[ex.id];
                const passed   = best?.passed ?? false;
                const attempts = best?.attempts ?? 0;
                return (
                  <Link key={ex.id} href={`/gym/${ex.id}`}>
                    <div className={cn(
                      "rounded-xl border p-4 cursor-pointer transition-all duration-150 group flex items-center gap-4",
                      passed
                        ? "border-green-500/20 bg-green-500/5 hover:bg-green-500/10"
                        : "border-border/40 hover:bg-muted/20 hover:border-border/60"
                    )}>
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        passed ? "bg-green-500/15" : "bg-muted/20"
                      )}>
                        {passed
                          ? <CheckCircle2 size={14} className="text-green-400" />
                          : <Circle size={14} className="text-muted-foreground/40" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold">{ex.title}</span>
                          <span className="text-xs text-muted-foreground border border-border/30 px-1.5 py-0.5 rounded">{CATEGORY_LABELS[ex.category]}</span>
                          <span className="text-xs text-muted-foreground">{ex.estimatedMinutes}m</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-tight">{ex.tagline}</p>
                      </div>
                      {attempts > 0 && (
                        <div className="text-right text-xs text-muted-foreground shrink-0">
                          {attempts} {attempts === 1 ? "attempt" : "attempts"}
                        </div>
                      )}
                      <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
