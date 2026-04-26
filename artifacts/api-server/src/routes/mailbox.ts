import { Router } from "express";
import { db } from "@workspace/db";
import { forgeMailbox } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

const WELCOME_SUBJECT = "Welcome to your Forge Mailbox";
const WELCOME_BODY = `Hey, welcome to your Forge inbox.

This is your personal mailbox inside 13 Moon Forge. A few things you can do here:

• Send notes to yourself — ideas, reminders, links, whatever you need to capture
• Forge (and the Moons) may send you important updates here
• Your Forge email address is yours — it's tied to your account

Your address is shown at the top of this mailbox. Right now incoming email from outside isn't hooked up yet, but the inbox is fully operational for in-app messages.

Stay sovereign.

— Forge`;

async function ensureWelcome(userId: string) {
  const existing = await db
    .select({ id: forgeMailbox.id })
    .from(forgeMailbox)
    .where(eq(forgeMailbox.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(forgeMailbox).values({
      userId,
      fromName: "Forge",
      fromAddress: "forge@13moonforge.ai",
      subject: WELCOME_SUBJECT,
      body: WELCOME_BODY,
      folder: "inbox",
    });
  }
}

router.get("/mailbox", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    await ensureWelcome(userId);
    const messages = await db
      .select()
      .from(forgeMailbox)
      .where(and(eq(forgeMailbox.userId, userId), eq(forgeMailbox.folder, "inbox")))
      .orderBy(desc(forgeMailbox.createdAt));
    res.json(messages);
  } catch (err) {
    req.log.error({ err }, "mailbox: failed to list");
    res.status(500).json({ error: "Failed to load mailbox" });
  }
});

router.get("/mailbox/starred", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const messages = await db
      .select()
      .from(forgeMailbox)
      .where(and(eq(forgeMailbox.userId, userId), eq(forgeMailbox.starred, true)))
      .orderBy(desc(forgeMailbox.createdAt));
    res.json(messages);
  } catch (err) {
    req.log.error({ err }, "mailbox: failed to list starred");
    res.status(500).json({ error: "Failed to load starred" });
  }
});

router.get("/mailbox/trash", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const messages = await db
      .select()
      .from(forgeMailbox)
      .where(and(eq(forgeMailbox.userId, userId), eq(forgeMailbox.folder, "trash")))
      .orderBy(desc(forgeMailbox.createdAt));
    res.json(messages);
  } catch (err) {
    req.log.error({ err }, "mailbox: failed to list trash");
    res.status(500).json({ error: "Failed to load trash" });
  }
});

router.post("/mailbox/compose", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { subject, body } = req.body ?? {};
  if (!body || typeof body !== "string") return res.status(400).json({ error: "body required" });

  try {
    const [msg] = await db.insert(forgeMailbox).values({
      userId,
      fromName: "Me",
      fromAddress: `${userId}@forge.13moonforge.ai`,
      subject: (typeof subject === "string" && subject.trim()) ? subject.trim() : "(No subject)",
      body: body.trim(),
      folder: "inbox",
    }).returning();
    res.status(201).json(msg);
  } catch (err) {
    req.log.error({ err }, "mailbox: compose failed");
    res.status(500).json({ error: "Failed to send message" });
  }
});

router.put("/mailbox/:id/read", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  try {
    await db.update(forgeMailbox).set({ read: true })
      .where(and(eq(forgeMailbox.id, id), eq(forgeMailbox.userId, userId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "mailbox: mark read failed");
    res.status(500).json({ error: "Failed to update" });
  }
});

router.put("/mailbox/:id/star", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  try {
    const [current] = await db.select({ starred: forgeMailbox.starred })
      .from(forgeMailbox)
      .where(and(eq(forgeMailbox.id, id), eq(forgeMailbox.userId, userId)));
    if (!current) return res.status(404).json({ error: "Not found" });
    await db.update(forgeMailbox).set({ starred: !current.starred })
      .where(and(eq(forgeMailbox.id, id), eq(forgeMailbox.userId, userId)));
    res.json({ starred: !current.starred });
  } catch (err) {
    req.log.error({ err }, "mailbox: star failed");
    res.status(500).json({ error: "Failed to update" });
  }
});

router.delete("/mailbox/:id", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  try {
    const [current] = await db.select({ folder: forgeMailbox.folder })
      .from(forgeMailbox)
      .where(and(eq(forgeMailbox.id, id), eq(forgeMailbox.userId, userId)));
    if (!current) return res.status(404).json({ error: "Not found" });

    if (current.folder === "trash") {
      await db.delete(forgeMailbox)
        .where(and(eq(forgeMailbox.id, id), eq(forgeMailbox.userId, userId)));
      res.json({ deleted: true });
    } else {
      await db.update(forgeMailbox).set({ folder: "trash" })
        .where(and(eq(forgeMailbox.id, id), eq(forgeMailbox.userId, userId)));
      res.json({ trashed: true });
    }
  } catch (err) {
    req.log.error({ err }, "mailbox: delete failed");
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
