import { Router } from "express";
import { db } from "@workspace/db";
import { forgeMailbox, forgeMailAttachments } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

const SHARED_KEY      = process.env.TPTS_INBOUND_KEY ?? "";
const AV_DEV_URL      = "https://a3cbb751-539c-43bf-8aea-a8f136876d1d-00-11g6l6u26jhof.spock.replit.dev";
const AV_PUSH_PATH    = "/api/inbound/from-forge";

function antivirusBaseUrl(): string {
  return process.env.ANTIVIRUS_URL ?? AV_DEV_URL;
}

// GET /api/mail-scanner/attachments
// Returns all attachments for the signed-in user, newest first, joined with message info
router.get("/mail-scanner/attachments", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const rows = await db
      .select({
        id:           forgeMailAttachments.id,
        messageId:    forgeMailAttachments.messageId,
        filename:     forgeMailAttachments.filename,
        mime:         forgeMailAttachments.mime,
        sizeBytes:    forgeMailAttachments.sizeBytes,
        scanStatus:   forgeMailAttachments.scanStatus,
        scanResult:   forgeMailAttachments.scanResult,
        droppedTo:    forgeMailAttachments.droppedTo,
        createdAt:    forgeMailAttachments.createdAt,
        fromName:     forgeMailbox.fromName,
        fromAddress:  forgeMailbox.fromAddress,
        subject:      forgeMailbox.subject,
        msgCreatedAt: forgeMailbox.createdAt,
      })
      .from(forgeMailAttachments)
      .innerJoin(forgeMailbox, eq(forgeMailAttachments.messageId, forgeMailbox.id))
      .where(eq(forgeMailAttachments.userId, userId))
      .orderBy(desc(forgeMailAttachments.createdAt));

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "mail-scanner: failed to list attachments");
    res.status(500).json({ error: "Failed to load attachments" });
  }
});

// POST /api/mail-scanner/scan/:id
// Send this attachment to the antivirus and update scan_status
router.post("/mail-scanner/scan/:id", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const [att] = await db
    .select()
    .from(forgeMailAttachments)
    .where(and(eq(forgeMailAttachments.id, id), eq(forgeMailAttachments.userId, userId)));

  if (!att) return res.status(404).json({ error: "Attachment not found" });

  if (!SHARED_KEY) {
    return res.status(500).json({ error: "TPTS_INBOUND_KEY not configured — cannot reach antivirus" });
  }

  await db
    .update(forgeMailAttachments)
    .set({ scanStatus: "scanning" })
    .where(eq(forgeMailAttachments.id, id));

  try {
    const r = await fetch(`${antivirusBaseUrl()}${AV_PUSH_PATH}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SHARED_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        userId,
        content:  att.content,
        filename: att.filename,
        type:     "file",
        source:   "13Moon Forge Mail Scanner",
        isBase64: true,
      }),
      signal: AbortSignal.timeout(20000),
    });

    const body = await r.json().catch(() => ({}));

    if (r.ok) {
      await db
        .update(forgeMailAttachments)
        .set({ scanStatus: "clean", scanResult: JSON.stringify(body) })
        .where(eq(forgeMailAttachments.id, id));
      res.json({ ok: true, scanStatus: "clean", antivirusResponse: body });
    } else {
      await db
        .update(forgeMailAttachments)
        .set({ scanStatus: "flagged", scanResult: JSON.stringify(body) })
        .where(eq(forgeMailAttachments.id, id));
      res.json({ ok: false, scanStatus: "flagged", antivirusResponse: body });
    }
  } catch (err: any) {
    await db
      .update(forgeMailAttachments)
      .set({ scanStatus: "error", scanResult: JSON.stringify({ message: err?.message }) })
      .where(eq(forgeMailAttachments.id, id));
    req.log.error({ err }, "mail-scanner: antivirus call failed");
    res.status(502).json({ error: "Could not reach antivirus", detail: err?.message });
  }
});

// PUT /api/mail-scanner/drop/:id
// Mark a clean attachment as sent to a Forge Drop destination
router.put("/mail-scanner/drop/:id", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const { destination } = req.body as { destination?: string };
  if (!destination) return res.status(400).json({ error: "destination is required" });

  const [att] = await db
    .select({ id: forgeMailAttachments.id, scanStatus: forgeMailAttachments.scanStatus })
    .from(forgeMailAttachments)
    .where(and(eq(forgeMailAttachments.id, id), eq(forgeMailAttachments.userId, userId)));

  if (!att) return res.status(404).json({ error: "Attachment not found" });

  if (att.scanStatus === "flagged") {
    return res.status(400).json({ error: "Cannot drop a flagged attachment" });
  }

  try {
    await db
      .update(forgeMailAttachments)
      .set({ droppedTo: destination })
      .where(eq(forgeMailAttachments.id, id));

    res.json({ ok: true, droppedTo: destination });
  } catch (err) {
    req.log.error({ err }, "mail-scanner: drop failed");
    res.status(500).json({ error: "Failed to update" });
  }
});

export default router;
