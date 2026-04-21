import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Eye, EyeOff, Loader2, Send, MonitorPlay, Shield, Sparkles,
  StopCircle, RefreshCw, Volume2, VolumeX, Download, Zap,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Goal options ──────────────────────────────────────────────────────────────
const GOAL_OPTIONS = [
  { id: "fix",     label: "Fix a problem",         emoji: "🔧" },
  { id: "gaming",  label: "Gaming setup",           emoji: "🎮" },
  { id: "gamedev", label: "Learning Godot",         emoji: "🕹️" },
  { id: "setup",   label: "Setting up my PC",       emoji: "💻" },
  { id: "general", label: "Just walk me through it",emoji: "🧭" },
];

// ── Quick-fix recipes ─────────────────────────────────────────────────────────
const QUICK_FIXES = [
  { emoji: "🐌", label: "PC is slow",          prompt: "My computer is running very slowly. Look at my screen and help me figure out why and how to fix it." },
  { emoji: "💥", label: "Game keeps crashing", prompt: "My game keeps crashing or freezing. Look at my screen and help me diagnose and fix the issue." },
  { emoji: "📶", label: "WiFi problems",        prompt: "I am having trouble connecting to WiFi or the internet. Look at my screen and walk me through fixing it." },
  { emoji: "🖥️", label: "New PC setup",        prompt: "I just got a new computer and need help setting it up. Look at my screen and guide me through the whole setup." },
  { emoji: "💙", label: "Blue screen / BSOD",  prompt: "I got a blue screen of death error. Help me understand what happened and how to fix it." },
  { emoji: "🔇", label: "No sound",             prompt: "My audio is not working. Look at my screen and help me fix the sound issue." },
  { emoji: "🎮", label: "Optimize for gaming", prompt: "I want to optimize my PC for the best gaming performance. Guide me through all the settings I should change." },
  { emoji: "🦠", label: "Think I have a virus", prompt: "I think my computer might have a virus or malware. Look at my screen and help me check and clean it." },
];

interface ChatMessage {
  role: "user" | "forge";
  text: string;
  timestamp: Date;
}

// ── Streaming fetch ───────────────────────────────────────────────────────────
async function streamAnalyze(
  screenshot: string,
  question: string,
  goal: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: () => void,
) {
  try {
    const res = await fetch(`${API_BASE}/api/screen-coach/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screenshot, question, goal }),
    });
    if (!res.body) throw new Error("No stream");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") { onDone(); return; }
        try {
          const j = JSON.parse(raw);
          const delta = j.choices?.[0]?.delta?.content ?? "";
          if (delta) onChunk(delta);
        } catch { /* skip */ }
      }
    }
    onDone();
  } catch { onError(); }
}

// ── Capture frame as base64 JPEG ──────────────────────────────────────────────
function captureFrame(video: HTMLVideoElement, maxW = 1280): string {
  const scale = Math.min(1, maxW / video.videoWidth);
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")?.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.65).split(",")[1];
}

// ── Frame diff for smart auto-watch ──────────────────────────────────────────
function getFramePixels(video: HTMLVideoElement, w = 160, h = 90): ImageData | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  } catch { return null; }
}

function calcDiff(a: ImageData, b: ImageData): number {
  let diff = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    diff += Math.abs(a.data[i] - b.data[i])
           + Math.abs(a.data[i+1] - b.data[i+1])
           + Math.abs(a.data[i+2] - b.data[i+2]);
  }
  return diff / (a.data.length / 4 * 3);
}

// ── Text-to-Speech ────────────────────────────────────────────────────────────
function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`{1,3}/g, "")
    .replace(/\n+/g, " ")
    .trim();
  const utt = new SpeechSynthesisUtterance(clean);
  utt.rate = 1.05;
  utt.pitch = 1.0;
  window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
  window.speechSynthesis?.cancel();
}

// ── Pointer hint detector ─────────────────────────────────────────────────────
function detectPointerHint(text: string): { x: number; y: number } | null {
  const t = text.toLowerCase();
  if (/(top[\s-]left|upper[\s-]left)/.test(t))       return { x: 12, y: 12 };
  if (/(top[\s-]right|upper[\s-]right)/.test(t))      return { x: 88, y: 12 };
  if (/(bottom[\s-]left|lower[\s-]left)/.test(t))     return { x: 12, y: 88 };
  if (/(bottom[\s-]right|lower[\s-]right)/.test(t))   return { x: 88, y: 88 };
  if (/(taskbar|start menu|start button|windows key)/.test(t)) return { x: 5, y: 96 };
  if (/(title bar|menu bar|top of the (screen|window))/.test(t)) return { x: 50, y: 4 };
  if (/(at the top|near the top|top of)/.test(t))     return { x: 50, y: 12 };
  if (/(at the bottom|near the bottom|bottom of)/.test(t)) return { x: 50, y: 88 };
  if (/(left (side|panel|sidebar|column)|on the left)/.test(t)) return { x: 12, y: 50 };
  if (/(right (side|panel|sidebar)|on the right)/.test(t))      return { x: 88, y: 50 };
  if (/(center|middle of the)/.test(t))               return { x: 50, y: 50 };
  return null;
}

// ── Session export ────────────────────────────────────────────────────────────
function exportSession(chat: ChatMessage[], goal: string) {
  const header = [
    "FORGE SCREEN COACH — SESSION SUMMARY",
    `Date: ${new Date().toLocaleString()}`,
    `Goal: ${GOAL_OPTIONS.find(g => g.id === goal)?.label ?? "General help"}`,
    "─".repeat(50),
    "",
  ].join("\n");

  const body = chat.map(m => {
    const who = m.role === "forge" ? "FORGE" : "YOU";
    const time = m.timestamp.toLocaleTimeString();
    return `[${time}] ${who}:\n${m.text}`;
  }).join("\n\n");

  const blob = new Blob([header + body], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `forge-session-${new Date().toISOString().split("T")[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onToggle, label, sub }: { on: boolean; onToggle: () => void; label: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
      <div>
        <p className="text-xs font-semibold">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      <button onClick={onToggle}
        className={`relative w-10 h-5 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted-foreground/30"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ScreenCoach() {
  const [sharing, setSharing] = useState(false);
  const [goal, setGoal] = useState("general");
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [autoWatch, setAutoWatch] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [smartStatus, setSmartStatus] = useState<"idle" | "watching" | "changed">("idle");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const lastAnalysisRef = useRef<number>(0);
  const streamingRef = useRef(false);

  // Keep streamingRef in sync
  useEffect(() => { streamingRef.current = streaming; }, [streaming]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // Cleanup on unmount
  useEffect(() => () => {
    stopSpeaking();
    doStopSharing();
  }, []);

  const doStopSharing = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setSharing(false);
    setAutoWatch(false);
    clearAuto();
    stopSpeaking();
    setPointer(null);
  };

  const clearAuto = () => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = null;
    setSmartStatus("idle");
    prevFrameRef.current = null;
  };

  const startSharing = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 5 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      stream.getVideoTracks()[0].addEventListener("ended", doStopSharing);
      setSharing(true);
      const welcome = "I can see your screen now. Tell me what you need help with, or click \"Ask Forge\" and I'll look and tell you what I notice. You can also pick one of the quick-fix buttons below.";
      setChat([{ role: "forge", text: welcome, timestamp: new Date() }]);
      if (voiceOn) speak(welcome);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "NotAllowedError") {
        setError("Could not start screen sharing. Make sure you're using Chrome, Edge, or Firefox and click Allow when prompted.");
      }
    }
  };

  const askForge = useCallback(async (autoQuestion?: string, silent = false) => {
    if (!videoRef.current || !sharing || streamingRef.current) return;
    const q = autoQuestion ?? question.trim();
    const screenshot = captureFrame(videoRef.current);

    if (!silent && !autoQuestion && q) {
      setChat(c => [...c, { role: "user", text: q, timestamp: new Date() }]);
      setQuestion("");
    }

    setStreaming(true);
    streamingRef.current = true;
    let acc = "";
    const timestamp = new Date();
    setChat(c => [...c, { role: "forge", text: "", timestamp }]);

    await streamAnalyze(
      screenshot,
      q || "Look at my screen and tell me what you see. Any advice or next steps?",
      GOAL_OPTIONS.find(g => g.id === goal)?.label ?? "General help",
      (chunk) => {
        acc += chunk;
        setChat(c => {
          const updated = [...c];
          const last = updated[updated.length - 1];
          if (last?.role === "forge") updated[updated.length - 1] = { ...last, text: acc };
          return updated;
        });
      },
      () => {
        setStreaming(false);
        streamingRef.current = false;
        // Voice
        if (voiceOn) speak(acc);
        // Visual pointer
        const hint = detectPointerHint(acc);
        if (hint) {
          setPointer(hint);
          setTimeout(() => setPointer(null), 8000);
        }
        lastAnalysisRef.current = Date.now();
      },
      () => {
        setStreaming(false);
        streamingRef.current = false;
        setChat(c => {
          const updated = [...c];
          const last = updated[updated.length - 1];
          if (last?.role === "forge" && !last.text) {
            updated[updated.length - 1] = { ...last, text: "Something went wrong. Please try again." };
          }
          return updated;
        });
      },
    );
  }, [sharing, question, goal, voiceOn]);

  // ── Smart auto-watch: polls every 2s, triggers AI when screen changes ────────
  const MIN_TRIGGER_GAP = 15_000; // ms between auto-analyses
  const DIFF_THRESHOLD = 8;       // avg pixel change to consider "significant"

  useEffect(() => {
    clearAuto();
    if (!autoWatch || !sharing) return;

    // Immediately do first analysis
    askForge("Take a look at my screen and tell me what you notice — what I should do, what could be improved.");
    setSmartStatus("watching");

    autoTimerRef.current = setInterval(() => {
      if (!videoRef.current || streamingRef.current) return;
      const now = Date.now();
      const curr = getFramePixels(videoRef.current);
      if (!curr) return;

      if (prevFrameRef.current) {
        const diff = calcDiff(prevFrameRef.current, curr);
        if (diff > DIFF_THRESHOLD && (now - lastAnalysisRef.current) > MIN_TRIGGER_GAP) {
          setSmartStatus("changed");
          askForge("Something changed on the screen. Tell me what you see and what I should do next.", true);
          setTimeout(() => setSmartStatus("watching"), 3000);
        }
      }
      prevFrameRef.current = curr;
    }, 2000);

    return clearAuto;
  }, [autoWatch, sharing]);

  const supported = !!navigator.mediaDevices?.getDisplayMedia;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <MonitorPlay size={22} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Screen Coach</h1>
          <p className="text-sm text-muted-foreground">Share your screen — Forge sees exactly what you see and walks you through everything</p>
        </div>
      </div>

      {!supported && (
        <div className="p-4 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-destructive">
          Screen sharing isn't supported in your browser. Please use Chrome, Edge, or Firefox on a desktop computer.
        </div>
      )}

      {/* Goal selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What do you need help with?</p>
        <div className="flex flex-wrap gap-2">
          {GOAL_OPTIONS.map(g => (
            <button key={g.id} onClick={() => setGoal(g.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all ${goal === g.id ? "border-primary bg-primary/10 text-foreground font-medium" : "border-border hover:border-primary/40 text-muted-foreground"}`}>
              <span>{g.emoji}</span> {g.label}
            </button>
          ))}
        </div>
      </div>

      {!sharing ? (
        /* ── Pre-share ──────────────────────────────────────────────────────── */
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center gap-5 py-12 text-center border border-dashed border-border rounded-xl bg-muted/10">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Eye size={40} className="text-primary" />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="text-xl font-bold">Let Forge see your screen</h2>
              <p className="text-sm text-muted-foreground">
                Click Share and choose your screen or window. Forge watches it live and gives you
                real, precise guidance based on exactly what it sees.
              </p>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-muted/30 border border-border rounded-lg px-4 py-3 max-w-sm text-left">
              <Shield size={14} className="text-green-400 mt-0.5 shrink-0" />
              <span>
                <span className="text-foreground font-medium">Never recorded or stored.</span> Screenshots are analyzed in real-time and immediately discarded. Stop sharing any time.
              </span>
            </div>
            {error && <p className="text-sm text-destructive max-w-sm">{error}</p>}
            <Button onClick={startSharing} size="lg" className="gap-2" disabled={!supported}>
              <MonitorPlay size={18} /> Share My Screen
            </Button>
            <p className="text-xs text-muted-foreground">Chrome, Edge, Firefox · No download required</p>
          </div>

          {/* Quick-fix recipes */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Common problems — click one to jump straight in</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {QUICK_FIXES.map(fix => (
                <button key={fix.label} onClick={async () => { await startSharing(); }}
                  title={fix.prompt}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border bg-muted/10 hover:border-primary/40 hover:bg-muted/30 transition-all text-center">
                  <span className="text-2xl">{fix.emoji}</span>
                  <span className="text-xs font-medium leading-tight">{fix.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Clicking any of these shares your screen and starts Forge focused on that problem</p>
          </div>

          {/* How it works */}
          <div className="space-y-3 pt-1 border-t border-border">
            <p className="text-sm font-semibold">How it works</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { n: "1", title: "Share your screen", body: "Choose which screen or window to share. Nothing is recorded — it's analyzed live." },
                { n: "2", title: "Ask or let Forge watch", body: "Type a question, or turn on Smart Watch and Forge reacts the moment your screen changes." },
                { n: "3", title: "Forge talks you through it", body: "Voice mode on by default — Forge speaks the steps so you can keep your eyes on the screen." },
              ].map(step => (
                <div key={step.n} className="flex gap-3 p-3 rounded-lg border border-border bg-muted/10">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">{step.n}</div>
                  <div>
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Active session ─────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Screen + controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${smartStatus === "changed" ? "bg-yellow-400" : "bg-green-400"}`} />
                <span className={`text-xs font-semibold ${smartStatus === "changed" ? "text-yellow-400" : "text-green-400"}`}>
                  {smartStatus === "changed" ? "Screen changed — analyzing…" : "Live Screen"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPreviewVisible(v => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {previewVisible ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
                </button>
                <button onClick={doStopSharing}
                  className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors">
                  <StopCircle size={12} /> Stop
                </button>
              </div>
            </div>

            {/* Video + pointer overlay */}
            <div className={`relative rounded-lg border border-border overflow-hidden bg-black ${previewVisible ? "" : "hidden"}`}
              style={{ aspectRatio: "16/9" }}>
              <video ref={videoRef} muted playsInline className="w-full h-full object-contain" />
              {pointer && (
                <div
                  className="absolute pointer-events-none"
                  style={{ left: `${pointer.x}%`, top: `${pointer.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  <div className="relative w-6 h-6">
                    <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
                    <div className="absolute inset-1 rounded-full bg-primary" />
                  </div>
                </div>
              )}
            </div>

            {/* Toggles */}
            <div className="space-y-1.5">
              <Toggle
                on={autoWatch}
                onToggle={() => setAutoWatch(v => !v)}
                label="Smart Watch"
                sub={autoWatch
                  ? smartStatus === "changed" ? "Screen change detected — checking now…" : "Watching for screen changes"
                  : "Forge reacts automatically when your screen changes"}
              />
              <Toggle
                on={voiceOn}
                onToggle={() => { setVoiceOn(v => !v); if (voiceOn) stopSpeaking(); }}
                label="Voice Mode"
                sub={voiceOn ? "Forge is speaking responses aloud" : "Voice off — responses shown in chat only"}
              />
            </div>

            {/* Quick fixes during session */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Quick problems</p>
              <div className="grid grid-cols-4 gap-1.5">
                {QUICK_FIXES.slice(0, 4).map(fix => (
                  <button key={fix.label}
                    onClick={() => askForge(fix.prompt)}
                    disabled={streaming}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border bg-muted/10 hover:border-primary/40 hover:bg-muted/30 transition-all disabled:opacity-50">
                    <span className="text-lg">{fix.emoji}</span>
                    <span className="text-[10px] text-center leading-tight">{fix.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Chat */}
          <div className="flex flex-col gap-3" style={{ height: "580px" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Forge's Guidance</span>
              <div className="flex items-center gap-2">
                {chat.length > 1 && (
                  <button
                    onClick={() => exportSession(chat, goal)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Download size={11} /> Save
                  </button>
                )}
                {chat.length > 1 && (
                  <button onClick={() => { setChat([]); stopSpeaking(); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <RefreshCw size={11} /> Clear
                  </button>
                )}
                {voiceOn && (
                  <button onClick={stopSpeaking}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <VolumeX size={11} /> Shush
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {chat.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "forge" && (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={13} className="text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
                    msg.role === "forge"
                      ? "bg-muted/40 border border-border text-foreground"
                      : "bg-primary/10 border border-primary/20 text-foreground ml-auto"
                  }`}>
                    {msg.text || (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 size={12} className="animate-spin" /> Looking at your screen…
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="space-y-2">
              <Textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder={`Ask anything… "Why is my game slow?" · "What do I click?" · "What's wrong here?"`}
                rows={2}
                className="resize-none text-sm"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askForge(); } }}
              />
              <div className="flex items-center gap-2">
                <Button onClick={() => askForge()} disabled={streaming} className="flex-1 gap-1.5" size="sm">
                  {streaming
                    ? <><Loader2 size={14} className="animate-spin" /> Forge is looking…</>
                    : <><Eye size={14} /> Ask Forge to Look</>}
                </Button>
                <Button variant="outline" size="sm" disabled={streaming}
                  onClick={() => askForge("Take a quick look at my screen. What do you notice?")}
                  className="gap-1.5 whitespace-nowrap">
                  <Zap size={13} /> Quick Look
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                Enter to send · {voiceOn ? "🔊 Voice on — Forge will speak the answer" : "Voice off"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
