export const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type DrillType = "trace" | "dry-run" | "sql" | "big-o" | "type-fixer" | "api" | "git" | "log";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner:     "Beginner",
  intermediate: "Intermediate",
  advanced:     "Advanced",
};

export const BIG_O_OPTIONS = [
  "O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(n³)", "O(2ⁿ)",
] as const;

export interface DrillMeta {
  label:      string;
  short:      string;   // one-line description
  why:        string;   // why this skill matters / use it or lose it
  color:      string;   // tailwind text color
  border:     string;
  bg:         string;
  route:      string;
}

export const DRILL_META: Record<DrillType, DrillMeta> = {
  "trace": {
    label:  "Read the Trace",
    short:  "Parse stack traces — find the root error, file, and line fast.",
    why:    "Most developers see a wall of red text and freeze. This drill builds the reflex to read a stack trace top-down and land on the exact line within seconds.",
    color:  "text-red-400",
    border: "border-red-500/30",
    bg:     "bg-red-500/5",
    route:  "/trace-reader",
  },
  "dry-run": {
    label:  "Dry Run",
    short:  "Execute code in your head — no running it allowed.",
    why:    "Developers who can't dry-run code spray console.logs until something clicks. This drill builds the mental model that separates fast debuggers from everyone else.",
    color:  "text-blue-400",
    border: "border-blue-500/30",
    bg:     "bg-blue-500/5",
    route:  "/dry-run",
  },
  "sql": {
    label:  "SQL Builder",
    short:  "Write SQL from a schema and a plain-English requirement.",
    why:    "Bad SQL compounds forever — every slow query, every missing index, every N+1 is a bill you pay forever. JOINs, subqueries, and window functions are pattern recognition that only comes from reps.",
    color:  "text-cyan-400",
    border: "border-cyan-500/30",
    bg:     "bg-cyan-500/5",
    route:  "/sql-drill",
  },
  "big-o": {
    label:  "Big O Spotter",
    short:  "Look at a function and name its time and space complexity.",
    why:    "Most developers can't estimate the complexity of their own code. This drill builds the intuition that turns O(n²) into O(n) before it hits production.",
    color:  "text-yellow-400",
    border: "border-yellow-500/30",
    bg:     "bg-yellow-500/5",
    route:  "/big-o",
  },
  "type-fixer": {
    label:  "Type Fixer",
    short:  "Fix TypeScript type errors — generics, unions, inference.",
    why:    "TypeScript is a language within a language. People fight it daily instead of using it. This drill builds the fluency that makes the type system a tool, not an obstacle.",
    color:  "text-purple-400",
    border: "border-purple-500/30",
    bg:     "bg-purple-500/5",
    route:  "/type-fixer",
  },
  "api": {
    label:  "API Architect",
    short:  "Design REST endpoints: method, path, body, status codes.",
    why:    "Bad API design gets baked in and multiplied across every client forever. REST conventions are learnable patterns — but only with deliberate practice.",
    color:  "text-green-400",
    border: "border-green-500/30",
    bg:     "bg-green-500/5",
    route:  "/api-architect",
  },
  "git": {
    label:  "Git Unstuck",
    short:  "Fix git scenarios — wrong branch, merge conflicts, lost commits.",
    why:    "Developers only touch the hard git operations during a crisis. This drill turns panicked googling into muscle memory before it matters.",
    color:  "text-orange-400",
    border: "border-orange-500/30",
    bg:     "bg-orange-500/5",
    route:  "/git-drill",
  },
  "log": {
    label:  "Log Reader",
    short:  "Parse application logs — find root causes, count affected requests.",
    why:    "Logs are the first thing you read in production and the last thing anyone practices reading. This drill builds the pattern recognition that finds problems in seconds instead of hours.",
    color:  "text-pink-400",
    border: "border-pink-500/30",
    bg:     "bg-pink-500/5",
    route:  "/log-reader",
  },
};

export const DRILL_ORDER: DrillType[] = ["trace", "dry-run", "sql", "big-o", "type-fixer", "api", "git", "log"];

export interface DrillProgress {
  total:    number;
  correct:  number;
  today:    number;
  lastSeen: string | null;
}

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function accuracyColor(pct: number) {
  if (pct >= 80) return "text-green-400";
  if (pct >= 60) return "text-yellow-400";
  return "text-red-400";
}
