import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, RotateCcw, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useProjects, loadMoonHistory, saveMoonHistory } from "@/hooks/use-projects";
import type { ChatMessage } from "@/hooks/use-projects";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface MoonConfig {
  id: string;
  name: string;
  moon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  placeholder: string;
  starters: string[];
}

export const MOON_CONFIGS: Record<string, MoonConfig> = {
  sage: {
    id: "sage", name: "Sage", moon: "Buck Moon",
    color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30",
    icon: "🌿",
    placeholder: "Tell Sage what you're thinking of building...",
    starters: [
      "I want to build something but I'm not sure if the idea is solid. Can you help me think it through?",
      "I've been working on this project for weeks and feel like I'm going in circles. Help me find the actual goal.",
      "Help me write a project brief for my idea.",
      "What questions should I be asking before I start building?",
    ],
  },
  scout: {
    id: "scout", name: "Scout", moon: "Hunter's Moon",
    color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30",
    icon: "🦅",
    placeholder: "What do you need Scout to research?",
    starters: [
      "What tools already exist for building a real-time collaborative text editor?",
      "Research the self-hosting market — who are the main players and what are they missing?",
      "What open-source alternatives exist for Stripe?",
      "What are the biggest pitfalls when building a mobile app with React Native?",
    ],
  },
  quill: {
    id: "quill", name: "Quill", moon: "Flower Moon",
    color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30",
    icon: "🪶",
    placeholder: "What does Quill need to write or brainstorm?",
    starters: [
      "Give me 10 name ideas for a self-hosting platform with a sovereign/ownership theme.",
      "Write a landing page headline and subheadline for an AI coding tool.",
      "Write the README for a tool that helps people move their apps off cloud platforms.",
      "I need a one-sentence pitch for my project. Here's what it does: ...",
    ],
  },
  grit: {
    id: "grit", name: "Grit", moon: "Harvest Moon",
    color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30",
    icon: "🔥",
    placeholder: "Tell Grit where you're stuck...",
    starters: [
      "I've been putting this off for two weeks and I don't know why.",
      "I'm overwhelmed — I don't know what to do next and everything feels urgent.",
      "I keep starting the same thing over and over and never finishing it.",
      "I'm about to quit this project. Talk me through it.",
    ],
  },
  herald: {
    id: "herald", name: "Herald", moon: "Beaver Moon",
    color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30",
    icon: "📣",
    placeholder: "Tell Herald what you're launching...",
    starters: [
      "I'm about to launch my app. Help me plan the announcement.",
      "Write a ProductHunt launch post for my self-hosting tool.",
      "What's the right sequence for a software launch? What goes out when?",
      "Help me write the email I'll send to my waiting list when I launch.",
    ],
  },
};

interface MoonChatProps {
  moonId: string;
  initialProjectId?: string;
}

export function MoonChat({ moonId, initialProjectId }: MoonChatProps) {
  const config = MOON_CONFIGS[moonId];
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(initialProjectId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  useEffect(() => {
    const saved = loadMoonHistory(moonId, selectedProjectId);
    setMessages(saved);
  }, [moonId, selectedProjectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    const projectContext = selectedProject
      ? `Project: ${selectedProject.name}\nDescription: ${selectedProject.description}\nPhase: ${selectedProject.phase}\n${selectedProject.brief ? `\nProject Brief:\n${selectedProject.brief}` : ""}`
      : undefined;

    abortRef.current = new AbortController();
    let reply = "";

    try {
      const res = await fetch(`${API_BASE}/api/moons/${moonId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortRef.current.signal,
        body: JSON.stringify({ messages: newMessages, projectContext }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const assistantMsg: ChatMessage = { role: "assistant", content: "" };
      const withAssistant = [...newMessages, assistantMsg];
      setMessages(withAssistant);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data) as { text?: string; error?: string };
            if (parsed.text) {
              reply += parsed.text;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: reply };
                return next;
              });
            }
          } catch { /* skip */ }
        }
      }

      const final = [...newMessages, { role: "assistant" as const, content: reply }];
      saveMoonHistory(moonId, final, selectedProjectId);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: "Something went wrong. Try again." }]);
      }
    } finally {
      setStreaming(false);
    }
  }, [messages, moonId, selectedProject, selectedProjectId, streaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); }
  };

  const clearChat = () => {
    setMessages([]);
    saveMoonHistory(moonId, [], selectedProjectId);
  };

  if (!config) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[900px]">
      {/* Header */}
      <div className={cn("rounded-xl border p-4 mb-4 flex items-center justify-between", config.bgColor, config.borderColor)}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{config.icon}</span>
          <div>
            <h1 className={cn("text-xl font-bold", config.color)}>{config.name}</h1>
            <p className="text-xs text-muted-foreground">{config.moon} · The Thirteen Moons</p>
          </div>
        </div>

        {/* Project selector */}
        <div className="relative">
          <button
            onClick={() => setProjectPickerOpen(v => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors",
              selectedProject
                ? cn(config.borderColor, config.color, config.bgColor)
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <span>{selectedProject ? selectedProject.name : "No project"}</span>
            <ChevronDown size={12} />
          </button>
          {projectPickerOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg z-20 overflow-hidden">
              <button
                onClick={() => { setSelectedProjectId(undefined); setProjectPickerOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-muted-foreground"
              >
                No project
              </button>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProjectId(p.id); setProjectPickerOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted border-t border-border/50"
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-muted-foreground truncate">{p.phase}</div>
                </button>
              ))}
              {projects.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No projects yet — create one in the Project Room</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.length === 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground text-center">Start a conversation, or try one of these:</p>
            {config.starters.map((s, i) => (
              <button
                key={i}
                onClick={() => void send(s)}
                className={cn(
                  "w-full text-left text-sm px-4 py-3 rounded-lg border transition-colors",
                  config.bgColor, config.borderColor,
                  "hover:opacity-80"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <span className="mr-2 mt-1 text-lg shrink-0">{config.icon}</span>
            )}
            <div className={cn(
              "max-w-[80%] px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap",
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : cn("bg-muted rounded-bl-sm", msg.role === "assistant" && i === messages.length - 1 && streaming ? "after:content-['▋'] after:animate-pulse after:ml-0.5" : "")
            )}>
              {msg.content || (streaming && i === messages.length - 1 ? "" : "…")}
            </div>
          </div>
        ))}

        {streaming && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <span className="mr-2 mt-1 text-lg">{config.icon}</span>
            <div className="bg-muted px-4 py-3 rounded-xl rounded-bl-sm">
              <Loader2 size={14} className="animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={config.placeholder}
            rows={2}
            className="resize-none flex-1"
            disabled={streaming}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => void send(input)}
              disabled={!input.trim() || streaming}
              size="icon"
              className={cn("shrink-0", streaming && "animate-pulse")}
            >
              {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
            {messages.length > 0 && (
              <Button onClick={clearChat} size="icon" variant="ghost" className="shrink-0" title="Clear chat">
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          {selectedProject ? `Working on: ${selectedProject.name}` : "No project selected — switch to a project in the top-right"}
        </p>
      </div>
    </div>
  );
}
