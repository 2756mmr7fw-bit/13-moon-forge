import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Message {
  role: "ai" | "user";
  text: string;
  loading?: boolean;
}

const WELCOME: Message = {
  role: "ai",
  text: "I'm your AI co-director. I can analyze pacing, suggest cuts, help with structure, write scratch voiceover, or talk through your edit. What are we working on?",
};

export default function AiPanel({ projectId }: { projectId?: number }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: Message = { role: "user", text };
    const aiMsg: Message = { role: "ai", text: "", loading: true };
    setMessages(prev => [...prev, userMsg, aiMsg]);
    setStreaming(true);

    try {
      const res = await fetch(`${API_BASE}/api/film/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, projectId }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") break;
            try {
              const { text: t } = JSON.parse(raw);
              if (t) {
                accumulated += t;
                setMessages(prev => {
                  const next = [...prev];
                  next[next.length - 1] = { role: "ai", text: accumulated, loading: false };
                  return next;
                });
              }
            } catch { /* skip malformed */ }
          }
        }
      }
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "ai", text: "Something went wrong. Try again.", loading: false };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c]">
      <div className="h-10 shrink-0 border-b border-white/10 flex items-center px-4 gap-2 bg-black/40">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-medium text-white/90 text-sm tracking-wide">AI Co-Director</span>
        {streaming && <Loader2 className="w-3 h-3 text-primary/60 animate-spin ml-auto" />}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
              msg.role === "user"
                ? "bg-primary/20 text-primary-foreground border border-primary/20"
                : "bg-white/5 text-white/80 border border-white/10"
            }`}>
              {msg.loading ? (
                <span className="flex items-center gap-1 text-white/40">
                  <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
                </span>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 shrink-0 border-t border-white/10 bg-black/20">
        <form onSubmit={handleSubmit} className="relative">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask the co-director…"
            disabled={streaming}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-10 focus-visible:ring-primary/50 text-sm"
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            disabled={streaming || !input.trim()}
            className="absolute right-1 top-1 h-7 w-7 text-white/50 hover:text-white hover:bg-white/10"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
