export const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
export const MIN_REQUIRED      = 3;
export const MIN_ACCURACY      = 0.6;   // 60% to qualify a session
export const HINT_PENALTY      = 30;    // seconds added for using a hint

export const LEVEL_LABELS: Record<number, string> = {
  1: "HTML Basics",   2: "CSS Basics",     3: "JS Syntax",    4: "JS Variables",
  5: "JS Logic",      6: "JS Scope",       7: "Async/Await",  8: "Array Methods",
  9: "API Handling",  10: "this Binding",  11: "Security",    12: "Architecture",
};

export const LEVEL_COLORS: Record<number, string> = {
  1: "text-green-400",  2: "text-green-400",
  3: "text-lime-400",   4: "text-lime-400",
  5: "text-yellow-400", 6: "text-yellow-400",
  7: "text-orange-400", 8: "text-orange-400",
  9: "text-red-400",    10: "text-red-400",
  11: "text-purple-400", 12: "text-fuchsia-400",
};

export const LANGUAGE_OPTIONS = [
  { value: "javascript", label: "JavaScript", monacoLang: "javascript" },
  { value: "typescript", label: "TypeScript",  monacoLang: "typescript" },
  { value: "python",     label: "Python",      monacoLang: "python"     },
  { value: "sql",        label: "SQL",         monacoLang: "sql"        },
];

export const SAGE_LESSON_MAP: Record<string, string> = {
  "Async Bug":        "JavaScript async/await and Promises",
  "Scope Bug":        "JavaScript variable scope, closures, and the event loop",
  "Syntax Error":     "JavaScript syntax fundamentals",
  "Logic Error":      "Boolean logic, comparison operators, and conditionals",
  "Type Error":       "JavaScript types, coercion, and TypeScript basics",
  "Security Flaw":    "Web security — SQL injection, XSS, and secrets management",
  "Performance Bug":  "Algorithm complexity, Big O notation, and query optimization",
  "Runtime Error":    "Error handling, try/catch, and defensive programming",
};

export const ACHIEVEMENT_SPEC: Record<string, { label: string; desc: string; emoji: string }> = {
  first_test:    { label: "First Blood",       desc: "Completed your first Code Fix Test.",                 emoji: "⚡" },
  perfect_score: { label: "Flawless",          desc: "100% accuracy in a single session.",                  emoji: "✨" },
  speed_demon:   { label: "Speed Demon",       desc: "Finished a full test in under 90 seconds.",           emoji: "🔥" },
  no_hints:      { label: "No Lifelines",      desc: "Completed a session without using any hints.",        emoji: "🧠" },
  streak_3:      { label: "On a Roll",         desc: "3-day testing streak.",                               emoji: "🔁" },
  streak_7:      { label: "Week Warrior",      desc: "7-day testing streak.",                               emoji: "📅" },
  streak_30:     { label: "Iron Habit",        desc: "30-day testing streak.",                              emoji: "🏆" },
  iron_coder:    { label: "Iron Coder",        desc: "Completed all 12 levels.",                           emoji: "⚔️" },
  boss_slayer:   { label: "Boss Slayer",       desc: "Survived the personalized boss challenge.",           emoji: "💀" },
  comeback_kid:  { label: "Comeback Kid",      desc: "Got a perfect score after failing a level badly.",    emoji: "🔄" },
  daily_first:   { label: "Daily Devotion",    desc: "Completed your first daily challenge.",               emoji: "☀️" },
  teach_master:  { label: "Teach the Teacher", desc: "Explained a mistake perfectly back to Forge.",       emoji: "📖" },
};

export interface Challenge {
  description:    string;
  brokenCode:     string;
  bugType:        string;
  challengeLevel: number;
  language:       string;
}

export interface SessionResult {
  challengeLevel: number;
  bugType:        string;
  language:       string;
  correct:        boolean;
  secondsTaken:   number;
  hintUsed:       boolean;
  rating:         number | null;
  description:    string;
  brokenCode:     string;
  userFix:        string;
  explanation:    string;
}

export interface HistorySession {
  id:             number;
  level:          number;
  mode:           string;
  language:       string;
  completedAt:    string;
  totalSeconds:   number;
  pausedSeconds:  number;
  challengeCount: number;
  correctCount:   number;
  accuracyPct:    number;
  qualifies:      boolean;
}

export interface LevelProgress {
  level:               number;
  completedSessions:   number;
  qualifyingSessions:  number;
  bestTotalSeconds:    number | null;
}

export interface StreakData {
  currentStreak:  number;
  longestStreak:  number;
  lastActiveDate: string | null;
}

export interface AchievementData {
  id:       string;
  label:    string;
  desc:     string;
  emoji:    string;
  earnedAt: string;
}

export interface WeaknessEntry {
  bugType:  string;
  total:    number;
  wrong:    number;
  pct:      number;
}

export interface DailyChallenge {
  challengeDate: string;
  language:      string;
  bugType:       string;
  challengeData: { description: string; brokenCode: string };
  alreadyDone:   boolean;
}

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
