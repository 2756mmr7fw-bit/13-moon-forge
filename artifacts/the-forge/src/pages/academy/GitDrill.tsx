import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";
import { GitBranch, Loader2, Play, ChevronRight, Terminal } from "lucide-react";
import DrillShell, { useDrill, useStopwatch, ResultBanner } from "./DrillShell";
import { API_BASE, Difficulty } from "./types";
import { getUserId } from "@/lib/userId";

type Scenario = { scenario: string; repoState: string; goal: string; correctCommands: string[]; explanation: string };

export default function GitDrill() {
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [scenario,   setScenario]   = useState<Scenario | null>(null);
  const [loading,    setLoading]     = useState(false);
  const [checking,   setChecking]    = useState(false);
  const [result,     setResult]      = useState<{ correct: boolean; feedback: string; correctAnswer: string } | null>(null);
  const [commands,   setCommands]    = useState("# Enter git commands, one per line\ngit ");
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal,   setSessionTotal]   = useState(0);

  const { progress } = useDrill("git");
  const timer = useStopwatch();

  const generate = async () => {
    setLoading(true); setResult(null); setCommands("# Enter git commands, one per line\ngit ");
    try {
      const res = await fetch(`${API_BASE}/api/academy/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "git", difficulty }),
      });
      if (res.ok) {
        const d = await res.json() as { scenario: Scenario };
        setScenario(d.scenario);
        timer.reset(); timer.start();
      }
    } finally { setLoading(false); }
  };

  const submit = async () => {
    if (!scenario || !commands.trim() || checking) return;
    setChecking(true); timer.pause();
    const realCommands = commands.split("\n").filter(l => l.trim() && !l.trim().startsWith("#")).join("\n");
    try {
      const res = await fetch(`${API_BASE}/api/academy/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "git", scenarioData: scenario, studentAnswer: realCommands, secondsTaken: timer.getElapsed(), difficulty }),
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
    <DrillShell type="git" difficulty={difficulty} onDifficultyChange={d => { setDifficulty(d); setScenario(null); setResult(null); }}
      progress={progress} elapsed={timer.elapsed}>

      {sessionTotal > 0 && (
        <div className="text-xs text-muted-foreground mb-4">
          <span className="text-green-400 font-semibold">{sessionCorrect}</span> / {sessionTotal} this session
        </div>
      )}

      {!scenario && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
            <GitBranch size={24} className="text-orange-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Git Unstuck</h2>
            <p className="text-sm text-muted-foreground max-w-md">A git situation appears. You write the commands to fix it. No Googling, no StackOverflow. Wrong commits, merge conflicts, detached HEAD — these are skills, not emergencies.</p>
          </div>
          <Button onClick={generate} className="gap-2 font-bold bg-orange-700 hover:bg-orange-600"><Play size={14} /> Generate Scenario</Button>
        </div>
      )}

      {loading && <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>}

      {scenario && !loading && (
        <div className="space-y-4">
          {/* Scenario */}
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
            <p className="text-xs font-semibold text-orange-400">The situation</p>
            <p className="text-sm leading-relaxed">{scenario.scenario}</p>
            <p className="text-xs font-semibold text-orange-400 mt-1">Your goal</p>
            <p className="text-sm text-muted-foreground">{scenario.goal}</p>
          </div>

          {/* Repo state */}
          <div className="rounded-xl border border-border/40 bg-muted/10 overflow-hidden">
            <div className="px-3 py-2 border-b border-border/30 flex items-center gap-2">
              <Terminal size={11} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-mono">Current repo state</span>
            </div>
            <pre className="p-3 text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap overflow-auto">{scenario.repoState}</pre>
          </div>

          {/* Command editor */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Your commands (one per line)</p>
            <div className="rounded-lg border border-orange-900/30 overflow-hidden" style={{ height: 200 }}>
              <Editor height="200px" language="shell" value={commands} onChange={v => setCommands(v ?? "")} theme="vs-dark"
                options={{ readOnly: !!result, fontSize: 13, minimap: { enabled: false }, lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 8, bottom: 8 }, fontFamily: "'JetBrains Mono', monospace" }} />
            </div>
          </div>

          {!result && (
            <Button onClick={submit} disabled={checking || !commands.trim()} className="w-full gap-2 bg-orange-700 hover:bg-orange-600 font-bold">
              {checking ? <><Loader2 size={14} className="animate-spin" /> Grading…</> : <><ChevronRight size={14} /> Submit Commands</>}
            </Button>
          )}

          {result && (
            <ResultBanner {...result} secondsTaken={timer.elapsed}
              onNext={generate} onRetry={() => { setResult(null); setCommands("# Enter git commands, one per line\ngit "); timer.reset(); timer.start(); }} />
          )}
        </div>
      )}
    </DrillShell>
  );
}
