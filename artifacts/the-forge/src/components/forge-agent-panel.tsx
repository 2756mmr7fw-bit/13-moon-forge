import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import {
  Flame, Send, Loader2, CheckCircle2, XCircle, Download,
  FileText, Globe, Plus, Sparkles, ChevronDown, Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface WItem {
  id: number;
  type: string;
  name: string;
  content: string;
  parentId: number | null;
  icon: string;
  color: string;
  pinned: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface AgentAction {
  a: "import" | "analyze" | "open" | "create";
  status: "pending" | "running" | "done" | "error";
  description: string;
  url?: string;
  name?: string;
  fileId?: number;
  fileName?: string;
  content?: string;
  result?: WItem | null;
  error?: string;
}

interface AgentMessage {
  role: "forge" | "user";
  content: string;
  streaming?: boolean;
  actions?: AgentAction[];
}

interface ForgeAgentPanelProps {
  items: WItem[];
  onFileCreated: (item: WItem) => void;
  onOpenFile: (item: WItem) => void;
  onClose?: () => void;
  initialMessage?: string;
  initialFileId?: number;
}

const QUICK_STARTS = [
  { icon: Globe, label: "Import a PDF from a URL", prompt: "I have a PDF at a URL I want to import" },
  { icon: FileText, label: "Analyze my PDFs", prompt: "Analyze all the PDFs in my workspace" },
  { icon: Sparkles, label: "What's in my workspace?", prompt: "What files do I have and what can you tell me about them?" },
  { icon: Bot, label: "Get PDFs from my phone", prompt: "I have PDFs on my phone. How do I get them here?" },
  { icon: Plus, label: "Create a business document", prompt: "Create a professional business plan document and save it to my workspace" },
  { icon: FileText, label: "Compare two documents", prompt: "I want to compare two of my documents" },
];

export function ForgeAgentPanel({ items, onFileCreated, onOpenFile, onClose, initialMessage, initialFileId }: ForgeAgentPanelProps) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState(initialMessage ?? "");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getToken();
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }, [getToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send initial file analysis prompt
  useEffect(() => {
    if (initialFileId) {
      const file = items.find(i => i.id === initialFileId);
      if (file) {
        const prompt = `Please analyze "${file.name}" for me.`;
        setInput("");
        send(prompt);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Execute a single action and update message state
  const executeAction = useCallback(async (
    action: AgentAction,
    msgIndex: number,
    actionIndex: number,
  ) => {
    const update = (patch: Partial<AgentAction>) => {
      setMessages(prev => {
        const next = [...prev];
        const msg = { ...next[msgIndex] };
        const acts = [...(msg.actions ?? [])];
        acts[actionIndex] = { ...acts[actionIndex], ...patch };
        msg.actions = acts;
        next[msgIndex] = msg;
        return next;
      });
    };

    update({ status: "running" });
    const headers = await authHeaders();

    try {
      if (action.a === "import" && action.url) {
        const res = await fetch(`${API_BASE}/api/workspace/import-url`, {
          method: "POST",
          headers,
          body: JSON.stringify({ url: action.url, name: action.name }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(e.error ?? "Import failed");
        }
        const item: WItem = await res.json();
        onFileCreated(item);
        update({ status: "done", result: item, description: `Imported: ${item.name}` });
      } else if (action.a === "analyze" && action.fileId) {
        const file = items.find(i => i.id === action.fileId);
        if (!file) throw new Error("File not found in workspace");
        const res = await fetch(`${API_BASE}/api/workspace/${action.fileId}/forge-pdf`, {
          method: "POST",
          headers,
          body: JSON.stringify({ parentId: file.parentId }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(e.error ?? "Analysis failed");
        }
        const newDoc: WItem = await res.json();
        onFileCreated(newDoc);
        update({ status: "done", result: newDoc, description: `Analysis saved: ${newDoc.name}` });
      } else if (action.a === "open" && action.fileId) {
        const file = items.find(i => i.id === action.fileId);
        if (file) {
          onOpenFile(file);
          update({ status: "done", description: `Opened: ${file.name}` });
        } else {
          throw new Error("File not found");
        }
      } else if (action.a === "create" && action.name && action.content) {
        const res = await fetch(`${API_BASE}/api/workspace`, {
          method: "POST",
          headers,
          body: JSON.stringify({ type: "document", name: action.name, content: action.content }),
        });
        if (!res.ok) throw new Error("Failed to create document");
        const item: WItem = await res.json();
        onFileCreated(item);
        update({ status: "done", result: item, description: `Created: ${item.name}` });
      } else {
        throw new Error("Unknown action");
      }
    } catch (err) {
      update({ status: "error", error: err instanceof Error ? err.message : "Failed" });
    }
  }, [authHeaders, items, onFileCreated, onOpenFile]);

  const send = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    const userMsg: AgentMessage = { role: "user", content: text };
    const forgeMsg: AgentMessage = { role: "forge", content: "", streaming: true, actions: [] };

    setMessages(prev => [...prev, userMsg, forgeMsg]);
    const msgIndex = messages.length + 1; // index of forgeMsg

    try {
      const headers = await authHeaders();
      const nonDataItems = items.filter(i => i.type !== "pdf" || !i.content?.startsWith("data:")).concat(
        items.filter(i => i.type === "pdf" && i.content?.startsWith("data:"))
      );
      const fileSummary = nonDataItems.map(i => ({ id: i.id, name: i.name, type: i.type }));

      const history = messages
        .filter(m => !m.streaming)
        .map(m => ({ role: m.role === "forge" ? "assistant" : "user", content: m.content }));

      const res = await fetch(`${API_BASE}/api/workspace/agent`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: [...history, { role: "user", content: text }],
          files: fileSummary,
        }),
      });

      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      const pendingActions: AgentAction[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as { type: string; a?: string; [k: string]: unknown };
            if (parsed.type === "chunk") {
              acc += parsed.content as string;
              setMessages(prev => {
                const next = [...prev];
                const idx = next.length - 1;
                next[idx] = { ...next[idx], content: acc };
                return next;
              });
            } else if (parsed.type === "action") {
              const action: AgentAction = {
                a: parsed.a as AgentAction["a"],
                status: "pending",
                description: describeAction(parsed),
                url: parsed.url as string | undefined,
                name: parsed.name as string | undefined,
                fileId: parsed.fileId as number | undefined,
                fileName: parsed.fileName as string | undefined,
                content: parsed.content as string | undefined,
              };
              pendingActions.push(action);
              setMessages(prev => {
                const next = [...prev];
                const idx = next.length - 1;
                next[idx] = { ...next[idx], actions: [...(next[idx].actions ?? []), action] };
                return next;
              });
            } else if (parsed.type === "done") {
              setMessages(prev => {
                const next = [...prev];
                const idx = next.length - 1;
                next[idx] = { ...next[idx], streaming: false };
                return next;
              });
            }
          } catch { /* skip */ }
        }
      }

      // Execute pending actions sequentially
      for (let i = 0; i < pendingActions.length; i++) {
        await executeAction(pendingActions[i], msgIndex, i);
      }
    } catch {
      setMessages(prev => {
        const next = [...prev];
        const idx = next.length - 1;
        next[idx] = { ...next[idx], content: "Forge hit a snag. Try again.", streaming: false };
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, authHeaders, items, executeAction]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
          <Flame size={15} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm">Forge Agent</h3>
          <p className="text-[10px] text-muted-foreground">Takes action. Doesn't just talk.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest">
            {items.length} file{items.length !== 1 ? "s" : ""}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Message list / Quick starts */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="p-4 space-y-4">
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                <Flame size={22} className="text-primary" />
              </div>
              <p className="text-sm font-bold">Tell Forge what to do.</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Share a URL and I'll import it. Ask me to analyze your files. Tell me what to create. I act — you watch.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {QUICK_STARTS.map(q => (
                <button
                  key={q.label}
                  onClick={() => { setInput(q.prompt); inputRef.current?.focus(); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                >
                  <q.icon size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
                {msg.role === "forge" && (
                  <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Flame size={12} className="text-primary" />
                  </div>
                )}
                <div className={cn(
                  "flex-1 min-w-0 space-y-2",
                  msg.role === "user" && "flex flex-col items-end",
                )}>
                  <div className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-sm max-w-[85%]",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted/60 rounded-tl-sm",
                  )}>
                    {msg.role === "forge" ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-li:my-0.5 prose-pre:bg-muted/60">
                        <ReactMarkdown>{msg.content || (msg.streaming ? "…" : "")}</ReactMarkdown>
                      </div>
                    ) : (
                      <span>{msg.content}</span>
                    )}
                    {msg.streaming && (
                      <span className="inline-block w-2 h-3 bg-primary/60 rounded-sm animate-pulse ml-0.5 align-baseline" />
                    )}
                  </div>

                  {/* Action cards */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="space-y-1.5 w-full max-w-[90%]">
                      {msg.actions.map((act, ai) => (
                        <ActionCard key={ai} action={act} onOpen={act.result ? () => onOpenFile(act.result!) : undefined} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 bg-card/80 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Tell Forge what to do — paste a URL, ask to analyze, or describe what you need…"
            rows={2}
            disabled={loading}
            className="flex-1 text-sm bg-muted/40 border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/60 disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
        <p className="text-[9px] text-muted-foreground/50 mt-1.5 px-1">
          Forge sees your {items.length} workspace files and can take action on them. Shift+Enter for new line.
        </p>
      </div>
    </div>
  );
}

function ActionCard({ action, onOpen }: { action: AgentAction; onOpen?: () => void }) {
  const icons = {
    import: Globe,
    analyze: Flame,
    open: FileText,
    create: Plus,
  };
  const Icon = icons[action.a] ?? Flame;

  const statusColors = {
    pending: "border-border bg-card text-muted-foreground",
    running: "border-primary/30 bg-primary/5 text-foreground",
    done: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
    error: "border-red-500/30 bg-red-500/5 text-red-300",
  };

  const statusIcon = {
    pending: <Loader2 size={11} className="text-muted-foreground/60 animate-spin" />,
    running: <Loader2 size={11} className="text-primary animate-spin" />,
    done: <CheckCircle2 size={11} className="text-emerald-400" />,
    error: <XCircle size={11} className="text-red-400" />,
  };

  return (
    <div className={cn(
      "flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs transition-colors",
      statusColors[action.status],
    )}>
      {statusIcon[action.status]}
      <Icon size={11} className="shrink-0 opacity-70" />
      <span className="flex-1 truncate">{action.description}</span>
      {action.status === "error" && action.error && (
        <span className="text-[10px] text-red-400/80 shrink-0 max-w-[120px] truncate">{action.error}</span>
      )}
      {action.status === "done" && action.result && (
        <div className="flex items-center gap-1 shrink-0">
          {onOpen && (
            <button onClick={onOpen} className="text-[10px] text-emerald-400 hover:underline">Open</button>
          )}
          {action.result.type === "pdf" && (
            <button
              onClick={() => {
                const a = document.createElement("a");
                a.href = action.result!.content;
                a.download = action.result!.name;
                a.click();
              }}
              className="p-0.5 rounded hover:bg-emerald-500/10"
            >
              <Download size={10} className="text-emerald-400" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function describeAction(parsed: Record<string, unknown>): string {
  const a = parsed.a as string;
  if (a === "import") return `Importing: ${parsed.name ?? parsed.url}`;
  if (a === "analyze") return `Analyzing: ${parsed.fileName ?? `File #${parsed.fileId}`}`;
  if (a === "open") return `Opening: ${parsed.fileName ?? `File #${parsed.fileId}`}`;
  if (a === "create") return `Creating: ${parsed.name}`;
  return "Taking action…";
}
