import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const FLINT_INTRO: Message = {
  role: "assistant",
  content: `The spark is ready.\n\nTell me the idea — even if it's half-formed. Especially if it's half-formed. That's when I do my best work.\n\nWhat are you thinking about?`,
};

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Brainstorm() {
  const [messages, setMessages] = useState<Message[]>([FLINT_INTRO]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const history = [...messages.filter(m => !m.streaming), userMsg];
    setMessages([...history, { role: "assistant", content: "", streaming: true }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/flint/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "chunk") {
              accumulated += parsed.content;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: accumulated, streaming: true };
                return next;
              });
            } else if (parsed.type === "done") {
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: accumulated };
                return next;
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: "The spark flickered. Try again." };
        return next;
      });
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const reset = () => {
    setMessages([FLINT_INTRO]);
    setInput("");
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[900px]">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg"
              style={{ boxShadow: "0 0 20px rgba(251, 191, 36, 0.35)" }}>
              <Sparkles size={22} className="text-black" />
            </div>
            <span className="absolute -bottom-1 -right-1 text-[10px] font-black bg-amber-400 text-black rounded-full w-5 h-5 flex items-center justify-center leading-none">
              13
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Flint, The Spark</h1>
            <p className="text-xs text-muted-foreground tracking-widest uppercase mt-0.5">
              Moon #13 · Brainstorm Engine · 13 Moon Forge
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="text-muted-foreground hover:text-foreground gap-2"
        >
          <RotateCcw size={14} />
          New Session
        </Button>
      </div>

      {/* Flint's quote */}
      <div className="mb-5 px-4 py-3 rounded-lg border border-amber-900/40 bg-amber-950/20">
        <p className="text-xs text-amber-400/80 italic">
          "Every great thing that ever existed started as a spark. One idea. One moment. I'm the moment."
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shrink-0 mt-0.5 mr-2.5 shadow-sm">
                <Sparkles size={13} className="text-black" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              )}
            >
              {msg.content.split("\n").map((line, j) => (
                <span key={j}>
                  {line}
                  {j < msg.content.split("\n").length - 1 && <br />}
                </span>
              ))}
              {msg.streaming && (
                <span className="inline-block w-1.5 h-4 bg-amber-400 ml-0.5 animate-pulse rounded-sm" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-3 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Drop the idea here — even half-baked..."
          className="min-h-[52px] max-h-[160px] resize-none flex-1 text-sm"
          rows={2}
          disabled={loading}
        />
        <Button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="h-[52px] px-4 shrink-0"
        >
          <Send size={16} />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-2">
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
