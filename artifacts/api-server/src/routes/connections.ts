import { Router } from "express";
import { db } from "@workspace/db";
import {
  serverConnectionsTable,
  githubConnectionsTable,
  gitlabConnectionsTable,
  bitbucketConnectionsTable,
  appSecretsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUserSubscriptions } from "../lib/moonApi";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function safeJson<T>(res: Response): Promise<T | null> {
  try { return await res.json() as T; } catch { return null; }
}

async function coolifyHealth(coolifyUrl: string, apiKey: string): Promise<boolean> {
  try {
    const r = await fetch(`${coolifyUrl}/api/v1/healthcheck`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    return r.ok;
  } catch { return false; }
}

// ─── GET /api/connections ─────────────────────────────────────────────────────
// Returns a full snapshot of everything the authenticated user has connected.
router.get("/connections", async (req, res) => {
  const userId = req.userId;

  try {
    // ── Run all DB lookups in parallel ───────────────────────────────────────
    const [
      coolifyRow,
      githubRow,
      gitlabRow,
      bitbucketRow,
      secretRows,
      moonSubs,
    ] = await Promise.all([
      db.select().from(serverConnectionsTable).where(eq(serverConnectionsTable.userId, userId)).then(r => r[0] ?? null),
      db.select().from(githubConnectionsTable).where(eq(githubConnectionsTable.userId, userId)).then(r => r[0] ?? null),
      db.select().from(gitlabConnectionsTable).where(eq(gitlabConnectionsTable.userId, userId)).then(r => r[0] ?? null),
      db.select().from(bitbucketConnectionsTable).where(eq(bitbucketConnectionsTable.userId, userId)).then(r => r[0] ?? null),
      db.select().from(appSecretsTable).where(eq(appSecretsTable.userId, userId)),
      getUserSubscriptions(userId),
    ]);

    // ── Coolify live health check (only if connected) ────────────────────────
    const coolifyHealthy = coolifyRow
      ? await coolifyHealth(coolifyRow.coolifyUrl, coolifyRow.coolifyApiKey)
      : false;

    // ── Moon subscription parsing ────────────────────────────────────────────
    const MOON_SLUGS = ["forge", "hawk", "quill", "creed", "sage", "flint"] as const;
    type MoonSlug = typeof MOON_SLUGS[number];

    interface RawMoon { active?: boolean; isBundle?: boolean; messagesRemaining?: number; moon?: string }
    const rawSubs = Array.isArray(moonSubs) ? moonSubs as RawMoon[] : [];

    const moons = Object.fromEntries(
      MOON_SLUGS.map(slug => {
        const found = rawSubs.find(m => m.moon === slug);
        const isBundle = found?.isBundle === true;
        const active = found?.active === true || isBundle;
        const remaining = isBundle ? null : (found?.messagesRemaining ?? 0);
        return [slug, { active, isBundle, messagesRemaining: remaining }];
      })
    ) as Record<MoonSlug, { active: boolean; isBundle: boolean; messagesRemaining: number | null }>;

    // ── Payment gateway detection ────────────────────────────────────────────
    // Square: API key is server-side (env var) — indicate it's configured
    const squareConfigured = !!(process.env.SQUARE_API_KEY?.trim());

    // Check secrets vault for payment-related keys
    const paymentKeywords = ["stripe", "square", "paypal", "braintree", "razorpay", "payment", "checkout"];
    const paymentSecrets = secretRows.filter(s =>
      paymentKeywords.some(kw =>
        s.serviceName.toLowerCase().includes(kw) || s.keyName.toLowerCase().includes(kw)
      )
    );

    // Stripe in vault?
    const stripeInVault = paymentSecrets.some(s => s.serviceName.toLowerCase().includes("stripe") || s.keyName.toLowerCase().includes("stripe"));
    // Square in vault?
    const squareInVault = paymentSecrets.some(s => s.serviceName.toLowerCase().includes("square") || s.keyName.toLowerCase().includes("square"));

    // ── Secrets vault summary ────────────────────────────────────────────────
    const secretsByService: Record<string, number> = {};
    for (const s of secretRows) {
      const svc = s.serviceName || "Other";
      secretsByService[svc] = (secretsByService[svc] ?? 0) + 1;
    }

    // ─── Response ────────────────────────────────────────────────────────────
    return res.json({
      infrastructure: {
        coolify: coolifyRow ? {
          connected: true,
          name: coolifyRow.name,
          url: coolifyRow.coolifyUrl,
          healthy: coolifyHealthy,
          connectedAt: coolifyRow.createdAt,
        } : { connected: false },
      },
      codeSources: {
        github: githubRow ? {
          connected: true,
          username: githubRow.username,
          avatarUrl: githubRow.avatarUrl ?? null,
          connectedAt: githubRow.connectedAt,
        } : { connected: false },
        gitlab: gitlabRow ? {
          connected: true,
          username: gitlabRow.username,
          avatarUrl: gitlabRow.avatarUrl ?? null,
          connectedAt: gitlabRow.connectedAt,
        } : { connected: false },
        bitbucket: bitbucketRow ? {
          connected: true,
          username: bitbucketRow.bbUsername,
          displayName: bitbucketRow.displayName ?? null,
          avatarUrl: bitbucketRow.avatarUrl ?? null,
          connectedAt: bitbucketRow.connectedAt,
        } : { connected: false },
      },
      moons,
      payments: {
        square: {
          configured: squareConfigured || squareInVault,
          source: squareConfigured ? "platform" : squareInVault ? "vault" : null,
        },
        stripe: {
          configured: stripeInVault,
          source: stripeInVault ? "vault" : null,
        },
        other: paymentSecrets
          .filter(s => !s.serviceName.toLowerCase().includes("stripe") && !s.serviceName.toLowerCase().includes("square"))
          .map(s => ({ service: s.serviceName, keyName: s.keyName })),
      },
      secrets: {
        total: secretRows.length,
        byService: secretsByService,
      },
    });
  } catch (err) {
    req.log.error({ err }, "connections GET failed");
    return res.status(500).json({ error: "Failed to load connections" });
  }
});

export default router;
