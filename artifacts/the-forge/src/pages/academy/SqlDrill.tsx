import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";
import { Database, Loader2, Play, ChevronRight } from "lucide-react";
import DrillShell, { useDrill, useStopwatch, ResultBanner } from "./DrillShell";
import { API_BASE, Difficulty } from "./types";
import { getUserId } from "@/lib/userId";

type Scenario = { schema: string; sampleData: string; requirement: string; correctQuery: string; explanation: string };

export default function SqlDrill() {
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [scenario,   setScenario]   = useState<Scenario | null>(null);
  const [loading,    setLoading]     = useState(false);
  const [checking,   setChecking]    = useState(false);
  const [result,     setResult]      = useState<{ correct: boolean; feedback: string; correctAnswer: string } | null>(null);
  const [query,      setQuery]       = useState("-- Write your SQL query here\nSELECT ");
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal,   setSessionTotal]   = useState(0);

  const { progress } = useDrill("sql");
  const timer = useStopwatch();

  const generate = async () => {
    setLoading(true); setResult(null); setQuery("-- Write your SQL query here\nSELECT ");
    try {
      const res = await fetch(`${API_BASE}/api/academy/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "sql", difficulty }),
      });
      if (res.ok) {
        const d = await res.json() as { scenario: Scenario };
        setScenario(d.scenario);
        timer.reset(); timer.start();
      }
    } finally { setLoading(false); }
  };

  const submit = async () => {
    if (!scenario || !query.trim() || checking) return;
    setChecking(true); timer.pause();
    try {
      const res = await fetch(`${API_BASE}/api/academy/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "sql", scenarioData: scenario, studentAnswer: query, secondsTaken: timer.getElapsed(), difficulty }),
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
    <DrillShell type="sql" difficulty={difficulty} onDifficultyChange={d => { setDifficulty(d); setScenario(null); setResult(null); }}
      progress={progress} elapsed={timer.elapsed}>

      {sessionTotal > 0 && (
        <div className="text-xs text-muted-foreground mb-4">
          <span className="text-green-400 font-semibold">{sessionCorrect}</span> / {sessionTotal} this session
        </div>
      )}

      {!scenario && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
            <Database size={24} className="text-cyan-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">SQL Builder</h2>
            <p className="text-sm text-muted-foreground max-w-md">A schema appears. A requirement in plain English. You write the SQL query that satisfies it — JOINs, GROUP BY, window functions, whatever it takes.</p>
          </div>
          <Button onClick={generate} className="gap-2 font-bold bg-cyan-700 hover:bg-cyan-600"><Play size={14} /> Generate Scenario</Button>
        </div>
      )}

      {loading && <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>}

      {scenario && !loading && (
        <div className="space-y-4">
          {/* Requirement */}
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-1">
            <p className="text-xs font-semibold text-cyan-400">Write a query that:</p>
            <p className="text-sm font-medium leading-relaxed">{scenario.requirement}</p>
          </div>

          {/* Schema + sample data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Schema</p>
              <div className="rounded-lg border border-border/40 overflow-hidden" style={{ height: 220 }}>
                <Editor height="220px" language="sql" value={scenario.schema} theme="vs-dark"
                  options={{ readOnly: true, fontSize: 12, minimap: { enabled: false }, lineNumbers: "off", wordWrap: "on", scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 8, bottom: 8 }, fontFamily: "'JetBrains Mono', monospace" }} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sample data</p>
              <div className="rounded-lg border border-border/40 overflow-hidden" style={{ height: 220 }}>
                <Editor height="220px" language="sql" value={scenario.sampleData} theme="vs-dark"
                  options={{ readOnly: true, fontSize: 12, minimap: { enabled: false }, lineNumbers: "off", wordWrap: "on", scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 8, bottom: 8 }, fontFamily: "'JetBrains Mono', monospace" }} />
              </div>
            </div>
          </div>

          {/* Query editor */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Your SQL query</p>
            <div className="rounded-lg border border-cyan-900/30 overflow-hidden" style={{ height: 200 }}>
              <Editor height="200px" language="sql" value={query} onChange={v => setQuery(v ?? "")} theme="vs-dark"
                options={{ readOnly: !!result, fontSize: 13, minimap: { enabled: false }, lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 8, bottom: 8 }, fontFamily: "'JetBrains Mono', monospace" }} />
            </div>
          </div>

          {!result && (
            <Button onClick={submit} disabled={checking || !query.trim()} className="w-full gap-2 bg-cyan-700 hover:bg-cyan-600 font-bold">
              {checking ? <><Loader2 size={14} className="animate-spin" /> Grading…</> : <><ChevronRight size={14} /> Submit Query</>}
            </Button>
          )}

          {result && (
            <ResultBanner {...result} secondsTaken={timer.elapsed}
              onNext={generate} onRetry={() => { setResult(null); setQuery("-- Write your SQL query here\nSELECT "); timer.reset(); timer.start(); }} />
          )}
        </div>
      )}
    </DrillShell>
  );
}
