import { useState } from "react";
import { Loader2 } from "lucide-react";
import { getUserId } from "@/lib/userId";
import { API_BASE, Challenge, SessionResult } from "./code-fix-test/types";
import ProgressScreen from "./code-fix-test/ProgressScreen";
import TestScreen     from "./code-fix-test/TestScreen";
import ResultsScreen  from "./code-fix-test/ResultsScreen";
import DailyChallenge from "./code-fix-test/DailyChallenge";

type Screen = "progress" | "loading" | "test" | "results" | "daily";

export default function CodeFixTest() {
  const [screen, setScreen]         = useState<Screen>("progress");
  const [level, setLevel]           = useState(1);
  const [mode, setMode]             = useState("level");
  const [language, setLanguage]     = useState("javascript");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [results, setResults]       = useState<SessionResult[]>([]);
  const [totalSeconds, setTotalSeconds]   = useState(0);
  const [pausedSeconds, setPausedSeconds] = useState(0);
  const [loadError, setLoadError]   = useState("");

  const fetchChallenges = async (endpoint: string, body: object) => {
    setScreen("loading");
    setLoadError("");
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { challenges?: Challenge[]; error?: string };
      if (!res.ok || data.error || !data.challenges?.length) {
        setLoadError(data.error ?? "Failed to generate test.");
        setScreen("progress");
      } else {
        setChallenges(data.challenges);
        setScreen("test");
      }
    } catch {
      setLoadError("Connection error. Try again.");
      setScreen("progress");
    }
  };

  const startLevel = (lvl: number, lang: string) => {
    setLevel(lvl); setMode("level"); setLanguage(lang);
    void fetchChallenges("/api/debug-test/generate", { level: lvl, language: lang });
  };

  const startBoss = (lang: string) => {
    setLevel(0); setMode("boss"); setLanguage(lang);
    void fetchChallenges("/api/debug-test/boss-challenge/generate", { language: lang });
  };

  const handleComplete = (r: SessionResult[], secs: number, paused: number) => {
    setResults(r);
    setTotalSeconds(secs);
    setPausedSeconds(paused);
    setScreen("results");
  };

  if (screen === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={28} className="animate-spin text-orange-400" />
        <p className="text-sm text-muted-foreground">
          {mode === "boss" ? "Forging your personalized boss challenge…" : `Generating Level ${level} test…`}
        </p>
        {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      </div>
    );
  }

  if (screen === "daily") {
    return <DailyChallenge onBack={() => setScreen("progress")} />;
  }

  if (screen === "test") {
    return (
      <TestScreen
        level={level}
        challenges={challenges}
        mode={mode}
        language={language}
        onComplete={handleComplete}
      />
    );
  }

  if (screen === "results") {
    return (
      <ResultsScreen
        level={level}
        mode={mode}
        language={language}
        results={results}
        totalSeconds={totalSeconds}
        pausedSeconds={pausedSeconds}
        onRetake={() => {
          if (mode === "boss") startBoss(language);
          else startLevel(level, language);
        }}
        onBack={() => setScreen("progress")}
      />
    );
  }

  return (
    <ProgressScreen
      onStart={startLevel}
      onDaily={() => setScreen("daily")}
      onBoss={startBoss}
    />
  );
}
