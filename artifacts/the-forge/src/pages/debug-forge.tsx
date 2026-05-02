import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Bug, Zap, Loader2, RotateCcw, ChevronRight, Eye, EyeOff,
  Copy, Check, Trophy, Flame, Shield, Star,
} from "lucide-react";
import { getUserId } from "@/lib/userId";
import { getSkillLevel } from "@/lib/skillLevel";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const LEVEL_LABELS: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1:  { label: "HTML Basics",       color: "text-green-400",   bg: "bg-green-500/10",   border: "border-green-500/30" },
  2:  { label: "CSS Basics",        color: "text-green-400",   bg: "bg-green-500/10",   border: "border-green-500/30" },
  3:  { label: "JS Syntax",         color: "text-lime-400",    bg: "bg-lime-500/10",    border: "border-lime-500/30" },
  4:  { label: "JS Variables",      color: "text-lime-400",    bg: "bg-lime-500/10",    border: "border-lime-500/30" },
  5:  { label: "JS Logic",          color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30" },
  6:  { label: "JS Scope",          color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30" },
  7:  { label: "Async/Await",       color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30" },
  8:  { label: "Array Methods",     color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30" },
  9:  { label: "API Handling",      color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/30" },
  10: { label: "this Binding",      color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/30" },
  11: { label: "Security",          color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/30" },
  12: { label: "Architecture",      color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/30" },
};

const BUG_TYPE_COLORS: Record<string, string> = {
  "Syntax Error":    "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Logic Error":     "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Scope Bug":       "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Async Bug":       "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "Type Error":      "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "Security Flaw":   "bg-red-500/20 text-red-300 border-red-500/30",
  "Performance Bug": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Runtime Error":   "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

interface Challenge {
  level: number;
  description: string;
  brokenCode: string;
  bugType: string;
  hint: string;
}

function useStream(endpoint: string) {
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");

  const run = useCallback(async (body: object) => {
    if (status === "running") return;
    setOutput(""); setStatus("running");
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": getUserId(),
          "x-skill-level": getSkillLevel(),
        },
        body: JSON.stringify(body),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = ""; let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "chunk") { acc += ev.content; setOutput(acc); }
            else if (ev.type === "done") setStatus("done");
            else if (ev.type === "error") { setOutput(ev.message ?? "Error."); setStatus("error"); }
            else if (ev.type === "subscription_required") { setOutput("Subscription required to use Debug Forge."); setStatus("error"); }
          } catch { /* skip */ }
        }
      }
      setStatus(s => s === "error" ? s : "done");
    } catch {
      setOutput("Forge hit a snag. Try again."); setStatus("error");
    }
  }, [endpoint, status]);

  const reset = useCallback(() => { setOutput(""); setStatus("idle"); }, []);
  return { output, status, run, reset };
}

export default function DebugForge() {
  const [level, setLevel] = useState(1);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [userFix, setUserFix] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [copied, setCopied] = useState(false);
  const [streak, setStreak] = useState(0);
  const [solved, setSolved] = useState(0);

  const check = useStream("/api/forge/debug-check");

  const levelMeta = LEVEL_LABELS[level] ?? LEVEL_LABELS[1];

  const generate = async () => {
    setGenerating(true);
    setGenerateError("");
    setChallenge(null);
    setUserFix("");
    setShowHint(false);
    check.reset();

    try {
      const res = await fetch(`${API_BASE}/api/forge/debug-challenge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": getUserId(),
        },
        body: JSON.stringify({ level }),
      });
      const data = await res.json() as Challenge & { error?: string };
      if (!res.ok || data.error) {
        setGenerateError(data.error ?? "Failed to generate challenge.");
      } else {
        setChallenge(data);
        setUserFix(data.brokenCode);
      }
    } catch {
      setGenerateError("Connection error. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const submitFix = () => {
    if (!challenge || !userFix.trim()) return;
    check.run({
      description: challenge.description,
      brokenCode: challenge.brokenCode,
      userFix,
      bugType: challenge.bugType,
      level: challenge.level,
    });
  };

  const copyCode = async () => {
    if (!challenge) return;
    await navigator.clipboard.writeText(challenge.brokenCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nextChallenge = () => {
    if (check.output.startsWith("✅")) {
      setSolved(s => s + 1);
      setStreak(s => s + 1);
      if (level < 12) setLevel(l => l + 1);
    } else {
      setStreak(0);
    }
    setChallenge(null);
    setUserFix("");
    setShowHint(false);
    check.reset();
    setGenerateError("");
  };

  const isCorrect = check.status === "done" && check.output.startsWith("✅");
  const isWrong   = check.status === "done" && check.output.startsWith("❌");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
              <Bug size={16} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Debug Forge</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Find and fix the bug. Start simple, work up to problems that break most developers.
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Flame size={13} className="text-orange-400" />
              <span className="text-xs font-bold text-orange-400">{streak} streak</span>
            </div>
          )}
          {solved > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <Trophy size={13} className="text-green-400" />
              <span className="text-xs font-bold text-green-400">{solved} solved</span>
            </div>
          )}
        </div>
      </div>

      {/* Level Selector */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground font-medium">Difficulty Level</Label>
          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", levelMeta.bg, levelMeta.color, levelMeta.border)}>
            <Star size={10} />
            Level {level}/12 — {levelMeta.label}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-1">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(l => {
            const meta = LEVEL_LABELS[l]!;
            const isActive = l === level;
            return (
              <button
                key={l}
                onClick={() => { setLevel(l); setChallenge(null); check.reset(); setGenerateError(""); }}
                className={cn(
                  "h-8 rounded text-xs font-bold transition-all border",
                  isActive
                    ? cn(meta.bg, meta.color, meta.border)
                    : "bg-muted/20 text-muted-foreground border-border/40 hover:bg-muted/40"
                )}
              >
                {l}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Levels 1–2: HTML/CSS</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />3–6: JavaScript</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />7–8: Async/Arrays</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />9–10: APIs/Binding</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />11–12: Security/Architecture</span>
        </div>
      </div>

      {/* Generate Button */}
      {!challenge && (
        <div className="flex flex-col items-center gap-3">
          <Button
            onClick={generate}
            disabled={generating}
            size="lg"
            className="gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-8"
          >
            {generating
              ? <><Loader2 size={16} className="animate-spin" /> Forging challenge…</>
              : <><Bug size={16} /> Generate Level {level} Challenge</>
            }
          </Button>
          {generateError && <p className="text-sm text-destructive">{generateError}</p>}
        </div>
      )}

      {/* Challenge Area */}
      {challenge && (
        <div className="space-y-4">
          {/* Challenge Header */}
          <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn("text-xs border", BUG_TYPE_COLORS[challenge.bugType] ?? "bg-muted text-muted-foreground")}>
                {challenge.bugType}
              </Badge>
              <Badge variant="outline" className={cn("text-xs border", levelMeta.bg, levelMeta.color, levelMeta.border)}>
                Level {challenge.level} — {levelMeta.label}
              </Badge>
            </div>
            <p className="text-sm font-medium leading-relaxed">{challenge.description}</p>
          </div>

          {/* Code Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Broken Code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Bug size={11} className="text-red-400" />
                  Broken Code
                  <span className="text-red-400 text-xs">(find the bug)</span>
                </Label>
                <Button variant="ghost" size="sm" onClick={copyCode} className="h-6 gap-1 text-xs text-muted-foreground">
                  {copied ? <><Check size={11} className="text-green-400" /> Copied</> : <><Copy size={11} /> Copy</>}
                </Button>
              </div>
              <pre className="rounded-lg border border-red-900/30 bg-red-950/10 p-4 text-sm font-mono leading-relaxed overflow-auto whitespace-pre text-foreground/90 min-h-[220px]">
                {challenge.brokenCode}
              </pre>
            </div>

            {/* Your Fix */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Shield size={11} className="text-green-400" />
                Your Fix
                <span className="text-green-400 text-xs">(edit the code above)</span>
              </Label>
              <Textarea
                value={userFix}
                onChange={e => setUserFix(e.target.value)}
                className="font-mono text-sm min-h-[220px] resize-none leading-relaxed border-green-900/30 bg-green-950/5 focus-visible:ring-green-600/30"
                placeholder="Paste or edit the fixed code here…"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Hint */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHint(h => !h)}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {showHint ? <EyeOff size={12} /> : <Eye size={12} />}
              {showHint ? "Hide hint" : "Show hint"}
            </Button>
            {showHint && (
              <span className="text-xs text-amber-400 italic">💡 {challenge.hint}</span>
            )}
          </div>

          {/* Submit / Feedback */}
          {check.status === "idle" && (
            <Button
              onClick={submitFix}
              disabled={!userFix.trim()}
              className="w-full gap-2 bg-green-700 hover:bg-green-600 font-bold"
            >
              <Zap size={15} /> Check My Fix
            </Button>
          )}

          {(check.status === "running" || check.status === "done" || check.status === "error") && (
            <div className={cn(
              "rounded-xl border p-4 space-y-3",
              isCorrect ? "border-green-500/30 bg-green-950/20" :
              isWrong   ? "border-red-500/30 bg-red-950/15" :
                          "border-border/60 bg-card/50"
            )}>
              <div className="flex items-center justify-between">
                <Label className={cn(
                  "text-xs font-medium",
                  isCorrect ? "text-green-400" : isWrong ? "text-red-400" : "text-muted-foreground"
                )}>
                  {check.status === "running" ? "Forge is reviewing…" : "Forge's Verdict"}
                </Label>
                {check.status === "running" && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
              </div>

              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {check.output || <span className="text-muted-foreground animate-pulse">Analyzing your fix…</span>}
                {check.status === "running" && <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse rounded-sm" />}
              </div>

              {check.status === "done" && (
                <div className="flex gap-2 flex-wrap pt-1">
                  <Button onClick={nextChallenge} className="gap-1.5 font-bold" size="sm">
                    <ChevronRight size={14} />
                    {isCorrect && level < 12 ? `Next → Level ${level + 1}` : isCorrect ? "One more at this level" : "Try again"}
                  </Button>
                  {isWrong && (
                    <Button variant="outline" size="sm" onClick={() => check.reset()} className="gap-1.5 text-xs">
                      <RotateCcw size={12} /> Revise my fix
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* New Challenge */}
          {check.status === "idle" && (
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={generate} disabled={generating} className="text-xs text-muted-foreground gap-1.5">
                <RotateCcw size={11} /> Different challenge at this level
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Info Footer */}
      {!challenge && !generating && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {[
            { icon: Bug, color: "text-red-400", bg: "bg-red-500/10", title: "Real Bugs", desc: "Every challenge uses actual bug patterns from real codebases — not made-up errors." },
            { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/10", title: "Instant Feedback", desc: "Forge reviews your fix and explains exactly what the bug was and why it mattered." },
            { icon: Trophy, color: "text-orange-400", bg: "bg-orange-500/10", title: "12 Levels Deep", desc: "From a missing HTML tag to a race condition. Master all 12 and you'll outperform most developers." },
          ].map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-2">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bg)}>
                <Icon size={15} className={color} />
              </div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
