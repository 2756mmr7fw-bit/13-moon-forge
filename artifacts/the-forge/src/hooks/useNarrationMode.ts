import { useState, useEffect } from "react";

const KEY = "13moonforge_narration_mode";

export function useNarrationMode() {
  const [narrationOn, setNarrationOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, narrationOn ? "true" : "false");
    } catch { /* silent */ }
  }, [narrationOn]);

  const toggle = () => setNarrationOn(v => !v);
  const enable = () => setNarrationOn(true);

  return { narrationOn, toggle, enable };
}
