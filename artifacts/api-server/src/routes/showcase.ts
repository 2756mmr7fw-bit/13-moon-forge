import { Router, type IRouter } from "express";
import { eq, desc, and, ne } from "drizzle-orm";
import { db, showcaseAppsTable } from "@workspace/db";
import {
  SubmitShowcaseAppBody,
  UpdateShowcaseAppParams,
  UpdateShowcaseAppBody,
  DeleteShowcaseAppParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const PLACEHOLDER_HIDE_THRESHOLD = 12;

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS ?? "").split(",").map((e) => e.trim()).filter(Boolean);

function isAdmin(req: Parameters<typeof router.get>[1] extends (req: infer R, ...args: never[]) => void ? R : never): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = req as any;
  const userId = r.userId as string | undefined;
  const email = r.user?.email as string | undefined;
  return (
    (userId != null && ADMIN_USER_IDS.includes(userId)) ||
    (email != null && ADMIN_EMAILS.includes(email))
  );
}

// Public — list featured + active community apps (no auth required)
router.get("/showcase", async (req, res): Promise<void> => {
  const all = await db
    .select()
    .from(showcaseAppsTable)
    .where(eq(showcaseAppsTable.isActive, true))
    .orderBy(desc(showcaseAppsTable.createdAt));

  const featured = all.filter((a) => a.isFeatured);
  const allCommunity = all.filter((a) => !a.isFeatured);

  // Count real (non-placeholder) community apps
  const realCommunityCount = allCommunity.filter((a) => !a.isPlaceholder).length;

  // Hide placeholders once we have enough real apps to fill the spotlight
  const community =
    realCommunityCount >= PLACEHOLDER_HIDE_THRESHOLD
      ? allCommunity.filter((a) => !a.isPlaceholder)
      : allCommunity;

  res.json({ featured, community });
});

// Public — submit an app (queued for admin approval)
router.post("/showcase/submit", async (req, res): Promise<void> => {
  const parsed = SubmitShowcaseAppBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.userId;

  const [app] = await db
    .insert(showcaseAppsTable)
    .values({
      ...parsed.data,
      submittedBy: userId ?? null,
      isFeatured: false,
      isPlaceholder: false,
      isActive: false, // Pending admin approval
    })
    .returning();

  logger.info({ appId: app.id, name: app.name }, "Showcase app submitted for review");

  res.status(201).json(app);
});

// Admin — list all apps including pending
router.get("/showcase/admin", async (req, res): Promise<void> => {
  if (!isAdmin(req as never)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const apps = await db
    .select()
    .from(showcaseAppsTable)
    .orderBy(desc(showcaseAppsTable.createdAt));

  res.json(apps);
});

// Admin — update an app (approve, feature, edit)
router.patch("/showcase/:id", async (req, res): Promise<void> => {
  if (!isAdmin(req as never)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const params = UpdateShowcaseAppParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateShowcaseAppBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [app] = await db
    .update(showcaseAppsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(showcaseAppsTable.id, params.data.id))
    .returning();

  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  res.json(app);
});

// Admin — delete an app
router.delete("/showcase/:id", async (req, res): Promise<void> => {
  if (!isAdmin(req as never)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const params = DeleteShowcaseAppParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(showcaseAppsTable)
    .where(eq(showcaseAppsTable.id, params.data.id));

  res.sendStatus(204);
});

export default router;
