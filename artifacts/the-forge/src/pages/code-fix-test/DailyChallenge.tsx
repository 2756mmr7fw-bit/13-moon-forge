import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";
import {
  Calendar, Timer, CheckCircle2, XCircle, Loader2, ArrowLeft,
  Trophy, Users, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { API_BASE, LANGUAGE_OPTIONS, formatTime, todayStr } from "./types";
import { getUserId } from "@/lib/userId";

interface DailyData {
  challengeDate: string;
  language: string;
  bugType: string;
  challengeData: { description: string; brokenCode: string };
  alreadyDone: boolean;
  attempt: { correct: boolean; secondsTaken: number; userFix: string } | null;
}

function useStopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const elRef = useRef(0);

  const start = useCallback(() => { startRef.current = Date.now() - elRef.current * 1000; setRunning(true); }, []);
  const pause = useCallback(() => setRunning(false), []);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        const e = Math.floor((Date.now() - startRef.current) / 1000);
        setElapsed(e); elRef.current = e;
      }, 500);
    } else { if (ref.current) clearInterval(ref.current); }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  return { elapsed, start, pause, getElapsed: () => elRef.current };
}

export default function DailyChallenge({ onBack }: { onBack: () => void }) {
  const [loading, setLoading]   = useState(true);
  const [daily, setDaily]       = useState<DailyData | null>(null);
  const [error, setError]       = useState("");
  const [userFix, setUserFix]   = useState("");
  const [checking, setChecking] = useState(false);
  const [verdict, setVerdict]   = useState<{ correct: boolean; explanation: string } | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ correct: boolean; secondsTaken: number }[]>([]);
  const timer = useStopwatch();

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/debug-test/daily`, { headers: { "x-user-id": getUserId() } });
        if (!res.ok) { setError("Could not load today's challenge."); return; }
        const d = await res.json() as DailyData;
        setDaily(d);
        setUserFix(d.challengeData.brokenCode);
        if (!d.alreadyDone) timer.start();
        if (d.alreadyDone) setVerdict({ correct: d.attempt?.correct ?? false, explanation: "You already completed today's challenge." });
      } catch { setError("Connection error."); }
      finally { setLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (!daily || !userFix.trim() || checking) return;
    setChecking(true);
    timer.pause();
    const secondsTaken = timer.getElapsed();

    try {
      // Check the answer
      const checkRes = await fetch(`${API_BASE}/api/debug-test/check-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ description: daily.challengeData.description, brokenCode: daily.challengeData.brokenCode, userFix }),
      });
      const checked = await checkRes.json() as { correct: boolean; explanation: string };
      setVerdict(checked);

      // Submit result
      const submitRes = await fetch(`${API_BASE}/api/debug-test/daily/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ correct: checked.correct, secondsTaken, userFix }),
      });
      if (submitRes.ok) {
        const s = await submitRes.json() as { leaderboard: { correct: boolean; secondsTaken: number }[] };
        setLeaderboard(s.leaderboard ?? []);
      }
    } finally { setChecking(false); }
  };

  const monacoLang = LANGUAGE_OPTIONS.find(l => l.value === (daily?.language ?? "javascript"))?.monacoLang ?? "javascript";
  const today = todayStr();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !daily) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-destructive">{error || "Could not load challenge."}</p>
        <Button onClick={onBack} variant="outline" size="sm">Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-yellow-400" />
            <h1 className="text-lg font-bold">Daily Challenge</h1>
            <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-400">{today}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">One bug. Same for everyone today. See how fast you can fix it.</p>
        </div>
        {!verdict && (
          <div className="flex items-center gap-1.5 text-orange-400">
            <Timer size={13} />
            <span className="font-mono text-sm font-bold">{formatTime(timer.elapsed)}</span>
          </div>
        )}
      </div>

      {/* Already done */}
      {daily.alreadyDone && daily.attempt && (
        <div className={cn("rounded-xl border p-4 space-y-1",
          daily.attempt.correct ? "border-green-500/30 bg-green-950/10" : "border-red-500/30 bg-red-950/10"
        )}>
          {daily.attempt.correct
            ? <p className="text-sm font-bold text-green-400">✓ You got it today in {formatTime(daily.attempt.secondsTaken)}!</p>
            : <p className="text-sm font-bold text-red-400">You attempted today's challenge but didn't get it.</p>
          }
          <p className="text-xs text-muted-foreground">Come back tomorrow for a new one.</p>
        </div>
      )}

      {/* Challenge */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{daily.bugType}</Badge>
          <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">{LANGUAGE_OPTIONS.find(l => l.value === daily.language)?.label ?? daily.language}</Badge>
        </div>
        <p className="text-sm font-medium leading-relaxed">{daily.challengeData.description}</p>
      </div>

      {/* Monaco editors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Broken Code</p>
          <div className="rounded-lg overflow-hidden border border-red-900/30" style={{ height: 280 }}>
            <Editor height="280px" language={monacoLang} value={daily.challengeData.brokenCode} theme="vs-dark"
              options={{ readOnly: true, fontSize: 13, minimap: { enabled: false }, lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 8, bottom: 8 }, fontFamily: "'JetBrains Mono', monospace" }} />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Your Fix</p>
          <div className="rounded-lg overflow-hidden border border-green-900/30" style={{ height: 280 }}>
            <Editor height="280px" language={monacoLang} value={userFix} onChange={v => setUserFix(v ?? "")} theme="vs-dark"
              options={{ readOnly: !!verdict || daily.alreadyDone, fontSize: 13, minimap: { enabled: false }, lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 8, bottom: 8 }, fontFamily: "'JetBrains Mono', monospace" }} />
          </div>
        </div>
      </div>

      {/* Submit */}
      {!verdict && !daily.alreadyDone && (
        <Button onClick={submit} disabled={checking || !userFix.trim()} className="w-full gap-2 font-bold bg-orange-600 hover:bg-orange-500">
          {checking ? <><Loader2 size={15} className="animate-spin" /> Checking…</> : <><ChevronRight size={15} /> Submit Fix</>}
        </Button>
      )}

      {/* Verdict */}
      {verdict && !daily.alreadyDone && (
        <div className={cn("rounded-xl border p-4 space-y-2",
          verdict.correct ? "border-green-500/30 bg-green-950/20" : "border-red-500/30 bg-red-950/15"
        )}>
          <div className="flex items-center gap-2">
            {verdict.correct ? <CheckCircle2 size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />}
            <span className={cn("text-sm font-bold", verdict.correct ? "text-green-400" : "text-red-400")}>
              {verdict.correct ? `Correct! Finished in ${formatTime(timer.getElapsed())}` : "Not quite."}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{verdict.explanation}</p>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/30 p-4 space-y-3">
          <p className="text-xs font-semibold flex items-center gap-2"><Users size={12} /> Today's Results (top {leaderboard.length})</p>
          <div className="space-y-1">
            {leaderboard.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-muted/10">
                <span className="text-muted-foreground w-5">{i + 1}.</span>
                {e.correct ? <CheckCircle2 size={11} className="text-green-400" /> : <XCircle size={11} className="text-red-400" />}
                <span className="font-mono">{formatTime(e.secondsTaken)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Trophy size={10} className="text-yellow-400" />
            {leaderboard.filter(e => e.correct).length} of {leaderboard.length} got it right today
          </div>
        </div>
      )}
    </div>
  );
}
