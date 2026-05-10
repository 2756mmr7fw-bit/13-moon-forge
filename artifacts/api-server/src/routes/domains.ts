import { Router } from "express";
import { db, domainsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// ─── GET /api/domains ─────────────────────────────────────────────────────────
router.get("/domains", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(domainsTable)
      .where(eq(domainsTable.userId, req.userId))
      .orderBy(domainsTable.createdAt);
    return res.json(rows);
  } catch (err) {
    req.log.error({ err }, "domains GET failed");
    return res.status(500).json({ error: "Failed to fetch domains" });
  }
});

// ─── POST /api/domains ────────────────────────────────────────────────────────
router.post("/domains", async (req, res) => {
  const { domain, registrar, expiresAt, connectedAppId, connectedAppName, connectedAppUrl, expectedIp, notes } = req.body as {
    domain?: string; registrar?: string; expiresAt?: string;
    connectedAppId?: string; connectedAppName?: string; connectedAppUrl?: string;
    expectedIp?: string; notes?: string;
  };

  if (!domain?.trim()) return res.status(400).json({ error: "domain is required" });

  try {
    const [row] = await db.insert(domainsTable).values({
      userId: req.userId,
      domain: domain.trim().toLowerCase(),
      registrar: registrar ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      connectedAppId: connectedAppId ?? null,
      connectedAppName: connectedAppName ?? null,
      connectedAppUrl: connectedAppUrl ?? null,
      expectedIp: expectedIp ?? null,
      notes: notes ?? null,
    }).returning();
    return res.json(row);
  } catch (err) {
    req.log.error({ err }, "domains POST failed");
    return res.status(500).json({ error: "Failed to save domain" });
  }
});

// ─── PATCH /api/domains/:id ───────────────────────────────────────────────────
router.patch("/domains/:id", async (req, res) => {
  const id = Number(req.params.id);
  const updates = req.body as Record<string, unknown>;

  try {
    const [row] = await db
      .update(domainsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(domainsTable.id, id), eq(domainsTable.userId, req.userId)))
      .returning();
    if (!row) return res.status(404).json({ error: "Domain not found" });
    return res.json(row);
  } catch (err) {
    req.log.error({ err }, "domains PATCH failed");
    return res.status(500).json({ error: "Failed to update domain" });
  }
});

// ─── DELETE /api/domains/:id ──────────────────────────────────────────────────
router.delete("/domains/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await db
      .delete(domainsTable)
      .where(and(eq(domainsTable.id, id), eq(domainsTable.userId, req.userId)));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "domains DELETE failed");
    return res.status(500).json({ error: "Failed to delete domain" });
  }
});

// ─── POST /api/domains/:id/check ─────────────────────────────────────────────
// Performs a live DNS + SSL check and updates the record.
router.post("/domains/:id/check", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [domain] = await db
      .select()
      .from(domainsTable)
      .where(and(eq(domainsTable.id, id), eq(domainsTable.userId, req.userId)));

    if (!domain) return res.status(404).json({ error: "Domain not found" });

    // DNS check via Cloudflare DoH
    let resolvedIp: string | null = null;
    let dnsStatus = "unknown";
    try {
      const dohRes = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain.domain)}&type=A`,
        { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(5000) }
      );
      if (dohRes.ok) {
        const data = await dohRes.json() as { Answer?: { data: string }[] };
        resolvedIp = data.Answer?.[0]?.data ?? null;
        if (resolvedIp) {
          dnsStatus = domain.expectedIp
            ? resolvedIp === domain.expectedIp ? "live" : "mismatch"
            : "live";
        } else {
          dnsStatus = "not_found";
        }
      }
    } catch {
      dnsStatus = "error";
    }

    // SSL check
    let sslStatus = "unknown";
    try {
      const sslRes = await fetch(`https://${domain.domain}`, {
        signal: AbortSignal.timeout(5000),
        method: "HEAD",
      });
      sslStatus = sslRes.ok || sslRes.status < 500 ? "ok" : "error";
    } catch {
      sslStatus = "unreachable";
    }

    const [updated] = await db
      .update(domainsTable)
      .set({ resolvedIp, dnsStatus, sslStatus, lastCheckedAt: new Date(), updatedAt: new Date() })
      .where(eq(domainsTable.id, id))
      .returning();

    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "domain check failed");
    return res.status(500).json({ error: "Check failed" });
  }
});

export default router;
