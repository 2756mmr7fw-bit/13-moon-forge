import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, MessageSquare, FileText, Bug, Wand2,
  Loader2, Copy, Check, ExternalLink, Flame, RotateCcw,
  BookMarked, ClipboardList,
} from "lucide-react";
import { getUserId } from "@/lib/userId";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Shared streaming hook ────────────────────────────────────────────────────
function useForgeStream(endpoint: string) {
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [subscribeUrl, setSubscribeUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = async (body: object) => {
    if (status === "running") return;
    setOutput("");
    setStatus("running");
    setSubscribeUrl(null);
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No response stream");

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
            else if (ev.type === "done") { setStatus("done"); }
            else if (ev.type === "subscription_required") {
              setOutput(ev.error ?? "Subscription required.");
              setSubscribeUrl(ev.subscribeUrl ?? null);
              setStatus("error");
            }
            else if (ev.type === "error") { setOutput(ev.message ?? "Something went wrong."); setStatus("error"); }
          } catch { /* skip */ }
        }
      }
      if (status !== "error") setStatus("done");
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setOutput("Forge hit a snag. Check your connection and try again.");
        setStatus("error");
      }
    }
  };

  const reset = () => { setOutput(""); setStatus("idle"); setSubscribeUrl(null); };
  return { output, status, subscribeUrl, run, reset };
}

// ─── Shared output panel ──────────────────────────────────────────────────────
function OutputPanel({
  output, status, subscribeUrl, placeholder, onReset,
}: {
  output: string;
  status: string;
  subscribeUrl: string | null;
  placeholder: string;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          Forge's Output
          {status === "running" && (
            <span className="ml-2 text-primary animate-pulse">Thinking…</span>
          )}
        </Label>
        <div className="flex items-center gap-2">
          {output && (
            <Button variant="ghost" size="sm" onClick={copy} className="h-7 gap-1.5 text-xs">
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          )}
          {output && (
            <Button variant="ghost" size="sm" onClick={onReset} className="h-7 gap-1.5 text-xs text-muted-foreground">
              <RotateCcw size={12} /> Clear
            </Button>
          )}
        </div>
      </div>

      <div className={cn(
        "min-h-[320px] rounded-md border p-4 text-sm leading-relaxed font-mono overflow-auto whitespace-pre-wrap",
        status === "error" ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-border bg-muted/10 text-foreground"
      )}>
        {output || (
          <p className="text-muted-foreground text-center mt-16 font-sans">{placeholder}</p>
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
  );
}

// ─── Error Decoder ────────────────────────────────────────────────────────────
function ErrorDecoder() {
  const [error, setError] = useState("");
  const [context, setContext] = useState("");
  const stream = useForgeStream("/api/forge/decode-error");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Error / Crash Log</Label>
          <Textarea
            value={error}
            onChange={e => setError(e.target.value)}
            placeholder={"Paste your error, stack trace, or crash log here…\n\nNullPointerException at line 42\n  at PlayerController.Update (PlayerController.cs:42)\n  at ...\n\nOr just paste what the console says."}
            className="h-[220px] font-mono text-[13px] resize-none"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Context <span className="opacity-60">(optional)</span></Label>
          <Input
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="e.g. Unity 2023, C#, happens when player jumps near wall"
            className="text-sm"
          />
        </div>
        <Button
          onClick={() => stream.run({ error, context })}
          disabled={!error.trim() || stream.status === "running"}
          className="w-full gap-2"
        >
          {stream.status === "running"
            ? <><Loader2 size={15} className="animate-spin" /> Decoding…</>
            : <><Wand2 size={15} /> Decode This Error</>
          }
        </Button>
      </div>
      <OutputPanel
        output={stream.output}
        status={stream.status}
        subscribeUrl={stream.subscribeUrl}
        placeholder="Paste an error above and Forge will tell you exactly what broke, why, and how to fix it — in plain English."
        onReset={stream.reset}
      />
    </div>
  );
}

// ─── Comment Forge ────────────────────────────────────────────────────────────
function CommentForge() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("");
  const stream = useForgeStream("/api/forge/comment-code");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Your Code</Label>
          <Textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Paste any code — functions, classes, scripts. Forge will add thorough, professional comments without changing a single line of logic."
            className="h-[220px] font-mono text-[13px] resize-none"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Language <span className="opacity-60">(optional — Forge will detect it)</span></Label>
          <Input
            value={language}
            onChange={e => setLanguage(e.target.value)}
            placeholder="e.g. GDScript, C#, Python, JavaScript"
            className="text-sm"
          />
        </div>
        <Button
          onClick={() => stream.run({ code, language })}
          disabled={!code.trim() || stream.status === "running"}
          className="w-full gap-2"
        >
          {stream.status === "running"
            ? <><Loader2 size={15} className="animate-spin" /> Commenting…</>
            : <><MessageSquare size={15} /> Add Comments</>
          }
        </Button>
      </div>
      <OutputPanel
        output={stream.output}
        status={stream.status}
        subscribeUrl={stream.subscribeUrl}
        placeholder="Paste your code above and Forge will add professional comments to every function, class, and tricky line — no logic changed."
        onReset={stream.reset}
      />
    </div>
  );
}

// ─── Patch Notes ─────────────────────────────────────────────────────────────
function PatchNotes() {
  const [changes, setChanges] = useState("");
  const [projectName, setProjectName] = useState("");
  const [version, setVersion] = useState("");
  const stream = useForgeStream("/api/forge/patch-notes");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Project Name <span className="opacity-60">(optional)</span></Label>
            <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="My Game" className="text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Version <span className="opacity-60">(optional)</span></Label>
            <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="v1.2.0" className="text-sm" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">What Changed</Label>
          <Textarea
            value={changes}
            onChange={e => setChanges(e.target.value)}
            placeholder={"Describe your changes in plain language — Forge will turn it into professional patch notes.\n\nExamples:\n- fixed bug where enemies didn't die sometimes\n- added new sword weapon\n- made jumping feel better\n- fixed the crash on level 3"}
            className="h-[220px] text-sm resize-none"
          />
        </div>
        <Button
          onClick={() => stream.run({ changes, projectName, version })}
          disabled={!changes.trim() || stream.status === "running"}
          className="w-full gap-2"
        >
          {stream.status === "running"
            ? <><Loader2 size={15} className="animate-spin" /> Writing…</>
            : <><FileText size={15} /> Write Patch Notes</>
          }
        </Button>
      </div>
      <OutputPanel
        output={stream.output}
        status={stream.status}
        subscribeUrl={stream.subscribeUrl}
        placeholder="Describe what you changed in plain language above and Forge will write polished, player-facing patch notes."
        onReset={stream.reset}
      />
    </div>
  );
}

// ─── Bug Translator ───────────────────────────────────────────────────────────
function BugTranslator() {
  const [report, setReport] = useState("");
  const stream = useForgeStream("/api/forge/translate-bug");

  const examples = [
    `"the game breaks when I jump near the wall thing and then the screen goes black and I have to restart"`,
    `"sometimes my character just floats in the air for no reason?? happens like every 3rd time I play"`,
    `"the sword doesn't work right. it hits things but they don't die"`,
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Player Bug Report</Label>
          <Textarea
            value={report}
            onChange={e => setReport(e.target.value)}
            placeholder={"Paste exactly what the player said — spelling mistakes, vague language, and all.\n\nForge will translate it into a proper bug report you can actually act on."}
            className="h-[220px] text-sm resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Quick examples:</p>
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => setReport(ex.replace(/"/g, ""))}
              className="w-full text-left text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-2 hover:bg-muted/30 transition-colors line-clamp-2"
            >
              {ex}
            </button>
          ))}
        </div>
        <Button
          onClick={() => stream.run({ report })}
          disabled={!report.trim() || stream.status === "running"}
          className="w-full gap-2"
        >
          {stream.status === "running"
            ? <><Loader2 size={15} className="animate-spin" /> Translating…</>
            : <><Bug size={15} /> Translate Bug Report</>
          }
        </Button>
      </div>
      <OutputPanel
        output={stream.output}
        status={stream.status}
        subscribeUrl={stream.subscribeUrl}
        placeholder="Paste a confusing player report above. Forge will translate it into a structured, developer-ready bug report with steps, severity, and a likely cause."
        onReset={stream.reset}
      />
    </div>
  );
}

// ─── Readme Writer ────────────────────────────────────────────────────────────
function ReadmeWriter() {
  const [description, setDescription] = useState("");
  const [projectName, setProjectName] = useState("");
  const [tech, setTech] = useState("");
  const [features, setFeatures] = useState("");
  const [author, setAuthor] = useState("");
  const [license, setLicense] = useState("MIT");
  const stream = useForgeStream("/api/forge/readme-writer");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Project Name</Label>
            <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="My Awesome Project" className="text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Author / Team</Label>
            <Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Your name or team" className="text-sm" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Description <span className="text-primary">Required</span></Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this project do? What problem does it solve? Who is it for?" className="h-[100px] text-sm resize-none" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Tech Stack</Label>
          <Input value={tech} onChange={e => setTech(e.target.value)} placeholder="e.g. React, TypeScript, Node.js, Godot 4, Python" className="text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Key Features</Label>
          <Textarea value={features} onChange={e => setFeatures(e.target.value)} placeholder="List the main features or selling points — one per line or comma-separated." className="h-[80px] text-sm resize-none" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">License</Label>
          <Input value={license} onChange={e => setLicense(e.target.value)} placeholder="MIT" className="text-sm" />
        </div>
        <Button onClick={() => stream.run({ projectName, description, tech, features, author, license })} disabled={!description.trim() || stream.status === "running"} className="w-full gap-2">
          {stream.status === "running" ? <><Loader2 size={15} className="animate-spin" /> Writing README…</> : <><BookMarked size={15} /> Write My README</>}
        </Button>
      </div>
      <OutputPanel output={stream.output} status={stream.status} subscribeUrl={stream.subscribeUrl} placeholder="Fill in your project details and Forge will write a complete, professional README — ready to drop straight into your GitHub repo." onReset={stream.reset} />
    </div>
  );
}

// ─── Playtest Analyzer ────────────────────────────────────────────────────────
function PlaytestAnalyzer() {
  const [feedback, setFeedback] = useState("");
  const [projectName, setProjectName] = useState("");
  const [testerCount, setTesterCount] = useState("");
  const stream = useForgeStream("/api/forge/analyze-playtest");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Game / Project</Label>
            <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Project name" className="text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Number of Testers</Label>
            <Input value={testerCount} onChange={e => setTesterCount(e.target.value)} placeholder="e.g. 5" className="text-sm" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Raw Feedback <span className="text-primary">Required</span></Label>
          <Textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder={"Paste all your playtest notes here — messy is fine. Quotes, survey answers, Discord messages, whatever you've got.\n\nTester 1: 'The jump felt floaty and I kept dying to the second enemy'\nTester 2: 'Loved the art! Couldn't figure out how to open the inventory'\nTester 3: 'Fun! But the tutorial was confusing'"}
            className="h-[300px] text-sm resize-none"
          />
        </div>
        <Button onClick={() => stream.run({ feedback, projectName, testerCount })} disabled={!feedback.trim() || stream.status === "running"} className="w-full gap-2">
          {stream.status === "running" ? <><Loader2 size={15} className="animate-spin" /> Analyzing…</> : <><ClipboardList size={15} /> Analyze Feedback</>}
        </Button>
      </div>
      <OutputPanel output={stream.output} status={stream.status} subscribeUrl={stream.subscribeUrl} placeholder="Paste all your raw playtest notes above — notes, quotes, survey answers, all of it. Forge will distill it into a prioritized action plan: what's broken, what's working, and what to fix first." onReset={stream.reset} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const TOOLS = [
  { id: "error",    label: "Error Decoder",    icon: AlertTriangle, tag: "Paste error → get fix" },
  { id: "comments", label: "Comment Forge",    icon: MessageSquare, tag: "Paste code → get comments" },
  { id: "patch",    label: "Patch Notes",      icon: FileText,      tag: "Describe changes → get notes" },
  { id: "bug",      label: "Bug Translator",   icon: Bug,           tag: "Player report → dev report" },
  { id: "readme",   label: "Readme Writer",    icon: BookMarked,    tag: "Project details → full README" },
  { id: "playtest", label: "Playtest Analyzer", icon: ClipboardList, tag: "Raw feedback → action plan" },
];

export default function ForgeTools() {
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-700 to-orange-600 flex items-center justify-center shadow-lg shrink-0"
          style={{ boxShadow: "0 0 24px rgba(239, 68, 68, 0.25)" }}>
          <Flame size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            Forge Tools
            <Badge variant="secondary" className="text-[10px] font-bold tracking-wider">MOON #5 · FORGE</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Four AI-powered tools that handle the tedious parts of development — so you can stay in the build.
          </p>
        </div>
      </div>

      <Tabs defaultValue="error">
        <TabsList className="flex-wrap h-auto gap-1 mb-6">
          {TOOLS.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="gap-1.5 data-[state=active]:text-primary">
              <t.icon size={13} />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TOOLS.map(t => (
          <div key={t.id} className="mb-4">
            <TabsContent value={t.id}>
              <div className="mb-5 px-3 py-2 rounded-md bg-muted/30 border border-border inline-flex items-center gap-2">
                <t.icon size={13} className="text-primary" />
                <span className="text-xs text-muted-foreground">{t.tag}</span>
              </div>
              {t.id === "error"    && <ErrorDecoder />}
              {t.id === "comments" && <CommentForge />}
              {t.id === "patch"    && <PatchNotes />}
              {t.id === "bug"      && <BugTranslator />}
              {t.id === "readme"   && <ReadmeWriter />}
              {t.id === "playtest" && <PlaytestAnalyzer />}
            </TabsContent>
          </div>
        ))}
      </Tabs>
    </div>
  );
}
