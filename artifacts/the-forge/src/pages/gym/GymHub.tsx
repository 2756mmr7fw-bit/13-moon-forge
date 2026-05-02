import { useState, useEffect } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  Dumbbell, CheckCircle2, Circle, ChevronRight,
  Eye, Hand, Brain, TrendingUp, FlaskConical,
  LayoutGrid, BookOpen,
} from "lucide-react";
import { ALL_GYM_EXERCISES } from "./exercises";
import { TEST_WRITING_EXERCISES } from "./testWritingExercises";
import {
  GYM_API, TIER_META, CATEGORY_LABELS, STYLE_META, CURRICULUM_TRACKS,
  type LearningProfileData, type LearningStyle, type Tier, type Category,
  type AnyExercise,
} from "./types";
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
  const [progress,    setProgress]    = useState<Progress | null>(null);
  const [view,        setView]        = useState<"tier" | "curriculum">("tier");
  const [activeTier,  setActiveTier]  = useState<Tier | "all">("all");
  const [activeCat,   setActiveCat]   = useState<Category | "all">("all");

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

  const tiers      = [1, 2, 3, 4] as Tier[];
  const categories = Object.keys(CATEGORY_LABELS) as Category[];
  const solveExs   = ALL_GYM_EXERCISES.filter(e => e.format !== "write-tests") as AnyExercise[];
  const testExs    = TEST_WRITING_EXERCISES as AnyExercise[];
  const allExs     = ALL_GYM_EXERCISES;

  const totalExercises = allExs.length;
  const passedCount    = progress?.totalPassed ?? 0;
  const pct            = totalExercises > 0 ? Math.round((passedCount / totalExercises) * 100) : 0;

  const profile       = progress?.learningProfile;
  const dominantStyle = profile?.dominantStyle as LearningStyle | undefined;

  const filteredSolve = solveExs.filter(e => {
    if (view === "curriculum") return true;
    if (activeTier !== "all" && (e as { tier: Tier }).tier !== activeTier) return false;
    if (activeCat !== "all" && e.category !== activeCat) return false;
    return true;
  });

  function ExerciseCard({ ex }: { ex: AnyExercise }) {
    const best     = progress?.exerciseBest[ex.id];
    const passed   = best?.passed ?? false;
    const attempts = best?.attempts ?? 0;
    const isTest   = ex.format === "write-tests";
    const tier     = (ex as { tier: Tier }).tier;
    return (
      <Link href={`/gym/${ex.id}`}>
        <div className={cn(
          "rounded-xl border p-4 cursor-pointer transition-all duration-150 group flex items-center gap-4",
          passed
            ? "border-green-500/20 bg-green-500/5 hover:bg-green-500/10"
            : "border-border/40 hover:bg-muted/20 hover:border-border/60"
        )}>
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            passed ? "bg-green-500/15" : isTest ? "bg-amber-500/10" : "bg-muted/20"
          )}>
            {passed
              ? <CheckCircle2 size={14} className="text-green-400" />
              : isTest
                ? <FlaskConical size={14} className="text-amber-400" />
                : <Circle size={14} className="text-muted-foreground/40" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-sm font-semibold">{ex.title}</span>
              {isTest && <span className="text-xs text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">Write Tests</span>}
              <span className="text-xs text-muted-foreground border border-border/30 px-1.5 py-0.5 rounded">{CATEGORY_LABELS[ex.category]}</span>
              <span className={cn("text-xs font-bold", TIER_META[tier].color)}>{TIER_META[tier].label}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-tight">{(ex as { tagline: string }).tagline}</p>
          </div>
          {attempts > 0 && (
            <div className="text-right text-xs text-muted-foreground shrink-0">
              {attempts} {attempts === 1 ? "attempt" : "attempts"}
            </div>
          )}
          <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
        </div>
      </Link>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Dumbbell size={20} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Forge's Gym</h1>
            <p className="text-xs text-muted-foreground">Write working code. Pass the tests. Write the tests. No shortcuts.</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="rounded-xl border border-border/40 bg-card/30 p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">{passedCount} of {totalExercises} passed ({solveExs.length} solve + {testExs.length} write-tests)</span>
              <span className="font-bold text-orange-400">{pct}%</span>
            </div>
            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Tiers</p>
            <div className="flex gap-1 mt-1">
              {tiers.map(t => {
                const tierEx = allExs.filter(e => (e as { tier?: Tier }).tier === t);
                const allPassed = tierEx.length > 0 && tierEx.every(e => progress?.exerciseBest[e.id]?.passed);
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
            {(["visual", "hands-on", "conceptual", "pattern"] as LearningStyle[]).map(s => {
              const scoreMap: Record<LearningStyle, number> = {
                visual:      profile?.visualScore     ?? 0,
                "hands-on":  profile?.handsOnScore    ?? 0,
                conceptual:  profile?.conceptualScore ?? 0,
                pattern:     profile?.patternScore    ?? 0,
              };
              const score = Math.round(scoreMap[s]);
              return (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-20 text-right">{STYLE_META[s].label.split(" ")[0]}</span>
                  <div className="w-16 h-1 bg-muted/30 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", s === "visual" ? "bg-purple-400" : s === "hands-on" ? "bg-orange-400" : s === "conceptual" ? "bg-blue-400" : "bg-green-400")}
                      style={{ width: `${score}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!dominantStyle && profile === null && (
        <div className="rounded-xl border border-dashed border-border/40 p-4 mb-6 text-center">
          <p className="text-xs text-muted-foreground">Complete 3+ exercises and your learning profile appears here — detected silently from how you work.</p>
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => setView("tier")}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
            view === "tier" ? "border-orange-500/50 bg-orange-500/10 text-orange-400" : "border-border/40 text-muted-foreground hover:bg-muted/20"
          )}>
          <LayoutGrid size={12} /> By Tier
        </button>
        <button onClick={() => setView("curriculum")}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
            view === "curriculum" ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-border/40 text-muted-foreground hover:bg-muted/20"
          )}>
          <BookOpen size={12} /> CS Curriculum
        </button>
        {view === "tier" && (
          <>
            <div className="w-px h-5 bg-border/40" />
            {tiers.map(t => (
              <button key={t} onClick={() => setActiveTier(activeTier === t ? "all" : t)}
                className={cn("px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors",
                  activeTier === t ? cn(TIER_META[t].color, "border-current/30 bg-muted/30") : "border-border/40 text-muted-foreground hover:bg-muted/20"
                )}>T{t}</button>
            ))}
            <div className="w-px h-5 bg-border/40" />
            {categories.slice(0, 6).map(c => (
              <button key={c} onClick={() => setActiveCat(activeCat === c ? "all" : c)}
                className={cn("px-2.5 py-1 rounded-lg border text-xs transition-colors hidden lg:block",
                  activeCat === c ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400" : "border-border/40 text-muted-foreground hover:bg-muted/20"
                )}>
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </>
        )}
      </div>

      {/* ── BY TIER VIEW ─────────────────────────────────────────────────────── */}
      {view === "tier" && (
        <div className="space-y-8">
          {(activeTier === "all" ? tiers : [activeTier]).map(tier => {
            const tierExs = filteredSolve.filter(e => (e as { tier: Tier }).tier === tier);
            const tierTestExs = testExs.filter(e => (e as { tier: Tier }).tier === tier);
            const combined = [...tierExs, ...tierTestExs];
            if (combined.length === 0) return null;
            return (
              <div key={tier}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn("text-xs font-black tracking-wider uppercase", TIER_META[tier].color)}>{TIER_META[tier].label}</span>
                  <span className="text-xs text-muted-foreground">— {TIER_META[tier].description}</span>
                </div>
                <div className="grid gap-2">
                  {combined.map(ex => <ExerciseCard key={ex.id} ex={ex} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CURRICULUM VIEW ───────────────────────────────────────────────────── */}
      {view === "curriculum" && (
        <div className="space-y-8">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs font-bold text-blue-400 mb-1">The Full CS Curriculum</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every track covers what a computer science degree teaches — plus the practical skills it skips.
              Someone who studied CS will fill in gaps they didn't know they had.
              Someone who didn't will come out knowing everything they do, and more.
            </p>
          </div>

          {CURRICULUM_TRACKS.map(track => {
            const trackExs = allExs.filter(e => track.categories.includes(e.category));
            if (trackExs.length === 0) return null;
            const passedInTrack = trackExs.filter(e => progress?.exerciseBest[e.id]?.passed).length;
            const trackPct = trackExs.length > 0 ? Math.round((passedInTrack / trackExs.length) * 100) : 0;
            return (
              <div key={track.id}>
                {/* Track header */}
                <div className={cn("rounded-xl border p-4 mb-3", track.border, track.bg)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className={cn("text-xs font-black uppercase tracking-wider mb-0.5", track.color)}>{track.title}</p>
                      <p className="text-xs text-muted-foreground mb-1">{track.forge}</p>
                      <p className="text-xs italic text-muted-foreground/50">{track.subtitle}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("text-lg font-black", track.color)}>{trackPct}%</p>
                      <p className="text-xs text-muted-foreground">{passedInTrack}/{trackExs.length}</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1 bg-muted/20 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-700", track.color.replace("text-", "bg-"))}
                      style={{ width: `${trackPct}%` }} />
                  </div>
                </div>
                <div className="grid gap-2">
                  {trackExs.map(ex => <ExerciseCard key={ex.id} ex={ex} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
