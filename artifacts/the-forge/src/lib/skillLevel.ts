export type SkillLevel = "absolute-beginner" | "beginner" | "novice" | "intermediate" | "pro";

export interface SkillLevelMeta {
  id: SkillLevel;
  label: string;
  emoji: string;
  tagline: string;
  color: string;
}

export const SKILL_LEVELS: SkillLevelMeta[] = [
  {
    id: "absolute-beginner",
    label: "Just Starting",
    emoji: "🌱",
    tagline: "Never written code before — or very new to tech",
    color: "text-emerald-400",
  },
  {
    id: "beginner",
    label: "Beginner",
    emoji: "🔦",
    tagline: "Learning the basics, building confidence",
    color: "text-sky-400",
  },
  {
    id: "novice",
    label: "Novice",
    emoji: "⚡",
    tagline: "Understands fundamentals, starting to build things",
    color: "text-yellow-400",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    emoji: "🔧",
    tagline: "Comfortable coding, knows the patterns",
    color: "text-orange-400",
  },
  {
    id: "pro",
    label: "Pro",
    emoji: "🔥",
    tagline: "Expert — just give me the code",
    color: "text-red-400",
  },
];

const KEY = "13moonforge_skill_level";

export function getSkillLevel(): SkillLevel {
  return (localStorage.getItem(KEY) as SkillLevel) ?? "novice";
}

export function setSkillLevel(level: SkillLevel): void {
  localStorage.setItem(KEY, level);
  window.dispatchEvent(new CustomEvent("skillLevelChanged", { detail: level }));
}

export function getSkillMeta(level?: SkillLevel): SkillLevelMeta {
  return SKILL_LEVELS.find(s => s.id === (level ?? getSkillLevel())) ?? SKILL_LEVELS[2];
}
