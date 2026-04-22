import { useEffect, useRef, useState, useCallback } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Monitor, MonitorOff, Power, AlertTriangle, Loader2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ConnState = "connecting" | "waiting" | "connected" | "disconnected" | "error";

interface AgentInfo {
  os?: string;
  hostname?: string;
  width?: number;
  height?: number;
}

function buildWsUrl(sessionId: string): string {
  const base = API_BASE || "";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${proto}//${host}${base}/api/remote/ws/${sessionId}?role=viewer`;
}

export default function RemoteViewer() {
  const [, params] = useRoute("/remote/:sessionId");
  const sessionId = (params?.sessionId ?? "").toUpperCase();

  const [connState, setConnState] = useState<ConnState>("connecting");
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [statusMsg, setStatusMsg] = useState("Connecting…");
  const [fps, setFps] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgRef = useRef(new Image());

  // ── FPS counter ───────────────────────────────────────────────────────────
  useEffect(() => {
    fpsTimerRef.current = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);
    return () => {
      if (fpsTimerRef.current) clearInterval(fpsTimerRef.current);
    };
  }, []);

  // ── WebSocket connection ──────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!sessionId) return;
    setConnState("connecting");
    setStatusMsg("Connecting to session…");

    const ws = new WebSocket(buildWsUrl(sessionId));
    wsRef.current = ws;

    ws.onopen = () => {
      setStatusMsg("Connected — waiting for agent…");
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as {
          type: string;
          agentInfo?: AgentInfo;
          message?: string;
          frame?: string;
          audio?: string;
          cursor?: { x: number; y: number };
        };

        switch (msg.type) {
          case "welcome":
            setConnState("waiting");
            setStatusMsg("Waiting for agent to connect…");
            break;

          case "waiting_for_agent":
            setConnState("waiting");
            setStatusMsg("Agent not yet connected — share your session code to start.");
            break;

          case "agent_connected":
            setConnState("connected");
            setStatusMsg("Agent connected");
            if (msg.agentInfo) setAgentInfo(msg.agentInfo);
            break;

          case "agent_disconnected":
            setConnState("waiting");
            setStatusMsg("Agent disconnected — waiting for reconnect…");
            break;

          case "frame":
            if (msg.frame && canvasRef.current) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext("2d");
              if (!ctx) break;
              imgRef.current.onload = () => {
                if (canvas.width !== imgRef.current.naturalWidth) {
                  canvas.width = imgRef.current.naturalWidth;
                  canvas.height = imgRef.current.naturalHeight;
                }
                ctx.drawImage(imgRef.current, 0, 0);
                frameCountRef.current++;
              };
              imgRef.current.src = `data:image/jpeg;base64,${msg.frame}`;
            }
            break;

          case "cursor":
            if (msg.cursor) setCursorPos(msg.cursor);
            break;

          case "audio":
            if (msg.audio && speakerOn) {
              playAudioChunk(msg.audio);
            }
            break;

          case "info":
            setAgentInfo(msg.agentInfo ?? null);
            break;

          case "error":
            setConnState("error");
            setStatusMsg(msg.message ?? "Connection error");
            break;
        }
      } catch { /* non-JSON */ }
    };

    ws.onclose = () => {
      setConnState("disconnected");
      setStatusMsg("Connection closed. Reconnecting…");
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      setConnState("error");
      setStatusMsg("WebSocket error — will retry…");
    };
  }, [sessionId, speakerOn]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      stopMic();
    };
  }, [connect]);

  // ── Audio playback ─────────────────────────────────────────────────────────
  function playAudioChunk(b64: string) {
    if (!speakerOn) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    const raw = atob(b64);
    const buf = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
    ctx.decodeAudioData(buf.buffer.slice(0))
      .then(decoded => {
        const src = ctx.createBufferSource();
        src.buffer = decoded;
        src.connect(ctx.destination);
        src.start();
      })
      .catch(() => {});
  }

  // ── Mic ───────────────────────────────────────────────────────────────────
  async function toggleMic() {
    if (micOn) {
      stopMic();
      setMicOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const ctx = audioCtxRef.current;
        const source = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(ctx.destination);
        processor.onaudioprocess = (e) => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          const pcm = e.inputBuffer.getChannelData(0);
          const buf = new Int16Array(pcm.length);
          for (let i = 0; i < pcm.length; i++) buf[i] = Math.max(-1, Math.min(1, pcm[i])) * 0x7fff;
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf.buffer)));
          wsRef.current.send(JSON.stringify({ type: "audio", audio: b64 }));
        };
        setMicOn(true);
      } catch {
        alert("Microphone access denied. Please allow microphone access in your browser.");
      }
    }
  }

  function stopMic() {
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
  }

  // ── Remote input ──────────────────────────────────────────────────────────
  function sendInput(msg: object) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (connState !== "connected") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = (agentInfo?.width ?? rect.width) / rect.width;
    const scaleY = (agentInfo?.height ?? rect.height) / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    sendInput({ type: "mouse_move", x, y });
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (connState !== "connected") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = (agentInfo?.width ?? rect.width) / rect.width;
    const scaleY = (agentInfo?.height ?? rect.height) / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    sendInput({ type: "mouse_click", x, y, button: e.button === 2 ? "right" : "left" });
  }

  function handleCanvasScroll(e: React.WheelEvent<HTMLCanvasElement>) {
    if (connState !== "connected") return;
    sendInput({ type: "mouse_scroll", dx: e.deltaX, dy: e.deltaY });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (connState !== "connected") return;
    e.preventDefault();
    sendInput({ type: "key", key: e.key, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey });
  }

  function disconnect() {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    wsRef.current?.close();
    setConnState("disconnected");
    setStatusMsg("Disconnected.");
  }

  const stateColor = {
    connecting: "text-yellow-400",
    waiting: "text-yellow-400",
    connected: "text-green-400",
    disconnected: "text-red-400",
    error: "text-red-400",
  }[connState];

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col",
        fullscreen ? "fixed inset-0 z-50 bg-black" : "max-w-5xl mx-auto space-y-3 p-4 md:p-6"
      )}
    >
      {/* Header bar */}
      {!fullscreen && (
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-xl font-black flex items-center gap-2">
              <Monitor size={18} className="text-orange-400" />
              Remote Session
              <span className="text-sm font-mono font-normal text-muted-foreground">#{sessionId}</span>
            </h1>
            {agentInfo && (
              <p className="text-xs text-muted-foreground">
                {agentInfo.hostname} · {agentInfo.os} · {agentInfo.width}×{agentInfo.height}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("text-xs font-semibold", stateColor)}>● {connState}</span>
            {connState === "connected" && (
              <span className="text-xs text-muted-foreground ml-2">{fps} fps</span>
            )}
          </div>
        </div>
      )}

      {/* Status overlay / waiting state */}
      {connState !== "connected" && (
        <div className="rounded-xl border border-border bg-muted/5 p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[300px]">
          {connState === "error" ? (
            <AlertTriangle size={32} className="text-red-400" />
          ) : (
            <Loader2 size={32} className={cn("animate-spin", stateColor)} />
          )}
          <div className="space-y-1">
            <p className="font-bold">{statusMsg}</p>
            {connState === "waiting" && (
              <p className="text-sm text-muted-foreground max-w-sm">
                Make sure the Forge Agent is running on the target computer and shows this session code: <strong className="text-foreground font-mono">{sessionId}</strong>
              </p>
            )}
          </div>
          {connState === "disconnected" && (
            <Button size="sm" onClick={connect}>Reconnect</Button>
          )}
        </div>
      )}

      {/* Screen canvas */}
      <div className={cn(
        "relative rounded-xl overflow-hidden border border-border bg-black",
        connState !== "connected" && "hidden"
      )}>
        <canvas
          ref={canvasRef}
          className="w-full h-auto cursor-crosshair"
          style={{ maxHeight: fullscreen ? "calc(100vh - 56px)" : "65vh" }}
          onMouseMove={handleCanvasMouseMove}
          onClick={handleCanvasClick}
          onContextMenu={(e) => { e.preventDefault(); handleCanvasClick(e as unknown as React.MouseEvent<HTMLCanvasElement>); }}
          onWheel={handleCanvasScroll}
          onKeyDown={handleKey}
          tabIndex={0}
        />
      </div>

      {/* Controls */}
      <div className={cn(
        "flex items-center gap-2 flex-wrap",
        fullscreen && "absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/80 rounded-full px-4 py-2"
      )}>
        <Button
          size="sm"
          variant={micOn ? "default" : "outline"}
          className={cn("gap-1.5", micOn && "bg-green-600 hover:bg-green-500 border-green-600")}
          onClick={toggleMic}
        >
          {micOn ? <Mic size={13} /> : <MicOff size={13} />}
          {micOn ? "Mic on" : "Mic off"}
        </Button>

        <Button
          size="sm"
          variant={speakerOn ? "default" : "outline"}
          className={cn("gap-1.5", speakerOn && "bg-blue-600 hover:bg-blue-500 border-blue-600")}
          onClick={() => setSpeakerOn(v => !v)}
        >
          {speakerOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
          {speakerOn ? "Sound on" : "Sound off"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setFullscreen(v => !v)}
        >
          {fullscreen ? <MonitorOff size={13} /> : <Monitor size={13} />}
          {fullscreen ? "Exit fullscreen" : "Fullscreen"}
        </Button>

        <Button
          size="sm"
          variant="destructive"
          className="gap-1.5 ml-auto"
          onClick={disconnect}
        >
          <Power size={13} /> End session
        </Button>
      </div>
    </div>
  );
}
