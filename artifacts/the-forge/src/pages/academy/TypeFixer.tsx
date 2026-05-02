import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";
import { FileType2, Loader2, Play, ChevronRight, AlertCircle } from "lucide-react";
import DrillShell, { useDrill, useStopwatch, ResultBanner } from "./DrillShell";
import { API_BASE, Difficulty } from "./types";
import { getUserId } from "@/lib/userId";

type Scenario = { brokenCode: string; errorMessages: string[]; correctCode: string; explanation: string };

export default function TypeFixer() {
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [scenario,   setScenario]   = useState<Scenario | null>(null);
  const [loading,    setLoading]     = useState(false);
  const [checking,   setChecking]    = useState(false);
  const [result,     setResult]      = useState<{ correct: boolean; feedback: string; correctAnswer: string } | null>(null);
  const [fixedCode,  setFixedCode]   = useState("");
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal,   setSessionTotal]   = useState(0);

  const { progress } = useDrill("type-fixer");
  const timer = useStopwatch();

  const generate = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/academy/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "type-fixer", difficulty }),
      });
      if (res.ok) {
        const d = await res.json() as { scenario: Scenario };
        setScenario(d.scenario);
        setFixedCode(d.scenario.brokenCode);
        timer.reset(); timer.start();
      }
    } finally { setLoading(false); }
  };

  const submit = async () => {
    if (!scenario || !fixedCode.trim() || checking) return;
    setChecking(true); timer.pause();
    try {
      const res = await fetch(`${API_BASE}/api/academy/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "type-fixer", scenarioData: scenario, studentAnswer: fixedCode, secondsTaken: timer.getElapsed(), difficulty }),
      });
      if (res.ok) {
        const r = await res.json() as { correct: boolean; feedback: string; correctAnswer: string };
        setResult(r);
        setSessionTotal(t => t + 1);
        if (r.correct) setSessionCorrect(c => c + 1);
      }
    } finally { setChecking(false); }
  };

  return (
    <DrillShell type="type-fixer" difficulty={difficulty} onDifficultyChange={d => { setDifficulty(d); setScenario(null); setResult(null); }}
      progress={progress} elapsed={timer.elapsed}>

      {sessionTotal > 0 && (
        <div className="text-xs text-muted-foreground mb-4">
          <span className="text-green-400 font-semibold">{sessionCorrect}</span> / {sessionTotal} this session
        </div>
      )}

      {!scenario && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center">
            <FileType2 size={24} className="text-purple-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Type Fixer</h2>
            <p className="text-sm text-muted-foreground max-w-md">TypeScript code appears with type errors. Fix them. The type system is trying to tell you something — you just have to understand what.</p>
          </div>
          <Button onClick={generate} className="gap-2 font-bold bg-purple-700 hover:bg-purple-600"><Play size={14} /> Generate Errors</Button>
        </div>
      )}

      {loading && <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>}

      {scenario && !loading && (
        <div className="space-y-4">
          {/* Error messages */}
          <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-3 space-y-2">
            <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5"><AlertCircle size={11} /> TypeScript Errors</p>
            {scenario.errorMessages.map((err, i) => (
              <p key={i} className="text-xs font-mono text-red-300/80 leading-relaxed">{err}</p>
            ))}
          </div>

          {/* Editors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Broken Code</p>
              <div className="rounded-lg border border-red-900/30 overflow-hidden" style={{ height: 280 }}>
                <Editor height="280px" language="typescript" value={scenario.brokenCode} theme="vs-dark"
                  options={{ readOnly: true, fontSize: 12, minimap: { enabled: false }, lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 8, bottom: 8 }, fontFamily: "'JetBrains Mono', monospace" }} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Your Fix</p>
              <div className="rounded-lg border border-purple-900/30 overflow-hidden" style={{ height: 280 }}>
                <Editor height="280px" language="typescript" value={fixedCode} onChange={v => setFixedCode(v ?? "")} theme="vs-dark"
                  options={{ readOnly: !!result, fontSize: 12, minimap: { enabled: false }, lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 8, bottom: 8 }, fontFamily: "'JetBrains Mono', monospace" }} />
              </div>
            </div>
          </div>

          {!result && (
            <Button onClick={submit} disabled={checking || !fixedCode.trim()} className="w-full gap-2 bg-purple-700 hover:bg-purple-600 font-bold">
              {checking ? <><Loader2 size={14} className="animate-spin" /> Checking…</> : <><ChevronRight size={14} /> Submit Fix</>}
            </Button>
          )}

          {result && (
            <ResultBanner {...result} secondsTaken={timer.elapsed}
              onNext={generate} onRetry={() => { setResult(null); setFixedCode(scenario.brokenCode); timer.reset(); timer.start(); }} />
          )}
        </div>
      )}
    </DrillShell>
  );
}
