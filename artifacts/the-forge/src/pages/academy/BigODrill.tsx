import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";
import { Zap, Loader2, Play, ChevronRight } from "lucide-react";
import DrillShell, { useDrill, useStopwatch, ResultBanner } from "./DrillShell";
import { API_BASE, Difficulty, BIG_O_OPTIONS } from "./types";
import { getUserId } from "@/lib/userId";

type Scenario = { language: string; code: string; functionName: string; timeComplexity: string; spaceComplexity: string; explanation: string };

export default function BigODrill() {
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [scenario,   setScenario]   = useState<Scenario | null>(null);
  const [loading,    setLoading]     = useState(false);
  const [checking,   setChecking]    = useState(false);
  const [result,     setResult]      = useState<{ correct: boolean; feedback: string; correctAnswer: string } | null>(null);
  const [timeAns,    setTimeAns]     = useState("");
  const [spaceAns,   setSpaceAns]    = useState("");
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal,   setSessionTotal]   = useState(0);

  const { progress } = useDrill("big-o");
  const timer = useStopwatch();

  const generate = async () => {
    setLoading(true); setResult(null); setTimeAns(""); setSpaceAns("");
    try {
      const res = await fetch(`${API_BASE}/api/academy/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "big-o", difficulty }),
      });
      if (res.ok) {
        const d = await res.json() as { scenario: Scenario };
        setScenario(d.scenario);
        timer.reset(); timer.start();
      }
    } finally { setLoading(false); }
  };

  const submit = async () => {
    if (!scenario || !timeAns || !spaceAns || checking) return;
    setChecking(true); timer.pause();
    try {
      const res = await fetch(`${API_BASE}/api/academy/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "big-o", scenarioData: scenario, studentAnswer: JSON.stringify({ time: timeAns, space: spaceAns }), secondsTaken: timer.getElapsed(), difficulty }),
      });
      if (res.ok) {
        const r = await res.json() as { correct: boolean; feedback: string; correctAnswer: string };
        setResult(r);
        setSessionTotal(t => t + 1);
        if (r.correct) setSessionCorrect(c => c + 1);
      }
    } finally { setChecking(false); }
  };

  const monacoLang = scenario?.language === "python" ? "python" : "javascript";

  function ComplexityPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex flex-wrap gap-2">
          {BIG_O_OPTIONS.map(opt => (
            <button key={opt} onClick={() => onChange(opt)}
              className={cn("px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-colors",
                value === opt
                  ? "border-yellow-500/60 bg-yellow-500/15 text-yellow-300"
                  : "border-border/40 text-muted-foreground hover:bg-muted/30"
              )}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <DrillShell type="big-o" difficulty={difficulty} onDifficultyChange={d => { setDifficulty(d); setScenario(null); setResult(null); }}
      progress={progress} elapsed={timer.elapsed}>

      {sessionTotal > 0 && (
        <div className="text-xs text-muted-foreground mb-4">
          <span className="text-green-400 font-semibold">{sessionCorrect}</span> / {sessionTotal} this session
        </div>
      )}

      {!scenario && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
            <Zap size={24} className="text-yellow-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Big O Spotter</h2>
            <p className="text-sm text-muted-foreground max-w-md">A function appears. You identify its time and space complexity. No cheating — no running it, no counting on paper. Read it, reason it, pick it.</p>
          </div>
          <Button onClick={generate} className="gap-2 font-bold bg-yellow-700 hover:bg-yellow-600"><Play size={14} /> Generate Function</Button>
        </div>
      )}

      {loading && <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>}

      {scenario && !loading && (
        <div className="space-y-5">
          <div className="rounded-xl border border-yellow-900/30 overflow-hidden">
            <div className="px-3 py-2 border-b border-yellow-900/20 bg-yellow-950/10 flex items-center justify-between">
              <span className="text-xs font-mono text-yellow-400 font-semibold">{scenario.functionName}() — {scenario.language}</span>
              <span className="text-xs text-muted-foreground">What are the complexities?</span>
            </div>
            <div style={{ height: 280 }}>
              <Editor height="280px" language={monacoLang} value={scenario.code} theme="vs-dark"
                options={{ readOnly: true, fontSize: 13, minimap: { enabled: false }, lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 10, bottom: 10 }, fontFamily: "'JetBrains Mono', monospace" }} />
            </div>
          </div>

          {!result && (
            <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-5">
              <ComplexityPicker label="Time Complexity" value={timeAns} onChange={setTimeAns} />
              <ComplexityPicker label="Space Complexity" value={spaceAns} onChange={setSpaceAns} />
              <Button onClick={submit} disabled={checking || !timeAns || !spaceAns} className="w-full gap-2 bg-yellow-700 hover:bg-yellow-600 font-bold">
                {checking ? <><Loader2 size={14} className="animate-spin" /> Checking…</> : <><ChevronRight size={14} /> Lock In Answer</>}
              </Button>
            </div>
          )}

          {result && (
            <ResultBanner {...result} secondsTaken={timer.elapsed}
              onNext={generate} onRetry={() => { setResult(null); setTimeAns(""); setSpaceAns(""); timer.reset(); timer.start(); }} />
          )}
        </div>
      )}
    </DrillShell>
  );
}
