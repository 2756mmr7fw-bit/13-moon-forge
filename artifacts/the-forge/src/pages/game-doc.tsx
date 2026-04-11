import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BookOpen, Loader2, Copy, Check, RotateCcw, Wand2, ExternalLink, ChevronRight,
} from "lucide-react";
import { getUserId } from "@/lib/userId";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface FormData {
  title: string;
  concept: string;
  platform: string;
  genre: string;
  audience: string;
  mechanic: string;
  setting: string;
  goal: string;
  inspiration: string;
  teamSize: string;
}

const BLANK: FormData = {
  title: "", concept: "", platform: "", genre: "",
  audience: "", mechanic: "", setting: "", goal: "", inspiration: "", teamSize: "",
};

const QUESTIONS: { key: keyof FormData; label: string; required?: boolean; placeholder: string; multiline?: boolean }[] = [
  { key: "title",       label: "Game Title",                      placeholder: "Untitled Game" },
  { key: "concept",     label: "Core Concept",                    required: true,  multiline: true,
    placeholder: "What's the game about? One paragraph — your elevator pitch. Don't overthink it." },
  { key: "mechanic",    label: "Core Mechanic — What Makes It Fun", required: true, multiline: true,
    placeholder: "What does the player DO? What's the satisfying loop? (e.g. 'You build towers that auto-shoot enemies while you explore the map to gather resources')" },
  { key: "genre",       label: "Genre",                           placeholder: "e.g. Platformer, RPG, Tower Defense, Puzzle, Roguelite" },
  { key: "platform",    label: "Target Platform",                 placeholder: "e.g. PC, Mobile, Web, Console, Cross-platform" },
  { key: "audience",    label: "Target Audience",                 placeholder: "e.g. Casual mobile players, Hardcore strategy fans, Kids 8-12" },
  { key: "setting",     label: "World & Setting",                 multiline: true,
    placeholder: "Where does the game take place? What's the tone? (e.g. Post-apocalyptic desert, Cozy village, Cyberpunk city, Abstract puzzle space)" },
  { key: "goal",        label: "Player's Ultimate Goal",
    placeholder: "What is the player ultimately trying to achieve? (e.g. Defeat the final boss, Escape the maze, Build the biggest empire)" },
  { key: "inspiration", label: "Inspiration / Reference Games",
    placeholder: "Games this is similar to or draws from (e.g. 'Like Stardew Valley but with combat', 'Dark Souls meets Tetris')" },
  { key: "teamSize",    label: "Team Size",                       placeholder: "Solo, 2-3 people, Small studio, etc." },
];

export default function GameDoc() {
  const [form, setForm] = useState<FormData>(BLANK);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [subscribeUrl, setSubscribeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"form" | "output">("form");

  const update = (key: keyof FormData, val: string) => setForm(f => ({ ...f, [key]: val }));

  const generate = async () => {
    if (status === "running") return;
    setOutput("");
    setStatus("running");
    setSubscribeUrl(null);
    setStep("output");

    try {
      const res = await fetch(`${API_BASE}/api/forge/game-doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify(form),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "chunk") { accumulated += ev.content; setOutput(accumulated); }
            else if (ev.type === "done") setStatus("done");
            else if (ev.type === "subscription_required") {
              setOutput(ev.error ?? "Subscription required.");
              setSubscribeUrl(ev.subscribeUrl ?? null);
              setStatus("error");
            }
            else if (ev.type === "error") { setOutput(ev.message ?? "Error."); setStatus("error"); }
          } catch { /* skip */ }
        }
      }
      if (status !== "error") setStatus("done");
    } catch {
      setOutput("Forge hit a snag. Check your connection and try again.");
      setStatus("error");
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setForm(BLANK);
    setOutput("");
    setStatus("idle");
    setSubscribeUrl(null);
    setStep("form");
  };

  const canGenerate = form.concept.trim() && form.mechanic.trim();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shrink-0"
          style={{ boxShadow: "0 0 24px rgba(139, 92, 246, 0.3)" }}>
          <BookOpen size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            Game Doc Builder
            <Badge variant="secondary" className="text-[10px] font-bold tracking-wider">MOON #5 · FORGE</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Answer 10 questions about your game. Forge builds you a complete Game Design Document — ready to hand to a developer.
          </p>
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button
          onClick={() => setStep("form")}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-all",
            step === "form" ? "border-primary/40 bg-primary/10 text-primary" : "border-border hover:border-muted-foreground"
          )}
        >
          1 · Fill in the Brief
        </button>
        <ChevronRight size={14} />
        <button
          onClick={() => output && setStep("output")}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-all",
            step === "output" ? "border-primary/40 bg-primary/10 text-primary" : "border-border",
            !output && "opacity-40 cursor-not-allowed"
          )}
        >
          2 · Your GDD
        </button>
      </div>

      {step === "form" && (
        <div className="space-y-5 max-w-2xl">
          {QUESTIONS.map(q => (
            <div key={q.key}>
              <Label className="text-sm font-semibold mb-1.5 flex items-center gap-2">
                {q.label}
                {q.required && <span className="text-primary text-xs">Required</span>}
              </Label>
              {q.multiline ? (
                <Textarea
                  value={form[q.key]}
                  onChange={e => update(q.key, e.target.value)}
                  placeholder={q.placeholder}
                  className="text-sm resize-none h-[100px]"
                />
              ) : (
                <Input
                  value={form[q.key]}
                  onChange={e => update(q.key, e.target.value)}
                  placeholder={q.placeholder}
                  className="text-sm"
                />
              )}
            </div>
          ))}

          <div className="pt-2 flex gap-3">
            <Button
              onClick={generate}
              disabled={!canGenerate || status === "running"}
              className="gap-2 flex-1"
              size="lg"
            >
              {status === "running"
                ? <><Loader2 size={16} className="animate-spin" /> Forge is building your GDD…</>
                : <><Wand2 size={16} /> Build My Game Doc</>
              }
            </Button>
            <Button variant="outline" size="lg" onClick={reset} className="gap-2">
              <RotateCcw size={16} /> Reset
            </Button>
          </div>

          {!canGenerate && (
            <p className="text-xs text-muted-foreground">Fill in <span className="text-primary">Core Concept</span> and <span className="text-primary">Core Mechanic</span> to unlock generation.</p>
          )}
        </div>
      )}

      {step === "output" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={status === "done" ? "default" : status === "error" ? "destructive" : "secondary"}>
                {status === "running" ? "Generating…" : status === "done" ? "Complete" : status === "error" ? "Error" : "Idle"}
              </Badge>
              {status === "running" && (
                <span className="text-xs text-muted-foreground animate-pulse">Forge is writing your GDD…</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {output && (
                <>
                  <Button variant="ghost" size="sm" onClick={copy} className="h-7 gap-1.5 text-xs">
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy GDD"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={reset} className="h-7 gap-1.5 text-xs text-muted-foreground">
                    <RotateCcw size={12} /> Start Over
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className={cn(
            "min-h-[500px] rounded-lg border p-6 text-sm leading-relaxed overflow-auto whitespace-pre-wrap",
            status === "error" ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/10"
          )}>
            {output || (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 size={24} className="animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Forge is reading your brief and building the document…</p>
              </div>
            )}
            {status === "running" && (
              <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>

          {subscribeUrl && (
            <a href={subscribeUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-colors">
              Subscribe on the Town Square <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
