import { Router } from "express";
import { db, showcaseAppsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/builder/:userId — public profile showing all active showcase apps for a user
router.get("/builder/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const apps = await db
      .select()
      .from(showcaseAppsTable)
      .where(eq(showcaseAppsTable.submittedBy, userId));

    if (apps.length === 0) {
      return res.status(404).json({ error: "Builder not found or has no public apps" });
    }

    // Try to look up clerk user info if available
    let displayName: string | null = null;
    let imageUrl: string | null = null;

    // Use builderName from first app record as a reasonable display
    const named = apps.find(a => a.builderName);
    if (named) displayName = named.builderName;

    return res.json({
      userId,
      displayName,
      imageUrl,
      apps: apps.map(a => ({
        id: a.id,
        name: a.name,
        tagline: a.tagline,
        description: a.description,
        websiteUrl: a.websiteUrl,
        logoUrl: a.logoUrl,
        category: a.category,
        listingType: a.listingType,
        isActive: a.isActive,
        builderName: a.builderName,
        submittedBy: a.submittedBy,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "builder profile GET failed");
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
