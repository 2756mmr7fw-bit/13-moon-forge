import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface SavedPrompt {
  id: number;
  userId: string;
  title: string;
  prompt: string;
  moonId: string | null;
  tags: string[];
  createdAt: string;
}

export function useSavedPrompts() {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/prompts`)
      .then(r => r.ok ? r.json() : [])
      .then(setPrompts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (title: string, prompt: string, moonId?: string) => {
    const res = await fetch(`${API}/api/prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, prompt, moonId: moonId ?? null }),
    });
    if (res.ok) {
      const created = await res.json() as SavedPrompt;
      setPrompts(prev => [created, ...prev]);
      return created;
    }
    return null;
  }, []);

  const remove = useCallback(async (id: number) => {
    await fetch(`${API}/api/prompts/${id}`, { method: "DELETE" });
    setPrompts(prev => prev.filter(p => p.id !== id));
  }, []);

  return { prompts, loading, save, remove };
}
