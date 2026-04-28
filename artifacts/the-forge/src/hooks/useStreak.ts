import { useState, useEffect } from "react";

const LAST_VISIT_KEY = "forge:last_visit";
const STREAK_KEY     = "forge:streak";
const LAST_MOON_KEY  = "forge:last_moon";

export interface StreakData {
  streak: number;
  lastVisit: Date | null;
  daysSinceLast: number;
  lastMoon: { id: string; label: string; href: string } | null;
}

export function useStreak(): StreakData {
  const [data, setData] = useState<StreakData>({
    streak: 0,
    lastVisit: null,
    daysSinceLast: 0,
    lastMoon: null,
  });

  useEffect(() => {
    try {
      const now = new Date();
      const today = now.toDateString();

      const lastVisitStr = localStorage.getItem(LAST_VISIT_KEY);
      const lastVisit = lastVisitStr ? new Date(lastVisitStr) : null;
      const storedStreak = parseInt(localStorage.getItem(STREAK_KEY) ?? "0", 10);
      const lastMoonRaw = localStorage.getItem(LAST_MOON_KEY);
      const lastMoon = lastMoonRaw ? JSON.parse(lastMoonRaw) : null;

      let streak = storedStreak;
      let daysSinceLast = 0;

      if (lastVisit) {
        const diffMs = now.getTime() - lastVisit.getTime();
        daysSinceLast = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (daysSinceLast === 0) {
          // same day, keep streak
        } else if (daysSinceLast === 1) {
          streak += 1;
        } else {
          streak = 1; // broken streak
        }
      } else {
        streak = 1;
      }

      if (!lastVisitStr || new Date(lastVisitStr).toDateString() !== today) {
        localStorage.setItem(LAST_VISIT_KEY, now.toISOString());
        localStorage.setItem(STREAK_KEY, String(streak));
      }

      setData({ streak, lastVisit, daysSinceLast, lastMoon });
    } catch { /* silent */ }
  }, []);

  return data;
}

export function recordMoonVisit(id: string, label: string, href: string) {
  try {
    localStorage.setItem(LAST_MOON_KEY, JSON.stringify({ id, label, href }));
  } catch { /* silent */ }
}
