import { Router } from "express";
import crypto from "crypto";

const router = Router();

// ── Types ──────────────────────────────────────────────────────────────────────

interface AgentInfo {
  machine: string;
  os: string;
  version: string;
  cwd: string;
  userId: string;
  connectedAt: Date;
  lastSeen: Date;
}

interface RelayMessage {
  id: string;
  from: "agent" | "forge" | "replit";
  message: string;
  timestamp: Date;
}

interface CommandRecord {
  id: string;
  type: string;
  payload: unknown;
  result?: unknown;
  error?: string;
  timestamp: Date;
}

interface AgentSession {
  sessionId: string;
  info: AgentInfo;
  agentSse: any | null;
  uiListeners: Set<any>;
  pending: Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; type: string }>;
  history: CommandRecord[];
  relay: RelayMessage[];
}

// ── In-memory store ────────────────────────────────────────────────────────────

const sessions = new Map<string, AgentSession>();

setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [id, s] of sessions) {
    if (s.info.lastSeen.getTime() < cutoff) sessions.delete(id);
  }
}, 60_000);

function broadcastUi(session: AgentSession, event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of session.uiListeners) {
    try { res.write(payload); } catch { session.uiListeners.delete(res); }
  }
}

// ── Agent: register ────────────────────────────────────────────────────────────
// POST /api/agent-bridge/register
router.post("/agent-bridge/register", (req, res) => {
  const { machine, os: agentOs, version, cwd, userId } = req.body as Record<string, string>;
  const sessionId = crypto.randomBytes(16).toString("hex");
  const now = new Date();
  sessions.set(sessionId, {
    sessionId,
    info: {
      machine: machine || "unknown",
      os: agentOs || "unknown",
      version: version || "1.0",
      cwd: cwd || "/",
      userId: userId || "anon",
      connectedAt: now,
      lastSeen: now,
    },
    agentSse: null,
    uiListeners: new Set(),
    pending: new Map(),
    history: [],
    relay: [],
  });
  res.json({ sessionId, ok: true });
});

// ── Agent: SSE stream (agent listens here for commands) ───────────────────────
// GET /api/agent-bridge/stream/:sessionId
router.get("/agent-bridge/stream/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  session.agentSse = res;
  session.info.lastSeen = new Date();

  res.write(`event: connected\ndata: ${JSON.stringify({ sessionId: session.sessionId })}\n\n`);

  const beat = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(beat); }
  }, 25_000);

  req.on("close", () => {
    clearInterval(beat);
    if (session.agentSse === res) {
      session.agentSse = null;
      broadcastUi(session, "agent_disconnected", { sessionId: session.sessionId });
    }
  });

  broadcastUi(session, "agent_connected", { sessionId: session.sessionId, info: session.info });
});

// ── Agent: heartbeat ──────────────────────────────────────────────────────────
// POST /api/agent-bridge/heartbeat/:sessionId
router.post("/agent-bridge/heartbeat/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  session.info.lastSeen = new Date();
  res.json({ ok: true });
});

// ── Agent: post result ────────────────────────────────────────────────────────
// POST /api/agent-bridge/result/:sessionId
router.post("/agent-bridge/result/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const { commandId, result, error } = req.body as { commandId: string; result?: unknown; error?: string };
  session.info.lastSeen = new Date();

  const pending = session.pending.get(commandId);
  if (pending) {
    const record = session.history.find(h => h.id === commandId);
    if (record) { record.result = result; record.error = error; }
    session.pending.delete(commandId);
    if (error) pending.reject(new Error(error));
    else pending.resolve(result);
  }

  broadcastUi(session, "result", { commandId, result, error, timestamp: new Date() });
  res.json({ ok: true });
});

// ── UI: send command to agent ─────────────────────────────────────────────────
// POST /api/agent-bridge/command/:sessionId
router.post("/agent-bridge/command/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (!session.agentSse) return res.status(503).json({ error: "Agent not connected" });

  const { type, payload } = req.body as { type: string; payload: unknown };
  const commandId = crypto.randomBytes(8).toString("hex");

  const record: CommandRecord = { id: commandId, type, payload, timestamp: new Date() };
  session.history.push(record);
  if (session.history.length > 100) session.history.shift();

  session.agentSse.write(`event: command\ndata: ${JSON.stringify({ commandId, type, payload })}\n\n`);

  broadcastUi(session, "command_sent", { commandId, type, payload, timestamp: new Date() });
  res.json({ ok: true, commandId });
});

// ── UI: list sessions ─────────────────────────────────────────────────────────
// GET /api/agent-bridge/sessions
router.get("/agent-bridge/sessions", (_req, res) => {
  const list = [];
  for (const s of sessions.values()) {
    list.push({
      sessionId: s.sessionId,
      info: s.info,
      connected: !!s.agentSse,
      pendingCount: s.pending.size,
      historyCount: s.history.length,
      relayCount: s.relay.length,
    });
  }
  res.json(list);
});

// ── UI: SSE stream to watch an agent ─────────────────────────────────────────
// GET /api/agent-bridge/ui-stream/:sessionId
router.get("/agent-bridge/ui-stream/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  session.uiListeners.add(res);

  res.write(`event: state\ndata: ${JSON.stringify({
    connected: !!session.agentSse,
    history: session.history.slice(-50),
    relay: session.relay.slice(-50),
  })}\n\n`);

  const beat = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(beat); }
  }, 25_000);

  req.on("close", () => {
    clearInterval(beat);
    session.uiListeners.delete(res);
  });
});

// ── Relay: send message agent↔forge/replit ────────────────────────────────────
// POST /api/agent-bridge/relay/:sessionId
router.post("/agent-bridge/relay/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const { from, message } = req.body as { from: "agent" | "forge" | "replit"; message: string };
  const msg: RelayMessage = {
    id: crypto.randomBytes(8).toString("hex"),
    from: from || "forge",
    message,
    timestamp: new Date(),
  };
  session.relay.push(msg);
  if (session.relay.length > 200) session.relay.shift();

  broadcastUi(session, "relay", msg);

  if (session.agentSse && from !== "agent") {
    const commandId = crypto.randomBytes(8).toString("hex");
    session.agentSse.write(`event: relay\ndata: ${JSON.stringify({ commandId, message })}\n\n`);
  }

  res.json({ ok: true, id: msg.id });
});

// ── GET /api/agent-bridge/history/:sessionId ─────────────────────────────────
router.get("/agent-bridge/history/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json({ history: session.history, relay: session.relay });
});

export default router;
