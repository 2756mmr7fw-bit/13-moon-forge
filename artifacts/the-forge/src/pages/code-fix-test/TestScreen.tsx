import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";
import {
  Bug, Timer, Trophy, ChevronRight, Loader2, CheckCircle2,
  XCircle, Lightbulb, Pause, Play, Shield, Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  API_BASE, LEVEL_LABELS, LEVEL_COLORS, LANGUAGE_OPTIONS,
  HINT_PENALTY, formatTime, Challenge, SessionResult,
} from "./types";
import { getUserId } from "@/lib/userId";

function useStopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);

  const start = useCallback(() => {
    startTimeRef.current = Date.now() - elapsedRef.current * 1000;
    setRunning(true);
  }, []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => { setRunning(false); setElapsed(0); elapsedRef.current = 0; }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        const e = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(e); elapsedRef.current = e;
      }, 500);
    } else { if (intervalRef.current) clearInterval(intervalRef.current); }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  return { elapsed, running, start, pause, reset, getElapsed: () => elapsedRef.current };
}

export default function TestScreen({ level, challenges, mode, language, onComplete }: {
  level: number;
  challenges: Challenge[];
  mode: string;
  language: string;
  onComplete: (results: SessionResult[], totalSeconds: number, pausedSeconds: number) => void;
}) {
  const [phase, setPhase]           = useState<"prep" | "test">("prep");
  const [prepText, setPrepText]     = useState("");
  const [prepLoading, setPrepLoading] = useState(false);

  const [idx, setIdx]               = useState(0);
  const [userFix, setUserFix]       = useState("");
  const [checking, setChecking]     = useState(false);
  const [verdict, setVerdict]       = useState<{ correct: boolean; explanation: string } | null>(null);
  const [results, setResults]       = useState<SessionResult[]>([]);
  const [challengeStart, setChallengeStart] = useState(Date.now());

  const [hint, setHint]             = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintUsed, setHintUsed]     = useState(false);

  const [paused, setPaused]         = useState(false);
  const [pausedAt, setPausedAt]     = useState(0);
  const [totalPausedSec, setTotalPausedSec] = useState(0);

  const [rating, setRating]         = useState<number | null>(null);

  const totalTimer     = useStopwatch();
  const challengeTimer = useStopwatch();

  const challenge = challenges[idx];
  const monacoLang = LANGUAGE_OPTIONS.find(l => l.value === language)?.monacoLang ?? "javascript";

  // Load prep brief
  useEffect(() => {
    setPrepLoading(true);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/debug-test/prep-brief`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
          body: JSON.stringify({ level, language }),
        });
        if (!res.ok || !res.body) { setPrepLoading(false); return; }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        setPrepLoading(false);
        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          setPrepText(p => p + dec.decode(value, { stream: true }));
        }
      } finally { if (!cancelled) setPrepLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const startTest = () => {
    setPhase("test");
    totalTimer.start();
    challengeTimer.start();
    if (challenge) setUserFix(challenge.brokenCode);
    setChallengeStart(Date.now());
  };

  const togglePause = () => {
    if (!paused) {
      setPausedAt(Date.now());
      totalTimer.pause();
      challengeTimer.pause();
      setPaused(true);
    } else {
      const extra = Math.floor((Date.now() - pausedAt) / 1000);
      setTotalPausedSec(p => p + extra);
      totalTimer.start();
      challengeTimer.start();
      setPaused(false);
    }
  };

  const getHint = async () => {
    if (!challenge || hintLoading || hintUsed) return;
    setHintLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/debug-test/hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({
          description: challenge.description, brokenCode: challenge.brokenCode,
          challengeLevel: challenge.challengeLevel, language,
        }),
      });
      const d = await res.json() as { hint: string; penaltySeconds: number };
      setHint(d.hint);
      setHintUsed(true);
    } finally { setHintLoading(false); }
  };

  const submitFix = async () => {
    if (!challenge || !userFix.trim() || checking) return;
    setChecking(true);
    challengeTimer.pause();
    const secondsTaken = Math.floor((Date.now() - challengeStart) / 1000) + (hintUsed ? HINT_PENALTY : 0);

    try {
      const res = await fetch(`${API_BASE}/api/debug-test/check-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ description: challenge.description, brokenCode: challenge.brokenCode, userFix }),
      });
      const data = await res.json() as { correct: boolean; explanation: string };
      setVerdict(data);
      setResults(prev => [...prev, {
        challengeLevel: challenge.challengeLevel, bugType: challenge.bugType,
        language, correct: data.correct, secondsTaken, hintUsed,
        rating: null, description: challenge.description,
        brokenCode: challenge.brokenCode, userFix, explanation: data.explanation,
      }]);
    } catch {
      const fallback = { correct: false, explanation: "Could not check. Moving on." };
      setVerdict(fallback);
      setResults(prev => [...prev, {
        challengeLevel: challenge.challengeLevel, bugType: challenge.bugType,
        language, correct: false, secondsTaken, hintUsed,
        rating: null, description: challenge.description,
        brokenCode: challenge.brokenCode, userFix, explanation: fallback.explanation,
      }]);
    } finally { setChecking(false); }
  };

  const next = () => {
    // Save rating on current result
    if (rating !== null && results.length > 0) {
      setResults(prev => prev.map((r, i) => i === prev.length - 1 ? { ...r, rating } : r));
    }
    if (idx + 1 >= challenges.length) {
      totalTimer.pause();
      onComplete(results, totalTimer.elapsed, totalPausedSec);
    } else {
      const nc = challenges[idx + 1];
      setIdx(i => i + 1);
      setVerdict(null); setHint(null); setHintUsed(false); setRating(null);
      setUserFix(nc?.brokenCode ?? "");
      setChallengeStart(Date.now());
      challengeTimer.reset(); challengeTimer.start();
    }
  };

  if (!challenge) return null;

  // ── Prep brief screen ──────────────────────────────────────────────────
  if (phase === "prep") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6 text-center">
        <div>
          <p className={cn("text-sm font-bold mb-1", LEVEL_COLORS[level])}>Level {level} — {LEVEL_LABELS[level]}</p>
          <h2 className="text-xl font-bold">Before you start</h2>
          <p className="text-sm text-muted-foreground mt-1">Forge has a quick brief for you. Read it, then hit Start.</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/50 p-5 text-left space-y-2 min-h-[80px]">
          {prepLoading
            ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={13} className="animate-spin" /> Forge is preparing your brief…</div>
            : <p className="text-sm text-muted-foreground leading-relaxed">{prepText || "Loading…"}</p>
          }
        </div>

        <div className="flex gap-3 justify-center">
          <Button onClick={() => { setPrepText(""); setPhase("test"); startTest(); }} variant="outline" size="sm">
            Skip Brief
          </Button>
          <Button onClick={startTest} className="gap-2 font-bold bg-orange-600 hover:bg-orange-500" disabled={prepLoading && !prepText}>
            <Play size={14} /> Start Test
          </Button>
        </div>
      </div>
    );
  }

  // ── Pause overlay ─────────────────────────────────────────────────────
  if (paused) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center space-y-2">
          <Pause size={32} className="text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">Test Paused</h2>
          <p className="text-sm text-muted-foreground">Timer stopped. Take your time.</p>
        </div>
        <Button onClick={togglePause} className="gap-2 font-bold bg-orange-600 hover:bg-orange-500">
          <Play size={14} /> Resume
        </Button>
      </div>
    );
  }

  const progressPct = (idx / challenges.length) * 100;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-bold", LEVEL_COLORS[level])}>
            {mode === "boss" ? "⚔️ Boss" : `Level ${level}`} — {LEVEL_LABELS[level]}
          </span>
          <span className="text-muted-foreground text-sm">•</span>
          <span className="text-sm text-muted-foreground">Challenge {idx + 1} of {challenges.length}</span>
          <span className="text-xs text-muted-foreground border border-border/40 px-1.5 py-0.5 rounded">{LANGUAGE_OPTIONS.find(l => l.value === language)?.label ?? language}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Timer size={13} className="text-orange-400" />
            <span className="font-mono text-sm font-bold text-orange-400">{formatTime(totalTimer.elapsed)}</span>
          </div>
          <button onClick={togglePause} className="text-muted-foreground hover:text-foreground transition-colors">
            <Pause size={14} />
          </button>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div className="h-full rounded-full bg-orange-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Challenge info */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs border-border/60 text-muted-foreground">{challenge.bugType}</Badge>
          {challenge.challengeLevel !== level && (
            <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">Review: Level {challenge.challengeLevel}</Badge>
          )}
          {hintUsed && <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">+{HINT_PENALTY}s hint penalty</Badge>}
        </div>
        <p className="text-sm font-medium leading-relaxed">{challenge.description}</p>

        {hint && (
          <div className="flex items-start gap-2 text-xs text-yellow-400/90 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 mt-1">
            <Lightbulb size={12} className="mt-0.5 shrink-0" />
            <span>{hint}</span>
          </div>
        )}
      </div>

      {/* Monaco editors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Bug size={11} className="text-red-400" /> Broken Code
          </p>
          <div className="rounded-lg overflow-hidden border border-red-900/30" style={{ height: 260 }}>
            <Editor
              height="260px" language={monacoLang} value={challenge.brokenCode}
              theme="vs-dark"
              options={{
                readOnly: true, fontSize: 13, minimap: { enabled: false },
                lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false,
                automaticLayout: true, tabSize: 2,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                padding: { top: 8, bottom: 8 },
              }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield size={11} className="text-green-400" /> Your Fix
          </p>
          <div className="rounded-lg overflow-hidden border border-green-900/30" style={{ height: 260 }}>
            <Editor
              height="260px" language={monacoLang} value={userFix}
              onChange={v => setUserFix(v ?? "")}
              theme="vs-dark"
              options={{
                readOnly: !!verdict, fontSize: 13, minimap: { enabled: false },
                lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false,
                automaticLayout: true, tabSize: 2,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                padding: { top: 8, bottom: 8 },
              }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      {!verdict && (
        <div className="flex gap-3">
          <Button onClick={getHint} disabled={hintLoading || hintUsed} variant="outline" size="sm" className="gap-1.5 text-yellow-400 border-yellow-500/30">
            {hintLoading ? <Loader2 size={12} className="animate-spin" /> : <Lightbulb size={12} />}
            {hintUsed ? "Hint used" : `Hint (+${HINT_PENALTY}s)`}
          </Button>
          <Button onClick={submitFix} disabled={checking || !userFix.trim()} className="flex-1 gap-2 font-bold bg-orange-600 hover:bg-orange-500">
            {checking ? <><Loader2 size={15} className="animate-spin" /> Checking…</> : <><ChevronRight size={15} /> Submit Fix</>}
          </Button>
        </div>
      )}

      {verdict && (
        <div className={cn("rounded-xl border p-4 space-y-3",
          verdict.correct ? "border-green-500/30 bg-green-950/20" : "border-red-500/30 bg-red-950/15"
        )}>
          <div className="flex items-center gap-2">
            {verdict.correct ? <CheckCircle2 size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />}
            <span className={cn("text-sm font-bold", verdict.correct ? "text-green-400" : "text-red-400")}>
              {verdict.correct ? "Correct!" : "Not quite."}
            </span>
            {!verdict.correct && <span className="text-xs text-muted-foreground ml-1">Forge will break this down in the review.</span>}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{verdict.explanation}</p>

          {/* Challenge rating */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rate this challenge:</span>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRating(n)}>
                <Star size={14} className={cn("transition-colors", rating !== null && n <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/40")} />
              </button>
            ))}
          </div>

          <Button onClick={next} className="gap-2 font-bold" size="sm">
            {idx + 1 >= challenges.length ? <><Trophy size={14} /> Finish &amp; Get Review</> : <><ChevronRight size={14} /> Next Challenge</>}
          </Button>
        </div>
      )}
    </div>
  );
}
