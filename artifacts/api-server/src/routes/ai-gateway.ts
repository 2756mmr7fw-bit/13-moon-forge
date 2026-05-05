import { Router } from "express";
import { db } from "@workspace/db";
import { aiApiKeysTable, aiUsageTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";

const router = Router();

const MOON_API_KEY   = () => process.env.MOON_API_KEY ?? process.env.TPTS_MOON_API_KEY ?? "";
const FORGE_DOMAIN   = process.env.FORGE_DOMAIN ?? "13moonforge.ai";

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function monthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Model → provider mapping
const MODEL_PROVIDERS: Record<string, string> = {
  "gpt-4o":                "openai",
  "gpt-4o-mini":           "openai",
  "gpt-4-turbo":           "openai",
  "gpt-3.5-turbo":         "openai",
  "claude-3-5-sonnet":     "anthropic",
  "claude-3-5-haiku":      "anthropic",
  "claude-3-opus":         "anthropic",
  "gemini-1.5-pro":        "google",
  "gemini-1.5-flash":      "google",
  "llama-3.1-70b":         "meta",
  "llama-3.1-8b":          "meta",
  "mistral-7b":            "mistral",
  "mixtral-8x7b":          "mistral",
};

// ─── Gateway key auth middleware ──────────────────────────────────────────────
async function gatewayKeyAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization as string | undefined;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing API key" });

  const rawKey = auth.slice(7);

  // Allow session auth too for dashboard testing
  if (req.session?.userId && rawKey === "session") {
    req.userId = req.session.userId;
    req.aiKey = null;
    return next();
  }

  const hash = hashKey(rawKey);
  const [keyRecord] = await db
    .select()
    .from(aiApiKeysTable)
    .where(and(eq(aiApiKeysTable.keyHash, hash), eq(aiApiKeysTable.active, true)));

  if (!keyRecord) return res.status(401).json({ error: "Invalid API key" });

  // Reset monthly counter
  const month = monthStr();
  if (keyRecord.lastResetMonth !== month) {
    await db.update(aiApiKeysTable)
      .set({ tokensUsedThisMonth: 0, lastResetMonth: month })
      .where(eq(aiApiKeysTable.id, keyRecord.id));
    keyRecord.tokensUsedThisMonth = 0;
  }

  if (keyRecord.tokensUsedThisMonth >= keyRecord.monthlyTokenLimit) {
    return res.status(429).json({ error: "Monthly token limit reached", limit: keyRecord.monthlyTokenLimit });
  }

  req.aiKey = keyRecord;
  req.userId = keyRecord.userId;
  next();
}

// ─── GET /api/ai/keys ─────────────────────────────────────────────────────────
router.get("/ai/keys", async (req, res) => {
  const keys = await db.select({
    id: aiApiKeysTable.id,
    name: aiApiKeysTable.name,
    keyPrefix: aiApiKeysTable.keyPrefix,
    monthlyTokenLimit: aiApiKeysTable.monthlyTokenLimit,
    tokensUsedThisMonth: aiApiKeysTable.tokensUsedThisMonth,
    allowedModels: aiApiKeysTable.allowedModels,
    active: aiApiKeysTable.active,
    createdAt: aiApiKeysTable.createdAt,
  }).from(aiApiKeysTable)
    .where(eq(aiApiKeysTable.userId, req.userId))
    .orderBy(desc(aiApiKeysTable.createdAt));

  return res.json({ keys });
});

// ─── POST /api/ai/keys ────────────────────────────────────────────────────────
router.post("/ai/keys", async (req, res) => {
  const { name, monthlyTokenLimit = 1_000_000, allowedModels = "*" } = req.body as {
    name?: string; monthlyTokenLimit?: number; allowedModels?: string;
  };

  const rawKey = `fga_${randomBytes(24).toString("hex")}`;
  const hash = hashKey(rawKey);
  const prefix = rawKey.slice(0, 10);

  const [key] = await db.insert(aiApiKeysTable).values({
    userId: req.userId,
    name: name ?? "Default",
    keyHash: hash,
    keyPrefix: prefix,
    monthlyTokenLimit,
    allowedModels,
    lastResetMonth: monthStr(),
  }).returning();

  return res.json({ ok: true, key: { ...key, rawKey } });
});

// ─── DELETE /api/ai/keys/:id ──────────────────────────────────────────────────
router.delete("/ai/keys/:id", async (req, res) => {
  await db.delete(aiApiKeysTable)
    .where(and(eq(aiApiKeysTable.id, parseInt(req.params.id)), eq(aiApiKeysTable.userId, req.userId)));
  return res.json({ ok: true });
});

// ─── GET /api/ai/usage ────────────────────────────────────────────────────────
router.get("/ai/usage", async (req, res) => {
  const usage = await db.select()
    .from(aiUsageTable)
    .where(eq(aiUsageTable.userId, req.userId))
    .orderBy(desc(aiUsageTable.usedAt))
    .limit(100);

  const totalTokens = usage.reduce((a, u) => a + u.totalTokens, 0);
  const byModel = usage.reduce((acc, u) => {
    acc[u.model] = (acc[u.model] ?? 0) + u.totalTokens;
    return acc;
  }, {} as Record<string, number>);

  return res.json({ usage, totalTokens, byModel });
});

// ─── GET /api/ai/models ───────────────────────────────────────────────────────
router.get("/ai/models", (_req, res) => {
  return res.json({
    models: [
      { id: "gpt-4o",            name: "GPT-4o",              provider: "openai",    contextWindow: 128000 },
      { id: "gpt-4o-mini",       name: "GPT-4o Mini",         provider: "openai",    contextWindow: 128000 },
      { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet",   provider: "anthropic", contextWindow: 200000 },
      { id: "claude-3-5-haiku",  name: "Claude 3.5 Haiku",    provider: "anthropic", contextWindow: 200000 },
      { id: "gemini-1.5-pro",    name: "Gemini 1.5 Pro",      provider: "google",    contextWindow: 1000000 },
      { id: "gemini-1.5-flash",  name: "Gemini 1.5 Flash",    provider: "google",    contextWindow: 1000000 },
      { id: "llama-3.1-70b",     name: "Llama 3.1 70B",       provider: "meta",      contextWindow: 128000 },
      { id: "mistral-7b",        name: "Mistral 7B",          provider: "mistral",   contextWindow: 32000 },
    ],
  });
});

// ─── POST /api/ai/chat  (OpenAI-compatible proxy) ─────────────────────────────
router.post("/ai/chat", gatewayKeyAuth, async (req, res) => {
  const { model = "gpt-4o-mini", messages, stream = false, max_tokens, temperature, ...rest } = req.body as {
    model?: string; messages: unknown[]; stream?: boolean;
    max_tokens?: number; temperature?: number; [k: string]: unknown;
  };

  const provider = MODEL_PROVIDERS[model] ?? "openai";
  const start = Date.now();
  let promptTokens = 0;
  let completionTokens = 0;
  let status: "success" | "error" = "success";
  let errorMsg: string | null = null;

  try {
    // Route to Moon API (supports multiple providers)
    const moonKey = MOON_API_KEY();
    if (!moonKey) {
      return res.status(503).json({ error: "AI gateway not configured" });
    }

    const moonRes = await fetch("https://api.aimlapi.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${moonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream, max_tokens, temperature, ...rest }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!moonRes.ok) {
      const err = await moonRes.text();
      throw new Error(`Upstream ${moonRes.status}: ${err.slice(0, 200)}`);
    }

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      const reader = moonRes.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } else {
      const data = await moonRes.json() as {
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        choices?: unknown[];
      };
      promptTokens = data.usage?.prompt_tokens ?? 0;
      completionTokens = data.usage?.completion_tokens ?? 0;
      return res.json(data);
    }
  } catch (e) {
    status = "error";
    errorMsg = e instanceof Error ? e.message : String(e);
    if (!res.headersSent) {
      return res.status(500).json({ error: errorMsg });
    }
  } finally {
    const latencyMs = Date.now() - start;
    const totalTokens = promptTokens + completionTokens;

    // Log usage
    if (req.aiKey || req.userId) {
      await db.insert(aiUsageTable).values({
        apiKeyId: req.aiKey?.id ?? 0,
        userId: req.userId,
        model,
        provider,
        promptTokens,
        completionTokens,
        totalTokens,
        latencyMs,
        status,
        error: errorMsg,
      }).catch(() => {});

      if (req.aiKey && totalTokens > 0) {
        await db.update(aiApiKeysTable).set({
          tokensUsedThisMonth: (req.aiKey.tokensUsedThisMonth ?? 0) + totalTokens,
        }).where(eq(aiApiKeysTable.id, req.aiKey.id)).catch(() => {});
      }
    }
  }
});

export default router;
