import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Play, CheckCircle2, XCircle, Lightbulb,
  RotateCcw, Loader2, FlaskConical, ShieldCheck, ShieldX,
} from "lucide-react";
import { runTestWritingExercise } from "./testWritingRunner";
import { GYM_API, TIER_META, type TestWritingExercise, type TestWritingResult } from "./types";
import { getUserId } from "@/lib/userId";

interface Props {
  exercise: TestWritingExercise;
}

export default function WriteTestsPage({ exercise }: Props) {
  const [code,        setCode]        = useState(exercise.starterCode);
  const [result,      setResult]      = useState<TestWritingResult | null>(null);
  const [running,     setRunning]     = useState(false);
  const [hintIndex,   setHintIndex]   = useState(-1);
  const [runCount,    setRunCount]    = useState(0);
  const [saved,       setSaved]       = useState(false);

  const startTimeRef     = useRef(Date.now());
  const firstEditTimeRef = useRef<number | null>(null);
  const hasEditedRef     = useRef(false);

  useEffect(() => {
    setCode(exercise.starterCode);
    startTimeRef.current = Date.now();
    firstEditTimeRef.current = null;
    hasEditedRef.current = false;
    setResult(null); setRunCount(0); setSaved(false);
  }, [exercise.id]);

  const handleCodeChange = useCallback((val: string | undefined) => {
    if (!hasEditedRef.current) {
      firstEditTimeRef.current = Date.now();
      hasEditedRef.current = true;
    }
    setCode(val ?? "");
  }, []);

  const runTests = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const r = runTestWritingExercise(code, exercise);
      setResult(r);
      setRunCount(c => c + 1);
      if (r.passed && !saved) {
        setSaved(true);
        void saveAttempt(true, r);
      }
      setRunning(false);
    }, 50);
  }, [code, exercise, saved]);

  const saveAttempt = async (passed: boolean, r: TestWritingResult) => {
    const timeTaken = Date.now() - startTimeRef.current;
    const timeToFirstEdit = firstEditTimeRef.current
      ? firstEditTimeRef.current - startTimeRef.current : null;
    try {
      await fetch(`${GYM_API}/api/gym/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({
          exerciseId: exercise.id,
          tier: exercise.tier,
          category: exercise.category,
          passed,
          testsPassed: r.brokenResults.filter(b => b.caught).length,
          testsTotal: exercise.brokenImpls.length,
          runsBeforePass: runCount + 1,
          timeToFirstEditMs: timeToFirstEdit,
          timeTakenMs: timeTaken,
          hintsUsed: hintIndex + 1,
          viewedSolution: false,
          studentCode: code,
        }),
      });
    } catch { /* non-critical */ }
  };

  const handleReset = () => {
    setCode(exercise.starterCode);
    setResult(null); setRunCount(0); setSaved(false);
    startTimeRef.current = Date.now();
    firstEditTimeRef.current = null; hasEditedRef.current = false;
  };

  const brokenCaught   = result?.brokenResults.filter(b => b.caught).length ?? 0;
  const brokenTotal    = exercise.brokenImpls.length;
  const passed         = result?.passed ?? false;

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="border-b border-border/60 bg-background/95 backdrop-blur shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link href="/gym" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={15} />
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={cn("text-xs font-bold shrink-0", TIER_META[exercise.tier].color)}>{TIER_META[exercise.tier].label}</span>
            <span className="text-border/60">·</span>
            <span className="text-xs text-amber-400 font-semibold shrink-0">Write Tests</span>
            <span className="text-border/60">·</span>
            <span className="text-sm font-semibold truncate">{exercise.title}</span>
          </div>
          {result && (
            <span className={cn("text-xs font-bold shrink-0", passed ? "text-green-400" : "text-muted-foreground")}>
              {passed ? "✓ All bugs caught" : `${brokenCaught}/${brokenTotal} bugs caught`}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">

        {/* Left panel */}
        <div className="w-[42%] shrink-0 border-r border-border/40 flex flex-col overflow-y-auto p-5 gap-5 text-sm">

          {/* What is Write Tests mode */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <FlaskConical size={12} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-400">Write Tests Mode</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The function is given. Your job is to write test cases that catch every broken implementation.
              A test "catches" a bug when the broken implementation produces a wrong answer for that test.
            </p>
          </div>

          {/* Function spec */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Function Spec</p>
            <div className="rounded-lg bg-muted/10 border border-border/30 px-3 py-2 font-mono text-xs mb-2">
              {exercise.functionSignature}
            </div>
            <p className="leading-relaxed">{exercise.description}</p>
          </div>

          {/* Examples */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Examples</p>
            {exercise.examples.map((ex, i) => (
              <div key={i} className="rounded-lg bg-muted/10 border border-border/30 p-3 space-y-1.5">
                <div className="font-mono text-xs">
                  <span className="text-muted-foreground">Input: </span><span>{ex.input}</span>
                </div>
                <div className="font-mono text-xs">
                  <span className="text-muted-foreground">Output: </span>
                  <span className="text-green-400">{ex.output}</span>
                </div>
                {ex.note && <p className="text-xs text-muted-foreground italic">{ex.note}</p>}
              </div>
            ))}
          </div>

          {/* Broken implementations to catch */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bugs to Catch ({brokenTotal})</p>
            {exercise.brokenImpls.map((b, i) => {
              const caught = result?.brokenResults[i]?.caught;
              return (
                <div key={i} className={cn("rounded-lg border p-2.5 flex items-center gap-2",
                  caught === undefined ? "border-border/30" :
                  caught ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
                )}>
                  {caught === undefined
                    ? <div className="w-3 h-3 rounded-full border border-border/50 shrink-0" />
                    : caught
                      ? <ShieldCheck size={12} className="text-green-400 shrink-0" />
                      : <ShieldX size={12} className="text-red-400 shrink-0" />
                  }
                  <span className="text-xs text-muted-foreground">{b.label}</span>
                </div>
              );
            })}
          </div>

          {/* Correct implementation check */}
          {result && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Tests vs Correct Implementation</p>
              {result.parseError ? (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5">
                  <p className="text-xs text-red-400">{result.parseError}</p>
                </div>
              ) : result.correctResults.map((r, i) => (
                <div key={i} className={cn("rounded-lg border p-2.5 text-xs",
                  r.passed ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
                )}>
                  <div className="flex items-center gap-1.5">
                    {r.passed ? <CheckCircle2 size={10} className="text-green-400" /> : <XCircle size={10} className="text-red-400" />}
                    <span className="font-mono">Test {i + 1}</span>
                    {!r.passed && <span className="text-red-400 ml-1">— your test has a mistake</span>}
                  </div>
                  {!r.passed && (
                    <div className="ml-4 mt-1 font-mono text-xs text-muted-foreground space-y-0.5">
                      {r.error
                        ? <p className="text-red-400">{r.error}</p>
                        : <>
                            <p>You said: <span className="text-red-400">{JSON.stringify(r.expected)}</span></p>
                            <p>Correct gives: <span className="text-green-400">{JSON.stringify(r.actual)}</span></p>
                          </>
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Hints */}
          {exercise.hints.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hints</p>
              {exercise.hints.slice(0, hintIndex + 1).map((h, i) => (
                <div key={i} className="flex gap-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-2.5">
                  <Lightbulb size={12} className="text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{h}</p>
                </div>
              ))}
              {hintIndex < exercise.hints.length - 1 && (
                <button onClick={() => setHintIndex(i => i + 1)}
                  className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1">
                  <Lightbulb size={10} /> {hintIndex === -1 ? "Show a hint" : "Next hint"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right panel: editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground">Your Test Cases (JavaScript)</span>
            <button onClick={handleReset} className="text-xs text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1 transition-colors">
              <RotateCcw size={10} /> Reset
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language="javascript"
              value={code}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                lineNumbers: "on",
                wordWrap: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                fontFamily: "'JetBrains Mono', monospace",
                tabSize: 2,
              }}
            />
          </div>

          {/* Run */}
          <div className="border-t border-border/40 p-3 flex items-center gap-3 shrink-0">
            <Button onClick={runTests} disabled={running}
              className={cn("flex-1 gap-2 font-bold", passed ? "bg-green-700 hover:bg-green-600" : "bg-amber-600 hover:bg-amber-500")}>
              {running
                ? <><Loader2 size={14} className="animate-spin" /> Running…</>
                : passed
                  ? <><ShieldCheck size={14} /> All Bugs Caught!</>
                  : <><Play size={14} /> Run My Tests</>
              }
            </Button>
            {result && !passed && !result.parseError && (
              <span className="text-xs text-muted-foreground">
                {result.correctAllPass ? "✓ Tests valid" : "✗ Fix your tests first"}
                {result.correctAllPass && ` · ${brokenCaught}/${brokenTotal} bugs caught`}
              </span>
            )}
          </div>

          {/* Pass celebration */}
          {passed && (
            <div className="border-t border-green-500/20 bg-green-950/20 px-4 py-3 flex items-center gap-3 shrink-0">
              <ShieldCheck size={16} className="text-green-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-green-400">All {brokenTotal} bugs caught in {runCount} run{runCount !== 1 ? "s" : ""}.</p>
                <p className="text-xs text-muted-foreground">Your test suite is solid. That's the skill.</p>
              </div>
              <Link href="/gym">
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0 text-green-400 border-green-500/30">
                  Next Exercise
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
