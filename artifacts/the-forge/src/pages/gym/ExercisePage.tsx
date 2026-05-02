import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useRoute } from "wouter";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Play, CheckCircle2, XCircle, Lightbulb,
  Eye, EyeOff, RotateCcw, ChevronRight, Timer, Loader2,
  Target, BookOpen,
} from "lucide-react";
import { getAnyExerciseById } from "./exercises";
import { runExercise } from "./testRunner";
import { GYM_API, TIER_META, CATEGORY_LABELS, type TestResult } from "./types";
import WriteTestsPage from "./WriteTestsPage";
import { getUserId } from "@/lib/userId";

export default function ExercisePage() {
  const [, params] = useRoute("/gym/:id");
  const anyExercise = params?.id ? getAnyExerciseById(params.id) : null;

  // All hooks must be unconditional — dispatch to WriteTestsPage in the render phase below
  const solveExercise = anyExercise?.format !== "write-tests"
    ? (anyExercise as import("./types").Exercise | null)
    : null;

  const [code,           setCode]           = useState(solveExercise?.starterCode ?? "");
  const [results,        setResults]        = useState<TestResult[] | null>(null);
  const [running,        setRunning]        = useState(false);
  const [showSolution,   setShowSolution]   = useState(false);
  const [hintIndex,      setHintIndex]      = useState(-1);
  const [passed,         setPassed]         = useState(false);
  const [runCount,       setRunCount]       = useState(0);
  const [saved,          setSaved]          = useState(false);
  const [activeTab,      setActiveTab]      = useState<"problem" | "solution">("problem");

  // Timing signals for adaptive learning
  const startTimeRef       = useRef(Date.now());
  const firstEditTimeRef   = useRef<number | null>(null);
  const hasEditedRef       = useRef(false);

  // This alias is used throughout the component below — keep it in sync
  const exercise = solveExercise;

  useEffect(() => {
    if (exercise) {
      setCode(exercise.starterCode);
      startTimeRef.current = Date.now();
      firstEditTimeRef.current = null;
      hasEditedRef.current = false;
      setResults(null); setPassed(false); setRunCount(0);
      setShowSolution(false); setHintIndex(-1); setSaved(false);
    }
  }, [exercise?.id]);

  const handleCodeChange = useCallback((val: string | undefined) => {
    if (!hasEditedRef.current) {
      firstEditTimeRef.current = Date.now();
      hasEditedRef.current = true;
    }
    setCode(val ?? "");
  }, []);

  const runCode = useCallback(() => {
    if (!exercise) return;
    setRunning(true);
    setTimeout(() => {
      const res = runExercise(code, exercise);
      setResults(res);
      const allPassed = res.every(r => r.passed);
      setRunCount(c => c + 1);
      if (allPassed && !passed) {
        setPassed(true);
        void saveAttempt(true, res.filter(r => r.passed).length, res.length);
      }
      setRunning(false);
    }, 50);
  }, [code, exercise, passed]);

  const saveAttempt = async (attemptPassed: boolean, testsPassed: number, testsTotal: number) => {
    if (!exercise || saved) return;
    setSaved(true);
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
          passed: attemptPassed,
          testsPassed, testsTotal,
          runsBeforePass: runCount + 1,
          timeToFirstEditMs: timeToFirstEdit,
          timeTakenMs: timeTaken,
          hintsUsed: hintIndex + 1,
          viewedSolution: showSolution,
          studentCode: code,
        }),
      });
    } catch { /* non-critical */ }
  };

  const handleRevealSolution = () => {
    setShowSolution(true);
    setActiveTab("solution");
    if (!saved && !passed) void saveAttempt(false, results?.filter(r => r.passed).length ?? 0, exercise?.testCases.length ?? 0);
  };

  const handleReset = () => {
    setCode(exercise?.starterCode ?? "");
    setResults(null); setPassed(false); setRunCount(0);
    setSaved(false);
    startTimeRef.current = Date.now();
    firstEditTimeRef.current = null;
    hasEditedRef.current = false;
  };

  // Dispatch write-tests exercises — done here (after all hooks)
  if (anyExercise?.format === "write-tests") {
    return <WriteTestsPage exercise={anyExercise} />;
  }

  if (!exercise) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Exercise not found.</p>
        <Link href="/gym"><Button variant="outline" className="mt-4">Back to Gym</Button></Link>
      </div>
    );
  }

  const visibleResults = results?.filter(r => !r.hidden) ?? [];
  const hiddenResults  = results?.filter(r => r.hidden)  ?? [];
  const passedVisible  = visibleResults.filter(r => r.passed).length;
  const passedHidden   = hiddenResults.filter(r => r.passed).length;
  const totalTests     = exercise.testCases.length;
  const totalPassed    = results?.filter(r => r.passed).length ?? 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="border-b border-border/60 bg-background/95 backdrop-blur shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link href="/gym" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={15} />
          </Link>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className={cn("text-xs font-bold shrink-0", TIER_META[exercise.tier].color)}>{TIER_META[exercise.tier].label}</span>
            <span className="text-border/60">·</span>
            <span className="text-xs text-muted-foreground shrink-0">{CATEGORY_LABELS[exercise.category]}</span>
            <span className="text-border/60">·</span>
            <span className="text-sm font-semibold truncate">{exercise.title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {runCount > 0 && (
              <span className="text-xs text-muted-foreground">{runCount} run{runCount !== 1 ? "s" : ""}</span>
            )}
            {passed && (
              <span className="flex items-center gap-1 text-xs font-bold text-green-400">
                <CheckCircle2 size={12} /> Passed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main split layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left panel: problem + results */}
        <div className="w-[42%] shrink-0 border-r border-border/40 flex flex-col overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-border/40 shrink-0">
            {[
              { key: "problem", label: "Problem", icon: Target },
              { key: "solution", label: "Solution", icon: BookOpen },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key as "problem" | "solution")}
                className={cn("flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors",
                  activeTab === key
                    ? "border-orange-500 text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}>
                <Icon size={11} /> {label}
                {key === "solution" && !showSolution && <span className="text-xs opacity-40">🔒</span>}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
            {activeTab === "problem" && (
              <>
                {/* Description */}
                <div>
                  <p className="font-medium leading-relaxed mb-1">{exercise.description}</p>
                  {exercise.analogy && (
                    <p className="text-xs text-muted-foreground italic mt-2 border-l-2 border-muted-foreground/20 pl-3">{exercise.analogy}</p>
                  )}
                </div>

                {/* Examples */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Examples</p>
                  {exercise.examples.map((ex, i) => (
                    <div key={i} className="rounded-lg bg-muted/10 border border-border/30 p-3 space-y-1.5">
                      <div className="font-mono text-xs">
                        <span className="text-muted-foreground">Input: </span>
                        <span>{ex.input}</span>
                      </div>
                      <div className="font-mono text-xs">
                        <span className="text-muted-foreground">Output: </span>
                        <span className="text-green-400">{ex.output}</span>
                      </div>
                      {ex.note && <p className="text-xs text-muted-foreground italic">{ex.note}</p>}
                    </div>
                  ))}
                </div>

                {/* Why this matters */}
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                  <p className="text-xs font-semibold text-orange-400 mb-1">Why this matters</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{exercise.why}</p>
                </div>

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
                        <Lightbulb size={10} /> {hintIndex === -1 ? "Show hint" : "Next hint"}
                      </button>
                    )}
                  </div>
                )}

                {/* Test results */}
                {results && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Test Results</p>
                      <span className={cn("text-xs font-bold", totalPassed === totalTests ? "text-green-400" : "text-red-400")}>
                        {totalPassed}/{totalTests}
                      </span>
                    </div>
                    {visibleResults.map((r, i) => (
                      <div key={i} className={cn("rounded-lg p-2.5 border text-xs",
                        r.passed ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
                      )}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {r.passed ? <CheckCircle2 size={11} className="text-green-400" /> : <XCircle size={11} className="text-red-400" />}
                          <span className="font-mono font-medium">{r.label}</span>
                        </div>
                        {!r.passed && (
                          <div className="space-y-0.5 ml-4 font-mono text-xs text-muted-foreground">
                            {r.error
                              ? <p className="text-red-400">{r.error}</p>
                              : <>
                                  <p>Expected: <span className="text-green-400">{JSON.stringify(r.expected)}</span></p>
                                  <p>Got:      <span className="text-red-400">{JSON.stringify(r.actual)}</span></p>
                                </>
                            }
                          </div>
                        )}
                      </div>
                    ))}
                    {hiddenResults.length > 0 && (
                      <div className={cn("rounded-lg p-2.5 border text-xs",
                        passedHidden === hiddenResults.length ? "border-green-500/20 bg-green-500/5" : "border-muted/30"
                      )}>
                        <div className="flex items-center gap-1.5">
                          {passedHidden === hiddenResults.length
                            ? <CheckCircle2 size={11} className="text-green-400" />
                            : <XCircle size={11} className="text-red-400" />
                          }
                          <span className="text-muted-foreground">{hiddenResults.length} hidden test{hiddenResults.length > 1 ? "s" : ""} — {passedHidden}/{hiddenResults.length} passed</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reveal solution */}
                {!showSolution && (
                  <button onClick={handleRevealSolution} className="text-xs text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1 transition-colors">
                    <Eye size={10} /> Reveal solution
                  </button>
                )}
              </>
            )}

            {activeTab === "solution" && (
              <>
                {!showSolution ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                    <div className="w-12 h-12 rounded-xl bg-muted/20 flex items-center justify-center">
                      <EyeOff size={18} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Solution is hidden until you reveal it.</p>
                    <Button onClick={handleRevealSolution} variant="outline" size="sm" className="gap-1.5">
                      <Eye size={12} /> Reveal Solution
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Forge-Approved Solution</p>
                    <div className="rounded-lg border border-border/40 overflow-hidden" style={{ height: 220 }}>
                      <Editor height="220px" language="javascript" value={exercise.solution} theme="vs-dark"
                        options={{ readOnly: true, fontSize: 12, minimap: { enabled: false }, lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 8, bottom: 8 }, fontFamily: "'JetBrains Mono', monospace" }} />
                    </div>
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                      <p className="text-xs font-semibold text-blue-400 mb-1">Why this works</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{exercise.solutionExplanation}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right panel: editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground">JavaScript</span>
            <div className="flex gap-2">
              <button onClick={handleReset} className="text-xs text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1 transition-colors">
                <RotateCcw size={10} /> Reset
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language="javascript"
              value={code}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                fontSize: 14,
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

          {/* Run button */}
          <div className="border-t border-border/40 p-3 flex items-center gap-3 shrink-0">
            <Button
              onClick={runCode}
              disabled={running}
              className={cn("flex-1 gap-2 font-bold", passed ? "bg-green-700 hover:bg-green-600" : "bg-orange-600 hover:bg-orange-500")}
            >
              {running
                ? <><Loader2 size={14} className="animate-spin" /> Running…</>
                : passed
                  ? <><CheckCircle2 size={14} /> All Tests Passing</>
                  : <><Play size={14} /> Run Tests</>
              }
            </Button>
            {results && !passed && (
              <span className="text-xs text-muted-foreground">
                {totalPassed}/{totalTests} tests passing
              </span>
            )}
          </div>

          {/* Pass celebration */}
          {passed && (
            <div className="border-t border-green-500/20 bg-green-950/20 px-4 py-3 flex items-center gap-3 shrink-0">
              <CheckCircle2 size={16} className="text-green-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-green-400">All tests passed in {runCount} run{runCount !== 1 ? "s" : ""}.</p>
                <p className="text-xs text-muted-foreground">Check the solution to compare approaches.</p>
              </div>
              <Link href="/gym">
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0 text-green-400 border-green-500/30">
                  <ChevronRight size={12} /> Next Exercise
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
