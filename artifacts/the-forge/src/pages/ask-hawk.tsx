import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Search, Crosshair, Loader2, Copy, Check, ExternalLink, RotateCcw,
} from "lucide-react";
import { getUserId } from "@/lib/userId";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const EXAMPLES = [
  { label: "Hardware part", text: "A 12V linear actuator with at least 100mm stroke, under $40, that I can control with an Arduino" },
  { label: "Game library", text: "A free Godot 4 plugin for procedural terrain generation, actively maintained" },
  { label: "Supplier search", text: "Where to buy small batch custom PCBs for a hardware prototype in the US, under $50 for 10 boards" },
  { label: "Asset search", text: "Free or affordable 2D pixel art character sprites for a top-down RPG, commercial use allowed" },
  { label: "API/service", text: "A free or low-cost SMS API I can use in a Node.js app to send text notifications, under $10/month for low volume" },
  { label: "Material sourcing", text: "Where to source thin aluminum sheet (1mm) in small quantities for a DIY enclosure project" },
];

export default function AskHawk() {
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState("");
  const [projectType, setProjectType] = useState("");
  const [location, setLocation] = useState("US");
  const [constraints, setConstraints] = useState("");
  const [alreadyTried, setAlreadyTried] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [subscribeUrl, setSubscribeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (status === "running" || !query.trim()) return;
    setOutput(""); setStatus("running"); setSubscribeUrl(null);
    try {
      const res = await fetch(`${API_BASE}/api/forge/find`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ query, budget, projectType, location, constraints, alreadyTried }),
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
      if (err instanceof Error && err.name !== "AbortError") { setOutput("Hawk hit a snag. Try again."); setStatus("error"); }
    }
  };

  const reset = () => { setQuery(""); setBudget(""); setProjectType(""); setConstraints(""); setAlreadyTried(""); setOutput(""); setStatus("idle"); setSubscribeUrl(null); };
  const copy = async () => { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shrink-0"
          style={{ boxShadow: "0 0 24px rgba(245, 158, 11, 0.35)" }}>
          <Crosshair size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            Ask Hawk
            <Badge className="text-[10px] font-bold tracking-wider bg-amber-500 text-black border-0">MOON #2 · HAWK</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hawk is The Finder. Tell Hawk what you need — a part, a tool, a library, a supplier, a resource — and Hawk finds it. Specific names. Real sources. Actual prices.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">What are you looking for? <span className="text-amber-400">Required</span></Label>
            <Textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={"Be specific — the more detail, the sharper Hawk's aim.\n\n'A 12V linear actuator with at least 100mm stroke, under $40, controllable with an Arduino'\n'A free Godot 4 procedural terrain plugin, actively maintained'\n'A cheap SMS API for a low-volume Node.js app'"}
              className="h-[180px] text-sm resize-none"
            />
          </div>

          {/* Examples */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Try an example:</p>
            <div className="grid grid-cols-2 gap-2">
              {EXAMPLES.map(ex => (
                <button key={ex.label} onClick={() => setQuery(ex.text)}
                  className="text-left text-xs border border-border rounded-md px-2.5 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                  <span className="text-amber-400 font-medium block">{ex.label}</span>
                  <span className="line-clamp-2 mt-0.5">{ex.text}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Budget</Label>
              <Input value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. Under $40, Free, Under $10/mo" className="text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Location / Shipping</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="US" className="text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Project Type</Label>
              <Input value={projectType} onChange={e => setProjectType(e.target.value)} placeholder="Game dev, Hardware prototype, Web app…" className="text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Already Tried</Label>
              <Input value={alreadyTried} onChange={e => setAlreadyTried(e.target.value)} placeholder="What didn't work?" className="text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Constraints <span className="opacity-60">(optional)</span></Label>
            <Input value={constraints} onChange={e => setConstraints(e.target.value)} placeholder="Must be open-source, commercial license, US shipping only…" className="text-sm" />
          </div>

          <Button onClick={run} disabled={!query.trim() || status === "running"} className="w-full gap-2 bg-amber-500 hover:bg-amber-400 text-black">
            {status === "running"
              ? <><Loader2 size={15} className="animate-spin" /> Hawk is searching…</>
              : <><Search size={15} /> Find It</>
            }
          </Button>
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              What Hawk Found {status === "running" && <span className="ml-2 text-amber-400 animate-pulse">Searching…</span>}
            </Label>
            <div className="flex gap-2">
              {output && <Button variant="ghost" size="sm" onClick={copy} className="h-7 gap-1.5 text-xs">{copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}{copied ? "Copied" : "Copy"}</Button>}
              {output && <Button variant="ghost" size="sm" onClick={reset} className="h-7 gap-1.5 text-xs text-muted-foreground"><RotateCcw size={12} /> Clear</Button>}
            </div>
          </div>
          <div className={cn(
            "min-h-[440px] rounded-md border p-4 text-sm leading-relaxed overflow-auto whitespace-pre-wrap",
            status === "error" ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-amber-900/30 bg-amber-950/10"
          )}>
            {output || (
              <div className="text-center mt-20 space-y-3">
                <Crosshair size={32} className="mx-auto text-amber-500/30" />
                <p className="text-muted-foreground text-sm">Tell Hawk what you need.<br />Specific names, real sources, actual prices — not vague suggestions.</p>
              </div>
            )}
            {status === "running" && <span className="inline-block w-1.5 h-4 bg-amber-400 ml-0.5 animate-pulse rounded-sm" />}
          </div>
          {subscribeUrl && (
            <a href={subscribeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-colors">
              Subscribe on the Town Square <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Footer note */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-900/30 bg-amber-950/10 text-xs text-muted-foreground">
        <Search size={14} className="shrink-0 mt-0.5 text-amber-400" />
        <span>Hawk draws on training knowledge to find resources — verify prices and availability before purchasing, as they may have changed. Use the links Hawk provides as starting points.</span>
      </div>
    </div>
  );
}
