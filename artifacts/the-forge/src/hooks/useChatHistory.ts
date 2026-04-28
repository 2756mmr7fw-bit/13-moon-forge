import { useState, useEffect, useCallback, useRef } from "react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts?: number;
}

export interface ChatSession {
  id: number;
  moonId: string;
  title: string | null;
  messages: ChatMessage[];
  updatedAt: string;
}

export function useChatHistory(moonId: string) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/chat-history/${moonId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled) { setSession(data); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [moonId]);

  const save = useCallback((messages: ChatMessage[]) => {
    if (!messages.length) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    // Debounce saves — wait 800ms of inactivity
    saveTimer.current = setTimeout(() => {
      fetch(`${API}/api/chat-history/${moonId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      })
        .then(r => r.json())
        .then(data => setSession(prev => prev
          ? { ...prev, messages, updatedAt: new Date().toISOString() }
          : { id: data.id, moonId, title: null, messages, updatedAt: new Date().toISOString() }
        ))
        .catch(() => {});
    }, 800);
  }, [moonId]);

  const clear = useCallback(() => {
    fetch(`${API}/api/chat-history/${moonId}`, { method: "DELETE" }).catch(() => {});
    setSession(null);
  }, [moonId]);

  return { session, loaded, save, clear };
}
