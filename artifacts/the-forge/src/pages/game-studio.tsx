import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Gamepad2, Wand2, Download, Loader2, Copy, Check, ExternalLink,
  MessageSquare, Code2, Play, FolderOpen, Monitor, Sparkles, AlertCircle,
} from "lucide-react";
import { getUserId } from "@/lib/userId";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Streaming hook (same pattern as game-design-tools) ────────────────────────
function useForgeStream(endpoint: string) {
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");

  const run = async (body: object) => {
    if (status === "running") return;
    setOutput(""); setStatus("running");
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
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") { setStatus("done"); return; }
          try {
            const j = JSON.parse(raw);
            const delta = j.choices?.[0]?.delta?.content ?? j.text ?? "";
            acc += delta; setOutput(acc);
          } catch { /* skip bad chunk */ }
        }
      }
      setStatus("done");
    } catch (e) {
      console.error(e); setStatus("error");
    }
  };

  return { output, status, run, reset: () => { setOutput(""); setStatus("idle"); } };
}

// ── Copy button helper ─────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      title="Copy to clipboard"
      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

// ── AI prompts ─────────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: "Player movement", prompt: "Write GDScript for smooth top-down player movement with WASD keys and a speed variable." },
  { label: "Enemy AI", prompt: "Write GDScript for a simple enemy that chases the player when they get close and patrols otherwise." },
  { label: "Coin collectibles", prompt: "Write GDScript for a collectible coin that disappears when the player touches it and adds to a score counter." },
  { label: "Health system", prompt: "Write a GDScript health system with max health, current health, take damage, and heal functions plus a death signal." },
  { label: "Jump & gravity", prompt: "Write GDScript for a 2D platformer character with jumping, gravity, and coyote time (brief jump after walking off an edge)." },
  { label: "Save/Load game", prompt: "Write GDScript to save and load game data (player position, score, level) to a local file using ConfigFile." },
  { label: "Game scene structure", prompt: "Describe the recommended Godot 4 scene tree structure for a 2D platformer game with a player, enemies, and collectibles." },
  { label: "UI health bar", prompt: "Write GDScript for a health bar UI that smoothly animates when the player takes damage." },
];

// ── Transfer steps ─────────────────────────────────────────────────────────────
const TRANSFER_STEPS = [
  {
    icon: Download,
    title: "Download Godot Desktop",
    body: "Go to godotengine.org and download the free Godot 4 editor for Windows, Mac, or Linux. It installs in seconds — no account needed.",
    link: { label: "Download Godot 4", url: "https://godotengine.org/download" },
  },
  {
    icon: FolderOpen,
    title: "Export your web project",
    body: 'In the Godot Web Editor, click the hamburger menu (top-left) → "Project" → "Export Project as ZIP". Save the .zip file to your computer.',
  },
  {
    icon: Monitor,
    title: "Open it on your computer",
    body: 'Unzip the downloaded file. Open the Godot desktop editor, click "Import", then navigate to the unzipped folder and select the project.godot file.',
  },
  {
    icon: Play,
    title: "Run and keep building",
    body: "Everything you built in the browser will be there. You now own a full local copy. Keep building, test with F5, and deploy to PC/Mac/Android/iOS when ready.",
  },
];

// ── Godot Editor Tab ─────────────────────────────────────────────────────────
function GodotEditorTab() {
  const [loaded, setLoaded] = useState(false);
  const [launched, setLaunched] = useState(false);

  if (!launched) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] gap-6 text-center px-8">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Gamepad2 size={40} className="text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Godot Game Editor</h2>
          <p className="text-muted-foreground max-w-md">
            The full Godot 4 game engine — right here in your browser. No download, no install.
            Build your game, then transfer it to your computer when you're ready.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-2.5 max-w-md">
          <AlertCircle size={16} className="shrink-0" />
          <span>The editor loads from godotengine.org — it may take 10–30 seconds on first open.</span>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setLaunched(true)} size="lg" className="gap-2">
            <Play size={18} /> Launch Godot Editor
          </Button>
          <Button
            variant="outline" size="lg"
            onClick={() => window.open("https://editor.godotengine.org/releases/latest/", "_blank")}
            className="gap-2"
          >
            <ExternalLink size={16} /> Open in New Tab
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Powered by the official <a href="https://editor.godotengine.org" target="_blank" rel="noreferrer" className="text-primary hover:underline">Godot Web Editor</a> — free and open source
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: "680px" }}>
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background rounded-lg z-10">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading Godot editor…</p>
          <p className="text-xs text-muted-foreground">First load may take up to 30 seconds</p>
        </div>
      )}
      <iframe
        src="https://editor.godotengine.org/releases/latest/"
        className="w-full h-full rounded-lg border border-border"
        onLoad={() => setLoaded(true)}
        allow="cross-origin-isolated"
        title="Godot Web Editor"
      />
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground px-1">
        <span>Godot Web Editor — your work is saved in your browser until you export it</span>
        <button
          onClick={() => window.open("https://editor.godotengine.org/releases/latest/", "_blank")}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ExternalLink size={12} /> Full screen
        </button>
      </div>
    </div>
  );
}

// ── AI Assistant Tab ──────────────────────────────────────────────────────────
function AIAssistantTab() {
  const [question, setQuestion] = useState("");
  const { output, status, run, reset } = useForgeStream("/api/game-tools/generate");
  const outputRef = useRef<HTMLDivElement>(null);

  const submit = () => {
    if (!question.trim()) return;
    run({ tool: "mechanic", prompt: question, genre: "Godot 4 GDScript game" });
  };

  const useQuick = (prompt: string) => {
    setQuestion(prompt);
    run({ tool: "mechanic", prompt, genre: "Godot 4 GDScript game" });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <Sparkles size={20} className="text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Forge AI — Godot Game Assistant</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ask anything about building a Godot game. Get GDScript code, design advice, or step-by-step explanations — then copy it straight into the editor.
          </p>
        </div>
      </div>

      {/* Quick prompts */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Starters</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(q => (
            <button
              key={q.label}
              onClick={() => useQuick(q.prompt)}
              disabled={status === "running"}
              className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <Textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Describe what you want to build... e.g. 'How do I make a door that opens when the player stands nearby?' or 'Write a script for a shooting mechanic'"
          rows={3}
          className="resize-none"
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Ctrl+Enter to send</span>
          <div className="flex gap-2">
            {(output || status !== "idle") && (
              <Button variant="ghost" size="sm" onClick={reset}>Clear</Button>
            )}
            <Button onClick={submit} disabled={status === "running" || !question.trim()} size="sm" className="gap-1.5">
              {status === "running" ? <><Loader2 size={14} className="animate-spin" /> Thinking…</> : <><MessageSquare size={14} /> Ask Forge</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Output */}
      {(output || status === "running") && (
        <div className="rounded-lg border border-border bg-muted/30 overflow-hidden" ref={outputRef}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Code2 size={13} />
              <span>Forge's answer — copy the code directly into Godot</span>
            </div>
            <div className="flex items-center gap-1">
              {status === "done" && <Badge variant="outline" className="text-[10px] text-green-400 border-green-400/30">Done</Badge>}
              {status === "running" && <Badge variant="outline" className="text-[10px] text-primary border-primary/30 animate-pulse">Writing…</Badge>}
              <CopyButton text={output} />
            </div>
          </div>
          <pre className="p-4 text-sm text-foreground whitespace-pre-wrap font-mono overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed">
            {output}
            {status === "running" && <span className="animate-pulse text-primary">▋</span>}
          </pre>
        </div>
      )}

      {status === "error" && (
        <p className="text-sm text-destructive text-center">Something went wrong. Please try again.</p>
      )}
    </div>
  );
}

// ── Transfer Tab ──────────────────────────────────────────────────────────────
function TransferTab() {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-green-400/5 border border-green-400/20">
        <p className="text-sm font-semibold text-green-400 mb-1">Your game, your files — forever</p>
        <p className="text-xs text-muted-foreground">
          Everything you build in the Godot web editor can be exported as a zip and opened in
          the free desktop Godot editor. No subscriptions. No lock-in. It's just files on your computer.
        </p>
      </div>

      <div className="space-y-4">
        {TRANSFER_STEPS.map((step, i) => (
          <div key={i} className="flex gap-4 p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors">
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <step.icon size={15} className="text-primary shrink-0" />
                <p className="font-semibold text-sm">{step.title}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              {step.link && (
                <a
                  href={step.link.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary hover:underline"
                >
                  <ExternalLink size={12} /> {step.link.label}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
        <p className="text-sm font-semibold">What can Godot desktop do that the browser can't?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
          {[
            ["🎮", "Export to Windows, Mac, Linux, iOS, Android"],
            ["⚡", "Full performance — no browser memory limits"],
            ["🔌", "Use C# and GDExtension plugins"],
            ["🖥️", "Connect to local databases and files"],
            ["🎵", "Import larger audio and texture assets"],
            ["🌐", "Publish your game to Steam or itch.io"],
          ].map(([icon, text]) => (
            <div key={text as string} className="flex items-start gap-2 p-2 rounded bg-muted/30">
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open("https://godotengine.org/download", "_blank")}>
          <Download size={14} /> Download Godot 4 (Free)
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open("https://docs.godotengine.org/en/stable/getting_started/introduction/index.html", "_blank")}>
          <ExternalLink size={14} /> Godot Beginner Docs
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open("https://godotengine.org/asset-library/asset", "_blank")}>
          <Wand2 size={14} /> Free Game Assets
        </Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GameStudio() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Gamepad2 size={22} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Game Studio</h1>
          <p className="text-sm text-muted-foreground">Build games with Godot in your browser — AI helps you write the code</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="editor">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor" className="gap-1.5">
            <Gamepad2 size={14} /> Godot Editor
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <Sparkles size={14} /> AI Assistant
          </TabsTrigger>
          <TabsTrigger value="transfer" className="gap-1.5">
            <Download size={14} /> Transfer to Desktop
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-4">
          <GodotEditorTab />
        </TabsContent>
        <TabsContent value="ai" className="mt-4">
          <AIAssistantTab />
        </TabsContent>
        <TabsContent value="transfer" className="mt-4">
          <TransferTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
