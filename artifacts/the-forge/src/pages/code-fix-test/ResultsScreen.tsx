import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";
import {
  Trophy, Timer, Star, Flame, CheckCircle2, XCircle, Loader2,
  BarChart2, RotateCcw, BookOpen, Lightbulb, Download, GraduationCap,
  ChevronRight, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  API_BASE, LEVEL_LABELS, LEVEL_COLORS, LANGUAGE_OPTIONS,
  ACHIEVEMENT_SPEC, SAGE_LESSON_MAP,
  formatTime, SessionResult,
} from "./types";
import { getUserId } from "@/lib/userId";
import { Link } from "wouter";

function ForgeReview({ mistakes }: {
  mistakes: { description: string; brokenCode: string; userFix: string; explanation: string; bugType: string }[];
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/debug-test/review-mistakes`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
          body: JSON.stringify({ mistakes }),
        });
        if (!res.ok || !res.body) { setLoading(false); return; }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        setLoading(false);
        while (true) {
          const { done: d, value } = await reader.read();
          if (d || cancelled) break;
          setText(p => p + dec.decode(value, { stream: true }));
        }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={13} className="animate-spin text-orange-400" /> Forge is reviewing…</div>;

  const lines = text.split("\n");
  return (
    <div className="space-y-1 text-sm">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="text-sm font-bold text-foreground mt-4 mb-1">{line.slice(3)}</h3>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-foreground/90 mt-2">{line.replace(/\*\*/g, "")}</p>;
        if (line === "---") return <hr key={i} className="border-border/30 my-3" />;
        if (line.startsWith("```")) return null;
        const parts = line.split(/(`[^`]+`)/g);
        if (parts.length > 1) return <p key={i} className="text-muted-foreground">{parts.map((p, j) => p.startsWith("`") && p.endsWith("`") ? <code key={j} className="bg-muted/40 px-1 rounded text-xs font-mono text-foreground">{p.slice(1, -1)}</code> : p)}</p>;
        return <p key={i} className="text-muted-foreground">{line}</p>;
      })}
      {(() => {
        const blocks: { code: string; lang: string }[] = [];
        let inBlock = false; let cur: string[] = []; let lang = "";
        for (const l of lines) {
          if (l.startsWith("```") && !inBlock) { inBlock = true; lang = l.slice(3); cur = []; }
          else if (l === "```" && inBlock) { blocks.push({ code: cur.join("\n"), lang }); inBlock = false; }
          else if (inBlock) cur.push(l);
        }
        return blocks.map((b, i) => (
          <pre key={`cb-${i}`} className="rounded-lg bg-muted/30 border border-border/40 p-3 font-mono text-xs overflow-auto my-2">{b.code}</pre>
        ));
      })()}
    </div>
  );
}

function TeachItBack({ result, index }: { result: SessionResult; index: number }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [grade, setGrade] = useState<{ score: number; understood: boolean; feedback: string } | null>(null);

  const submit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/debug-test/teach-back`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({
          description: result.description, brokenCode: result.brokenCode,
          correctExplanation: result.explanation, studentExplanation: text,
        }),
      });
      if (res.ok) setGrade(await res.json() as { score: number; understood: boolean; feedback: string });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-2 mt-3 border-t border-border/30 pt-3">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <GraduationCap size={11} /> Mistake {index + 1}: Teach it back
      </p>
      {!grade ? (
        <>
          <p className="text-xs text-muted-foreground">Explain what was broken and how to fix it in your own words. Forge grades you 0–10.</p>
          <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="The bug was…" className="text-sm min-h-[80px] resize-none" />
          <Button onClick={submit} disabled={loading || !text.trim()} size="sm" className="gap-1.5">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
            Submit explanation
          </Button>
        </>
      ) : (
        <div className={cn("rounded-lg border p-3 space-y-1.5", grade.understood ? "border-green-500/30 bg-green-950/10" : "border-yellow-500/30 bg-yellow-950/10")}>
          <div className="flex items-center gap-2">
            {grade.understood ? <CheckCircle2 size={13} className="text-green-400" /> : <Lightbulb size={13} className="text-yellow-400" />}
            <span className="text-xs font-bold">{grade.score}/10 — {grade.understood ? "Understood" : "Getting there"}</span>
            {grade.score >= 9 && <span className="text-[10px] text-orange-400">🏆 Achievement: Teach the Teacher</span>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{grade.feedback}</p>
        </div>
      )}
    </div>
  );
}

export default function ResultsScreen({ level, mode, language, results, totalSeconds, pausedSeconds, onRetake, onBack }: {
  level: number; mode: string; language: string;
  results: SessionResult[]; totalSeconds: number; pausedSeconds: number;
  onRetake: () => void; onBack: () => void;
}) {
  const [saving, setSaving]         = useState(true);
  const [saved, setSaved]           = useState<{
    sessionId: number; correctCount: number; accuracyPct: number; qualifies: boolean;
    unlockedNext: boolean; qualifyingSessions: number; minRequired: number;
    newAchievements: string[];
  } | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [showTeach, setShowTeach]   = useState(false);

  // Fix-it-yourself state
  const [fixIdx, setFixIdx]         = useState<number | null>(null);
  const [fixCode, setFixCode]       = useState("");
  const [fixChecking, setFixChecking] = useState(false);
  const [fixVerdict, setFixVerdict] = useState<{ correct: boolean; explanation: string } | null>(null);

  const wrongAnswers = results.filter(r => !r.correct);
  const correctCount = results.filter(r => r.correct).length;
  const accuracy     = Math.round((correctCount / results.length) * 100);
  const avgSec       = Math.round(totalSeconds / results.length);
  const hintsUsed    = results.filter(r => r.hintUsed).length;

  const monacoLang = LANGUAGE_OPTIONS.find(l => l.value === language)?.monacoLang ?? "javascript";

  const missedBugTypes = [...new Set(wrongAnswers.map(r => r.bugType))];
  const sageLessons = missedBugTypes.filter(bt => SAGE_LESSON_MAP[bt]).map(bt => ({ bugType: bt, lesson: SAGE_LESSON_MAP[bt]! }));

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/debug-test/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
          body: JSON.stringify({ level, mode, language, totalSeconds, pausedSeconds, results }),
        });
        if (res.ok) setSaved(await res.json());
      } finally { setSaving(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!saving && wrongAnswers.length > 0) {
      const t = setTimeout(() => setShowReview(true), 700);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [saving, wrongAnswers.length]);

  const startFixIt = (i: number) => {
    const w = wrongAnswers[i]!;
    setFixIdx(i); setFixCode(w.brokenCode); setFixVerdict(null);
  };

  const submitFix = async () => {
    if (fixIdx === null || !fixCode.trim() || fixChecking) return;
    const w = wrongAnswers[fixIdx]!;
    setFixChecking(true);
    try {
      const res = await fetch(`${API_BASE}/api/debug-test/check-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ description: w.description, brokenCode: w.brokenCode, userFix: fixCode }),
      });
      if (res.ok) setFixVerdict(await res.json() as { correct: boolean; explanation: string });
    } finally { setFixChecking(false); }
  };

  const exportGuide = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const html = `<!DOCTYPE html><html><head><title>Code Fix Test — Mistake Review</title>
<style>body{font-family:monospace;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;}
h1{border-bottom:2px solid #333;padding-bottom:8px;}
h2{margin-top:32px;color:#c00;}pre{background:#f4f4f4;padding:12px;border-radius:4px;overflow:auto;}
.correct{color:green;}.wrong{color:red;}</style></head><body>
<h1>Code Fix Test — Study Guide</h1>
<p>Level ${level}: ${LEVEL_LABELS[level]} | ${new Date().toLocaleDateString()}</p>
<p>Score: ${correctCount}/${results.length} (${accuracy}%) | Time: ${formatTime(totalSeconds)}</p>
${wrongAnswers.map((r, i) => `
<h2>Mistake ${i + 1}: ${r.bugType}</h2>
<p><strong>Task:</strong> ${r.description}</p>
<h3>Broken Code:</h3><pre>${r.brokenCode}</pre>
<h3>Your Submission:</h3><pre>${r.userFix}</pre>
<h3>Forge's Note:</h3><p>${r.explanation}</p>
`).join("")}
</body></html>`;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/15 flex items-center justify-center mx-auto">
          {mode === "boss" ? <span className="text-2xl">💀</span> : <Trophy size={24} className="text-orange-400" />}
        </div>
        <h2 className="text-2xl font-bold">{mode === "boss" ? "Boss Defeated" : "Test Complete"}</h2>
        <p className={cn("text-sm font-medium", LEVEL_COLORS[level])}>Level {level} — {LEVEL_LABELS[level]}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Total Time",  value: formatTime(totalSeconds),  icon: Timer, color: "text-orange-400" },
          { label: "Accuracy",    value: `${accuracy}%`,            icon: Star,  color: accuracy >= 80 ? "text-green-400" : "text-yellow-400" },
          { label: "Avg / Fix",   value: formatTime(avgSec),        icon: Flame, color: "text-blue-400" },
          { label: "Hints Used",  value: `${hintsUsed}`,            icon: Lightbulb, color: hintsUsed === 0 ? "text-green-400" : "text-yellow-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border/50 bg-card/50 p-3 text-center">
            <Icon size={13} className={cn(color, "mx-auto mb-1")} />
            <p className="text-base font-bold">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Qualify badge */}
      {!saving && saved && (
        <div className={cn("rounded-xl border p-3 flex items-center gap-3",
          saved.qualifies ? "border-green-500/30 bg-green-950/10" : "border-yellow-500/30 bg-yellow-950/10"
        )}>
          {saved.qualifies
            ? <CheckCircle2 size={16} className="text-green-400 shrink-0" />
            : <XCircle size={16} className="text-yellow-400 shrink-0" />
          }
          <div className="text-xs">
            {saved.qualifies ? (
              <p className="font-semibold text-green-400">Session qualifies! ({saved.accuracyPct}% ≥ 60%)</p>
            ) : (
              <p className="font-semibold text-yellow-400">Doesn't qualify ({saved.accuracyPct}% — need 60%)</p>
            )}
            <p className="text-muted-foreground">{saved.qualifyingSessions}/{saved.minRequired} qualifying sessions at this level{saved.unlockedNext && level < 12 ? ` · 🔓 Level ${level + 1} unlocked!` : ""}</p>
          </div>
        </div>
      )}

      {/* New achievements */}
      {saved?.newAchievements && saved.newAchievements.length > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 space-y-2">
          <p className="text-xs font-bold text-orange-300">🏆 Achievement{saved.newAchievements.length > 1 ? "s" : ""} Unlocked!</p>
          <div className="flex flex-wrap gap-2">
            {saved.newAchievements.map(id => {
              const spec = ACHIEVEMENT_SPEC[id];
              return spec ? (
                <div key={id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-orange-500/30 bg-orange-500/10 text-xs">
                  <span>{spec.emoji}</span><span className="font-medium">{spec.label}</span>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Per-challenge breakdown */}
      <div className="rounded-xl border border-border/50 bg-card/30 divide-y divide-border/30 overflow-hidden">
        {results.map((r, i) => (
          <div key={i} className="flex items-center gap-2 px-4 py-2.5 text-sm">
            {r.correct ? <CheckCircle2 size={13} className="text-green-400 shrink-0" /> : <XCircle size={13} className="text-red-400 shrink-0" />}
            <span className="text-muted-foreground text-xs flex-1">{r.bugType}</span>
            {r.hintUsed && <span className="text-[10px] text-yellow-500">hint</span>}
            {r.rating && <span className="text-[10px] text-yellow-400">{"★".repeat(r.rating)}</span>}
            <span className="font-mono text-xs text-muted-foreground">{formatTime(r.secondsTaken)}</span>
          </div>
        ))}
      </div>

      {/* Sage lesson links */}
      {sageLessons.length > 0 && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-4 space-y-2">
          <p className="text-xs font-semibold text-blue-300 flex items-center gap-1.5"><GraduationCap size={12} /> Go study these with Sage</p>
          {sageLessons.map(({ bugType, lesson }) => (
            <Link key={bugType} href="/sage"
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-blue-500/20 hover:bg-blue-500/5 transition-colors text-muted-foreground">
              <span className="text-blue-400 shrink-0">→</span>
              <span><strong className="text-foreground">{bugType}</strong>: {lesson}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Fix-it-yourself */}
      {wrongAnswers.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
          <button onClick={() => setFixIdx(fixIdx !== null ? null : 0)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/20 transition-colors">
            <p className="text-sm font-bold flex items-center gap-2"><RefreshCw size={14} className="text-green-400" /> Fix It Yourself (Practice Mode)</p>
            {fixIdx !== null ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </button>

          {fixIdx !== null && (
            <div className="border-t border-border/30 p-4 space-y-3">
              <p className="text-xs text-muted-foreground">No timer. No pressure. Practice fixing the ones you got wrong.</p>

              <div className="flex gap-2 flex-wrap">
                {wrongAnswers.map((_, i) => (
                  <button key={i} onClick={() => { startFixIt(i); setFixVerdict(null); }}
                    className={cn("px-2.5 py-1 rounded-md text-xs border transition-colors",
                      fixIdx === i ? "border-orange-500/60 bg-orange-500/10 text-orange-300" : "border-border/40 text-muted-foreground hover:bg-muted/30"
                    )}>
                    Mistake {i + 1}
                  </button>
                ))}
              </div>

              {fixIdx !== null && wrongAnswers[fixIdx] && (
                <div className="space-y-3">
                  <p className="text-xs font-medium">{wrongAnswers[fixIdx]!.description}</p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Broken Code</p>
                      <div className="rounded-lg overflow-hidden border border-red-900/20" style={{ height: 200 }}>
                        <Editor height="200px" language={monacoLang} value={wrongAnswers[fixIdx]!.brokenCode} theme="vs-dark"
                          options={{ readOnly: true, fontSize: 12, minimap: { enabled: false }, lineNumbers: "on", scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 8, bottom: 8 }, fontFamily: "'JetBrains Mono', monospace" }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Your Practice Fix</p>
                      <div className="rounded-lg overflow-hidden border border-green-900/20" style={{ height: 200 }}>
                        <Editor height="200px" language={monacoLang} value={fixCode} onChange={v => setFixCode(v ?? "")} theme="vs-dark"
                          options={{ readOnly: !!fixVerdict, fontSize: 12, minimap: { enabled: false }, lineNumbers: "on", scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 8, bottom: 8 }, fontFamily: "'JetBrains Mono', monospace" }} />
                      </div>
                    </div>
                  </div>

                  {!fixVerdict
                    ? <Button onClick={submitFix} disabled={fixChecking} size="sm" className="gap-1.5 bg-orange-600 hover:bg-orange-500">
                        {fixChecking ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />} Check Fix
                      </Button>
                    : <div className={cn("rounded-lg border p-3 text-xs", fixVerdict.correct ? "border-green-500/30 bg-green-950/10" : "border-red-500/30 bg-red-950/10")}>
                        <p className={cn("font-bold mb-1", fixVerdict.correct ? "text-green-400" : "text-red-400")}>{fixVerdict.correct ? "✓ Fixed!" : "Still not quite."}</p>
                        <p className="text-muted-foreground">{fixVerdict.explanation}</p>
                        {fixVerdict.correct && fixIdx + 1 < wrongAnswers.length && (
                          <button onClick={() => startFixIt(fixIdx + 1)} className="mt-2 text-orange-400 hover:text-orange-300 flex items-center gap-1">
                            <ChevronRight size={11} /> Next mistake
                          </button>
                        )}
                      </div>
                  }
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Forge mistake review */}
      {wrongAnswers.length > 0 && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-950/10 overflow-hidden">
          <button onClick={() => setShowReview(v => !v)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-orange-500/5 transition-colors">
            <p className="text-sm font-bold text-orange-300 flex items-center gap-2">
              <BookOpen size={14} /> Forge Reviews Your {wrongAnswers.length} Mistake{wrongAnswers.length > 1 ? "s" : ""}
            </p>
            {showReview ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </button>
          {showReview && (
            <div className="border-t border-orange-500/15 p-4 space-y-4">
              <ForgeReview mistakes={wrongAnswers.map(r => ({
                description: r.description, brokenCode: r.brokenCode, userFix: r.userFix,
                explanation: r.explanation, bugType: r.bugType,
              }))} />
            </div>
          )}
        </div>
      )}

      {/* Teach it back */}
      {wrongAnswers.length > 0 && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 overflow-hidden">
          <button onClick={() => setShowTeach(v => !v)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-purple-500/5 transition-colors">
            <p className="text-sm font-bold text-purple-300 flex items-center gap-2">
              <GraduationCap size={14} /> Teach It Back — Prove You Understood
            </p>
            {showTeach ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </button>
          {showTeach && (
            <div className="border-t border-purple-500/15 p-4 space-y-1">
              <p className="text-xs text-muted-foreground mb-3">Explain each mistake in your own words. Forge grades you 0–10. Score 8+ = genuine understanding.</p>
              {wrongAnswers.map((r, i) => <TeachItBack key={i} result={r} index={i} />)}
            </div>
          )}
        </div>
      )}

      {wrongAnswers.length === 0 && (
        <div className="rounded-xl border border-green-500/20 bg-green-950/10 p-4 text-center">
          <CheckCircle2 size={20} className="text-green-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-green-400">Perfect score!</p>
          <p className="text-xs text-muted-foreground mt-1">No mistakes. Every bug found correctly.</p>
        </div>
      )}

      {/* Save status */}
      {saving && (
        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
          <Loader2 size={11} className="animate-spin" /> Saving session…
        </p>
      )}

      <div className="flex gap-3 flex-wrap">
        <Button onClick={exportGuide} variant="outline" size="sm" className="gap-1.5">
          <Download size={13} /> Export Study Guide
        </Button>
        <Button onClick={onBack} variant="outline" className="flex-1 gap-2 min-w-[120px]">
          <BarChart2 size={14} /> Progress
        </Button>
        <Button onClick={onRetake} className="flex-1 gap-2 bg-orange-600 hover:bg-orange-500 font-bold min-w-[120px]">
          <RotateCcw size={14} /> Retake
        </Button>
      </div>
    </div>
  );
}
