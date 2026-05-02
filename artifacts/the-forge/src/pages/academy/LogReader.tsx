import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ScrollText, Loader2, Play, ChevronRight } from "lucide-react";
import DrillShell, { useDrill, useStopwatch, ResultBanner } from "./DrillShell";
import { API_BASE, Difficulty } from "./types";
import { getUserId } from "@/lib/userId";

type Question = { q: string; answer: string };
type Scenario  = { logText: string; questions: Question[]; errorType: string; rootCause: string; explanation: string };

export default function LogReader() {
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [scenario,   setScenario]   = useState<Scenario | null>(null);
  const [loading,    setLoading]     = useState(false);
  const [checking,   setChecking]    = useState(false);
  const [result,     setResult]      = useState<{ correct: boolean; feedback: string; correctAnswer: string } | null>(null);
  const [answers,    setAnswers]     = useState<string[]>([]);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal,   setSessionTotal]   = useState(0);

  const { progress } = useDrill("log");
  const timer = useStopwatch();

  const generate = async () => {
    setLoading(true); setResult(null); setAnswers([]);
    try {
      const res = await fetch(`${API_BASE}/api/academy/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "log", difficulty }),
      });
      if (res.ok) {
        const d = await res.json() as { scenario: Scenario };
        setScenario(d.scenario);
        setAnswers(new Array((d.scenario.questions ?? []).length).fill(""));
        timer.reset(); timer.start();
      }
    } finally { setLoading(false); }
  };

  const submit = async () => {
    if (!scenario || checking) return;
    setChecking(true); timer.pause();
    const studentAnswer = JSON.stringify(
      (scenario.questions ?? []).map((q, i) => ({ q: q.q, answer: answers[i] ?? "" }))
    );
    try {
      const res = await fetch(`${API_BASE}/api/academy/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "log", scenarioData: scenario, studentAnswer, secondsTaken: timer.getElapsed(), difficulty }),
      });
      if (res.ok) {
        const r = await res.json() as { correct: boolean; feedback: string; correctAnswer: string };
        setResult(r);
        setSessionTotal(t => t + 1);
        if (r.correct) setSessionCorrect(c => c + 1);
      }
    } finally { setChecking(false); }
  };

  const setAnswer = (i: number, v: string) => setAnswers(prev => prev.map((a, idx) => idx === i ? v : a));
  const allAnswered = answers.length > 0 && answers.every(a => a.trim());

  // Colorize log lines
  const colorizeLog = (line: string) => {
    if (line.includes("ERROR") || line.includes("FATAL") || line.includes("error")) return "text-red-400";
    if (line.includes("WARN")  || line.includes("warning")) return "text-yellow-400";
    if (line.includes("INFO"))  return "text-blue-300/70";
    if (line.includes("DEBUG")) return "text-muted-foreground/50";
    return "text-green-300/60";
  };

  return (
    <DrillShell type="log" difficulty={difficulty} onDifficultyChange={d => { setDifficulty(d); setScenario(null); setResult(null); }}
      progress={progress} elapsed={timer.elapsed}>

      {sessionTotal > 0 && (
        <div className="text-xs text-muted-foreground mb-4">
          <span className="text-green-400 font-semibold">{sessionCorrect}</span> / {sessionTotal} this session
        </div>
      )}

      {!scenario && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center">
            <ScrollText size={24} className="text-pink-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Log Reader</h2>
            <p className="text-sm text-muted-foreground max-w-md">Application logs appear. You read them fast, find the error, identify when it started, count affected requests. In production, every second you spend confused is a second you're not fixing it.</p>
          </div>
          <Button onClick={generate} className="gap-2 font-bold bg-pink-700 hover:bg-pink-600"><Play size={14} /> Generate Logs</Button>
        </div>
      )}

      {loading && <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>}

      {scenario && !loading && (
        <div className="space-y-5">
          {/* Log output */}
          <div className="rounded-xl border border-border/40 bg-zinc-950 overflow-hidden">
            <div className="px-3 py-2 border-b border-border/30 flex items-center gap-2">
              <ScrollText size={11} className="text-pink-400" />
              <span className="text-xs font-mono text-pink-400 font-semibold">Application Logs</span>
            </div>
            <div className="p-3 font-mono text-xs leading-relaxed overflow-auto max-h-80">
              {scenario.logText.split("\n").map((line, i) => (
                <div key={i} className={colorizeLog(line)}>{line}</div>
              ))}
            </div>
          </div>

          {/* Questions */}
          {!result && (
            <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-4">
              <p className="text-sm font-semibold">Answer these questions</p>
              {(scenario.questions ?? []).map((q, i) => (
                <div key={i} className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">{i + 1}. {q.q}</label>
                  <Input
                    value={answers[i] ?? ""}
                    onChange={e => setAnswer(i, e.target.value)}
                    placeholder="Your answer"
                    className="text-sm"
                  />
                </div>
              ))}
              <Button onClick={submit} disabled={checking || !allAnswered} className="w-full gap-2 bg-pink-700 hover:bg-pink-600 font-bold">
                {checking ? <><Loader2 size={14} className="animate-spin" /> Grading…</> : <><ChevronRight size={14} /> Submit Answers</>}
              </Button>
            </div>
          )}

          {result && (
            <ResultBanner {...result} secondsTaken={timer.elapsed}
              onNext={generate} onRetry={() => { setResult(null); setAnswers(new Array((scenario.questions ?? []).length).fill("")); timer.reset(); timer.start(); }} />
          )}
        </div>
      )}
    </DrillShell>
  );
}
