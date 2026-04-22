import { Router } from "express";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { logger } from "../lib/logger";
import crypto from "crypto";

export const remoteRouter = Router();

// ── Session registry ─────────────────────────────────────────────────────────
interface RemoteSession {
  id: string;
  agent: WebSocket | null;
  viewer: WebSocket | null;
  createdAt: number;
  agentInfo?: {
    os?: string;
    hostname?: string;
    width?: number;
    height?: number;
  };
}

const sessions = new Map<string, RemoteSession>();

// Clean up stale sessions every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 1000 * 60 * 30; // 30 minutes
  for (const [id, s] of sessions.entries()) {
    if (s.createdAt < cutoff && !s.agent && !s.viewer) {
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

// ── HTTP endpoints ────────────────────────────────────────────────────────────

remoteRouter.post("/create", (_req, res) => {
  const id = crypto.randomBytes(4).toString("hex").toUpperCase();
  sessions.set(id, {
    id,
    agent: null,
    viewer: null,
    createdAt: Date.now(),
  });
  res.json({ sessionId: id });
});

remoteRouter.get("/session/:id", (req, res) => {
  const s = sessions.get(req.params.id.toUpperCase());
  if (!s) return res.status(404).json({ error: "Session not found" });
  res.json({
    sessionId: s.id,
    agentConnected: s.agent !== null && s.agent.readyState === WebSocket.OPEN,
    viewerConnected: s.viewer !== null && s.viewer.readyState === WebSocket.OPEN,
    agentInfo: s.agentInfo ?? null,
  });
});

remoteRouter.get("/sessions", (_req, res) => {
  const list = Array.from(sessions.values()).map(s => ({
    sessionId: s.id,
    agentConnected: s.agent !== null && s.agent.readyState === WebSocket.OPEN,
    viewerConnected: s.viewer !== null && s.viewer.readyState === WebSocket.OPEN,
    agentInfo: s.agentInfo ?? null,
    createdAt: s.createdAt,
  }));
  res.json(list);
});

// ── WebSocket server ──────────────────────────────────────────────────────────

export function createRemoteWss(): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "/", "ws://localhost");
    const pathParts = url.pathname.split("/");
    const sessionId = (pathParts[pathParts.length - 1] ?? "").toUpperCase();
    const role = url.searchParams.get("role") as "agent" | "viewer" | null;

    if (!role || !["agent", "viewer"].includes(role)) {
      ws.close(1008, "role param required: agent or viewer");
      return;
    }

    let session = sessions.get(sessionId);
    if (!session) {
      if (role === "agent") {
        session = { id: sessionId, agent: null, viewer: null, createdAt: Date.now() };
        sessions.set(sessionId, session);
      } else {
        ws.send(JSON.stringify({ type: "error", message: "Session not found" }));
        ws.close(1008, "Session not found");
        return;
      }
    }

    if (role === "agent") {
      if (session.agent && session.agent.readyState === WebSocket.OPEN) {
        session.agent.close(1000, "Replaced by new agent");
      }
      session.agent = ws;
      logger.info({ sessionId, role: "agent" }, "Remote agent connected");

      ws.send(JSON.stringify({ type: "welcome", role: "agent", sessionId }));

      if (session.viewer && session.viewer.readyState === WebSocket.OPEN) {
        session.viewer.send(JSON.stringify({ type: "agent_connected" }));
        ws.send(JSON.stringify({ type: "viewer_connected" }));
      }

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as { type: string; [key: string]: unknown };

          if (msg.type === "info") {
            session!.agentInfo = msg as RemoteSession["agentInfo"];
          }

          if (session!.viewer && session!.viewer.readyState === WebSocket.OPEN) {
            session!.viewer.send(raw.toString());
          }
        } catch { /* malformed */ }
      });

      ws.on("close", () => {
        if (session) {
          session.agent = null;
          if (session.viewer && session.viewer.readyState === WebSocket.OPEN) {
            session.viewer.send(JSON.stringify({ type: "agent_disconnected" }));
          }
          logger.info({ sessionId }, "Remote agent disconnected");
        }
      });
    } else {
      if (session.viewer && session.viewer.readyState === WebSocket.OPEN) {
        session.viewer.close(1000, "Replaced by new viewer");
      }
      session.viewer = ws;
      logger.info({ sessionId, role: "viewer" }, "Remote viewer connected");

      ws.send(JSON.stringify({ type: "welcome", role: "viewer", sessionId }));

      if (session.agent && session.agent.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "agent_connected", agentInfo: session.agentInfo }));
        session.agent.send(JSON.stringify({ type: "viewer_connected" }));
      } else {
        ws.send(JSON.stringify({ type: "waiting_for_agent" }));
      }

      ws.on("message", (raw) => {
        try {
          if (session!.agent && session!.agent.readyState === WebSocket.OPEN) {
            session!.agent.send(raw.toString());
          }
        } catch { /* malformed */ }
      });

      ws.on("close", () => {
        if (session) {
          session.viewer = null;
          if (session.agent && session.agent.readyState === WebSocket.OPEN) {
            session.agent.send(JSON.stringify({ type: "viewer_disconnected" }));
          }
          logger.info({ sessionId }, "Remote viewer disconnected");
        }
      });
    }
  });

  return wss;
}
