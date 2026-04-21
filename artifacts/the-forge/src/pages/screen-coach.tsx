import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Eye, EyeOff, Loader2, Send, MonitorPlay, Shield, Sparkles,
  StopCircle, RefreshCw, Volume2, VolumeX, ChevronDown,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const GOAL_OPTIONS = [
  { id: "fix",     label: "Fix a problem",        emoji: "🔧" },
  { id: "gaming",  label: "Gaming setup",          emoji: "🎮" },
  { id: "gamedev", label: "Learning Godot",        emoji: "🕹️" },
  { id: "setup",   label: "Setting up my PC",      emoji: "💻" },
  { id: "general", label: "Just walk me through it",emoji: "🧭" },
];

interface ChatMessage {
  role: "user" | "forge";
  text: string;
  timestamp: Date;
}

// ── Streaming fetch ─────────────────────────────────────────────────────────
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

// ── Capture current video frame as base64 JPEG ─────────────────────────────
function captureFrame(video: HTMLVideoElement, maxW = 1280): string {
  const scale = Math.min(1, maxW / video.videoWidth);
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")?.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.65).split(",")[1];
}

export default function ScreenCoach() {
  const [sharing, setSharing] = useState(false);
  const [goal, setGoal] = useState("general");
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [autoWatch, setAutoWatch] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // Cleanup on unmount
  useEffect(() => () => {
    stopSharing();
    clearAutoWatch();
  }, []);

  const stopSharing = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setSharing(false);
    setAutoWatch(false);
    clearAutoWatch();
  };

  const clearAutoWatch = () => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    autoTimerRef.current = null;
    countdownRef.current = null;
    setAutoCountdown(0);
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
      stream.getVideoTracks()[0].addEventListener("ended", stopSharing);
      setSharing(true);
      setChat([{
        role: "forge",
        text: "I can see your screen now. Tell me what you need help with, or just click \"Ask Forge\" and I'll take a look and tell you what I notice.",
        timestamp: new Date(),
      }]);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "NotAllowedError") {
        setError("Could not start screen sharing. Make sure you're using Chrome, Edge, or Firefox and click Allow when prompted.");
      }
    }
  };

  const askForge = useCallback(async (autoQuestion?: string) => {
    if (!videoRef.current || !sharing || streaming) return;
    const q = autoQuestion ?? question.trim();
    const screenshot = captureFrame(videoRef.current);

    // Add user message (only if manual question)
    if (!autoQuestion && q) {
      setChat(c => [...c, { role: "user", text: q, timestamp: new Date() }]);
      setQuestion("");
    }

    setStreaming(true);
    let acc = "";
    const timestamp = new Date();

    // Add placeholder Forge message
    setChat(c => [...c, { role: "forge", text: "", timestamp }]);

    await streamAnalyze(
      screenshot,
      q || "Please look at my screen and tell me what you see. Any advice?",
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
      () => setStreaming(false),
      () => {
        setStreaming(false);
        setChat(c => {
          const updated = [...c];
          const last = updated[updated.length - 1];
          if (last?.role === "forge" && !last.text) {
            updated[updated.length - 1] = { ...last, text: "Something went wrong analyzing the screen. Please try again." };
          }
          return updated;
        });
      },
    );
  }, [sharing, streaming, question, goal]);

  // Auto-watch logic
  const AUTO_INTERVAL = 20; // seconds
  useEffect(() => {
    clearAutoWatch();
    if (!autoWatch || !sharing) return;

    // Trigger immediately then every AUTO_INTERVAL seconds
    askForge("Take a look at my screen and tell me anything useful — what you see, what I should do, what could be better.");
    setAutoCountdown(AUTO_INTERVAL);

    countdownRef.current = setInterval(() => {
      setAutoCountdown(c => (c <= 1 ? AUTO_INTERVAL : c - 1));
    }, 1000);

    autoTimerRef.current = setInterval(() => {
      askForge("Take another look at my screen. What's changed? Any new advice or next steps?");
    }, AUTO_INTERVAL * 1000);

    return clearAutoWatch;
  }, [autoWatch]);

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
          <p className="text-sm text-muted-foreground">Share your screen and Forge will see exactly what you see — then walk you through everything step by step</p>
        </div>
      </div>

      {!supported && (
        <div className="p-4 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-destructive">
          Screen sharing isn't supported in your browser. Please use Chrome, Edge, or Firefox on a desktop computer.
        </div>
      )}

      {/* Goal selector — always visible */}
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
        /* ── Pre-share screen ─────────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center gap-6 py-16 text-center border border-dashed border-border rounded-xl bg-muted/10">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Eye size={40} className="text-primary" />
          </div>
          <div className="max-w-md space-y-2">
            <h2 className="text-xl font-bold">Let Forge see your screen</h2>
            <p className="text-sm text-muted-foreground">
              When you click Share, your browser will ask which screen or window to share.
              Forge will watch it and give you real, specific guidance based on exactly what it sees.
            </p>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-muted/30 border border-border rounded-lg px-4 py-3 max-w-sm text-left">
            <Shield size={14} className="text-green-400 mt-0.5 shrink-0" />
            <span>
              <span className="text-foreground font-medium">Your screen is never recorded or stored.</span> Screenshots are analyzed in real-time by the AI and immediately discarded. You can stop sharing at any moment.
            </span>
          </div>

          {error && (
            <p className="text-sm text-destructive max-w-sm">{error}</p>
          )}

          <Button onClick={startSharing} size="lg" className="gap-2" disabled={!supported}>
            <MonitorPlay size={18} /> Share My Screen
          </Button>

          <p className="text-xs text-muted-foreground">Works in Chrome, Edge, and Firefox · No download required</p>
        </div>
      ) : (
        /* ── Active session ───────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Screen preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-semibold text-green-400">Live Screen</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewVisible(v => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {previewVisible ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
                </button>
                <button
                  onClick={stopSharing}
                  className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                >
                  <StopCircle size={12} /> Stop
                </button>
              </div>
            </div>

            <div className={`relative rounded-lg border border-border overflow-hidden bg-black ${previewVisible ? "" : "hidden"}`}
              style={{ aspectRatio: "16/9" }}>
              <video ref={videoRef} muted playsInline className="w-full h-full object-contain" />
            </div>

            {/* Auto-watch toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
              <div>
                <p className="text-xs font-semibold">Auto-Watch Mode</p>
                <p className="text-[11px] text-muted-foreground">
                  {autoWatch
                    ? `Forge checks your screen every ${AUTO_INTERVAL}s · next check in ${autoCountdown}s`
                    : "Forge watches continuously and speaks up automatically"}
                </p>
              </div>
              <button
                onClick={() => setAutoWatch(v => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${autoWatch ? "bg-primary" : "bg-muted-foreground/30"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoWatch ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>

          {/* Right: Chat */}
          <div className="flex flex-col gap-3" style={{ height: "520px" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Forge's Guidance</span>
              {chat.length > 1 && (
                <button onClick={() => setChat([])} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <RefreshCw size={11} /> Clear
                </button>
              )}
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
                placeholder={`Ask anything… "Why is my game running slow?" · "Where do I click next?" · "What's wrong here?"`}
                rows={2}
                className="resize-none text-sm"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askForge(); } }}
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => askForge()}
                  disabled={streaming}
                  className="flex-1 gap-1.5"
                  size="sm"
                >
                  {streaming
                    ? <><Loader2 size={14} className="animate-spin" /> Forge is looking…</>
                    : <><Eye size={14} /> Ask Forge to Look</>}
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={streaming}
                  onClick={() => askForge("Take a snapshot look at my screen and give me your best general advice about what you see.")}
                  className="gap-1.5 whitespace-nowrap"
                >
                  <Send size={13} /> Quick Look
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">Press Enter to send · Forge sees your actual screen in real-time</p>
            </div>
          </div>
        </div>
      )}

      {/* How it works — shown before sharing */}
      {!sharing && (
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-sm font-semibold">How it works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { n: "1", title: "Share your screen", body: "Click Share and choose which screen or window. Forge will start watching immediately." },
              { n: "2", title: "Ask or let Forge look", body: "Type a question, or turn on Auto-Watch and Forge will check in every 20 seconds on its own." },
              { n: "3", title: "Get step-by-step help", body: "Forge describes what it sees on your screen and tells you exactly what to click, change, or fix." },
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {[
              ["🔧", "Fix errors & crashes"],
              ["🎮", "Optimize for gaming"],
              ["🕹️", "Learn game development"],
              ["⚡", "Speed up your PC"],
              ["🔒", "Security checkups"],
              ["📦", "Install software"],
              ["⚙️", "System settings"],
              ["🧠", "Learn anything new"],
            ].map(([icon, label]) => (
              <div key={label as string} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground">
                <span>{icon}</span> {label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
