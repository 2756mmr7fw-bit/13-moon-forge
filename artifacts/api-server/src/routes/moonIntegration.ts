import { Router } from "express";
import { TPTS_INBOUND_KEY, FORGE_MOONS } from "../lib/moonApi";

const router = Router();

const APP_DOMAIN = process.env.APP_DOMAIN ?? process.env.REPLIT_DOMAINS?.split(",")[0] ?? "13moonforge.ai";

// ─── Integration Status ───────────────────────────────────────────────────────
// Ezekiel's probe hits this to confirm the integration is green.
// GET /api/moon/integration-status
router.get("/moon/integration-status", (_req, res) => {
  const hasOutboundKey = !!(
    process.env.TPTS_MOON_API_KEY ||
    process.env.TSQ_MOON_API_KEY ||
    process.env.MOON_API_KEY
  );
  const hasInboundKey = !!TPTS_INBOUND_KEY;

  res.json({
    ok: hasOutboundKey && hasInboundKey,
    app: "13 Moon Forge Builder",
    domain: APP_DOMAIN,
    authorizedMoons: [...FORGE_MOONS],
    callingApp: "thepeoplestownsq.com",
    acceptsEvents: hasInboundKey,
    userIdScheme: "tpts-numeric",
    webhookUrl: `https://${APP_DOMAIN}/api/moon/webhook`,
  });
});

// ─── Inbound Webhook ─────────────────────────────────────────────────────────
// TPTS fires events here when Moon ownership changes.
// POST /api/moon/webhook
// Header: x-api-key: <TPTS_INBOUND_KEY>
router.post("/moon/webhook", (req, res) => {
  const providedKey = (typeof req.headers["x-api-key"] === "string"
    ? req.headers["x-api-key"]
    : ""
  ).trim();

  // Safe diagnostics — logs length + first 10 chars only, never the full key
  req.log?.info({
    envKeyLen: TPTS_INBOUND_KEY.length,
    envKeyPrefix: TPTS_INBOUND_KEY.slice(0, 10),
    providedKeyLen: providedKey.length,
    providedKeyPrefix: providedKey.slice(0, 10),
    match: providedKey === TPTS_INBOUND_KEY,
  }, "webhook auth check");

  if (!TPTS_INBOUND_KEY) {
    req.log?.warn("TPTS_INBOUND_KEY not set — webhook accepted in dev mode");
  } else if (providedKey !== TPTS_INBOUND_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { event, userId, moon, isBundle, messagesRemaining, expiresAt } = req.body as {
    event: string;
    userId: string;
    moon: string;
    isBundle?: boolean;
    messagesRemaining?: number;
    expiresAt?: string;
  };

  if (!event || !userId || !moon) {
    return res.status(400).json({ error: "Missing required fields: event, userId, moon" });
  }

  req.log?.info({ event, userId, moon, isBundle, messagesRemaining, expiresAt }, "TPTS Moon webhook received");

  // Future: invalidate any per-user subscription cache here
  // For now we verify live on every gated request so no cache to bust.

  return res.json({ received: true, event, userId, moon });
});

export default router;
