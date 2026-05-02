import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Bug, Timer, Trophy, Flame, ChevronRight, RotateCcw,
  CheckCircle2, XCircle, Star, TrendingUp, Lock, Loader2,
  BarChart2, Play, Shield,
} from "lucide-react";
import { getUserId } from "@/lib/userId";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const MIN_REQUIRED = 3;

const LEVEL_LABELS: Record<number, string> = {
  1: "HTML Basics", 2: "CSS Basics", 3: "JS Syntax", 4: "JS Variables",
  5: "JS Logic", 6: "JS Scope", 7: "Async/Await", 8: "Array Methods",
  9: "API Handling", 10: "this Binding", 11: "Security", 12: "Architecture",
};

const LEVEL_COLORS: Record<number, string> = {
  1: "text-green-400", 2: "text-green-400", 3: "text-lime-400", 4: "text-lime-400",
  5: "text-yellow-400", 6: "text-yellow-400", 7: "text-orange-400", 8: "text-orange-400",
  9: "text-red-400", 10: "text-red-400", 11: "text-purple-400", 12: "text-fuchsia-400",
};

interface Challenge {
  description: string;
  brokenCode: string;
  bugType: string;
  challengeLevel: number;
}

interface SessionResult {
  challengeLevel: number;
  bugType: string;
  correct: boolean;
  secondsTaken: number;
}

interface HistorySession {
  id: number;
  level: number;
  completedAt: string;
  totalSeconds: number;
  challengeCount: number;
  correctCount: number;
}

interface LevelProgress {
  level: number;
  completedSessions: number;
  bestTotalSeconds: number | null;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function useStopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const start = useCallback(() => {
    startTimeRef.current = Date.now() - elapsed * 1000;
    setRunning(true);
  }, [elapsed]);

  const pause = useCallback(() => setRunning(false), []);

  const reset = useCallback(() => {
    setRunning(false);
    setElapsed(0);
  }, []);

  const snapshot = useCallback(() => elapsed, [elapsed]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  return { elapsed, running, start, pause, reset, snapshot };
}

// ── Progress / Home Screen ─────────────────────────────────────────────────
function ProgressScreen({ onStart }: { onStart: (level: number) => void }) {
  const [progress, setProgress] = useState<LevelProgress[]>([]);
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState(1);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/debug-test/progress`, {
          headers: { "x-user-id": getUserId() },
        });
        if (res.ok) {
          const data = await res.json() as { progress: LevelProgress[]; recentSessions: HistorySession[] };
          setProgress(data.progress ?? []);
          setHistory(data.recentSessions ?? []);

          // Auto-select highest unlocked level
          const progressMap = Object.fromEntries((data.progress ?? []).map(p => [p.level, p]));
          let highestUnlocked = 1;
          for (let l = 1; l <= 12; l++) {
            const p = progressMap[l];
            if (l === 1 || (progressMap[l - 1]?.completedSessions ?? 0) >= MIN_REQUIRED) {
              highestUnlocked = l;
            }
            if (!p || p.completedSessions < MIN_REQUIRED) break;
          }
          setSelectedLevel(highestUnlocked);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const progressMap = Object.fromEntries(progress.map(p => [p.level, p]));

  const isUnlocked = (level: number) => {
    if (level === 1) return true;
    return (progressMap[level - 1]?.completedSessions ?? 0) >= MIN_REQUIRED;
  };

  const levelHistory = history.filter(s => s.level === selectedLevel && s.completedAt);
  const firstTime = levelHistory.length > 0 ? levelHistory[levelHistory.length - 1]?.totalSeconds : null;
  const bestTime = levelHistory.length > 0 ? Math.min(...levelHistory.map(s => s.totalSeconds)) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
          <Timer size={18} className="text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Code Fix Test</h1>
          <p className="text-sm text-muted-foreground">Timed tests that track your improvement. Every session saved.</p>
        </div>
      </div>

      {/* Level Grid */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Select a level to test</p>
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(l => {
            const p = progressMap[l];
            const unlocked = isUnlocked(l);
            const sessions = p?.completedSessions ?? 0;
            const isSelected = l === selectedLevel;
            const color = LEVEL_COLORS[l] ?? "text-zinc-400";

            return (
              <button
                key={l}
                disabled={!unlocked}
                onClick={() => setSelectedLevel(l)}
                className={cn(
                  "relative h-12 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5",
                  !unlocked
                    ? "bg-muted/10 border-border/30 text-muted-foreground/30 cursor-not-allowed"
                    : isSelected
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border/40 bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                )}
              >
                {!unlocked ? <Lock size={10} /> : <span className={isSelected ? "" : color}>{l}</span>}
                {unlocked && (
                  <span className="text-[9px] opacity-60">
                    {sessions}/{MIN_REQUIRED}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock size={10} /> Complete {MIN_REQUIRED} tests at each level to unlock the next
        </div>
      </div>

      {/* Selected Level Detail */}
      {selectedLevel && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-lg font-bold", LEVEL_COLORS[selectedLevel])}>
                  Level {selectedLevel}
                </span>
                <span className="text-muted-foreground">—</span>
                <span className="text-sm font-medium">{LEVEL_LABELS[selectedLevel]}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {(progressMap[selectedLevel]?.completedSessions ?? 0)} of {MIN_REQUIRED} sessions completed to unlock next level
              </p>
            </div>

            <Button
              onClick={() => onStart(selectedLevel)}
              disabled={!isUnlocked(selectedLevel)}
              className="gap-2 font-bold bg-orange-600 hover:bg-orange-500"
            >
              <Play size={14} /> Start Test
            </Button>
          </div>

          {/* Time progression */}
          {levelHistory.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingUp size={11} /> Your time history for this level
              </p>
              <div className="flex flex-wrap gap-2">
                {levelHistory.slice().reverse().map((s, i) => {
                  const isFirst = i === 0;
                  const isBest = s.totalSeconds === bestTime;
                  return (
                    <div key={s.id} className={cn(
                      "flex flex-col items-center px-3 py-2 rounded-lg border text-xs",
                      isBest ? "border-green-500/40 bg-green-500/10" : "border-border/40 bg-muted/20"
                    )}>
                      <span className="text-[10px] text-muted-foreground mb-0.5">
                        {isFirst ? "First" : `#${i + 1}`}{isBest ? " 🏆" : ""}
                      </span>
                      <span className="font-bold">{formatTime(s.totalSeconds)}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {s.correctCount}/{s.challengeCount} correct
                      </span>
                    </div>
                  );
                })}
              </div>
              {firstTime !== null && bestTime !== null && firstTime !== bestTime && (
                <p className="text-xs text-green-400">
                  You improved by {formatTime(firstTime - bestTime)} from your first attempt!
                </p>
              )}
            </div>
          )}

          {levelHistory.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No tests taken at this level yet. Start your first test!</p>
          )}
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Timer, color: "text-orange-400", bg: "bg-orange-500/10", title: "Time Recorded", desc: "Not a countdown. The clock just runs. Your time is saved every session so you can watch yourself get faster." },
          { icon: BarChart2, color: "text-blue-400", bg: "bg-blue-500/10", title: "Track Improvement", desc: "Every test session is saved. See your first attempt vs. your latest — the numbers tell the story." },
          { icon: Shield, color: "text-purple-400", bg: "bg-purple-500/10", title: "Cumulative Tests", desc: "Higher levels mix in challenges from past levels. By Level 12, you've seen everything — and fixed all of it." },
        ].map(({ icon: Icon, color, bg, title, desc }) => (
          <div key={title} className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bg)}>
              <Icon size={15} className={color} />
            </div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Active Test Screen ─────────────────────────────────────────────────────
function TestScreen({
  level, challenges, onComplete,
}: {
  level: number;
  challenges: Challenge[];
  onComplete: (results: SessionResult[], totalSeconds: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [userFix, setUserFix] = useState("");
  const [checking, setChecking] = useState(false);
  const [verdict, setVerdict] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [challengeStart, setChallengeStart] = useState(Date.now());
  const totalTimer = useStopwatch();
  const challengeTimer = useStopwatch();

  const challenge = challenges[idx];

  useEffect(() => {
    totalTimer.start();
    challengeTimer.start();
    if (challenge) setUserFix(challenge.brokenCode);
    setChallengeStart(Date.now());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitFix = async () => {
    if (!challenge || !userFix.trim() || checking) return;
    setChecking(true);
    challengeTimer.pause();

    const secondsTaken = Math.floor((Date.now() - challengeStart) / 1000);

    try {
      const res = await fetch(`${API_BASE}/api/debug-test/check-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({
          description: challenge.description,
          brokenCode: challenge.brokenCode,
          userFix,
        }),
      });
      const data = await res.json() as { correct: boolean; explanation: string };
      setVerdict(data);
      setResults(prev => [...prev, {
        challengeLevel: challenge.challengeLevel,
        bugType: challenge.bugType,
        correct: data.correct,
        secondsTaken,
      }]);
    } catch {
      setVerdict({ correct: false, explanation: "Could not check. Moving on." });
      setResults(prev => [...prev, {
        challengeLevel: challenge.challengeLevel,
        bugType: challenge.bugType,
        correct: false,
        secondsTaken,
      }]);
    } finally {
      setChecking(false);
    }
  };

  const next = () => {
    if (idx + 1 >= challenges.length) {
      totalTimer.pause();
      onComplete(results, totalTimer.elapsed);
    } else {
      const nextChallenge = challenges[idx + 1];
      setIdx(i => i + 1);
      setVerdict(null);
      setUserFix(nextChallenge?.brokenCode ?? "");
      setChallengeStart(Date.now());
      challengeTimer.reset();
      challengeTimer.start();
    }
  };

  if (!challenge) return null;

  const progressPct = ((idx) / challenges.length) * 100;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Test Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-bold", LEVEL_COLORS[level])}>
            Level {level} — {LEVEL_LABELS[level]}
          </span>
          <span className="text-muted-foreground text-sm">•</span>
          <span className="text-sm text-muted-foreground">
            Challenge {idx + 1} of {challenges.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Timer size={13} className="text-orange-400" />
          <span className="font-mono text-sm font-bold text-orange-400">
            {formatTime(totalTimer.elapsed)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-orange-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Challenge */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs border-border/60 text-muted-foreground">
            {challenge.bugType}
          </Badge>
          {challenge.challengeLevel !== level && (
            <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">
              Review: Level {challenge.challengeLevel}
            </Badge>
          )}
        </div>
        <p className="text-sm font-medium leading-relaxed">{challenge.description}</p>
      </div>

      {/* Code panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Bug size={11} className="text-red-400" /> Broken Code
          </p>
          <pre className="rounded-lg border border-red-900/30 bg-red-950/10 p-4 text-sm font-mono leading-relaxed overflow-auto whitespace-pre min-h-[200px] text-foreground/90">
            {challenge.brokenCode}
          </pre>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield size={11} className="text-green-400" /> Your Fix
          </p>
          <Textarea
            value={userFix}
            onChange={e => setUserFix(e.target.value)}
            disabled={!!verdict}
            className="font-mono text-sm min-h-[200px] resize-none leading-relaxed border-green-900/30 bg-green-950/5"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Submit / Verdict */}
      {!verdict && (
        <Button
          onClick={submitFix}
          disabled={checking || !userFix.trim()}
          className="w-full gap-2 font-bold bg-orange-600 hover:bg-orange-500"
        >
          {checking
            ? <><Loader2 size={15} className="animate-spin" /> Checking…</>
            : <><ChevronRight size={15} /> Submit Fix</>
          }
        </Button>
      )}

      {verdict && (
        <div className={cn(
          "rounded-xl border p-4 space-y-3",
          verdict.correct ? "border-green-500/30 bg-green-950/20" : "border-red-500/30 bg-red-950/15"
        )}>
          <div className="flex items-center gap-2">
            {verdict.correct
              ? <CheckCircle2 size={16} className="text-green-400" />
              : <XCircle size={16} className="text-red-400" />
            }
            <span className={cn("text-sm font-bold", verdict.correct ? "text-green-400" : "text-red-400")}>
              {verdict.correct ? "Correct!" : "Not quite."}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{verdict.explanation}</p>

          <Button onClick={next} className="gap-2 font-bold" size="sm">
            {idx + 1 >= challenges.length ? (
              <><Trophy size={14} /> Finish Test</>
            ) : (
              <><ChevronRight size={14} /> Next Challenge</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Results Screen ─────────────────────────────────────────────────────────
function ResultsScreen({
  level, results, totalSeconds, onRetake, onBack,
}: {
  level: number;
  results: SessionResult[];
  totalSeconds: number;
  onRetake: () => void;
  onBack: () => void;
}) {
  const [saving, setSaving] = useState(true);
  const [saved, setSaved] = useState<{
    correctCount: number; total: number; unlockedNext: boolean;
    completedSessions: number; minRequired: number;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/debug-test/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
          body: JSON.stringify({ level, totalSeconds, results }),
        });
        if (res.ok) {
          const data = await res.json();
          setSaved(data);
        }
      } finally {
        setSaving(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const correctCount = results.filter(r => r.correct).length;
  const accuracy = Math.round((correctCount / results.length) * 100);
  const avgSeconds = Math.round(totalSeconds / results.length);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/15 flex items-center justify-center mx-auto">
          <Trophy size={24} className="text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold">Test Complete</h2>
        <p className={cn("text-sm font-medium", LEVEL_COLORS[level])}>
          Level {level} — {LEVEL_LABELS[level]}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Time", value: formatTime(totalSeconds), icon: Timer, color: "text-orange-400" },
          { label: "Accuracy", value: `${accuracy}%`, icon: Star, color: accuracy >= 80 ? "text-green-400" : "text-yellow-400" },
          { label: "Avg / Fix", value: formatTime(avgSeconds), icon: Flame, color: "text-blue-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border/50 bg-card/50 p-3 text-center">
            <Icon size={14} className={cn(color, "mx-auto mb-1")} />
            <p className="text-lg font-bold">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Per-challenge breakdown */}
      <div className="rounded-xl border border-border/50 bg-card/30 divide-y divide-border/30 overflow-hidden">
        {results.map((r, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div className="flex items-center gap-2">
              {r.correct
                ? <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                : <XCircle size={14} className="text-red-400 shrink-0" />
              }
              <span className="text-muted-foreground text-xs">{r.bugType}</span>
              {r.challengeLevel !== level && (
                <span className="text-[10px] text-yellow-500">L{r.challengeLevel}</span>
              )}
            </div>
            <span className="font-mono text-xs text-muted-foreground">{formatTime(r.secondsTaken)}</span>
          </div>
        ))}
      </div>

      {/* Save status */}
      <div className="text-center text-xs text-muted-foreground">
        {saving ? (
          <span className="flex items-center justify-center gap-1.5">
            <Loader2 size={11} className="animate-spin" /> Saving results…
          </span>
        ) : saved ? (
          <div className="space-y-1">
            <p className="text-green-400">✓ Saved — Session {saved.completedSessions} of {saved.minRequired} at this level</p>
            {saved.unlockedNext && level < 12 && (
              <p className="text-orange-400 font-semibold">🔓 Level {level + 1} unlocked!</p>
            )}
          </div>
        ) : (
          <span className="text-destructive">Could not save. Results recorded locally.</span>
        )}
      </div>

      <div className="flex gap-3">
        <Button onClick={onBack} variant="outline" className="flex-1 gap-2">
          <BarChart2 size={14} /> View Progress
        </Button>
        <Button onClick={onRetake} className="flex-1 gap-2 bg-orange-600 hover:bg-orange-500 font-bold">
          <RotateCcw size={14} /> Retake Level {level}
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function CodeFixTest() {
  const [screen, setScreen] = useState<"progress" | "loading" | "test" | "results">("progress");
  const [level, setLevel] = useState(1);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [loadError, setLoadError] = useState("");

  const startTest = async (lvl: number) => {
    setLevel(lvl);
    setScreen("loading");
    setLoadError("");

    try {
      const res = await fetch(`${API_BASE}/api/debug-test/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ level: lvl }),
      });
      const data = await res.json() as { challenges?: Challenge[]; error?: string };
      if (!res.ok || data.error) {
        setLoadError(data.error ?? "Failed to generate test.");
        setScreen("progress");
      } else {
        setChallenges(data.challenges ?? []);
        setScreen("test");
      }
    } catch {
      setLoadError("Connection error. Try again.");
      setScreen("progress");
    }
  };

  const handleComplete = (sessionResults: SessionResult[], seconds: number) => {
    setResults(sessionResults);
    setTotalSeconds(seconds);
    setScreen("results");
  };

  if (screen === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={28} className="animate-spin text-orange-400" />
        <p className="text-sm text-muted-foreground">Forging your Level {level} test…</p>
        {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      </div>
    );
  }

  if (screen === "test") {
    return (
      <TestScreen
        level={level}
        challenges={challenges}
        onComplete={handleComplete}
      />
    );
  }

  if (screen === "results") {
    return (
      <ResultsScreen
        level={level}
        results={results}
        totalSeconds={totalSeconds}
        onRetake={() => startTest(level)}
        onBack={() => setScreen("progress")}
      />
    );
  }

  return <ProgressScreen onStart={startTest} />;
}
