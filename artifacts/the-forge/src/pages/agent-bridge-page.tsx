import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Monitor, Send, RefreshCw, Wifi, WifiOff, Terminal,
  Package, Cpu, MemoryStick, HardDrive, Clock, Zap,
  MessageSquare, Download, ChevronRight, Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AgentInfo {
  machine: string;
  os: string;
  version: string;
  cwd: string;
  userId: string;
  connectedAt: string;
  lastSeen: string;
}

interface AgentSession {
  sessionId: string;
  info: AgentInfo;
  connected: boolean;
  pendingCount: number;
  historyCount: number;
  relayCount: number;
}

interface CommandRecord {
  id: string;
  type: string;
  payload: unknown;
  result?: unknown;
  error?: string;
  timestamp: string;
}

interface RelayMessage {
  id: string;
  from: "agent" | "forge" | "replit";
  message: string;
  timestamp: string;
}

interface LiveState {
  connected: boolean;
  history: CommandRecord[];
  relay: RelayMessage[];
}

function timeSince(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function AgentBridgePage() {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [live, setLive] = useState<LiveState>({ connected: false, history: [], relay: [] });
  const [cmd, setCmd] = useState("");
  const [cmdType, setCmdType] = useState<"chat" | "shell" | "tool" | "relay">("chat");
  const [relayMsg, setRelayMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sysInfo, setSysInfo] = useState<Record<string, string> | null>(null);
  const [installImage, setInstallImage] = useState("");
  const [installName, setInstallName] = useState("");
  const [installPort, setInstallPort] = useState("");
  const [installing, setInstalling] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/agent-bridge/sessions`, { credentials: "include" });
      if (r.ok) setSessions(await r.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchSessions();
    const t = setInterval(fetchSessions, 5000);
    return () => clearInterval(t);
  }, [fetchSessions]);

  useEffect(() => {
    if (!selected) return;

    if (eventSourceRef.current) eventSourceRef.current.close();

    const es = new EventSource(`${API_BASE}/api/agent-bridge/ui-stream/${selected}`, { withCredentials: true });
    eventSourceRef.current = es;

    es.addEventListener("state", (e) => {
      const data = JSON.parse(e.data) as LiveState;
      setLive(data);
    });
    es.addEventListener("result", (e) => {
      const data = JSON.parse(e.data) as { commandId: string; result?: unknown; error?: string; timestamp: string };
      setLive(prev => ({
        ...prev,
        history: prev.history.map(h =>
          h.id === data.commandId ? { ...h, result: data.result, error: data.error } : h
        ),
      }));
    });
    es.addEventListener("command_sent", (e) => {
      const data = JSON.parse(e.data) as CommandRecord;
      setLive(prev => ({ ...prev, history: [...prev.history, data].slice(-100) }));
    });
    es.addEventListener("relay", (e) => {
      const data = JSON.parse(e.data) as RelayMessage;
      setLive(prev => ({ ...prev, relay: [...prev.relay, data].slice(-200) }));
    });
    es.addEventListener("agent_connected", () => setLive(prev => ({ ...prev, connected: true })));
    es.addEventListener("agent_disconnected", () => setLive(prev => ({ ...prev, connected: false })));

    return () => es.close();
  }, [selected]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [live.history, live.relay]);

  async function sendCommand() {
    if (!selected || !cmd.trim()) return;
    setSending(true);
    try {
      const payload = cmdType === "shell"
        ? { command: cmd.trim() }
        : cmdType === "chat"
          ? { message: cmd.trim() }
          : { message: cmd.trim() };
      await fetch(`${API_BASE}/api/agent-bridge/command/${selected}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: cmdType === "relay" ? "chat" : cmdType, payload }),
      });
      setCmd("");
    } finally { setSending(false); }
  }

  async function sendRelay() {
    if (!selected || !relayMsg.trim()) return;
    setSending(true);
    try {
      await fetch(`${API_BASE}/api/agent-bridge/relay/${selected}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: "forge", message: relayMsg.trim() }),
      });
      setRelayMsg("");
    } finally { setSending(false); }
  }

  async function fetchSystemInfo() {
    if (!selected) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/agent-bridge/command/${selected}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "system_info", payload: {} }),
      });
      if (r.ok) {
        const { commandId } = await r.json() as { commandId: string };
        await new Promise(resolve => setTimeout(resolve, 2000));
        const latest = live.history.find(h => h.id === commandId);
        if (latest?.result) {
          try { setSysInfo(JSON.parse(latest.result as string) as Record<string, string>); } catch {}
        }
      }
    } finally { setLoading(false); }
  }

  async function installApp() {
    if (!selected || !installImage || !installName) return;
    setInstalling(true);
    try {
      await fetch(`${API_BASE}/api/agent-bridge/command/${selected}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "install_app",
          payload: { image: installImage, name: installName, port: installPort || undefined },
        }),
      });
      setInstallImage(""); setInstallName(""); setInstallPort("");
    } finally { setInstalling(false); }
  }

  const selectedSession = sessions.find(s => s.sessionId === selected);
  const isConnected = selectedSession?.connected || live.connected;

  const installLine = `curl -o forge.js https://13moonforge.ai/api/help/forge-agent.js && node forge.js daemon`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Radio className="text-orange-400" size={24} />
              Agent Bridge
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Local Forge Agents connected to your machines — send commands, relay messages, install apps
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSessions}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Sessions list */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Connected Machines ({sessions.length})
            </h2>

            {sessions.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-5 text-center space-y-3">
                <Monitor size={28} className="mx-auto text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No agents connected</p>
                <p className="text-xs text-muted-foreground">Run this on your computer:</p>
                <code className="text-xs bg-muted rounded px-2 py-1 block text-left break-all">{installLine}</code>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => navigator.clipboard.writeText(installLine)}
                  className="text-xs"
                >
                  Copy command
                </Button>
              </div>
            )}

            {sessions.map(s => (
              <button
                key={s.sessionId}
                onClick={() => setSelected(s.sessionId)}
                className={cn(
                  "w-full text-left rounded-xl border p-4 space-y-2 transition-colors hover:bg-muted/40",
                  selected === s.sessionId ? "border-orange-400/60 bg-orange-500/5" : "border-border"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{s.info.machine}</span>
                  {s.connected
                    ? <Wifi size={14} className="text-green-400 shrink-0" />
                    : <WifiOff size={14} className="text-muted-foreground shrink-0" />
                  }
                </div>
                <p className="text-xs text-muted-foreground truncate">{s.info.os}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{timeSince(s.info.lastSeen)}</span>
                  <Badge variant="outline" className="text-xs py-0">{s.info.version}</Badge>
                </div>
              </button>
            ))}

            {/* Download command always visible */}
            <div className="rounded-xl border border-border p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Add a machine</p>
              <code className="text-xs text-muted-foreground break-all block">{installLine}</code>
              <Button
                variant="ghost" size="sm" className="text-xs w-full"
                onClick={() => navigator.clipboard.writeText(installLine)}
              >
                <Download size={12} className="mr-1" /> Copy
              </Button>
            </div>
          </div>

          {/* Main panel */}
          <div className="lg:col-span-3 space-y-4">
            {!selected ? (
              <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
                <Monitor size={40} className="mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground">Select a machine to start</p>
              </div>
            ) : (
              <>
                {/* Agent header */}
                <div className="rounded-xl border border-border p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-400" : "bg-muted-foreground")} />
                    <div>
                      <p className="font-semibold">{selectedSession?.info.machine}</p>
                      <p className="text-xs text-muted-foreground">{selectedSession?.info.cwd}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isConnected ? "default" : "secondary"}>
                      {isConnected ? "Live" : "Offline"}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={fetchSystemInfo} disabled={loading || !isConnected}>
                      {loading ? <RefreshCw size={12} className="animate-spin" /> : <Cpu size={12} />}
                      <span className="ml-1 hidden sm:inline">System Info</span>
                    </Button>
                  </div>
                </div>

                {/* System info */}
                {sysInfo && (
                  <div className="rounded-xl border border-border p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {sysInfo.cpus && (
                      <div className="flex items-center gap-2">
                        <Cpu size={14} className="text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">CPUs</p>
                          <p className="text-sm font-medium">{sysInfo.cpus}</p>
                        </div>
                      </div>
                    )}
                    {sysInfo.totalMemGb && (
                      <div className="flex items-center gap-2">
                        <MemoryStick size={14} className="text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">RAM</p>
                          <p className="text-sm font-medium">{sysInfo.freeMemGb}GB free / {sysInfo.totalMemGb}GB</p>
                        </div>
                      </div>
                    )}
                    {sysInfo.uptime && (
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Uptime</p>
                          <p className="text-sm font-medium">{sysInfo.uptime}</p>
                        </div>
                      </div>
                    )}
                    {sysInfo.platform && (
                      <div className="flex items-center gap-2">
                        <HardDrive size={14} className="text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Platform</p>
                          <p className="text-sm font-medium">{sysInfo.platform} / {sysInfo.arch}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Command + relay tabs */}
                <div className="rounded-xl border border-border overflow-hidden">
                  {/* Tab bar */}
                  <div className="flex border-b border-border bg-muted/30">
                    {([
                      { id: "chat", icon: MessageSquare, label: "Chat" },
                      { id: "shell", icon: Terminal, label: "Shell" },
                      { id: "relay", icon: Radio, label: "Relay to Replit" },
                    ] as const).map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setCmdType(tab.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors",
                          cmdType === tab.id
                            ? "border-orange-400 text-orange-400"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <tab.icon size={12} />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 space-y-3">
                    {cmdType === "relay" ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Send a message to the agent. The agent will process it and relay any response back here — bridging your local machine with Forge.
                        </p>
                        <div className="flex gap-2">
                          <Input
                            value={relayMsg}
                            onChange={e => setRelayMsg(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && sendRelay()}
                            placeholder="Tell the agent what you and Replit are working on..."
                            disabled={!isConnected || sending}
                            className="flex-1"
                          />
                          <Button onClick={sendRelay} disabled={!isConnected || sending || !relayMsg.trim()}>
                            <Send size={14} />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">
                          {cmdType === "chat"
                            ? "Chat with Forge AI through this machine's local agent."
                            : "Run a shell command on this machine."}
                        </p>
                        <div className="flex gap-2">
                          <Input
                            value={cmd}
                            onChange={e => setCmd(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && sendCommand()}
                            placeholder={cmdType === "shell" ? "ls ~/projects" : "What apps are running?"}
                            disabled={!isConnected || sending}
                            className={cn("flex-1 font-mono text-sm", cmdType === "shell" && "font-mono")}
                          />
                          <Button onClick={sendCommand} disabled={!isConnected || sending || !cmd.trim()}>
                            {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Install App */}
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Package size={14} className="text-orange-400" />
                    Install App on this Machine
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Pull a Docker image and run it as a container on this machine.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      value={installImage}
                      onChange={e => setInstallImage(e.target.value)}
                      placeholder="Docker image (e.g. 13moonstpts/forge:latest)"
                      className="sm:col-span-1"
                    />
                    <Input
                      value={installName}
                      onChange={e => setInstallName(e.target.value)}
                      placeholder="Container name"
                    />
                    <Input
                      value={installPort}
                      onChange={e => setInstallPort(e.target.value)}
                      placeholder="Port (optional, e.g. 8080)"
                    />
                  </div>
                  <Button
                    onClick={installApp}
                    disabled={!isConnected || installing || !installImage || !installName}
                    className="w-full sm:w-auto"
                  >
                    {installing
                      ? <><RefreshCw size={14} className="mr-2 animate-spin" />Installing...</>
                      : <><Zap size={14} className="mr-2" />Install</>
                    }
                  </Button>
                </div>

                {/* Command history */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Terminal size={14} className="text-muted-foreground" />
                      Activity Log
                    </h3>
                    <span className="text-xs text-muted-foreground">{live.history.length} commands</span>
                  </div>

                  <div className="h-72 overflow-y-auto bg-black/30 p-4 space-y-3 font-mono text-xs">
                    {live.history.length === 0 && live.relay.length === 0 && (
                      <p className="text-muted-foreground">No activity yet. Send a command above.</p>
                    )}

                    {/* Merge history and relay sorted by time */}
                    {[
                      ...live.history.map(h => ({ ...h, _kind: "cmd" as const })),
                      ...live.relay.map(r => ({ ...r, _kind: "relay" as const })),
                    ]
                      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                      .map((item) => {
                        if (item._kind === "relay") {
                          const r = item as RelayMessage & { _kind: "relay" };
                          return (
                            <div key={r.id} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Radio size={10} className={cn(
                                  r.from === "agent" ? "text-orange-400" :
                                  r.from === "replit" ? "text-blue-400" : "text-purple-400"
                                )} />
                                <span className={cn(
                                  "font-semibold",
                                  r.from === "agent" ? "text-orange-400" :
                                  r.from === "replit" ? "text-blue-400" : "text-purple-400"
                                )}>{r.from}</span>
                                <span className="text-muted-foreground">{timeSince(r.timestamp)}</span>
                              </div>
                              <pre className="text-white/80 pl-5 whitespace-pre-wrap break-all">{r.message}</pre>
                            </div>
                          );
                        }
                        const h = item as CommandRecord & { _kind: "cmd" };
                        return (
                          <div key={h.id} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <ChevronRight size={10} className="text-green-400" />
                              <span className="text-green-400 font-semibold">{h.type}</span>
                              <span className="text-muted-foreground">{timeSince(h.timestamp)}</span>
                            </div>
                            {Boolean(h.payload && typeof h.payload === "object" && "message" in (h.payload as object)) && (
                              <pre className="text-white/60 pl-5 whitespace-pre-wrap break-all">
                                {(h.payload as { message: string }).message}
                              </pre>
                            )}
                            {Boolean(h.payload && typeof h.payload === "object" && "command" in (h.payload as object)) && (
                              <pre className="text-white/60 pl-5 whitespace-pre-wrap break-all">
                                $ {(h.payload as { command: string }).command}
                              </pre>
                            )}
                            {h.result !== undefined && (
                              <pre className="text-white/80 pl-5 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                                {typeof h.result === "string" ? h.result : JSON.stringify(h.result, null, 2)}
                              </pre>
                            )}
                            {h.error && (
                              <pre className="text-red-400 pl-5 whitespace-pre-wrap break-all">Error: {h.error}</pre>
                            )}
                          </div>
                        );
                      })}
                    <div ref={historyEndRef} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
