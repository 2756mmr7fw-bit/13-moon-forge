import { Router } from "express";
import { db } from "@workspace/db";
import { workspaceItemsTable } from "@workspace/db";

const router = Router();

const SHARED_KEY = process.env.TPTS_INBOUND_KEY ?? "";

const AV_DEV_URL  = "https://a3cbb751-539c-43bf-8aea-a8f136876d1d-00-11g6l6u26jhof.spock.replit.dev";
const AV_PROD_URL = "https://13moonantivirus.ai";
const AV_PUSH_PATH = "/api/inbound/from-forge";
const AV_PROBE_PATH = "/api/inbound/from-forge/status";

function antivirusBaseUrl(): string {
  return process.env.ANTIVIRUS_URL ?? AV_DEV_URL;
}

function verifyInboundKey(req: any, res: any): boolean {
  const auth = req.headers["authorization"] ?? "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  if (!SHARED_KEY || key !== SHARED_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// GET /antivirus/status — connection info for the UI (public, no secrets returned)
router.get("/antivirus/status", (_req, res) => {
  const forgeBase = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://13moonforge.ai";
  res.json({
    connected: true,
    // Antivirus → Forge
    ingestUrl: `${forgeBase}/api/ingest/document`,
    // Forge → Antivirus
    antivirusPushUrl: `${antivirusBaseUrl()}${AV_PUSH_PATH}`,
    antivirusProbeUrl: `${antivirusBaseUrl()}${AV_PROBE_PATH}`,
    antivirusUrl: AV_PROD_URL,
    antivirusReplit: "https://13-moon-ai-antivirus.replit.app",
    authNote: "Both directions use the same bearer token (TPTS_INBOUND_KEY)",
  });
});

// GET /antivirus/ping — Forge health check (antivirus calls this to confirm Forge is reachable)
router.get("/antivirus/ping", (req, res) => {
  if (!verifyInboundKey(req, res)) return;
  res.json({ ok: true, service: "13 Moon Forge", version: "1.0" });
});

// GET /antivirus/probe — Forge checks antivirus is reachable (no auth needed on antivirus side)
router.get("/antivirus/probe", async (_req, res) => {
  try {
    const r = await fetch(`${antivirusBaseUrl()}${AV_PROBE_PATH}`, {
      signal: AbortSignal.timeout(8000),
    });
    const body = await r.json().catch(() => ({}));
    res.json({ ok: r.ok, status: r.status, antivirusResponse: body });
  } catch (err: any) {
    res.json({ ok: false, error: err?.message ?? "Unreachable" });
  }
});

// POST /antivirus/send — Forge sends a file or content to the antivirus
router.post("/antivirus/send", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Sign in required" });
  if (!SHARED_KEY) return res.status(500).json({ error: "TPTS_INBOUND_KEY not configured" });

  const {
    content,
    filename,
    type = "text",
    note,
    isBase64 = false,
  } = req.body as {
    content?: string;
    filename?: string;
    type?: string;
    note?: string;
    isBase64?: boolean;
  };

  if (!content) return res.status(400).json({ error: "content is required" });
  if (!filename) return res.status(400).json({ error: "filename is required" });

  try {
    const r = await fetch(`${antivirusBaseUrl()}${AV_PUSH_PATH}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SHARED_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        content,
        filename,
        type,
        source: "13Moon Forge",
        isBase64,
        note: note ?? undefined,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json({ error: "Antivirus rejected the file", detail: body });
    }
    res.json({ ok: true, antivirusResponse: body });
  } catch (err: any) {
    req.log.error({ err }, "Failed to push to antivirus");
    res.status(502).json({ error: "Could not reach antivirus", detail: err?.message });
  }
});

// POST /ingest/document — antivirus sends extracted content here (antivirus → Forge)
router.post("/ingest/document", async (req, res) => {
  if (!verifyInboundKey(req, res)) return;

  const {
    userId,
    content,
    filename,
    type = "code",
    source = "13 Moon Antivirus",
  } = req.body as {
    userId?: string;
    content?: string;
    filename?: string;
    type?: string;
    source?: string;
  };

  if (!content) return res.status(400).json({ error: "content is required" });

  const targetUserId = userId ?? req.userId;
  if (!targetUserId) return res.status(400).json({ error: "userId is required" });

  const name = filename ?? `Ingested from ${source} — ${new Date().toLocaleDateString()}`;

  const itemType = (() => {
    if (type === "code" || filename?.match(/\.(ts|tsx|js|jsx|py|go|rs|java|cpp|c|cs|php|rb|sh)$/i)) return "code";
    if (type === "plan" || filename?.match(/plan|blueprint/i)) return "plan";
    return "document";
  })();

  try {
    const [item] = await db.insert(workspaceItemsTable).values({
      userId: targetUserId,
      type: itemType,
      name,
      content,
      icon: "🦠",
      color: "green",
    }).returning();

    req.log.info({ itemId: item.id, source }, "Document ingested from antivirus");
    res.status(201).json({ ok: true, itemId: item.id, name: item.name });
  } catch (err) {
    req.log.error({ err }, "Failed to ingest document");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
