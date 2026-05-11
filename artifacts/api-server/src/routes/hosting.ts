import { Router } from "express";
import { db } from "@workspace/db";
import { hostedUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const FORGE_COOLIFY_URL = process.env.FORGE_COOLIFY_URL ?? "http://5.78.154.21:8000";

// GET /api/hosting/status — check if current user has managed hosting
router.get("/hosting/status", async (req, res) => {
  if (!req.userId || req.userId.startsWith("anon-")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const [row] = await db
      .select()
      .from(hostedUsersTable)
      .where(eq(hostedUsersTable.userId, req.userId));

    if (!row) return res.json({ status: "none" });

    return res.json({
      status: row.status,
      plan: row.plan,
      subdomain: row.subdomain,
      coolifyTeamId: row.coolifyTeamId,
      coolifyUrl: row.coolifyUrl,
      provisionedAt: row.provisionedAt,
      requestedAt: row.requestedAt,
    });
  } catch (err) {
    req.log.error({ err }, "hosting/status failed");
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/hosting/request — user requests managed hosting
router.post("/hosting/request", async (req, res) => {
  if (!req.userId || req.userId.startsWith("anon-")) {
    return res.status(401).json({ error: "Sign in to request hosting" });
  }

  const { plan, subdomain, requestNote } = req.body as {
    plan?: string;
    subdomain?: string;
    requestNote?: string;
  };

  const cleanSubdomain = subdomain?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 30);

  try {
    const existing = await db
      .select()
      .from(hostedUsersTable)
      .where(eq(hostedUsersTable.userId, req.userId));

    if (existing.length > 0) {
      return res.json({ ok: true, status: existing[0].status, message: "Request already submitted" });
    }

    await db.insert(hostedUsersTable).values({
      userId: req.userId,
      plan: plan ?? "basic",
      coolifyUrl: FORGE_COOLIFY_URL,
      subdomain: cleanSubdomain ?? null,
      requestNote: requestNote?.trim() ?? null,
      status: "pending",
    });

    return res.json({ ok: true, status: "pending", message: "Your hosting request has been submitted. We'll set you up shortly." });
  } catch (err) {
    req.log.error({ err }, "hosting/request failed");
    return res.status(500).json({ error: "Failed to submit request" });
  }
});

export default router;
