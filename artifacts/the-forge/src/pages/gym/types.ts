export const GYM_API = import.meta.env.BASE_URL.replace(/\/$/, "");

export type Tier     = 1 | 2 | 3 | 4;
export type Category =
  | "arrays" | "strings" | "objects" | "functions"
  | "algorithms" | "async" | "data-structures"
  | "functional" | "regex" | "testing"
  | "trees" | "graphs" | "dynamic-programming" | "bit-manipulation"
  | "auth";

export type LearningStyle = "visual" | "hands-on" | "conceptual" | "pattern";
export type ExerciseFormat = "solve" | "write-tests";

export interface TestCase {
  args:      unknown[];
  expected:  unknown;
  label:     string;
  hidden?:   boolean;
}

// ── Standard solve-it exercise ───────────────────────────────────────────────
export interface Exercise {
  id:                  string;
  format?:             "solve";
  tier:                Tier;
  category:            Category;
  title:               string;
  tagline:             string;
  description:         string;
  why:                 string;
  analogy?:            string;
  examples:            { input: string; output: string; note?: string }[];
  starterCode:         string;
  functionName:        string;
  testCases:           TestCase[];
  solution:            string;
  solutionExplanation: string;
  hints:               string[];
  tags:                string[];
  estimatedMinutes:    number;
}

// ── "Write the Tests" exercise ───────────────────────────────────────────────
export interface BrokenImpl {
  label:  string;
  code:   string;
}

export interface TestWritingExercise {
  id:                string;
  format:            "write-tests";
  tier:              Tier;
  category:          "testing";
  title:             string;
  tagline:           string;
  description:       string;
  why:               string;
  functionSignature: string;
  correctImpl:       string;
  brokenImpls:       BrokenImpl[];
  starterCode:       string;
  examples:          { input: string; output: string; note?: string }[];
  hints:             string[];
  tags:              string[];
  estimatedMinutes:  number;
}

export type AnyExercise = Exercise | TestWritingExercise;

// ── Test result types ────────────────────────────────────────────────────────
export interface TestResult {
  label:    string;
  passed:   boolean;
  actual?:  unknown;
  expected: unknown;
  error?:   string;
  hidden?:  boolean;
}

export interface StudentTestCase {
  args:     unknown[];
  expected: unknown;
}

export interface BrokenImplResult {
  label:        string;
  caught:       boolean;
  failingTest?: StudentTestCase;
}

export interface TestWritingResult {
  studentTests:    StudentTestCase[];
  correctAllPass:  boolean;
  correctResults:  { passed: boolean; actual: unknown; expected: unknown; error?: string }[];
  brokenResults:   BrokenImplResult[];
  allBrokenCaught: boolean;
  passed:          boolean;
  parseError?:     string;
}

export interface AttemptSignals {
  timeToFirstEditMs?: number;
  runsBeforePass:     number;
  timeTakenMs:        number;
  hintsUsed:          number;
  viewedSolution:     boolean;
  testsPassed:        number;
  testsTotal:         number;
}

export interface LearningProfileData {
  dominantStyle?:    LearningStyle;
  visualScore:       number;
  handsOnScore:      number;
  conceptualScore:   number;
  patternScore:      number;
  totalAttempts:     number;
  strongestCategory?: Category;
  weakestCategory?:  Category;
}

// ── Display metadata ─────────────────────────────────────────────────────────
export const STYLE_META: Record<LearningStyle, {
  label: string; color: string; border: string; bg: string;
  description: string; tip: string;
}> = {
  "visual": {
    label: "Visual Learner",
    color: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/5",
    description: "You think in shapes, patterns, and pictures. You process examples before reading the rules.",
    tip: "Look at the examples first. Build a mental picture of input → output before touching the code.",
  },
  "hands-on": {
    label: "Hands-On Builder",
    color: "text-orange-400", border: "border-orange-500/30", bg: "bg-orange-500/5",
    description: "You learn by doing. You start coding fast, run it often, and iterate your way to the answer.",
    tip: "Your instinct is right — run it early and often. Use the failing test output to guide you.",
  },
  "conceptual": {
    label: "Conceptual Thinker",
    color: "text-blue-400", border: "border-blue-500/30", bg: "bg-blue-500/5",
    description: "You read the problem carefully, think before coding, and rarely need more than one or two tries.",
    tip: "Trust your pre-thinking. Pseudocode before code — write the logic in plain English first.",
  },
  "pattern": {
    label: "Pattern Matcher",
    color: "text-green-400", border: "border-green-500/30", bg: "bg-green-500/5",
    description: "Once you've seen the shape of a problem, you transfer that knowledge rapidly to new variations.",
    tip: "Categorize the problem type before solving it. Ask: 'What pattern is this?'",
  },
};

export const TIER_META: Record<Tier, { label: string; color: string; description: string }> = {
  1: { label: "Tier 1", color: "text-green-400",  description: "Foundations — every developer should do these cold" },
  2: { label: "Tier 2", color: "text-blue-400",   description: "Patterns — what seniors do without thinking" },
  3: { label: "Tier 3", color: "text-orange-400", description: "Real-world — production code patterns" },
  4: { label: "Tier 4", color: "text-red-400",    description: "Algorithms — interview-level, practical wrapping" },
};

export const CATEGORY_LABELS: Record<Category, string> = {
  arrays:                 "Arrays",
  strings:                "Strings",
  objects:                "Objects",
  functions:              "Functions",
  algorithms:             "Algorithms",
  async:                  "Async",
  "data-structures":      "Data Structures",
  functional:             "Functional",
  regex:                  "Regex",
  testing:                "Write Tests",
  trees:                  "Trees",
  graphs:                 "Graphs",
  "dynamic-programming":  "Dynamic Programming",
  "bit-manipulation":     "Bit Manipulation",
  auth:                   "Auth & Security",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  arrays:                 "text-blue-400",
  strings:                "text-green-400",
  objects:                "text-yellow-400",
  functions:              "text-orange-400",
  algorithms:             "text-red-400",
  async:                  "text-purple-400",
  "data-structures":      "text-cyan-400",
  functional:             "text-pink-400",
  regex:                  "text-lime-400",
  testing:                "text-amber-400",
  trees:                  "text-emerald-400",
  graphs:                 "text-teal-400",
  "dynamic-programming":  "text-violet-400",
  "bit-manipulation":     "text-rose-400",
  auth:                   "text-indigo-400",
};

// ── CS Curriculum Tracks ─────────────────────────────────────────────────────
export interface CurriculumTrack {
  id:         string;
  title:      string;
  subtitle:   string;
  forge:      string;
  categories: Category[];
  color:      string;
  border:     string;
  bg:         string;
}

export const CURRICULUM_TRACKS: CurriculumTrack[] = [
  {
    id: "linear",
    title: "Linear Data Structures",
    subtitle: "CS 201 — Data Structures I",
    forge: "How data is stored and accessed in sequence",
    categories: ["arrays", "strings", "data-structures"],
    color: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-500/5",
  },
  {
    id: "trees-graphs",
    title: "Trees & Graphs",
    subtitle: "CS 202 — Data Structures II",
    forge: "Non-linear structures that model the real world",
    categories: ["trees", "graphs"],
    color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/5",
  },
  {
    id: "logic",
    title: "Algorithms & Sorting",
    subtitle: "CS 301 — Algorithm Design",
    forge: "The patterns that solve 90% of hard problems",
    categories: ["algorithms"],
    color: "text-red-400", border: "border-red-500/30", bg: "bg-red-500/5",
  },
  {
    id: "dp",
    title: "Dynamic Programming",
    subtitle: "CS 401 — Advanced Algorithms",
    forge: "Turning exponential problems into polynomial ones by remembering what you've already solved",
    categories: ["dynamic-programming"],
    color: "text-violet-400", border: "border-violet-500/30", bg: "bg-violet-500/5",
  },
  {
    id: "fp",
    title: "Functional Programming",
    subtitle: "CS 350 — Programming Paradigms",
    forge: "How to compose programs from small, pure pieces",
    categories: ["functional", "functions"],
    color: "text-pink-400", border: "border-pink-500/30", bg: "bg-pink-500/5",
  },
  {
    id: "async-track",
    title: "Concurrency & Async",
    subtitle: "CS 410 — Operating Systems",
    forge: "How to handle time, waiting, and multiple things at once",
    categories: ["async"],
    color: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/5",
  },
  {
    id: "patterns",
    title: "Code Patterns & Objects",
    subtitle: "CS 340 — Object-Oriented Design",
    forge: "Reusable patterns for building reliable systems",
    categories: ["objects"],
    color: "text-yellow-400", border: "border-yellow-500/30", bg: "bg-yellow-500/5",
  },
  {
    id: "strings-regex",
    title: "Strings & Pattern Matching",
    subtitle: "CS 311 — Theory of Computation (made practical)",
    forge: "Text manipulation and regular expressions — the ones college never made you actually use",
    categories: ["strings", "regex"],
    color: "text-green-400", border: "border-green-500/30", bg: "bg-green-500/5",
  },
  {
    id: "bit-track",
    title: "Bit Manipulation",
    subtitle: "CS 211 — Computer Organization",
    forge: "Working directly with binary — the layer beneath every integer operation",
    categories: ["bit-manipulation"],
    color: "text-rose-400", border: "border-rose-500/30", bg: "bg-rose-500/5",
  },
  {
    id: "testing-track",
    title: "Software Testing",
    subtitle: "— (College skipped this entirely) —",
    forge: "Write tests, catch bugs before they ship. The skill colleges never teach.",
    categories: ["testing"],
    color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/5",
  },
  {
    id: "auth-track",
    title: "Authentication & Security",
    subtitle: "— (The gap every developer has until they get burned) —",
    forge: "Build what Clerk, Auth0, and every SSO company sell — from scratch. Passwords, tokens, sessions, OAuth, permissions.",
    categories: ["auth"],
    color: "text-indigo-400", border: "border-indigo-500/30", bg: "bg-indigo-500/5",
  },
];
