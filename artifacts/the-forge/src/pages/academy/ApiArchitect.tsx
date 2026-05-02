import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Network, Loader2, Play, ChevronRight } from "lucide-react";
import DrillShell, { useDrill, useStopwatch, ResultBanner } from "./DrillShell";
import { API_BASE, Difficulty } from "./types";
import { getUserId } from "@/lib/userId";

type Scenario = { requirement: string; context: string; correctDesign: { method: string; path: string; requestBody: object; responseBody: object; successStatus: number; errorStatuses: Record<string, number> }; explanation: string };

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export default function ApiArchitect() {
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [scenario,   setScenario]   = useState<Scenario | null>(null);
  const [loading,    setLoading]     = useState(false);
  const [checking,   setChecking]    = useState(false);
  const [result,     setResult]      = useState<{ correct: boolean; feedback: string; correctAnswer: string } | null>(null);

  const [method,         setMethod]         = useState("GET");
  const [path,           setPath]           = useState("/api/");
  const [requestBody,    setRequestBody]    = useState("{}");
  const [responseBody,   setResponseBody]   = useState("{}");
  const [successStatus,  setSuccessStatus]  = useState("200");
  const [errorStatuses,  setErrorStatuses]  = useState("{ \"not_found\": 404, \"validation\": 422 }");

  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal,   setSessionTotal]   = useState(0);

  const { progress } = useDrill("api");
  const timer = useStopwatch();

  const reset = () => {
    setMethod("GET"); setPath("/api/"); setRequestBody("{}"); setResponseBody("{}");
    setSuccessStatus("200"); setErrorStatuses('{ "not_found": 404, "validation": 422 }');
  };

  const generate = async () => {
    setLoading(true); setResult(null); reset();
    try {
      const res = await fetch(`${API_BASE}/api/academy/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "api", difficulty }),
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
    setChecking(true); timer.pause();
    const studentAnswer = JSON.stringify({
      method, path, requestBody, responseBody,
      successStatus: Number(successStatus), errorStatuses,
    });
    try {
      const res = await fetch(`${API_BASE}/api/academy/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ type: "api", scenarioData: scenario, studentAnswer, secondsTaken: timer.getElapsed(), difficulty }),
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
    <DrillShell type="api" difficulty={difficulty} onDifficultyChange={d => { setDifficulty(d); setScenario(null); setResult(null); }}
      progress={progress} elapsed={timer.elapsed}>

      {sessionTotal > 0 && (
        <div className="text-xs text-muted-foreground mb-4">
          <span className="text-green-400 font-semibold">{sessionCorrect}</span> / {sessionTotal} this session
        </div>
      )}

      {!scenario && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
            <Network size={24} className="text-green-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">API Architect</h2>
            <p className="text-sm text-muted-foreground max-w-md">A feature requirement appears. You design the REST endpoint — method, path, request body, response shape, and status codes. Bad API design gets baked in forever.</p>
          </div>
          <Button onClick={generate} className="gap-2 font-bold bg-green-700 hover:bg-green-600"><Play size={14} /> Generate Scenario</Button>
        </div>
      )}

      {loading && <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>}

      {scenario && !loading && (
        <div className="space-y-5">
          {/* Requirement */}
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-green-400">Feature requirement</p>
            <p className="text-sm font-medium leading-relaxed">{scenario.requirement}</p>
            <p className="text-xs text-muted-foreground italic">{scenario.context}</p>
          </div>

          {/* Design form */}
          {!result && (
            <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-4">
              <p className="text-sm font-semibold">Design the endpoint</p>

              <div className="flex gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Method</label>
                  <div className="flex gap-1.5">
                    {HTTP_METHODS.map(m => (
                      <button key={m} onClick={() => setMethod(m)}
                        className={cn("px-2.5 py-1 rounded-md border text-xs font-bold font-mono transition-colors",
                          method === m ? "border-green-500/60 bg-green-500/15 text-green-300" : "border-border/40 text-muted-foreground hover:bg-muted/30"
                        )}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Path</label>
                <Input value={path} onChange={e => setPath(e.target.value)} placeholder="/api/users/:id" className="font-mono text-sm" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Request body (JSON shape or "none")</label>
                  <Textarea value={requestBody} onChange={e => setRequestBody(e.target.value)} placeholder='{ "name": "string" }' className="font-mono text-xs min-h-[80px] resize-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Success response body (JSON shape)</label>
                  <Textarea value={responseBody} onChange={e => setResponseBody(e.target.value)} placeholder='{ "id": "number", "name": "string" }' className="font-mono text-xs min-h-[80px] resize-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Success status code</label>
                  <Input type="number" value={successStatus} onChange={e => setSuccessStatus(e.target.value)} placeholder="200" className="font-mono text-sm" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs text-muted-foreground">Error status codes (JSON)</label>
                  <Input value={errorStatuses} onChange={e => setErrorStatuses(e.target.value)} placeholder='{"not_found": 404}' className="font-mono text-xs" />
                </div>
              </div>

              <Button onClick={submit} disabled={checking || !path.trim()} className="w-full gap-2 bg-green-700 hover:bg-green-600 font-bold">
                {checking ? <><Loader2 size={14} className="animate-spin" /> Grading…</> : <><ChevronRight size={14} /> Submit Design</>}
              </Button>
            </div>
          )}

          {result && (
            <ResultBanner {...result} secondsTaken={timer.elapsed}
              onNext={generate} onRetry={() => { setResult(null); reset(); timer.reset(); timer.start(); }} />
          )}
        </div>
      )}
    </DrillShell>
  );
}
