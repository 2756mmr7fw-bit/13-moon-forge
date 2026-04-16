import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Rocket, Target, Megaphone, Store, Loader2, Copy, Check, ExternalLink, RotateCcw,
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
          Forge's Output {status === "running" && <span className="ml-2 text-primary animate-pulse">Writing…</span>}
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

// ─── MVP Definer ──────────────────────────────────────────────────────────────
function MvpDefiner() {
  const [vision, setVision] = useState(""); const [features, setFeatures] = useState(""); const [audience, setAudience] = useState("");
  const [teamSize, setTeamSize] = useState("Solo"); const [timeframe, setTimeframe] = useState("30 days"); const [tech, setTech] = useState("");
  const s = useForgeStream("/api/forge/mvp-definer");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">The Vision <span className="text-primary">Required</span></Label><Textarea value={vision} onChange={e => setVision(e.target.value)} placeholder={"Describe your big idea — don't hold back, don't self-edit. Give Forge everything.\n\nForge will cut it to what can actually ship."} className="h-[160px] text-sm resize-none" /></div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Features You're Thinking About</Label><Textarea value={features} onChange={e => setFeatures(e.target.value)} placeholder="List everything you're imagining — inventory system, multiplayer, voice chat, procedural generation, crafting… dump it all here." className="h-[100px] text-sm resize-none" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Target User</Label><Input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Who is this for?" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Team Size</Label><Input value={teamSize} onChange={e => setTeamSize(e.target.value)} placeholder="Solo" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Timeframe</Label><Input value={timeframe} onChange={e => setTimeframe(e.target.value)} placeholder="30 days" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Tech / Platform</Label><Input value={tech} onChange={e => setTech(e.target.value)} placeholder="Godot, React, Swift…" className="text-sm" /></div>
        </div>
        <Button onClick={() => s.run({ vision, features, audience, teamSize, timeframe, tech })} disabled={!vision.trim() || s.status === "running"} className="w-full gap-2">
          {s.status === "running" ? <><Loader2 size={15} className="animate-spin" /> Cutting to the MVP…</> : <><Target size={15} /> Define My MVP</>}
        </Button>
      </div>
      <OutputPanel output={s.output} status={s.status} subscribeUrl={s.subscribeUrl} placeholder="Describe your full vision above. Forge will ruthlessly cut it to the smallest version that can actually ship — with a week-by-week plan to get there in 30 days." onReset={s.reset} />
    </div>
  );
}

// ─── Pitch Builder ────────────────────────────────────────────────────────────
function PitchBuilder() {
  const [title, setTitle] = useState(""); const [concept, setConcept] = useState(""); const [genre, setGenre] = useState("");
  const [audience, setAudience] = useState(""); const [hook, setHook] = useState(""); const [comps, setComps] = useState("");
  const [traction, setTraction] = useState(""); const [team, setTeam] = useState(""); const [ask, setAsk] = useState("");
  const s = useForgeStream("/api/forge/pitch-builder");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Project name" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Genre / Category</Label><Input value={genre} onChange={e => setGenre(e.target.value)} placeholder="Game, App, SaaS, Product…" className="text-sm" /></div>
        </div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Concept <span className="text-primary">Required</span></Label><Textarea value={concept} onChange={e => setConcept(e.target.value)} placeholder="What is it? What does it do? Why does it exist?" className="h-[100px] text-sm resize-none" /></div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Unique Hook — What makes this different?</Label><Input value={hook} onChange={e => setHook(e.target.value)} placeholder="The one thing no competitor has" className="text-sm" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Target Audience</Label><Input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Who buys/plays this?" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Comparable Titles</Label><Input value={comps} onChange={e => setComps(e.target.value)} placeholder="'Like X meets Y'" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Current Progress</Label><Input value={traction} onChange={e => setTraction(e.target.value)} placeholder="Prototype, 500 wishlists, launched…" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Team</Label><Input value={team} onChange={e => setTeam(e.target.value)} placeholder="Solo dev, 3-person team…" className="text-sm" /></div>
        </div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">The Ask</Label><Input value={ask} onChange={e => setAsk(e.target.value)} placeholder="Publishing deal, funding, wishlists, partners…" className="text-sm" /></div>
        <Button onClick={() => s.run({ title, concept, genre, audience, hook, comps, traction, team, ask })} disabled={!concept.trim() || s.status === "running"} className="w-full gap-2">
          {s.status === "running" ? <><Loader2 size={15} className="animate-spin" /> Writing Your Pitch…</> : <><Megaphone size={15} /> Build My Pitch</>}
        </Button>
      </div>
      <OutputPanel output={s.output} status={s.status} subscribeUrl={s.subscribeUrl} placeholder="Fill in your project details above and Forge will write a complete pitch — the kind that gets publishers, investors, and partners to stop and pay attention." onReset={s.reset} />
    </div>
  );
}

// ─── Store Description ────────────────────────────────────────────────────────
function StoreDescription() {
  const [title, setTitle] = useState(""); const [platform, setPlatform] = useState(""); const [genre, setGenre] = useState("");
  const [description, setDescription] = useState(""); const [audience, setAudience] = useState(""); const [features, setFeatures] = useState(""); const [tone, setTone] = useState("");
  const s = useForgeStream("/api/forge/store-description");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Game / App name" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Platform</Label><Input value={platform} onChange={e => setPlatform(e.target.value)} placeholder="Steam, App Store, itch.io…" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Genre</Label><Input value={genre} onChange={e => setGenre(e.target.value)} placeholder="Cozy sim, Action RPG…" className="text-sm" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Tone / Vibe</Label><Input value={tone} onChange={e => setTone(e.target.value)} placeholder="Dark, Whimsical, Gritty, Chill…" className="text-sm" /></div>
        </div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Core Description <span className="text-primary">Required</span></Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell Forge what your game or app is about. Include the experience — not just the features." className="h-[100px] text-sm resize-none" /></div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Key Features</Label><Textarea value={features} onChange={e => setFeatures(e.target.value)} placeholder="Bullet your main features — anything you want called out in the listing." className="h-[80px] text-sm resize-none" /></div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Target Audience</Label><Input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Fans of Stardew Valley, mobile puzzle lovers…" className="text-sm" /></div>
        <Button onClick={() => s.run({ title, platform, genre, description, audience, features, tone })} disabled={!description.trim() || s.status === "running"} className="w-full gap-2">
          {s.status === "running" ? <><Loader2 size={15} className="animate-spin" /> Writing Your Listing…</> : <><Store size={15} /> Write Store Description</>}
        </Button>
      </div>
      <OutputPanel output={s.output} status={s.status} subscribeUrl={s.subscribeUrl} placeholder="Describe your project above and Forge will write a complete store listing — short description, long description, feature bullets, and keyword tags." onReset={s.reset} />
    </div>
  );
}

const TOOLS = [
  { id: "mvp",   label: "MVP Definer",       icon: Target,    tag: "Big vision → shippable MVP in 30 days" },
  { id: "pitch", label: "Pitch Builder",     icon: Megaphone, tag: "Your project → publisher-ready pitch" },
  { id: "store", label: "Store Description", icon: Store,     tag: "Game/App details → full listing copy" },
];

export default function LaunchKit() {
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center shadow-lg shrink-0" style={{ boxShadow: "0 0 24px rgba(16, 185, 129, 0.3)" }}>
          <Rocket size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            Launch Kit
            <Badge variant="secondary" className="text-[10px] font-bold tracking-wider">MOON #5 · FORGE</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Three tools for getting your project into the world — define the MVP, build the pitch, write the store listing.</p>
        </div>
      </div>
      <Tabs defaultValue="mvp">
        <TabsList className="flex-wrap h-auto gap-1 mb-6">
          {TOOLS.map(t => <TabsTrigger key={t.id} value={t.id} className="gap-1.5"><t.icon size={13} />{t.label}</TabsTrigger>)}
        </TabsList>
        {TOOLS.map(t => (
          <TabsContent key={t.id} value={t.id}>
            <div className="mb-5 px-3 py-2 rounded-md bg-muted/30 border border-border inline-flex items-center gap-2">
              <t.icon size={13} className="text-primary" />
              <span className="text-xs text-muted-foreground">{t.tag}</span>
            </div>
            {t.id === "mvp"   && <MvpDefiner />}
            {t.id === "pitch" && <PitchBuilder />}
            {t.id === "store" && <StoreDescription />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
