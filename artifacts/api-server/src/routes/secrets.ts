import { Router } from "express";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { db, appSecretsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export const router = Router();

// ─── Encryption helpers ───────────────────────────────────────────────────────
// AES-256-GCM with a 32-byte key derived from SESSION_SECRET

function getEncKey(): Buffer {
  const raw = process.env.SESSION_SECRET ?? "forge-default-secret-change-in-prod";
  return createHash("sha256").update(raw).digest();
}

function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), encrypted.toString("hex"), tag.toString("hex")].join(":");
}

function decrypt(ciphertext: string): string {
  const [ivHex, encHex, tagHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", getEncKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

// ─── GET /api/secrets ─────────────────────────────────────────────────────────
// Returns all secrets for the user. Values are masked (only last 4 chars shown).
router.get("/secrets", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(appSecretsTable)
      .where(eq(appSecretsTable.userId, req.userId))
      .orderBy(appSecretsTable.appName, appSecretsTable.serviceName, appSecretsTable.keyName);

    const masked = rows.map(r => {
      let preview = "••••••••";
      try {
        const plain = decrypt(r.encryptedValue);
        preview = plain.length > 4 ? `••••${plain.slice(-4)}` : "••••";
      } catch {}
      return { ...r, encryptedValue: undefined, valuePreview: preview };
    });

    return res.json(masked);
  } catch (err) {
    req.log.error({ err }, "secrets GET failed");
    return res.status(500).json({ error: "Failed to fetch secrets" });
  }
});

// ─── GET /api/secrets/:id/reveal ──────────────────────────────────────────────
router.get("/secrets/:id/reveal", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [row] = await db
      .select()
      .from(appSecretsTable)
      .where(and(eq(appSecretsTable.id, id), eq(appSecretsTable.userId, req.userId)));
    if (!row) return res.status(404).json({ error: "Not found" });
    const value = decrypt(row.encryptedValue);
    return res.json({ value });
  } catch (err) {
    req.log.error({ err }, "secrets reveal failed");
    return res.status(500).json({ error: "Failed to reveal secret" });
  }
});

// ─── POST /api/secrets ────────────────────────────────────────────────────────
router.post("/secrets", async (req, res) => {
  const { appName, serviceName, keyName, value, notes } = req.body as Record<string, string>;
  if (!serviceName?.trim() || !keyName?.trim() || !value?.trim()) {
    return res.status(400).json({ error: "serviceName, keyName and value are required" });
  }
  try {
    const [row] = await db.insert(appSecretsTable).values({
      userId: req.userId,
      appName: appName?.trim() || "Default",
      serviceName: serviceName.trim(),
      keyName: keyName.trim().toUpperCase().replace(/\s+/g, "_"),
      encryptedValue: encrypt(value.trim()),
      notes: notes?.trim() || null,
    }).returning();
    return res.status(201).json({ ...row, encryptedValue: undefined, valuePreview: `••••${value.trim().slice(-4)}` });
  } catch (err) {
    req.log.error({ err }, "secrets POST failed");
    return res.status(500).json({ error: "Failed to create secret" });
  }
});

// ─── PATCH /api/secrets/:id ───────────────────────────────────────────────────
router.patch("/secrets/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { appName, serviceName, keyName, value, notes } = req.body as Record<string, string>;
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (appName !== undefined) updates.appName = appName.trim() || "Default";
    if (serviceName !== undefined) updates.serviceName = serviceName.trim();
    if (keyName !== undefined) updates.keyName = keyName.trim().toUpperCase().replace(/\s+/g, "_");
    if (value !== undefined && value.trim()) updates.encryptedValue = encrypt(value.trim());
    if (notes !== undefined) updates.notes = notes.trim() || null;

    const [row] = await db
      .update(appSecretsTable)
      .set(updates)
      .where(and(eq(appSecretsTable.id, id), eq(appSecretsTable.userId, req.userId)))
      .returning();

    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json({ ...row, encryptedValue: undefined });
  } catch (err) {
    req.log.error({ err }, "secrets PATCH failed");
    return res.status(500).json({ error: "Failed to update secret" });
  }
});

// ─── DELETE /api/secrets/:id ──────────────────────────────────────────────────
router.delete("/secrets/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [row] = await db
      .delete(appSecretsTable)
      .where(and(eq(appSecretsTable.id, id), eq(appSecretsTable.userId, req.userId)))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "secrets DELETE failed");
    return res.status(500).json({ error: "Failed to delete secret" });
  }
});

// ─── POST /api/secrets/import ─────────────────────────────────────────────────
// Body: { appName, envText } — parses KEY=VALUE lines
router.post("/secrets/import", async (req, res) => {
  const { appName, envText, serviceName } = req.body as Record<string, string>;
  if (!envText?.trim()) return res.status(400).json({ error: "envText is required" });

  const lines = envText.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
  const pairs: { keyName: string; value: string }[] = [];

  for (const line of lines) {
    const eqIdx = line.indexOf("=");
    if (eqIdx < 1) continue;
    const keyName = line.slice(0, eqIdx).trim().toUpperCase();
    const value = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (keyName && value) pairs.push({ keyName, value });
  }

  if (pairs.length === 0) return res.status(400).json({ error: "No valid KEY=VALUE pairs found" });

  try {
    const inserted = await db.insert(appSecretsTable).values(
      pairs.map(p => ({
        userId: req.userId,
        appName: appName?.trim() || "Default",
        serviceName: serviceName?.trim() || "Imported",
        keyName: p.keyName,
        encryptedValue: encrypt(p.value),
      }))
    ).returning();

    return res.json({ ok: true, count: inserted.length });
  } catch (err) {
    req.log.error({ err }, "secrets import failed");
    return res.status(500).json({ error: "Failed to import secrets" });
  }
});

// ─── POST /api/secrets/migrate ───────────────────────────────────────────────
// Migrates secrets stored under a localStorage UUID to the authenticated Clerk userId.
// Safe to call multiple times — only migrates secrets that don't conflict.
router.post("/secrets/migrate", async (req, res) => {
  const { anonUserId } = req.body as { anonUserId?: string };
  if (!anonUserId?.trim()) return res.status(400).json({ error: "anonUserId required" });

  const clerkUserId = req.userId;
  // Guard: only migrate if the caller is a real Clerk user (not anon)
  if (clerkUserId.startsWith("anon-") || clerkUserId === anonUserId) {
    return res.status(403).json({ error: "Must be authenticated to migrate secrets" });
  }

  try {
    // Re-attribute all secrets from the old anon ID to the Clerk user ID
    const updated = await db
      .update(appSecretsTable)
      .set({ userId: clerkUserId })
      .where(eq(appSecretsTable.userId, anonUserId.trim()))
      .returning({ id: appSecretsTable.id });

    req.log.info({ from: anonUserId, to: clerkUserId, count: updated.length }, "secrets migrated");
    return res.json({ ok: true, migrated: updated.length });
  } catch (err) {
    req.log.error({ err }, "secrets migrate failed");
    return res.status(500).json({ error: "Migration failed" });
  }
});

// ─── GET /api/secrets/export ──────────────────────────────────────────────────
// ?appName=xxx  — returns .env file content
router.get("/secrets/export", async (req, res) => {
  const appName = (req.query.appName as string) || "";
  try {
    const whereClause = appName
      ? and(eq(appSecretsTable.userId, req.userId), eq(appSecretsTable.appName, appName))
      : eq(appSecretsTable.userId, req.userId);

    const rows = await db
      .select()
      .from(appSecretsTable)
      .where(whereClause)
      .orderBy(appSecretsTable.appName, appSecretsTable.serviceName, appSecretsTable.keyName);

    const lines: string[] = [];
    let lastApp = "";
    let lastService = "";

    for (const row of rows) {
      if (row.appName !== lastApp) {
        if (lines.length) lines.push("");
        lines.push(`# === ${row.appName} ===`);
        lastApp = row.appName;
        lastService = "";
      }
      if (row.serviceName !== lastService) {
        lines.push(`# ${row.serviceName}`);
        lastService = row.serviceName;
      }
      let value = "DECRYPTION_ERROR";
      try { value = decrypt(row.encryptedValue); } catch {}
      lines.push(`${row.keyName}=${value}`);
    }

    const filename = appName ? `${appName.replace(/\s+/g, "-")}.env` : "forge-secrets.env";
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "text/plain");
    return res.send(lines.join("\n"));
  } catch (err) {
    req.log.error({ err }, "secrets export failed");
    return res.status(500).json({ error: "Failed to export secrets" });
  }
});
