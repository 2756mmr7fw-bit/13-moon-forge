import { Router } from "express";
import { db } from "@workspace/db";
import { emailApiKeysTable, emailSendsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";

const router = Router();

const RESEND_KEY    = () => process.env.RESEND_API_KEY ?? "";
const SENDGRID_KEY  = () => process.env.SENDGRID_API_KEY ?? "";
const FORGE_DOMAIN  = process.env.FORGE_DOMAIN ?? "13moonforge.ai";

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function todayStr() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function monthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Auth middleware for email gateway (Bearer key) ───────────────────────────
async function emailKeyAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization as string | undefined;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing API key" });

  const rawKey = auth.slice(7);
  const hash = hashKey(rawKey);

  const [keyRecord] = await db
    .select()
    .from(emailApiKeysTable)
    .where(and(eq(emailApiKeysTable.keyHash, hash), eq(emailApiKeysTable.active, true)));

  if (!keyRecord) return res.status(401).json({ error: "Invalid API key" });

  // Reset daily counter
  const today = todayStr();
  if (keyRecord.lastResetDay !== today) {
    await db.update(emailApiKeysTable)
      .set({ sendsToday: 0, lastResetDay: today })
      .where(eq(emailApiKeysTable.id, keyRecord.id));
    keyRecord.sendsToday = 0;
  }

  // Check limits
  if (keyRecord.sendsToday >= keyRecord.dailyLimit) {
    return res.status(429).json({ error: "Daily email limit reached", limit: keyRecord.dailyLimit });
  }
  if (keyRecord.sendsThisMonth >= keyRecord.monthlyLimit) {
    return res.status(429).json({ error: "Monthly email limit reached", limit: keyRecord.monthlyLimit });
  }

  req.emailKey = keyRecord;
  req.userId = keyRecord.userId;
  next();
}

// ─── GET /api/email/keys ──────────────────────────────────────────────────────
router.get("/email/keys", async (req, res) => {
  const keys = await db.select({
    id: emailApiKeysTable.id,
    name: emailApiKeysTable.name,
    keyPrefix: emailApiKeysTable.keyPrefix,
    dailyLimit: emailApiKeysTable.dailyLimit,
    monthlyLimit: emailApiKeysTable.monthlyLimit,
    sendsToday: emailApiKeysTable.sendsToday,
    sendsThisMonth: emailApiKeysTable.sendsThisMonth,
    fromDomain: emailApiKeysTable.fromDomain,
    active: emailApiKeysTable.active,
    createdAt: emailApiKeysTable.createdAt,
  }).from(emailApiKeysTable)
    .where(eq(emailApiKeysTable.userId, req.userId))
    .orderBy(desc(emailApiKeysTable.createdAt));

  return res.json({ keys });
});

// ─── POST /api/email/keys ─────────────────────────────────────────────────────
router.post("/email/keys", async (req, res) => {
  const { name, fromDomain } = req.body as { name?: string; fromDomain?: string };

  const rawKey = `fge_${randomBytes(24).toString("hex")}`;
  const hash = hashKey(rawKey);
  const prefix = rawKey.slice(0, 10);

  const [key] = await db.insert(emailApiKeysTable).values({
    userId: req.userId,
    name: name ?? "Default",
    keyHash: hash,
    keyPrefix: prefix,
    fromDomain: fromDomain ?? null,
    lastResetDay: todayStr(),
  }).returning();

  return res.json({ ok: true, key: { ...key, rawKey } });
});

// ─── DELETE /api/email/keys/:id ───────────────────────────────────────────────
router.delete("/email/keys/:id", async (req, res) => {
  await db.delete(emailApiKeysTable)
    .where(and(eq(emailApiKeysTable.id, parseInt(req.params.id)), eq(emailApiKeysTable.userId, req.userId)));
  return res.json({ ok: true });
});

// ─── GET /api/email/sends ─────────────────────────────────────────────────────
router.get("/email/sends", async (req, res) => {
  const sends = await db.select()
    .from(emailSendsTable)
    .where(eq(emailSendsTable.userId, req.userId))
    .orderBy(desc(emailSendsTable.sentAt))
    .limit(100);
  return res.json({ sends });
});

// ─── POST /api/email/send  (authenticated with email API key) ─────────────────
router.post("/email/send", emailKeyAuth, async (req, res) => {
  const {
    from,
    to,
    subject,
    html,
    text,
    replyTo,
  } = req.body as {
    from?: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
  };

  const fromAddress = from ?? `noreply@${FORGE_DOMAIN}`;
  const toAddresses = Array.isArray(to) ? to : [to];

  let providerId: string | null = null;
  let status: "sent" | "failed" = "sent";
  let error: string | null = null;

  // Try Resend first, fall back to SendGrid
  if (RESEND_KEY()) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromAddress, to: toAddresses, subject, html, text, reply_to: replyTo }),
      });
      const data = await r.json() as { id?: string; message?: string };
      if (r.ok) {
        providerId = data.id ?? null;
      } else {
        throw new Error(data.message ?? `Resend ${r.status}`);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      status = "failed";
    }
  } else if (SENDGRID_KEY()) {
    try {
      const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${SENDGRID_KEY()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: toAddresses.map(e => ({ email: e })) }],
          from: { email: fromAddress },
          subject,
          content: html
            ? [{ type: "text/html", value: html }]
            : [{ type: "text/plain", value: text ?? "" }],
        }),
      });
      if (!r.ok) {
        const body = await r.text();
        throw new Error(`SendGrid ${r.status}: ${body.slice(0, 200)}`);
      }
      providerId = r.headers.get("x-message-id");
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      status = "failed";
    }
  } else {
    return res.status(503).json({ error: "No email provider configured" });
  }

  // Record the send
  const emailKey = req.emailKey!;
  await db.insert(emailSendsTable).values({
    apiKeyId: emailKey.id,
    userId: req.userId,
    fromAddress,
    toAddress: toAddresses.join(", "),
    subject,
    provider: RESEND_KEY() ? "resend" : "sendgrid",
    providerId,
    status,
    error,
  });

  // Increment counters
  if (status === "sent") {
    await db.update(emailApiKeysTable).set({
      sendsToday: (emailKey.sendsToday ?? 0) + 1,
      sendsThisMonth: (emailKey.sendsThisMonth ?? 0) + 1,
    }).where(eq(emailApiKeysTable.id, emailKey.id));
  }

  if (status === "failed") {
    return res.status(500).json({ error, ok: false });
  }

  return res.json({ ok: true, id: providerId });
});

export default router;
