import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle, X, Send, Loader2, Bot, User, RotateCcw, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

const SUGGESTED = [
  "How do I move my Replit app here?",
  "Why is my deploy stuck?",
  "Where do I find my env vars?",
  "What is The Vault?",
  "How does auto-deploy work?",
];

function uid() { return Math.random().toString(36).slice(2); }

export function HelpChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { id: uid(), role: "user", content: text.trim() };
    const assistantId = uid();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", loading: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_BASE}/api/help/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: "Something went wrong. Try again.", loading: false } : m
        ));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6)) as { type: string; text?: string };
            if (ev.type === "chunk" && ev.text) {
              accumulated += ev.text;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: accumulated, loading: false } : m
              ));
            } else if (ev.type === "done") {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, loading: false } : m
              ));
            }
          } catch { /* skip malformed */ }
        }
      }

      if (!open) setUnread(n => n + 1);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: "Connection lost. Try again.", loading: false } : m
        ));
      }
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, open]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setStreaming(false);
    setInput("");
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-13 h-13 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
          "bg-primary text-primary-foreground hover:scale-105 active:scale-95",
          open && "rotate-12"
        )}
        style={{ width: 52, height: 52 }}
        aria-label="Open help chat"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: 480 }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Forge Guide</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Ask anything about The Forge</p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={reset} title="Clear chat" className="p-1.5 rounded hover:bg-muted transition-colors">
                  <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-muted transition-colors">
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2.5 text-sm leading-relaxed">
                    Hey — I'm Forge Guide. I know everything about moving your apps here, setting up auto-deploy, and using The Vault. What do you need?
                  </div>
                </div>
                <div className="space-y-2 pl-10">
                  {SUGGESTED.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full text-left text-xs px-3 py-2 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={cn("flex gap-2.5", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    msg.role === "user" ? "bg-primary/20" : "bg-primary/15"
                  )}>
                    {msg.role === "user"
                      ? <User className="w-3.5 h-3.5 text-primary" />
                      : <Bot className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <div className={cn(
                    "max-w-[78%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  )}>
                    {msg.loading && !msg.content ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
                      </span>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-border shrink-0 bg-card">
            <div className="flex items-end gap-2 bg-muted rounded-xl px-3 py-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={streaming}
                placeholder="Ask anything…"
                rows={1}
                className="flex-1 bg-transparent resize-none text-sm leading-relaxed focus:outline-none placeholder:text-muted-foreground/60 max-h-28 min-h-[1.5rem]"
                style={{ scrollbarWidth: "none" }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || streaming}
                className={cn(
                  "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                  input.trim() && !streaming
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-muted-foreground/20 text-muted-foreground cursor-not-allowed"
                )}
              >
                {streaming
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      )}
    </>
  );
}
