import { Router } from "express";
import { db } from "@workspace/db";
import { forgeMailbox, workspaceItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
  "application/x-zip",
  "text/plain",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function iconForMime(mime: string): string {
  if (mime === "application/pdf") return "📄";
  if (mime.includes("zip")) return "📦";
  if (mime.includes("word") || mime.includes("docx")) return "📝";
  if (mime.includes("text")) return "📄";
  return "📁";
}

function labelForMime(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("zip")) return "ZIP archive";
  if (mime.includes("word") || mime.includes("docx")) return "Word doc";
  if (mime.includes("text")) return "Text file";
  return "File";
}

// Extract the userId from a Forge inbound address
// Format: {userId}@forge.13moonforge.ai
function extractUserId(toAddress: string): string | null {
  const match = toAddress.match(/^([^@]+)@forge\.13moonforge\.ai$/i);
  return match ? match[1] : null;
}

// POST /api/inbound/email
// Called by Resend (or any inbound email provider) when mail arrives at forge.13moonforge.ai
router.post("/inbound/email", async (req, res) => {
  try {
    // Resend wraps the payload under `data`, but also handle flat payloads
    const payload = req.body?.data ?? req.body;

    const toAddresses: string[] = Array.isArray(payload.to)
      ? payload.to
      : typeof payload.to === "string"
        ? [payload.to]
        : [];

    const fromName: string   = payload.from_name ?? payload.fromName ?? payload.from?.split("<")[0]?.trim() ?? "Unknown Sender";
    const fromAddr: string   = payload.from ?? "";
    const subject: string    = payload.subject ?? "(No subject)";
    const bodyText: string   = payload.text ?? payload.body ?? "";
    const attachments: any[] = payload.attachments ?? [];

    // Find the Forge userId from recipient addresses
    let userId: string | null = null;
    for (const addr of toAddresses) {
      const candidate = extractUserId(addr.toLowerCase().trim().replace(/[<>]/g, ""));
      if (candidate) { userId = candidate; break; }
    }

    if (!userId) {
      // No matching Forge address — silently accept (200) so the provider doesn't retry
      return res.json({ ok: true, note: "no matching forge address" });
    }

    // ── Save attachments to Workspace ─────────────────────────────────────────
    const savedFiles: string[] = [];

    for (const att of attachments) {
      const filename: string = att.filename ?? att.name ?? "attachment";
      const mime: string     = att.contentType ?? att.mimeType ?? att.content_type ?? "application/octet-stream";
      const content: string  = att.content ?? att.data ?? "";

      if (!content) continue;

      // Store as data URI in workspace content — frontend can decode/download
      const dataUri = `data:${mime};base64,${content}`;

      await db.insert(workspaceItemsTable).values({
        userId,
        type:    "file",
        name:    filename,
        content: dataUri,
        icon:    iconForMime(mime),
        color:   "#e8611a",
      });

      savedFiles.push(`${labelForMime(mime)}: ${filename}`);
    }

    // ── Deliver the email as a Forge mailbox message ──────────────────────────
    const attachmentSummary = savedFiles.length > 0
      ? `\n\n📎 Attachments saved to your Workspace:\n${savedFiles.map(f => `  • ${f}`).join("\n")}`
      : "";

    const fullBody = bodyText
      ? `${bodyText}${attachmentSummary}`
      : attachmentSummary || "(No message body)";

    await db.insert(forgeMailbox).values({
      userId,
      fromName:    fromName || fromAddr || "Email",
      fromAddress: fromAddr,
      subject:     subject + (savedFiles.length > 0 ? ` [${savedFiles.length} file${savedFiles.length > 1 ? "s" : ""} saved]` : ""),
      body:        fullBody,
      folder:      "inbox",
    });

    res.json({ ok: true, filesaved: savedFiles.length });
  } catch (err: any) {
    console.error("inbound email error", err);
    res.status(500).json({ error: "processing failed" });
  }
});

export default router;
