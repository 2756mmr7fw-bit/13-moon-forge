import { useState, useRef, useEffect, useCallback } from "react";
import {
  Flame, Send, Loader2, Download, Copy, Check, ChevronRight,
  FileCode, Terminal, CheckCircle2, Sparkles, FolderOpen,
  PlayCircle, AlertCircle, Gamepad2, Globe, Brain, Search,
  Smartphone, Zap, MonitorPlay, RotateCcw, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────
type BuildStatus = "idle" | "planning" | "building" | "done" | "error";

interface ParsedFile {
  path: string;
  content: string;
  language: string;
}

interface StreamEvent {
  type: string;
  text?: string;
  path?: string;
  content?: string;
  message?: string;
  fileCount?: number;
  files?: string[];
  setupContent?: string;
}

const DOMAIN_ICONS: Record<string, string> = {
  game: "🎮", web: "🌐", ai: "🧠", search: "🔍",
  mobile: "📱", api: "⚡", cli: "🖥️", anything: "🔥",
};

const EXAMPLE_PROMPTS = [
  { domain: "game", icon: "🎮", text: "Build me a 2D platformer game with a player that can run, jump, and collect coins. Include enemies that patrol and a game over screen." },
  { domain: "web", icon: "🌐", text: "Build a full-stack task manager app with user accounts, project boards, drag-and-drop cards, and real-time updates." },
  { domain: "ai", icon: "🧠", text: "Build an AI world with living agents that have free will, make decisions, age, and when they die their karma determines if they ascend, reincarnate, or are destroyed." },
  { domain: "search", icon: "🔍", text: "Build a search engine that crawls websites, indexes content, and ranks results by relevance. Include a clean search interface." },
  { domain: "api", icon: "⚡", text: "Build a REST API for a social network — users, posts, likes, follows, feed generation, and authentication." },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rs: "rust", go: "go", cpp: "cpp", cs: "csharp",
    gd: "gdscript", json: "json", yaml: "yaml", yml: "yaml",
    html: "html", css: "css", md: "markdown", sh: "bash",
    sql: "sql", toml: "toml", dockerfile: "dockerfile",
  };
  return map[ext] ?? "plaintext";
}

function FileIcon({ path }: { path: string }) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const color: Record<string, string> = {
    ts: "text-blue-400", tsx: "text-blue-400", js: "text-yellow-400",
    jsx: "text-yellow-400", py: "text-green-400", rs: "text-orange-400",
    go: "text-cyan-400", gd: "text-emerald-400", css: "text-pink-400",
    html: "text-red-400", json: "text-amber-400", md: "text-purple-400",
    sh: "text-lime-400",
  };
  return <FileCode className={cn("w-3.5 h-3.5 shrink-0", color[ext] ?? "text-muted-foreground")} />;
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return { copied, copy };
}

// ── Streaming log line ─────────────────────────────────────────────────────────
function NarrationLog({ text }: { text: string }) {
  return (
    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
      {text}
    </div>
  );
}

// ── File viewer ───────────────────────────────────────────────────────────────
function FileViewer({ file }: { file: ParsedFile }) {
  const { copied, copy } = useCopy(file.content);
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileIcon path={file.path} />
          <span className="text-xs font-mono text-foreground truncate">{file.path}</span>
        </div>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2">
          {copied ? <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copied</span></> : <><Copy className="w-3 h-3" />Copy</>}
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-xs font-mono leading-relaxed text-foreground/85 bg-[#0d1117]">
        <code>{file.content}</code>
      </pre>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ForgeCoderPage() {
  const [task, setTask] = useState("");
  const [status, setStatus] = useState<BuildStatus>("idle");
  const [narration, setNarration] = useState("");
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [activeFile, setActiveFile] = useState<ParsedFile | null>(null);
  const [buildingFile, setBuildingFile] = useState<string | null>(null);
  const [setupInstructions, setSetupInstructions] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentTask, setCurrentTask] = useState("");
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const narrationRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (narrationRef.current) {
      narrationRef.current.scrollTop = narrationRef.current.scrollHeight;
    }
  }, [narration]);

  useEffect(() => {
    if (files.length > 0 && !activeFile) setActiveFile(files[files.length - 1]);
  }, [files]);

  const startBuild = useCallback(async () => {
    if (!task.trim() || status === "building" || status === "planning") return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const thisTask = task.trim();
    setCurrentTask(thisTask);
    setStatus("planning");
    setNarration("");
    setFiles([]);
    setActiveFile(null);
    setBuildingFile(null);
    setSetupInstructions(null);
    setErrorMsg(null);
    setTask("");

    try {
      const res = await fetch(`${API_BASE}/api/agent/build`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: thisTask, history: history.slice(-6) }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        setStatus("error");
        setErrorMsg("Failed to connect to Forge Coder");
        return;
      }

      setStatus("building");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6)) as StreamEvent;
            switch (ev.type) {
              case "chunk":
                setNarration(prev => prev + (ev.text ?? ""));
                assistantText += ev.text ?? "";
                break;
              case "status":
                break;
              case "file_start":
                setBuildingFile(ev.path ?? null);
                break;
              case "file_complete":
                if (ev.path && ev.content !== undefined) {
                  const newFile: ParsedFile = {
                    path: ev.path,
                    content: ev.content,
                    language: detectLanguage(ev.path),
                  };
                  setFiles(prev => {
                    const existing = prev.findIndex(f => f.path === ev.path);
                    if (existing >= 0) {
                      const updated = [...prev];
                      updated[existing] = newFile;
                      return updated;
                    }
                    return [...prev, newFile];
                  });
                  setActiveFile(newFile);
                  setBuildingFile(null);
                }
                break;
              case "setup_complete":
                setSetupInstructions(ev.content ?? null);
                break;
              case "done":
                setStatus("done");
                setHistory(prev => [
                  ...prev,
                  { role: "user", content: thisTask },
                  { role: "assistant", content: assistantText },
                ]);
                break;
              case "error":
                setStatus("error");
                setErrorMsg(ev.message ?? "Something went wrong");
                break;
            }
          } catch { /* skip */ }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setStatus("error");
        setErrorMsg("Connection lost — try again");
      }
    }
  }, [task, status, history]);

  const handleDownload = async () => {
    if (files.length === 0) return;
    const fileMap: Record<string, string> = {};
    for (const f of files) fileMap[f.path] = f.content;
    const projectName = currentTask.slice(0, 30).replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const res = await fetch(`${API_BASE}/api/agent/download`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: fileMap, projectName }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setStatus("idle");
    setNarration("");
    setFiles([]);
    setActiveFile(null);
    setBuildingFile(null);
    setSetupInstructions(null);
    setErrorMsg(null);
    setCurrentTask("");
    setTask("");
  };

  const isBuilding = status === "building" || status === "planning";

  // ── Idle / input state ─────────────────────────────────────────────────────
  if (status === "idle" && !currentTask) {
    return (
      <div className="max-w-3xl space-y-8">
        {/* Hero */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Flame className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">Forge Coder</h1>
              <p className="text-sm text-muted-foreground">Expert programmer. Builds anything. Explain what you want — Forge does the rest.</p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <Textarea
            value={task}
            onChange={e => setTask(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) startBuild(); }}
            placeholder="Describe what you want built. Be as specific or as vague as you like — Forge will ask for clarification if needed..."
            className="min-h-[140px] text-sm font-mono resize-none bg-card border-border focus:ring-1 focus:ring-primary/30"
          />
          <div className="flex items-center gap-3">
            <Button onClick={startBuild} disabled={!task.trim()} size="lg" className="gap-2">
              <Flame className="w-4 h-4" />
              Build It
            </Button>
            <span className="text-xs text-muted-foreground">⌘ + Enter to build</span>
          </div>
        </div>

        {/* Capabilities */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">What Forge can build</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: "🎮", label: "Video Games", sub: "Godot · Phaser · Three.js" },
              { icon: "🧠", label: "AI Systems", sub: "Agents · RAG · ML models" },
              { icon: "🔍", label: "Search Engines", sub: "Crawlers · Indexers · UI" },
              { icon: "🌐", label: "Web Apps", sub: "React · Node.js · DBs" },
              { icon: "📱", label: "Mobile Apps", sub: "React Native · iOS · Android" },
              { icon: "⚡", label: "APIs", sub: "REST · GraphQL · WebSockets" },
              { icon: "🖥️", label: "CLI Tools", sub: "Automation · Scripts · Systems" },
              { icon: "🔥", label: "Anything", sub: "If you can describe it" },
            ].map(item => (
              <div key={item.label} className="p-3 bg-card border border-border rounded-xl">
                <span className="text-xl block mb-1">{item.icon}</span>
                <p className="text-xs font-medium leading-tight">{item.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Examples */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">Examples — click to use</p>
          <div className="space-y-2">
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <button
                key={i}
                onClick={() => setTask(ex.text)}
                className="w-full text-left flex items-start gap-3 p-3.5 bg-card border border-border rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <span className="text-lg shrink-0">{ex.icon}</span>
                <span className="text-sm text-muted-foreground group-hover:text-foreground leading-relaxed transition-colors">{ex.text}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Build in progress / done ───────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4" style={{ height: "calc(100vh - 8rem)" }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isBuilding && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
          {status === "done" && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
          {status === "error" && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          <p className="text-sm font-medium truncate">{currentTask}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status === "done" && files.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Download
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="w-3.5 h-3.5" />
            New Build
          </Button>
        </div>
      </div>

      {/* Main panels */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Left — narration + file tree */}
        <div className="w-72 shrink-0 flex flex-col gap-3 min-h-0">
          {/* Narration log */}
          <div
            ref={narrationRef}
            className="flex-1 bg-[#0d1117] border border-border rounded-xl p-4 overflow-y-auto min-h-0"
          >
            {status === "planning" && !narration && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Forge is thinking…
              </div>
            )}
            {narration && <NarrationLog text={narration} />}
            {status === "error" && (
              <p className="text-red-400 text-sm mt-2">{errorMsg}</p>
            )}
          </div>

          {/* File tree */}
          {(files.length > 0 || buildingFile) && (
            <div className="bg-card border border-border rounded-xl overflow-hidden shrink-0">
              <div className="px-3 py-2 border-b border-border bg-muted/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                  <FolderOpen className="w-3 h-3" />
                  Project Files ({files.length})
                </p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {files.map(f => (
                  <button
                    key={f.path}
                    onClick={() => setActiveFile(f)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left",
                      activeFile?.path === f.path
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    <FileIcon path={f.path} />
                    <span className="truncate font-mono">{f.path}</span>
                  </button>
                ))}
                {buildingFile && (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground/60">
                    <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                    <span className="truncate font-mono">{buildingFile}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Setup instructions */}
          {setupInstructions && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2 flex items-center gap-1.5">
                <Terminal className="w-3 h-3" /> How to run it
              </p>
              <pre className="text-xs text-emerald-300/80 font-mono whitespace-pre-wrap leading-relaxed">{setupInstructions}</pre>
            </div>
          )}
        </div>

        {/* Right — file viewer */}
        <div className="flex-1 bg-[#0d1117] border border-border rounded-xl overflow-hidden min-h-0 flex flex-col">
          {activeFile ? (
            <FileViewer file={activeFile} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/30 gap-3">
              {isBuilding ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm">Forge is writing your code…</p>
                </>
              ) : (
                <>
                  <FileCode className="w-10 h-10" />
                  <p className="text-sm">Files will appear here as they're created</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Follow-up input */}
      {status === "done" && (
        <div className="flex gap-3 shrink-0">
          <Textarea
            value={task}
            onChange={e => setTask(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) startBuild(); }}
            placeholder="Ask Forge to add a feature, fix something, or keep building…"
            className="flex-1 min-h-[60px] max-h-[120px] text-sm font-mono resize-none bg-card border-border"
            rows={2}
          />
          <Button onClick={startBuild} disabled={!task.trim()} className="self-end gap-1.5">
            <Send className="w-4 h-4" />
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
