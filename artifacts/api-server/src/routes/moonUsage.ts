import { Router } from "express";
import { checkForgeAccess, checkFlintAccess, checkSageAccess,
         checkHawkAccess, getMoonSubscribeUrl } from "../lib/moonApi";
import { db, moonEntitlements } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const MOON_DEFS = [
  { id: "forge",  label: "Forge",  desc: "Builder AI",   color: "#f97316" },
  { id: "flint",  label: "Flint",  desc: "Code Sparker", color: "#ef4444" },
  { id: "sage",   label: "Sage",   desc: "Learn & Teach", color: "#22c55e" },
  { id: "hawk",   label: "Hawk",   desc: "The Finder",   color: "#eab308" },
  { id: "quill",  label: "Quill",  desc: "Writer",       color: "#8b5cf6" },
  { id: "creed",  label: "Creed",  desc: "Strategy",     color: "#3b82f6" },
] as const;

// GET /api/moon/usage — returns entitlement snapshot for the current user
// Auth-gated: uses Clerk userId from middleware
router.get("/moon/usage", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Check local entitlements store first (populated by webhooks)
    const [entitlement] = await db
      .select()
      .from(moonEntitlements)
      .where(eq(moonEntitlements.userId, userId))
      .limit(1);

    const moons = MOON_DEFS.map(m => ({
      ...m,
      active: entitlement?.isActive && (entitlement.moons ?? []).includes(m.id) || false,
      messagesRemaining: entitlement?.messagesRemaining ?? null,
      expiresAt: entitlement?.expiresAt ?? null,
      subscribeUrl: getMoonSubscribeUrl(m.id),
    }));

    res.json({
      userId,
      hasAnyActive: entitlement?.isActive ?? false,
      moons,
      updatedAt: entitlement?.updatedAt ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "moon-usage: failed");
    res.status(500).json({ error: "Failed to load usage" });
  }
});

export default router;
