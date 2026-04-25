import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  GraduationCap, BookOpenCheck, Lightbulb, Loader2, Copy, Check, ExternalLink, RotateCcw,
} from "lucide-react";
import { getUserId } from "@/lib/userId";
import { getSkillLevel, getSkillMeta, SKILL_LEVELS, setSkillLevel, type SkillLevel } from "@/lib/skillLevel";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useForgeStream(endpoint: string) {
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [subscribeUrl, setSubscribeUrl] = useState<string | null>(null);

  const run = async (body: object) => {
    if (status === "running") return;
    setOutput(""); setStatus("running"); setSubscribeUrl(null);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": getUserId(),
          "x-skill-level": getSkillLevel(),
        },
        body: JSON.stringify(body),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = ""; let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "chunk") { acc += ev.content; setOutput(acc); }
            else if (ev.type === "done") setStatus("done");
            else if (ev.type === "subscription_required") { setOutput(ev.error ?? "Subscription required."); setSubscribeUrl(ev.subscribeUrl ?? null); setStatus("error"); }
            else if (ev.type === "error") { setOutput(ev.message ?? "Error."); setStatus("error"); }
          } catch { /* skip */ }
        }
      }
      setStatus(s => s === "error" ? s : "done");
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") { setOutput("Sage hit a snag. Try again."); setStatus("error"); }
    }
  };

  const reset = () => { setOutput(""); setStatus("idle"); setSubscribeUrl(null); };
  return { output, status, subscribeUrl, run, reset };
}

function OutputPanel({ output, status, subscribeUrl, placeholder, onReset }: {
  output: string; status: string; subscribeUrl: string | null; placeholder: string; onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          Sage's Explanation {status === "running" && <span className="ml-2 text-indigo-400 animate-pulse">Teaching…</span>}
        </Label>
        <div className="flex gap-2">
          {output && <Button variant="ghost" size="sm" onClick={copy} className="h-7 gap-1.5 text-xs">{copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}{copied ? "Copied" : "Copy"}</Button>}
          {output && <Button variant="ghost" size="sm" onClick={onReset} className="h-7 gap-1.5 text-xs text-muted-foreground"><RotateCcw size={12} /> Clear</Button>}
        </div>
      </div>
      <div className={cn("min-h-[380px] rounded-md border p-4 text-sm leading-relaxed overflow-auto whitespace-pre-wrap", status === "error" ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-indigo-900/30 bg-indigo-950/10")}>
        {output || <p className="text-muted-foreground text-center mt-20 font-sans text-sm">{placeholder}</p>}
        {status === "running" && <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 animate-pulse rounded-sm" />}
      </div>
      {subscribeUrl && (
        <a href={subscribeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-colors">
          Subscribe on the Town Square <ExternalLink size={11} />
        </a>
      )}
    </div>
  );
}

// ─── Explain It ───────────────────────────────────────────────────────────────
function ExplainIt() {
  const [topic, setTopic] = useState("");
  const [background, setBackground] = useState("");
  const [context, setContext] = useState("");
  const [depth, setDepth] = useState("");
  const s = useForgeStream("/api/forge/explain");

  const examples = [
    "How does a PID controller work?",
    "What is a shader and how does the GPU use it?",
    "Explain garbage collection in programming",
    "How does mesh colliders vs. box colliders affect performance?",
    "What's the difference between TCP and UDP?",
    "How does a servo motor know where it is?",
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">What do you want to understand? <span className="text-indigo-400">Required</span></Label>
          <Textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ask anything — a concept, a technology, a principle, a system. No such thing as a dumb question here." className="h-[120px] text-sm resize-none" />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Or pick an example:</p>
          <div className="flex flex-wrap gap-2">
            {examples.map(ex => (
              <button key={ex} onClick={() => setTopic(ex)} className="text-xs border border-border rounded-md px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Your Background <span className="opacity-60">(optional)</span></Label>
            <Input value={background} onChange={e => setBackground(e.target.value)} placeholder="e.g. No coding background, intermediate dev" className="text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Why You're Asking <span className="opacity-60">(optional)</span></Label>
            <Input value={context} onChange={e => setContext(e.target.value)} placeholder="e.g. Building a Godot game, deciding on tech stack" className="text-sm" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Depth <span className="opacity-60">(optional)</span></Label>
          <Input value={depth} onChange={e => setDepth(e.target.value)} placeholder="e.g. Simple overview, Full deep-dive, Enough to make a decision" className="text-sm" />
        </div>

        <Button onClick={() => s.run({ topic, background, context, depth })} disabled={!topic.trim() || s.status === "running"} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-500">
          {s.status === "running" ? <><Loader2 size={15} className="animate-spin" /> Explaining…</> : <><Lightbulb size={15} /> Explain This to Me</>}
        </Button>
      </div>
      <OutputPanel output={s.output} status={s.status} subscribeUrl={s.subscribeUrl} placeholder="Ask anything above — Sage will explain it from the ground up, using analogies and real examples. No jargon, no assumptions about what you already know." onReset={s.reset} />
    </div>
  );
}

// ─── Write a Tutorial ─────────────────────────────────────────────────────────
function WriteTutorial() {
  const [skill, setSkill] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [tools, setTools] = useState("");
  const [goal, setGoal] = useState("");
  const s = useForgeStream("/api/forge/tutorial");

  const examples = [
    "How to set up a 2D character controller in Godot",
    "Python basics for someone who's never programmed before",
    "How to wire a relay module to an Arduino",
    "Rigging a character for animation in Blender",
    "Setting up a Node.js API with Express from scratch",
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Skill to Learn <span className="text-indigo-400">Required</span></Label>
          <Textarea value={skill} onChange={e => setSkill(e.target.value)} placeholder="What skill or technique should Sage teach? Be as specific as possible — the more specific, the better the tutorial." className="h-[120px] text-sm resize-none" />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Or pick an example:</p>
          <div className="flex flex-wrap gap-2">
            {examples.map(ex => (
              <button key={ex} onClick={() => setSkill(ex)} className="text-xs border border-border rounded-md px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Current Level</Label>
            <Input value={level} onChange={e => setLevel(e.target.value)} placeholder="Beginner, Intermediate…" className="text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Tools / Environment</Label>
            <Input value={tools} onChange={e => setTools(e.target.value)} placeholder="Godot 4, Python 3.11, Arduino…" className="text-sm" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Why You're Learning This <span className="opacity-60">(optional)</span></Label>
          <Input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. Building a game, starting a project, preparing for a job" className="text-sm" />
        </div>

        <Button onClick={() => s.run({ skill, level, tools, goal })} disabled={!skill.trim() || s.status === "running"} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-500">
          {s.status === "running" ? <><Loader2 size={15} className="animate-spin" /> Writing Tutorial…</> : <><BookOpenCheck size={15} /> Write My Tutorial</>}
        </Button>
      </div>
      <OutputPanel output={s.output} status={s.status} subscribeUrl={s.subscribeUrl} placeholder="Describe the skill above and Sage will write a complete step-by-step tutorial — with what you need, numbered steps, the why behind each one, and common mistakes to avoid." onReset={s.reset} />
    </div>
  );
}

const TABS = [
  { id: "explain",  label: "Explain It",     icon: Lightbulb,    tag: "Ask anything → real understanding" },
  { id: "tutorial", label: "Write Tutorial", icon: BookOpenCheck, tag: "Skill name → step-by-step tutorial" },
];

export default function LearnWithSage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center shadow-lg shrink-0"
          style={{ boxShadow: "0 0 24px rgba(99, 102, 241, 0.35)" }}>
          <GraduationCap size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            Learn with Sage
            <Badge className="text-[10px] font-bold tracking-wider bg-indigo-600 text-white border-0">MOON #7 · SAGE</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sage is The Teacher. Ask anything — a concept, a skill, a system. Sage explains it from the ground up and writes tutorials that actually work.
          </p>
        </div>
      </div>

      <Tabs defaultValue="explain">
        <TabsList className="flex-wrap h-auto gap-1 mb-6">
          {TABS.map(t => <TabsTrigger key={t.id} value={t.id} className="gap-1.5"><t.icon size={13} />{t.label}</TabsTrigger>)}
        </TabsList>
        {TABS.map(t => (
          <TabsContent key={t.id} value={t.id}>
            <div className="mb-5 px-3 py-2 rounded-md bg-indigo-950/30 border border-indigo-900/30 inline-flex items-center gap-2">
              <t.icon size={13} className="text-indigo-400" />
              <span className="text-xs text-muted-foreground">{t.tag}</span>
            </div>
            {t.id === "explain"  && <ExplainIt />}
            {t.id === "tutorial" && <WriteTutorial />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
