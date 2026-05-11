import { Router } from "express";
import { db, siteAnalyticsTable, siteHitsTable, domainsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

// POST /api/analytics/hit — public endpoint, no auth needed, called from hosted apps
// Usage: fetch('/api/analytics/hit', { method: 'POST', body: JSON.stringify({ domain, path }) })
router.post("/analytics/hit", async (req, res) => {
  const { domain, path = "/" } = req.body as { domain?: string; path?: string };
  if (!domain) return res.status(400).json({ error: "domain required" });

  const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  const today = new Date().toISOString().split("T")[0];

  try {
    await db.insert(siteHitsTable).values({
      domain: cleanDomain,
      path: path.substring(0, 200),
      referrer: (req.headers.referer ?? req.headers.referrer ?? null) as string | null,
    });

    await db
      .insert(siteAnalyticsTable)
      .values({ userId: "system", domain: cleanDomain, day: today, pageViews: 1 })
      .onConflictDoUpdate({
        target: [siteAnalyticsTable.domain, siteAnalyticsTable.day],
        set: { pageViews: sql`${siteAnalyticsTable.pageViews} + 1`, updatedAt: new Date() },
      });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
});

// GET /api/analytics — get analytics for all domains owned by the user
router.get("/analytics", async (req, res) => {
  try {
    const userDomains = await db
      .select({ domain: domainsTable.domain })
      .from(domainsTable)
      .where(eq(domainsTable.userId, req.userId));

    const domainList = userDomains.map(d => d.domain);
    if (domainList.length === 0) return res.json({ domains: [] });

    const results = await Promise.all(
      domainList.map(async (domain) => {
        const rows = await db
          .select()
          .from(siteAnalyticsTable)
          .where(eq(siteAnalyticsTable.domain, domain))
          .orderBy(desc(siteAnalyticsTable.day))
          .limit(30);

        const total = rows.reduce((sum, r) => sum + r.pageViews, 0);
        const today = rows.find(r => r.day === new Date().toISOString().split("T")[0])?.pageViews ?? 0;
        const yesterday = rows.find(r => {
          const d = new Date();
          d.setDate(d.getDate() - 1);
          return r.day === d.toISOString().split("T")[0];
        })?.pageViews ?? 0;

        return { domain, total, today, yesterday, days: rows };
      })
    );

    return res.json({ domains: results });
  } catch (err) {
    req.log.error({ err }, "analytics GET failed");
    return res.status(500).json({ error: "Failed" });
  }
});

// GET /api/analytics/:domain — get analytics for a specific domain
router.get("/analytics/:domain", async (req, res) => {
  const domain = req.params.domain.toLowerCase();
  try {
    const [owned] = await db
      .select()
      .from(domainsTable)
      .where(and(eq(domainsTable.domain, domain), eq(domainsTable.userId, req.userId)));

    if (!owned) return res.status(403).json({ error: "Domain not found or not owned by you" });

    const rows = await db
      .select()
      .from(siteAnalyticsTable)
      .where(eq(siteAnalyticsTable.domain, domain))
      .orderBy(desc(siteAnalyticsTable.day))
      .limit(30);

    const recent = await db
      .select()
      .from(siteHitsTable)
      .where(eq(siteHitsTable.domain, domain))
      .orderBy(desc(siteHitsTable.createdAt))
      .limit(20);

    return res.json({ domain, days: rows, recent });
  } catch (err) {
    req.log.error({ err }, "analytics domain GET failed");
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
