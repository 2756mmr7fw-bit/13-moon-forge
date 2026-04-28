import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, RotateCcw, ExternalLink, Clock, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getUserId } from "@/lib/userId";
import { SpeakButton } from "@/components/speak-button";
import { useChatHistory } from "@/hooks/useChatHistory";
import { SavedPromptsPanel } from "@/components/saved-prompts-panel";
import { MoonOutputActions } from "@/components/moon-output-actions";
import { useNarrationMode } from "@/hooks/useNarrationMode";
import { NarrationBanner } from "@/components/narration-banner";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  subscriptionRequired?: boolean;
  subscribeUrl?: string;
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
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const { session, loaded, save: saveHistory, clear: clearHistory } = useChatHistory("brainstorm");
  const { narrationOn, toggle: toggleNarration } = useNarrationMode();

  // Check for a pending workspace AI action
  useEffect(() => {
    const pending = localStorage.getItem("forge:workspace:pending");
    if (pending) {
      try {
        const { content, filename } = JSON.parse(pending) as { content: string; filename: string };
        setInput(`Here's the content of "${filename}":\n\n${content}`);
        localStorage.removeItem("forge:workspace:pending");
      } catch { /* ignore */ }
    }
  }, []);

  // Show restore banner once session is loaded and has meaningful content
  useEffect(() => {
    if (loaded && session && session.messages.length > 2) {
      setShowRestoreBanner(true);
    }
  }, [loaded, session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const history = [...messages.filter(m => !m.streaming && !m.subscriptionRequired), userMsg];
    setMessages([...history, { role: "assistant", content: "", streaming: true }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/flint/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": getUserId(),
          ...(narrationOn ? { "x-narration-mode": "true" } : {}),
        },
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
            if (parsed.type === "subscription_required") {
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = {
                  role: "assistant",
                  content: parsed.error ?? "You need an active subscription to chat with Flint.",
                  subscriptionRequired: true,
                  subscribeUrl: parsed.subscribeUrl,
                };
                return next;
              });
            } else if (parsed.type === "chunk") {
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
                // Save to persistent history (debounced inside hook)
                saveHistory(next.filter(m => !m.streaming && !m.subscriptionRequired).map(m => ({
                  role: m.role as "user" | "assistant",
                  content: m.content,
                  ts: Date.now(),
                })));
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

      {/* Restore last session banner */}
      {showRestoreBanner && session && (
        <div className="mb-3 flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-900/40 text-xs">
          <Clock size={12} className="text-amber-400 shrink-0" />
          <span className="text-amber-300/80 flex-1">
            Last session: <span className="font-medium">{new Date(session.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </span>
          <button
            onClick={() => {
              setMessages(session.messages.map(m => ({ role: m.role, content: m.content })));
              setShowRestoreBanner(false);
            }}
            className="text-amber-400 font-medium hover:underline"
          >
            Restore
          </button>
          <button onClick={() => { clearHistory(); setShowRestoreBanner(false); }} className="text-muted-foreground/50 hover:text-muted-foreground">
            ✕
          </button>
        </div>
      )}

      {/* Narration Mode */}
      <div className="mb-4">
        <NarrationBanner narrationOn={narrationOn} onToggle={toggleNarration} moonName="Flint" />
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
                  : msg.subscriptionRequired
                    ? "bg-amber-950/40 border border-amber-800/50 text-foreground rounded-bl-sm"
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
              {msg.subscriptionRequired && msg.subscribeUrl && (
                <div className="mt-3">
                  <a
                    href={msg.subscribeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-colors"
                  >
                    Subscribe on the Town Square
                    <ExternalLink size={11} />
                  </a>
                </div>
              )}
              {msg.role === "assistant" && !msg.streaming && !msg.subscriptionRequired && msg.content.trim() && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex justify-end">
                    <SpeakButton text={msg.content} />
                  </div>
                  <MoonOutputActions
                    content={msg.content}
                    moonId="brainstorm"
                    title={`Flint — ${new Date().toLocaleDateString()}`}
                    className="justify-end"
                  />
                </div>
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

      <SavedPromptsPanel
        moonId="brainstorm"
        currentPrompt={input}
        onUsePrompt={p => { setInput(p); textareaRef.current?.focus(); }}
        className="mt-3"
      />
    </div>
  );
}
