import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useCreateProject, useCreatePage, getListProjectsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Flame, Loader2, Hammer, Send, RotateCcw, CheckCircle2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpeakButton } from "@/components/speak-button";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TEMPLATES = ["portfolio", "business", "blog", "landing", "ecommerce"] as const;
type Template = typeof TEMPLATES[number];

interface Msg { role: "user" | "forge"; text: string }
interface Plan {
  name: string;
  template: Template;
  pages: string[];
  brief: string;
  ready: boolean;
}

const slugify = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const FORGE_OPEN = `What are you building?

Just describe it — the name, what kind of site, who it's for, what feel you want. Or just start talking and I'll figure out the rest.`;

export default function NewProject() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<Msg[]>([{ role: "forge", text: FORGE_OPEN }]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [creating, setCreating] = useState(false);
  const [userTurns, setUserTurns] = useState(0);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const createProject = useCreateProject();
  const createPage = useCreatePage();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const extractPlan = useCallback(async (msgs: Msg[]) => {
    setExtracting(true);
    try {
      const conversation = msgs
        .filter(m => m.text.trim())
        .map(m => ({ role: m.role === "forge" ? "assistant" : "user", content: m.text }));

      const res = await fetch(`${API_BASE}/api/forge/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as Plan;
      setPlan(data);
      setEditName(data.name);
    } catch {
      // silently fail — user can still proceed
    } finally {
      setExtracting(false);
    }
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const turns = userTurns + 1;
    setUserTurns(turns);

    const userMsg: Msg = { role: "user", text };
    const forgeMsg: Msg = { role: "forge", text: "" };
    const nextMsgs = [...messages, userMsg, forgeMsg];
    setMessages(nextMsgs);
    setStreaming(true);

    const history = [...messages, userMsg].map(m => ({
      role: m.role === "forge" ? "assistant" : "user",
      content: m.text,
    }));

    const systemNote = turns === 1
      ? " (The user is describing what they want to build. Ask one targeted follow-up to clarify the vibe or audience if still unclear, or say you have enough and you will set it up.)"
      : " (You have enough info. Respond with a brief confirmation like 'Perfect — I have everything I need. Here is what I will build:' then a short 2-line summary. Be decisive.)";

    try {
      const res = await fetch(`${API_BASE}/api/landing-forge/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text + systemNote,
          history: history.slice(0, -1),
          systemOverride: `You are Forge, the builder AI. You are helping a user start a new website project. Keep responses SHORT — 2-4 sentences max. No lists. Ask one question at a time. When you have: a project name, type (portfolio, business, blog, landing page, or store), and the general vibe — say so and stop asking questions.`,
        }),
      });

      if (!res.ok || !res.body) throw new Error("failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const raw = decoder.decode(value, { stream: true });
        for (const line of raw.split("\n\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6).trim();
          if (d === "[DONE]") break;
          try {
            const parsed = JSON.parse(d) as { choices?: { delta?: { content?: string } }[] };
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              accumulated += delta;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "forge", text: accumulated };
                return next;
              });
            }
          } catch { /* partial */ }
        }
      }

      const finalMsgs = [...messages, userMsg, { role: "forge" as const, text: accumulated }];

      // Extract plan after 2nd user turn or if Forge seems done
      if (turns >= 2 || /have what i need|set.*up|here.*what i.ll build|ready to build/i.test(accumulated)) {
        await extractPlan(finalMsgs);
      }
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "forge", text: "Something went wrong. Try again." };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages, userTurns, extractPlan]);

  const buildProject = async () => {
    if (!plan) return;
    setCreating(true);
    const finalName = editingName ? editName.trim() : plan.name;
    if (!finalName) { setCreating(false); return; }

    try {
      const project = await new Promise<{ id: number }>((resolve, reject) => {
        createProject.mutate(
          { data: { name: finalName, description: plan.brief || undefined, template: plan.template } },
          { onSuccess: resolve, onError: reject }
        );
      });

      await Promise.all(
        (plan.pages.length > 0 ? plan.pages : ["Home"]).map((title, i) =>
          new Promise<void>((resolve, reject) => {
            createPage.mutate(
              { id: project.id, data: { title, slug: slugify(title), content: "", order: i } },
              { onSuccess: () => resolve(), onError: reject }
            );
          })
        )
      );

      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });

      toast({ title: "Project created!", description: `${finalName} is ready — Forge is standing by.` });
      setLocation(`/projects/${project.id}`);
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Something went wrong. Try again." });
      setCreating(false);
    }
  };

  const reset = () => {
    setMessages([{ role: "forge", text: FORGE_OPEN }]);
    setInput("");
    setPlan(null);
    setUserTurns(0);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500 flex flex-col" style={{ minHeight: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/15 rounded-lg">
            <Flame className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">New Project</h1>
            <p className="text-sm text-muted-foreground">Tell Forge what you're building — he'll set it up.</p>
          </div>
        </div>
        {userTurns > 0 && (
          <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Start over
          </button>
        )}
      </div>

      {/* Chat */}
      <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[260px] max-h-[400px]">
          {messages.map((m, i) => (
            <div key={i} className={cn(
              "rounded-xl px-4 py-3 text-sm leading-relaxed max-w-[90%]",
              m.role === "user"
                ? "ml-auto bg-primary/20 border border-primary/20"
                : "bg-background border border-border"
            )}>
              {m.role === "forge" && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-primary block mb-1.5">Forge</span>
              )}
              <span className="whitespace-pre-wrap">{m.text}</span>
              {m.role === "forge" && m.text && !streaming && (
                <div className="mt-1.5 flex justify-end">
                  <SpeakButton text={m.text} />
                </div>
              )}
              {m.role === "forge" && m.text === "" && streaming && (
                <span className="inline-flex gap-0.5 ml-1">
                  {[0, 1, 2].map(j => (
                    <span key={j} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${j * 120}ms` }} />
                  ))}
                </span>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-4 space-y-2.5">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder={userTurns === 0 ? "Describe what you want to build…" : "Reply to Forge…"}
              rows={2}
              className="flex-1 resize-none rounded-xl bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
              disabled={streaming || creating}
              autoFocus
            />
            <button
              onClick={send}
              disabled={!input.trim() || streaming || creating}
              className="self-end p-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Project Plan Card */}
      {(extracting || plan) && (
        <div className={cn(
          "mt-5 rounded-2xl border p-5 space-y-4 transition-all duration-500",
          plan?.ready ? "border-primary/40 bg-primary/5" : "border-border bg-card"
        )}>
          {extracting ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Forge is planning your project…
            </div>
          ) : plan ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span className="font-semibold text-sm">Project plan ready</span>
                </div>
                {!extracting && (
                  <button
                    onClick={() => extractPlan(messages)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Redo
                  </button>
                )}
              </div>

              <div className="space-y-3 text-sm">
                {/* Name */}
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground w-16 shrink-0">Name</span>
                  {editingName ? (
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => setEditingName(false)}
                      onKeyDown={e => e.key === "Enter" && setEditingName(false)}
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setEditingName(true)}
                      className="font-semibold flex items-center gap-1.5 hover:text-primary transition-colors group"
                    >
                      {editName || plan.name}
                      <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-60" />
                    </button>
                  )}
                </div>

                {/* Type */}
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground w-16 shrink-0">Type</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {TEMPLATES.map(t => (
                      <button
                        key={t}
                        onClick={() => setPlan(p => p ? { ...p, template: t } : p)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize",
                          plan.template === t
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pages */}
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground w-16 shrink-0 mt-0.5">Pages</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {plan.pages.map(p => (
                      <span key={p} className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Brief */}
                {plan.brief && (
                  <div className="flex items-start gap-3">
                    <span className="text-muted-foreground w-16 shrink-0 mt-0.5">Brief</span>
                    <p className="text-muted-foreground leading-relaxed">{plan.brief}</p>
                  </div>
                )}
              </div>

              <Button
                onClick={buildProject}
                disabled={creating}
                className="w-full bg-primary text-primary-foreground"
                size="lg"
              >
                {creating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating project…</>
                ) : (
                  <><Hammer className="w-4 h-4 mr-2" /> Build It</>
                )}
              </Button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
