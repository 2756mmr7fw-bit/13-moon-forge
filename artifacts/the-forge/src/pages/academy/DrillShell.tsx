import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Timer, CheckCircle2, XCircle, RotateCcw,
  Loader2, Flame, Target, ChevronDown,
} from "lucide-react";
import { DrillType, Difficulty, DRILL_META, DIFFICULTY_LABELS, DrillProgress, formatTime, accuracyColor, API_BASE } from "./types";
import { getUserId } from "@/lib/userId";

// ── Stopwatch ─────────────────────────────────────────────────────────────────
export function useStopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const ref    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const elRef  = useRef(0);

  const start = useCallback(() => {
    startRef.current = Date.now() - elRef.current * 1000;
    setRunning(true);
  }, []);
  const pause  = useCallback(() => setRunning(false), []);
  const reset  = useCallback(() => { setRunning(false); setElapsed(0); elRef.current = 0; }, []);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        const e = Math.floor((Date.now() - startRef.current) / 1000);
        setElapsed(e); elRef.current = e;
      }, 500);
    } else { if (ref.current) clearInterval(ref.current); }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  return { elapsed, running, start, pause, reset, getElapsed: () => elRef.current };
}

// ── useDrill hook ─────────────────────────────────────────────────────────────
export function useDrill(type: DrillType) {
  const [progress, setProgress] = useState<DrillProgress | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/academy/progress`, { headers: { "x-user-id": getUserId() } });
        if (res.ok) {
          const d = await res.json() as { byType: Record<string, DrillProgress>; streak: number };
          const p = d.byType[type] ?? { total: 0, correct: 0, today: 0, lastSeen: null };
          setProgress(p);
        }
      } catch { /* ignore */ }
    })();
  }, [type]);

  return { progress };
}

// ── Result banner ─────────────────────────────────────────────────────────────
export function ResultBanner({ correct, feedback, correctAnswer, onNext, onRetry, secondsTaken }: {
  correct:       boolean;
  feedback:      string;
  correctAnswer: string;
  secondsTaken:  number;
  onNext:        () => void;
  onRetry:       () => void;
}) {
  return (
    <div className={cn("rounded-xl border p-5 space-y-3 mt-4",
      correct ? "border-green-500/30 bg-green-950/20" : "border-red-500/30 bg-red-950/15"
    )}>
      <div className="flex items-center gap-2">
        {correct
          ? <CheckCircle2 size={18} className="text-green-400 shrink-0" />
          : <XCircle     size={18} className="text-red-400 shrink-0" />
        }
        <span className={cn("font-bold text-sm", correct ? "text-green-400" : "text-red-400")}>
          {correct ? `Correct! Answered in ${formatTime(secondsTaken)}` : "Not quite."}
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{feedback}</p>
      {!correct && correctAnswer && (
        <div className="rounded-lg bg-muted/20 border border-border/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Answer: </span>{correctAnswer}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button onClick={onRetry} variant="outline" size="sm" className="gap-1.5"><RotateCcw size={12} /> Try Another</Button>
        <Button onClick={onNext}  size="sm" className="gap-1.5 bg-orange-600 hover:bg-orange-500 font-bold flex-1">Next Drill →</Button>
      </div>
    </div>
  );
}

// ── Main DrillShell ───────────────────────────────────────────────────────────
export default function DrillShell({ type, difficulty, onDifficultyChange, progress, elapsed, children }: {
  type:               DrillType;
  difficulty:         Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  progress:           DrillProgress | null;
  elapsed:            number;
  children:           ReactNode;
}) {
  const meta = DRILL_META[type];
  const [diffOpen, setDiffOpen] = useState(false);

  const accuracy = progress && progress.total > 0
    ? Math.round((progress.correct / progress.total) * 100) : null;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/academy" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
          </Link>

          <div className="flex-1 flex items-center gap-2">
            <span className={cn("text-sm font-bold", meta.color)}>{meta.label}</span>
          </div>

          {/* Difficulty */}
          <div className="relative">
            <button
              onClick={() => setDiffOpen(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/50 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              {DIFFICULTY_LABELS[difficulty]} <ChevronDown size={10} />
            </button>
            {diffOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-background border border-border rounded-lg shadow-xl overflow-hidden">
                {(["beginner", "intermediate", "advanced"] as Difficulty[]).map(d => (
                  <button key={d} onClick={() => { onDifficultyChange(d); setDiffOpen(false); }}
                    className={cn("block w-full px-4 py-2 text-xs text-left hover:bg-muted/40 transition-colors",
                      d === difficulty ? "text-primary font-semibold" : "text-muted-foreground"
                    )}>
                    {DIFFICULTY_LABELS[d]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timer */}
          <div className="flex items-center gap-1.5 text-orange-400">
            <Timer size={13} />
            <span className="font-mono text-sm font-bold">{formatTime(elapsed)}</span>
          </div>

          {/* Stats */}
          {progress && progress.total > 0 && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
              {accuracy !== null && (
                <span className={cn("font-semibold", accuracyColor(accuracy))}>{accuracy}%</span>
              )}
              <span>{progress.total} done</span>
              {progress.today > 0 && (
                <span className="text-orange-400 flex items-center gap-1"><Flame size={10} /> {progress.today} today</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  );
}
