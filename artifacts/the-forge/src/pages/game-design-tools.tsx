import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Trophy, Wrench, Sliders, Wand2, Loader2, Copy, Check, ExternalLink, RotateCcw, Gamepad2,
} from "lucide-react";
import { getUserId } from "@/lib/userId";

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
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
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
      if (err instanceof Error && err.name !== "AbortError") { setOutput("Forge hit a snag. Try again."); setStatus("error"); }
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
          Forge's Output {status === "running" && <span className="ml-2 text-primary animate-pulse">Thinking…</span>}
        </Label>
        <div className="flex gap-2">
          {output && <Button variant="ghost" size="sm" onClick={copy} className="h-7 gap-1.5 text-xs">{copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}{copied ? "Copied" : "Copy"}</Button>}
          {output && <Button variant="ghost" size="sm" onClick={onReset} className="h-7 gap-1.5 text-xs text-muted-foreground"><RotateCcw size={12} /> Clear</Button>}
        </div>
      </div>
      <div className={cn("min-h-[380px] rounded-md border p-4 text-sm leading-relaxed font-mono overflow-auto whitespace-pre-wrap", status === "error" ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-border bg-muted/10")}>
        {output || <p className="text-muted-foreground text-center mt-20 font-sans text-sm">{placeholder}</p>}
        {status === "running" && <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse rounded-sm" />}
      </div>
      {subscribeUrl && (
        <a href={subscribeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-colors">
          Subscribe on the Town Square <ExternalLink size={11} />
        </a>
      )}
    </div>
  );
}

// ─── Achievement Designer ─────────────────────────────────────────────────────
function AchievementDesigner() {
  const [title, setTitle] = useState(""); const [genre, setGenre] = useState(""); const [concept, setConcept] = useState("");
  const [mechanics, setMechanics] = useState(""); const [length, setLength] = useState(""); const [count, setCount] = useState("20-30");
  const s = useForgeStream("/api/forge/achievement-designer");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Game Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="My Game" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Genre</Label><Input value={genre} onChange={e => setGenre(e.target.value)} placeholder="Roguelite, RPG, Platformer…" className="text-sm" /></div>
        </div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Core Concept <span className="text-primary">Required</span></Label><Textarea value={concept} onChange={e => setConcept(e.target.value)} placeholder="What's the game about? What does the player do?" className="h-[90px] text-sm resize-none" /></div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Key Mechanics</Label><Textarea value={mechanics} onChange={e => setMechanics(e.target.value)} placeholder="What are the main gameplay systems? Combat, crafting, exploration, building, etc." className="h-[80px] text-sm resize-none" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Game Length</Label><Input value={length} onChange={e => setLength(e.target.value)} placeholder="e.g. 10h, 40h, infinite" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Target # of Achievements</Label><Input value={count} onChange={e => setCount(e.target.value)} placeholder="20-30" className="text-sm" /></div>
        </div>
        <Button onClick={() => s.run({ title, genre, concept, mechanics, length, count })} disabled={!concept.trim() || s.status === "running"} className="w-full gap-2">
          {s.status === "running" ? <><Loader2 size={15} className="animate-spin" /> Designing Achievements…</> : <><Trophy size={15} /> Design Achievement System</>}
        </Button>
      </div>
      <OutputPanel output={s.output} status={s.status} subscribeUrl={s.subscribeUrl} placeholder="Describe your game above and Forge will design a complete achievement system — story achievements, challenge unlocks, secret achievements, and everything in between." onReset={s.reset} />
    </div>
  );
}

// ─── Mechanic Workshop ────────────────────────────────────────────────────────
function MechanicWorkshop() {
  const [mechanic, setMechanic] = useState(""); const [genre, setGenre] = useState(""); const [platform, setPlatform] = useState(""); const [teamSize, setTeamSize] = useState(""); const [engine, setEngine] = useState("");
  const s = useForgeStream("/api/forge/mechanic-workshop");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Mechanic Idea <span className="text-primary">Required</span></Label><Textarea value={mechanic} onChange={e => setMechanic(e.target.value)} placeholder={"Describe your mechanic idea in plain language — even rough is fine.\n\nExamples:\n• 'I want players to feel like they're building a city while also managing hunger and survival'\n• 'A stamina system that also powers your special abilities'\n• 'Enemy AI that remembers what the player did and adapts'"} className="h-[200px] text-sm resize-none" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Genre</Label><Input value={genre} onChange={e => setGenre(e.target.value)} placeholder="RPG, Platformer, RTS…" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Platform</Label><Input value={platform} onChange={e => setPlatform(e.target.value)} placeholder="PC, Mobile, Console…" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Engine</Label><Input value={engine} onChange={e => setEngine(e.target.value)} placeholder="Godot, Unity, Unreal…" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Team Size</Label><Input value={teamSize} onChange={e => setTeamSize(e.target.value)} placeholder="Solo, 2-3, Small studio…" className="text-sm" /></div>
        </div>
        <Button onClick={() => s.run({ mechanic, genre, platform, teamSize, engine })} disabled={!mechanic.trim() || s.status === "running"} className="w-full gap-2">
          {s.status === "running" ? <><Loader2 size={15} className="animate-spin" /> Workshopping…</> : <><Wrench size={15} /> Show Me How to Build It</>}
        </Button>
      </div>
      <OutputPanel output={s.output} status={s.status} subscribeUrl={s.subscribeUrl} placeholder="Describe your mechanic idea above. Forge will give you 3-5 concrete implementation approaches — with complexity ratings, tradeoffs, and a final recommendation on which to build." onReset={s.reset} />
    </div>
  );
}

// ─── Difficulty Guide ─────────────────────────────────────────────────────────
function DifficultyGuide() {
  const [description, setDescription] = useState(""); const [genre, setGenre] = useState(""); const [coreLoop, setCoreLoop] = useState(""); const [progression, setProgression] = useState(""); const [audience, setAudience] = useState(""); const [problem, setProblem] = useState("");
  const s = useForgeStream("/api/forge/difficulty-guide");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Game Description <span className="text-primary">Required</span></Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief game summary" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Genre</Label><Input value={genre} onChange={e => setGenre(e.target.value)} placeholder="Roguelite, Platformer, RTS…" className="text-sm" /></div>
        </div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Core Loop <span className="text-primary">Required</span></Label><Textarea value={coreLoop} onChange={e => setCoreLoop(e.target.value)} placeholder="What does the player do moment-to-moment? What actions repeat? What's the reward loop?" className="h-[90px] text-sm resize-none" /></div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Player Progression</Label><Textarea value={progression} onChange={e => setProgression(e.target.value)} placeholder="How does the player get stronger, better, or more capable over time?" className="h-[80px] text-sm resize-none" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Target Audience</Label><Input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Casual, Hardcore, Kids…" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Biggest Challenge</Label><Input value={problem} onChange={e => setProblem(e.target.value)} placeholder="e.g. 'Game feels too easy late'" className="text-sm" /></div>
        </div>
        <Button onClick={() => s.run({ description, genre, coreLoop, progression, audience, problem })} disabled={!description.trim() || !coreLoop.trim() || s.status === "running"} className="w-full gap-2">
          {s.status === "running" ? <><Loader2 size={15} className="animate-spin" /> Building Tuning Guide…</> : <><Sliders size={15} /> Build Tuning Guide</>}
        </Button>
      </div>
      <OutputPanel output={s.output} status={s.status} subscribeUrl={s.subscribeUrl} placeholder="Describe your game's core loop above and Forge will give you specific starting numbers, a progression curve, difficulty mode multipliers, and a playtesting checklist." onReset={s.reset} />
    </div>
  );
}

const TOOLS = [
  { id: "achievements", label: "Achievement Designer", icon: Trophy, tag: "Describe game → full achievement list" },
  { id: "mechanic",    label: "Mechanic Workshop",    icon: Wrench,  tag: "Mechanic idea → 5 implementation approaches" },
  { id: "difficulty",  label: "Difficulty Tuning",    icon: Sliders, tag: "Core loop → specific tuning numbers" },
];

export default function GameDesignTools() {
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shrink-0" style={{ boxShadow: "0 0 24px rgba(168, 85, 247, 0.3)" }}>
          <Gamepad2 size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            Game Design Tools
            <Badge variant="secondary" className="text-[10px] font-bold tracking-wider">MOON #3 · FORGE</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Design systems, tune difficulty, and build achievement lists — without needing 10 years of game design experience.</p>
        </div>
      </div>
      <Tabs defaultValue="achievements">
        <TabsList className="flex-wrap h-auto gap-1 mb-6">
          {TOOLS.map(t => <TabsTrigger key={t.id} value={t.id} className="gap-1.5"><t.icon size={13} />{t.label}</TabsTrigger>)}
        </TabsList>
        {TOOLS.map(t => (
          <TabsContent key={t.id} value={t.id}>
            <div className="mb-5 px-3 py-2 rounded-md bg-muted/30 border border-border inline-flex items-center gap-2">
              <t.icon size={13} className="text-primary" />
              <span className="text-xs text-muted-foreground">{t.tag}</span>
            </div>
            {t.id === "achievements" && <AchievementDesigner />}
            {t.id === "mechanic"     && <MechanicWorkshop />}
            {t.id === "difficulty"   && <DifficultyGuide />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
