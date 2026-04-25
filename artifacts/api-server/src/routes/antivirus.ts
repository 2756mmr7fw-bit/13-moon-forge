import { Router } from "express";
import { db } from "@workspace/db";
import { workspaceItemsTable } from "@workspace/db";

const router = Router();

const INBOUND_KEY = process.env.TPTS_INBOUND_KEY ?? "";

function verifyInboundKey(req: any, res: any): boolean {
  const auth = req.headers["authorization"] ?? "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  if (!INBOUND_KEY || key !== INBOUND_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// GET /antivirus/status — info card (public, no secrets returned)
router.get("/antivirus/status", (_req, res) => {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://13moonforge.ai";
  res.json({
    connected: true,
    ingestUrl: `${baseUrl}/api/ingest/document`,
    antivirusUrl: "https://13moonantivirus.ai",
    antivirusReplit: "https://13-moon-ai-antivirus.replit.app",
    instructions: [
      "Copy the Forge Ingest URL above",
      "Open 13 Moon Antivirus → Settings → Forge Integration",
      "Paste the URL and enter your Inbound Key",
      "Enable email PDF extraction",
      "Any code PDFs extracted from email will land in your Forge Workspace automatically",
    ],
  });
});

// GET /antivirus/ping — let antivirus verify Forge is reachable
router.get("/antivirus/ping", (req, res) => {
  if (!verifyInboundKey(req, res)) return;
  res.json({ ok: true, service: "13 Moon Forge", version: "1.0" });
});

// POST /ingest/document — antivirus sends extracted code/file content here
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

  if (!content) {
    return res.status(400).json({ error: "content is required" });
  }

  const targetUserId = userId ?? req.userId;
  if (!targetUserId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const name = filename ?? `Ingested from ${source} — ${new Date().toLocaleDateString()}`;

  const itemType = (() => {
    if (type === "code" || filename?.match(/\.(ts|tsx|js|jsx|py|go|rs|java|cpp|c|cs|php|rb|sh)$/i)) return "code";
    if (type === "plan" || filename?.match(/plan|blueprint/i)) return "plan";
    if (type === "document" || filename?.match(/\.(md|txt|pdf)$/i)) return "document";
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
