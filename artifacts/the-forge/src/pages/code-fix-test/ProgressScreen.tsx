import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import {
  Lock, Loader2, Play, TrendingUp, Flame, Trophy, BarChart2,
  BookOpen, Star, ChevronRight, Zap, Calendar, Target,
  Skull, RefreshCw, GraduationCap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import {
  API_BASE, MIN_REQUIRED, LEVEL_LABELS, LEVEL_COLORS, LANGUAGE_OPTIONS,
  ACHIEVEMENT_SPEC, SAGE_LESSON_MAP,
  formatTime, LevelProgress, HistorySession, StreakData, AchievementData, WeaknessEntry,
} from "./types";
import { getUserId } from "@/lib/userId";

function StreamingText({ endpoint, body, trigger }: {
  endpoint: string; body: object; trigger: boolean;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (!trigger || done.current) return;
    done.current = true;
    setLoading(true);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
          body: JSON.stringify(body),
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
  }, [trigger]);

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={13} className="animate-spin text-orange-400" /> Forge is analyzing…</div>;

  return (
    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="text-sm font-bold text-foreground mt-3 mb-1">{line.replace("## ", "")}</h3>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-foreground/90 mt-1.5">{line.replace(/\*\*/g, "")}</p>;
        if (line === "---") return <hr key={i} className="border-border/30 my-2" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export default function ProgressScreen({ onStart, onDaily, onBoss }: {
  onStart: (level: number, language: string) => void;
  onDaily: () => void;
  onBoss: (language: string) => void;
}) {
  const [progress, setProgress]       = useState<LevelProgress[]>([]);
  const [history, setHistory]         = useState<HistorySession[]>([]);
  const [streak, setStreak]           = useState<StreakData | null>(null);
  const [achievements, setAchievements] = useState<AchievementData[]>([]);
  const [weakness, setWeakness]       = useState<WeaknessEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedLang, setSelectedLang]   = useState("javascript");
  const [showBlindSpot, setShowBlindSpot] = useState(false);
  const [blindSpotOpen, setBlindSpotOpen] = useState(false);
  const [reviewSid, setReviewSid]     = useState<number | null>(null);
  const [reviewText, setReviewText]   = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [progRes, weakRes] = await Promise.all([
          fetch(`${API_BASE}/api/debug-test/progress`, { headers: { "x-user-id": getUserId() } }),
          fetch(`${API_BASE}/api/debug-test/weakness-report`, { headers: { "x-user-id": getUserId() } }),
        ]);
        if (progRes.ok) {
          const d = await progRes.json() as {
            progress: LevelProgress[]; recentSessions: HistorySession[];
            streak: StreakData | null; achievements: AchievementData[];
          };
          setProgress(d.progress ?? []);
          setHistory(d.recentSessions ?? []);
          setStreak(d.streak);
          setAchievements(d.achievements ?? []);

          const pm = Object.fromEntries((d.progress ?? []).map(p => [p.level, p]));
          let hi = 1;
          for (let l = 1; l <= 12; l++) {
            if (l === 1 || (pm[l - 1]?.qualifyingSessions ?? 0) >= MIN_REQUIRED) hi = l;
            if (!(pm[l]?.qualifyingSessions >= MIN_REQUIRED)) break;
          }
          setSelectedLevel(hi);
        }
        if (weakRes.ok) {
          const d = await weakRes.json() as { data: WeaknessEntry[] };
          setWeakness(d.data ?? []);
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const pm = Object.fromEntries(progress.map(p => [p.level, p]));
  const isUnlocked = (l: number) => l === 1 || (pm[l - 1]?.qualifyingSessions ?? 0) >= MIN_REQUIRED;
  const allComplete = Array.from({ length: 12 }, (_, i) => i + 1).every(l => (pm[l]?.qualifyingSessions ?? 0) >= MIN_REQUIRED);

  const levelHistory = history.filter(s => s.level === selectedLevel && s.completedAt);
  const best = levelHistory.length ? Math.min(...levelHistory.map(s => s.totalSeconds)) : null;

  const progressChartData = levelHistory.slice().reverse().map((s, i) => ({
    session: i + 1, accuracy: s.accuracyPct ?? 0, time: s.totalSeconds,
  }));

  const loadReview = async (sid: number) => {
    setReviewSid(sid);
    setReviewText("");
    setReviewLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/debug-test/review-mistakes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ sessionId: sid }),
      });
      if (!res.ok || !res.body) { setReviewLoading(false); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      setReviewLoading(false);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setReviewText(p => p + dec.decode(value, { stream: true }));
      }
    } finally { setReviewLoading(false); }
  };

  const topWeaknesses = weakness.filter(w => w.pct > 0).slice(0, 5);
  const missedBugTypes = [...new Set(topWeaknesses.filter(w => w.pct >= 40).map(w => w.bugType))];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={24} className="animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header + Streak */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Code Fix Test</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Timed tests that track improvement. 60% accuracy to qualify a session. Mistakes reviewed by Forge.</p>
        </div>
        {streak && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-orange-500/30 bg-orange-500/10">
            <Flame size={16} className="text-orange-400" />
            <div className="text-right">
              <p className="text-sm font-bold text-orange-300">{streak.currentStreak} day streak</p>
              <p className="text-[10px] text-muted-foreground">Best: {streak.longestStreak}</p>
            </div>
          </div>
        )}
      </div>

      {/* Daily Challenge card */}
      <div
        onClick={onDaily}
        className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-center gap-4 cursor-pointer hover:bg-yellow-500/10 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
          <Calendar size={18} className="text-yellow-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-yellow-300">Daily Challenge</p>
          <p className="text-xs text-muted-foreground">One challenge, every day, same for everyone — see how you rank.</p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground" />
      </div>

      {/* Boss challenge card (when all 12 done) */}
      {allComplete && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/10 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
            <Skull size={18} className="text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-300">Boss Challenge Unlocked</p>
            <p className="text-xs text-muted-foreground">A personalized final exam built from your historical weak spots. No mercy.</p>
          </div>
          <Button onClick={() => onBoss(selectedLang)} size="sm" className="bg-red-700 hover:bg-red-600 gap-1.5 font-bold shrink-0">
            <Skull size={12} /> Face the Boss
          </Button>
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Trophy size={11} /> Earned Achievements</p>
          <div className="flex flex-wrap gap-2">
            {achievements.map(a => {
              const spec = ACHIEVEMENT_SPEC[a.id];
              return (
                <div key={a.id} title={spec?.desc ?? ""} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/40 bg-muted/20 text-xs">
                  <span>{spec?.emoji ?? "⭐"}</span>
                  <span className="font-medium">{spec?.label ?? a.id}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Language selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Language:</span>
        {LANGUAGE_OPTIONS.map(l => (
          <button
            key={l.value}
            onClick={() => setSelectedLang(l.value)}
            className={cn("px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
              selectedLang === l.value ? "border-primary/60 bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:bg-muted/30"
            )}
          >{l.label}</button>
        ))}
      </div>

      {/* Level Grid */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Select a level — 60% accuracy required to qualify each session</p>
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(l => {
            const p = pm[l];
            const unlocked = isUnlocked(l);
            const qual = p?.qualifyingSessions ?? 0;
            const isSelected = l === selectedLevel;
            const color = LEVEL_COLORS[l] ?? "text-zinc-400";
            const complete = qual >= MIN_REQUIRED;

            return (
              <button key={l} disabled={!unlocked} onClick={() => setSelectedLevel(l)}
                className={cn("relative h-14 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5",
                  !unlocked ? "bg-muted/10 border-border/30 text-muted-foreground/30 cursor-not-allowed"
                    : isSelected ? "border-primary/60 bg-primary/10 text-primary"
                      : complete ? "border-green-500/40 bg-green-500/5 text-green-400"
                        : "border-border/40 bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                )}>
                {!unlocked ? <Lock size={10} /> : (
                  <>
                    <span className={isSelected ? "" : color}>{l}</span>
                    <span className="text-[9px] opacity-60">{qual}/{MIN_REQUIRED}</span>
                    {complete && <span className="text-[8px] text-green-400">✓</span>}
                  </>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Lock size={9} /> {MIN_REQUIRED} qualifying sessions (≥60%) unlock next level. Green = complete.</p>
      </div>

      {/* Selected Level Detail */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-lg font-bold", LEVEL_COLORS[selectedLevel])}>Level {selectedLevel}</span>
              <span className="text-muted-foreground">—</span>
              <span className="text-sm font-medium">{LEVEL_LABELS[selectedLevel]}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {pm[selectedLevel]?.qualifyingSessions ?? 0}/{MIN_REQUIRED} qualifying sessions
              {pm[selectedLevel] && ` · ${pm[selectedLevel]!.completedSessions} total attempts`}
            </p>
          </div>
          <Button onClick={() => onStart(selectedLevel, selectedLang)} disabled={!isUnlocked(selectedLevel)}
            className="gap-2 font-bold bg-orange-600 hover:bg-orange-500">
            <Play size={14} /> Start Test
          </Button>
        </div>

        {/* Progress chart */}
        {progressChartData.length >= 2 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingUp size={11} /> Accuracy over sessions at this level</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressChartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="session" tick={{ fontSize: 10, fill: "#888" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#888" }} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number, name: string) => [name === "accuracy" ? `${v}%` : formatTime(v), name === "accuracy" ? "Accuracy" : "Time"]}
                  />
                  <Line type="monotone" dataKey="accuracy" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Session history with review */}
        {levelHistory.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Session history</p>
            <div className="space-y-1.5">
              {levelHistory.slice(0, 6).map((s, i) => {
                const isBest = s.totalSeconds === best;
                return (
                  <div key={s.id} className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs",
                    isBest ? "border-green-500/30 bg-green-500/5" : "border-border/30 bg-muted/10"
                  )}>
                    <span className="text-muted-foreground w-14 shrink-0">{i === levelHistory.length - 1 ? "First" : `#${i + 1}`}{isBest ? " 🏆" : ""}</span>
                    <span className="font-mono font-bold w-14 shrink-0">{formatTime(s.totalSeconds)}</span>
                    <span className={cn("shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full", s.qualifies ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400")}>
                      {s.accuracyPct}% {s.qualifies ? "✓" : "✗"}
                    </span>
                    <span className="text-muted-foreground/60 flex-1">{s.correctCount}/{s.challengeCount} correct</span>
                    {s.correctCount < s.challengeCount && (
                      <button onClick={() => { setReviewSid(null); loadReview(s.id); }}
                        className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1">
                        <BookOpen size={9} /> Review
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {levelHistory.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No tests at this level yet. Start your first one!</p>
        )}
      </div>

      {/* Past session review panel */}
      {reviewSid !== null && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-950/10 p-4 space-y-3">
          <p className="text-sm font-bold text-orange-300 flex items-center gap-2"><BookOpen size={14} /> Forge Reviews Past Session</p>
          {reviewLoading
            ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={13} className="animate-spin" /> Loading…</div>
            : reviewText
              ? <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{reviewText}</div>
              : <p className="text-sm text-muted-foreground italic">No mistakes to review in that session.</p>
          }
        </div>
      )}

      {/* Weakness Tracker */}
      {topWeaknesses.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2"><Target size={14} className="text-red-400" /> Your Weak Spots</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topWeaknesses} margin={{ top: 4, right: 8, bottom: 20, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="bugType" tick={{ fontSize: 9, fill: "#888" }} angle={-20} textAnchor="end" interval={0} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#888" }} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [`${v}% error rate`]} />
                <Bar dataKey="pct" fill="#f97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sage lesson links */}
          {missedBugTypes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Suggested lessons for your weak spots:</p>
              {missedBugTypes.map(bt => (
                <Link key={bt} href="/sage"
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground">
                  <GraduationCap size={11} className="text-blue-400 shrink-0" />
                  <span>Ask Sage about: <strong className="text-foreground">{SAGE_LESSON_MAP[bt] ?? bt}</strong></span>
                  <ChevronRight size={10} className="ml-auto" />
                </Link>
              ))}
            </div>
          )}

          {/* Blind spot report */}
          <button onClick={() => { setBlindSpotOpen(v => !v); setShowBlindSpot(true); }}
            className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1.5 transition-colors">
            <Zap size={10} /> {blindSpotOpen ? "Hide" : "Get"} Forge blind spot analysis
          </button>

          {blindSpotOpen && (
            <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
              <StreamingText endpoint="/api/debug-test/blind-spot-report" body={{}} trigger={showBlindSpot} />
            </div>
          )}
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Star, color: "text-orange-400", bg: "bg-orange-500/10", title: "60% to Qualify", desc: "Sessions under 60% accuracy don't count toward level advancement. You have to actually learn, not just click through." },
          { icon: BarChart2, color: "text-blue-400", bg: "bg-blue-500/10", title: "Every Session Saved", desc: "Time, accuracy, and every wrong answer stored. See your improvement with actual numbers." },
          { icon: RefreshCw, color: "text-green-400", bg: "bg-green-500/10", title: "Forge Explains Mistakes", desc: "After each test, Forge reviews every wrong answer with the correct fix and the concept behind it." },
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
    </div>
  );
}
