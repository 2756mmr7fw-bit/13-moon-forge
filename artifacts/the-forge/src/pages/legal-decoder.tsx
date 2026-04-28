import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Scale, Wand2, Loader2, Copy, Check, ExternalLink, RotateCcw, ShieldAlert,
} from "lucide-react";
import { getUserId } from "@/lib/userId";
import { SpeakButton } from "@/components/speak-button";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const EXAMPLES = [
  { label: "MIT License", text: `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.` },
  { label: "Generic EULA Clause", text: `By installing, copying, or otherwise using the Software, you agree to be bound by the terms of this End-User License Agreement. If you do not agree to the terms of this Agreement, do not install or use the Software. The Software is licensed, not sold. This Agreement does not give you any rights to any intellectual property in the Software. The licensor reserves all rights not expressly granted to you.` },
  { label: "Asset Store Terms", text: `You are granted a non-exclusive, worldwide, royalty-free license to use, reproduce, display, and distribute the asset as part of your project. You may not resell, redistribute, or sublicense the asset as a standalone product. Attribution is not required but appreciated. The asset is provided "as is" without warranty of any kind.` },
];

export default function LegalDecoder() {
  const [legalText, setLegalText] = useState("");
  const [context, setContext] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [subscribeUrl, setSubscribeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (status === "running" || !legalText.trim()) return;
    setOutput(""); setStatus("running"); setSubscribeUrl(null);
    try {
      const res = await fetch(`${API_BASE}/api/forge/legal-decoder`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ legalText, context }),
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
  const copy = async () => { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg shrink-0" style={{ boxShadow: "0 0 24px rgba(100, 116, 139, 0.3)" }}>
          <Scale size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            Legal Decoder
            <Badge className="text-[10px] font-bold tracking-wider bg-slate-600 text-white border-0">MOON #6 · CREED</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Paste any license, EULA, contract clause, or legal wall of text. Forge translates it into plain English — what you can do, what you can't, and what to watch out for.</p>
        </div>
      </div>

      {/* Disclaimer banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200/80">
        <ShieldAlert size={14} className="shrink-0 mt-0.5 text-amber-400" />
        <span>This tool gives you a plain-English summary for your own understanding — not legal advice. For anything with real stakes (contracts, IP, licensing deals), talk to an actual attorney.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Legal Text <span className="text-primary">Required</span></Label>
            <Textarea
              value={legalText}
              onChange={e => setLegalText(e.target.value)}
              placeholder={"Paste any legal text here — license agreement, EULA, contract clause, terms of service, whatever you need decoded.\n\nIt can be long. Forge can handle it."}
              className="h-[280px] text-sm resize-none font-mono"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Context <span className="opacity-60">(optional)</span></Label>
            <Input value={context} onChange={e => setContext(e.target.value)} placeholder="e.g. Asset store license, employment contract, game engine EULA" className="text-sm" />
          </div>

          {/* Example snippets */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map(ex => (
                <button key={ex.label} onClick={() => setLegalText(ex.text)}
                  className="text-xs border border-border rounded-md px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={run} disabled={!legalText.trim() || status === "running"} className="w-full gap-2">
            {status === "running"
              ? <><Loader2 size={15} className="animate-spin" /> Decoding…</>
              : <><Wand2 size={15} /> Decode This</>
            }
          </Button>
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              Plain English Translation {status === "running" && <span className="ml-2 text-primary animate-pulse">Reading…</span>}
            </Label>
            <div className="flex gap-2">
              {output && <Button variant="ghost" size="sm" onClick={copy} className="h-7 gap-1.5 text-xs">{copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}{copied ? "Copied" : "Copy"}</Button>}
              {output && <SpeakButton text={output} className="h-7 w-7 rounded-md hover:bg-accent" />}
              {output && <Button variant="ghost" size="sm" onClick={reset} className="h-7 gap-1.5 text-xs text-muted-foreground"><RotateCcw size={12} /> Clear</Button>}
            </div>
          </div>
          <div className={cn(
            "min-h-[440px] rounded-md border p-4 text-sm leading-relaxed overflow-auto whitespace-pre-wrap",
            status === "error" ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-border bg-muted/10"
          )}>
            {output || (
              <div className="text-center mt-20 space-y-2">
                <Scale size={28} className="mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">Paste legal text and Forge will break it down — what you can do, what you can't, and what the red flags are.</p>
              </div>
            )}
            {status === "running" && <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse rounded-sm" />}
          </div>
          {subscribeUrl && (
            <a href={subscribeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-colors">
              Subscribe on the Town Square <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
