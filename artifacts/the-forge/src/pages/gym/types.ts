export const GYM_API = import.meta.env.BASE_URL.replace(/\/$/, "");

export type Tier     = 1 | 2 | 3 | 4;
export type Category = "arrays" | "strings" | "objects" | "functions" | "algorithms" | "async";
export type LearningStyle = "visual" | "hands-on" | "conceptual" | "pattern";

export interface TestCase {
  args:      unknown[];
  expected:  unknown;
  label:     string;
  hidden?:   boolean;
}

export interface Exercise {
  id:               string;
  tier:             Tier;
  category:         Category;
  title:            string;
  tagline:          string;         // one-line hook
  description:      string;         // plain text, what to build
  why:              string;         // why this matters in real code
  analogy?:         string;         // for visual/pattern learners
  examples:         { input: string; output: string; note?: string }[];
  starterCode:      string;
  functionName:     string;
  testCases:        TestCase[];
  solution:         string;
  solutionExplanation: string;
  hints:            string[];
  tags:             string[];
  estimatedMinutes: number;
}

export interface TestResult {
  label:    string;
  passed:   boolean;
  actual?:  unknown;
  expected: unknown;
  error?:   string;
  hidden?:  boolean;
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

export const STYLE_META: Record<LearningStyle, { label: string; color: string; border: string; bg: string; description: string; tip: string }> = {
  "visual": {
    label: "Visual Learner",
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    description: "You think in shapes, patterns, and pictures. You process examples before reading the rules.",
    tip: "Look at the examples first. Build a mental picture of input → output before touching the code.",
  },
  "hands-on": {
    label: "Hands-On Builder",
    color: "text-orange-400",
    border: "border-orange-500/30",
    bg: "bg-orange-500/5",
    description: "You learn by doing. You start coding fast, run it often, and iterate your way to the answer.",
    tip: "Your instinct is right — run it early and often. Use the failing test output to guide you.",
  },
  "conceptual": {
    label: "Conceptual Thinker",
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    description: "You read the problem carefully, think before coding, and rarely need more than one or two tries.",
    tip: "Trust your pre-thinking. Pseudocode before code — write the logic in plain English first.",
  },
  "pattern": {
    label: "Pattern Matcher",
    color: "text-green-400",
    border: "border-green-500/30",
    bg: "bg-green-500/5",
    description: "Once you've seen the shape of a problem, you transfer that knowledge rapidly to new variations.",
    tip: "Categorize the problem type before solving it. Ask: 'What pattern is this?'",
  },
};

export const TIER_META: Record<Tier, { label: string; color: string; description: string }> = {
  1: { label: "Tier 1",    color: "text-green-400",  description: "Foundations — every developer should do these cold" },
  2: { label: "Tier 2",    color: "text-blue-400",   description: "Patterns — what seniors do without thinking" },
  3: { label: "Tier 3",    color: "text-orange-400", description: "Real-world — production code patterns" },
  4: { label: "Tier 4",    color: "text-red-400",    description: "Algorithms — interview-level, practical wrapping" },
};

export const CATEGORY_LABELS: Record<Category, string> = {
  arrays:     "Arrays",
  strings:    "Strings",
  objects:    "Objects",
  functions:  "Functions",
  algorithms: "Algorithms",
  async:      "Async",
};
