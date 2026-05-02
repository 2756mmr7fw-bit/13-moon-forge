import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";
import { Cpu, Loader2, Play, ChevronRight } from "lucide-react";
import DrillShell, { useDrill, useStopwatch, ResultBanner } from "./DrillShell";
import { API_BASE, Difficulty } from "./types";
import { getUserId } from "@/lib/userId";

type Scenario = { language: string; code: string; functionCall: string; question: string; correctAnswer: string; explanation: string };

const LANG_MAP: Record<string, string> = { javascript: "javascript", python: "python", typescript: "typescript" };

export default function DryRun() {
  const [difficulty,   setDifficulty]  = useState<Difficulty>("beginner");
  const [scenario,     setScenario]    = useState<Scenario | null>(null);
  const [loading,      setLoading]     = useState(false);
  const [checking,     setChecking]    = useState(false);
  const [result,       setResult]      = useState<{ correct: boolean; feedback: string; correctAnswer: string } | null>(null);
  const [answer,       setAnswer]      = useState("");
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal,   setSessionTotal]   = useState(0);

  const { progress } = useDrill("dry-run");
  const timer = useStopwatch();

  const generate = async () => {
    setLoading(true); setResult(null); setAnswer("");
    try {
      const res = await fetch(`${API_BASE}/api/academy/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "dry-run", difficulty }),
      });
      if (res.ok) {
        const d = await res.json() as { scenario: Scenario };
        setScenario(d.scenario);
        timer.reset(); timer.start();
      }
    } finally { setLoading(false); }
  };

  const submit = async () => {
    if (!scenario || !answer.trim() || checking) return;
    setChecking(true); timer.pause();
    try {
      const res = await fetch(`${API_BASE}/api/academy/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "dry-run", scenarioData: scenario, studentAnswer: answer.trim(), secondsTaken: timer.getElapsed(), difficulty }),
      });
      if (res.ok) {
        const r = await res.json() as { correct: boolean; feedback: string; correctAnswer: string };
        setResult(r);
        setSessionTotal(t => t + 1);
        if (r.correct) setSessionCorrect(c => c + 1);
      }
    } finally { setChecking(false); }
  };

  const monacoLang = scenario ? (LANG_MAP[scenario.language] ?? "javascript") : "javascript";

  return (
    <DrillShell type="dry-run" difficulty={difficulty} onDifficultyChange={d => { setDifficulty(d); setScenario(null); setResult(null); }}
      progress={progress} elapsed={timer.elapsed}>

      {sessionTotal > 0 && (
        <div className="text-xs text-muted-foreground mb-4">
          <span className="text-green-400 font-semibold">{sessionCorrect}</span> / {sessionTotal} this session
        </div>
      )}

      {!scenario && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Cpu size={24} className="text-blue-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Dry Run</h2>
            <p className="text-sm text-muted-foreground max-w-md">A function appears. You run it in your head. No browser, no node, no python. Just you and the logic. Tell me exactly what it returns.</p>
          </div>
          <Button onClick={generate} className="gap-2 font-bold bg-blue-700 hover:bg-blue-600"><Play size={14} /> Generate Function</Button>
        </div>
      )}

      {loading && <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>}

      {scenario && !loading && (
        <div className="space-y-5">
          {/* Code display */}
          <div className="rounded-xl border border-blue-900/30 overflow-hidden">
            <div className="px-3 py-2 border-b border-blue-900/20 bg-blue-950/20 flex items-center justify-between">
              <span className="text-xs font-mono text-blue-400 font-semibold">Run this in your head</span>
              <span className="text-xs text-muted-foreground border border-border/40 px-2 py-0.5 rounded">{scenario.language}</span>
            </div>
            <div style={{ height: 280 }}>
              <Editor height="280px" language={monacoLang} value={scenario.code} theme="vs-dark"
                options={{ readOnly: true, fontSize: 13, minimap: { enabled: false }, lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 10, bottom: 10 }, fontFamily: "'JetBrains Mono', monospace" }} />
            </div>
          </div>

          {/* Question + Answer */}
          {!result && (
            <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{scenario.question}</p>
                <p className="text-xs font-mono text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 inline-block">{scenario.functionCall}</p>
              </div>
              <Input
                value={answer} onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") void submit(); }}
                placeholder='Type your answer, e.g.  7  or  [1, 2, 3]  or  undefined'
                className="font-mono text-sm"
                autoFocus
              />
              <Button onClick={submit} disabled={checking || !answer.trim()} className="w-full gap-2 bg-blue-700 hover:bg-blue-600 font-bold">
                {checking ? <><Loader2 size={14} className="animate-spin" /> Checking…</> : <><ChevronRight size={14} /> Submit Answer</>}
              </Button>
            </div>
          )}

          {result && (
            <ResultBanner {...result} secondsTaken={timer.elapsed}
              onNext={generate} onRetry={() => { setResult(null); setAnswer(""); timer.reset(); timer.start(); }} />
          )}
        </div>
      )}
    </DrillShell>
  );
}
