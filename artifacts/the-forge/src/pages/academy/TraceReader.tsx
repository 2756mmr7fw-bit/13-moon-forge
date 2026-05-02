import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2, Play, ChevronRight } from "lucide-react";
import DrillShell, { useDrill, useStopwatch, ResultBanner } from "./DrillShell";
import { API_BASE, Difficulty } from "./types";
import { getUserId } from "@/lib/userId";

type Scenario = { traceText: string; errorType: string; rootFile: string; rootLine: number; rootCause: string; callerChain: string; language: string };

export default function TraceReader() {
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [scenario,   setScenario]   = useState<Scenario | null>(null);
  const [loading,    setLoading]     = useState(false);
  const [checking,   setChecking]    = useState(false);
  const [result,     setResult]      = useState<{ correct: boolean; feedback: string; correctAnswer: string } | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal,   setSessionTotal]   = useState(0);

  const [errorType, setErrorType] = useState("");
  const [rootFile,  setRootFile]  = useState("");
  const [rootLine,  setRootLine]  = useState("");
  const [rootCause, setRootCause] = useState("");

  const { progress } = useDrill("trace");
  const timer = useStopwatch();

  const generate = async () => {
    setLoading(true); setResult(null);
    setErrorType(""); setRootFile(""); setRootLine(""); setRootCause("");
    try {
      const res = await fetch(`${API_BASE}/api/academy/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "trace", difficulty }),
      });
      if (res.ok) {
        const d = await res.json() as { scenario: Scenario };
        setScenario(d.scenario);
        timer.reset(); timer.start();
      }
    } finally { setLoading(false); }
  };

  const submit = async () => {
    if (!scenario || checking) return;
    setChecking(true);
    timer.pause();
    const studentAnswer = JSON.stringify({ errorType, rootFile, rootLine: Number(rootLine), rootCause });
    try {
      const res = await fetch(`${API_BASE}/api/academy/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "trace", scenarioData: scenario, studentAnswer, secondsTaken: timer.getElapsed(), difficulty }),
      });
      if (res.ok) {
        const r = await res.json() as { correct: boolean; feedback: string; correctAnswer: string };
        setResult(r);
        setSessionTotal(t => t + 1);
        if (r.correct) setSessionCorrect(c => c + 1);
      }
    } finally { setChecking(false); }
  };

  const canSubmit = errorType.trim() && rootFile.trim() && rootLine.trim();

  return (
    <DrillShell type="trace" difficulty={difficulty} onDifficultyChange={d => { setDifficulty(d); setScenario(null); setResult(null); }}
      progress={progress} elapsed={timer.elapsed}>

      {/* Session stats */}
      {sessionTotal > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
          <span className="text-green-400 font-semibold">{sessionCorrect}</span> / {sessionTotal} this session
        </div>
      )}

      {!scenario && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Read the Trace</h2>
            <p className="text-sm text-muted-foreground max-w-md">A stack trace appears. You have to identify the error type, the root file, the line number, and what caused it. No scrolling to the bottom — top-down, fast.</p>
          </div>
          <Button onClick={generate} className="gap-2 font-bold bg-red-700 hover:bg-red-600"><Play size={14} /> Generate Trace</Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {scenario && !loading && (
        <div className="space-y-5">
          {/* Stack trace display */}
          <div className="rounded-xl border border-red-900/40 bg-red-950/10 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-red-900/30 bg-red-950/20">
              <AlertTriangle size={12} className="text-red-400" />
              <span className="text-xs font-mono text-red-400 font-semibold">Stack Trace — {scenario.language.toUpperCase()}</span>
            </div>
            <pre className="p-4 text-xs font-mono text-red-200/80 overflow-auto whitespace-pre-wrap leading-relaxed">{scenario.traceText}</pre>
          </div>

          {/* Answer inputs */}
          {!result && (
            <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-4">
              <p className="text-sm font-semibold">Diagnose the trace</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Error type (e.g. TypeError)</label>
                  <Input value={errorType} onChange={e => setErrorType(e.target.value)} placeholder="TypeError" className="font-mono text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Root cause file</label>
                  <Input value={rootFile} onChange={e => setRootFile(e.target.value)} placeholder="server.js" className="font-mono text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Root cause line number</label>
                  <Input type="number" value={rootLine} onChange={e => setRootLine(e.target.value)} placeholder="23" className="font-mono text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">What caused this? (one sentence)</label>
                  <Input value={rootCause} onChange={e => setRootCause(e.target.value)} placeholder="Calling .map on undefined" className="text-sm" />
                </div>
              </div>
              <Button onClick={submit} disabled={checking || !canSubmit} className="w-full gap-2 bg-red-700 hover:bg-red-600 font-bold">
                {checking ? <><Loader2 size={14} className="animate-spin" /> Checking…</> : <><ChevronRight size={14} /> Submit Answer</>}
              </Button>
            </div>
          )}

          {result && (
            <ResultBanner {...result} secondsTaken={timer.elapsed}
              onNext={generate} onRetry={() => { setResult(null); setErrorType(""); setRootFile(""); setRootLine(""); setRootCause(""); timer.reset(); timer.start(); }} />
          )}
        </div>
      )}
    </DrillShell>
  );
}
