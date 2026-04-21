import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { createRequire } from "module";

const router = Router();

const DIAGNOSIS_SYSTEM = `You are Flint — The Fixer. One of The Thirteen Moons, built by Sovereign Digital LLC.

Your personality: Seasoned computer repair technician. Methodical, honest, no-nonsense. Twenty years in the shop. You don't upsell, you don't scare people, and you don't start work until you know exactly what you're dealing with.

YOUR JOB RIGHT NOW: Run a diagnosis. Ask targeted questions to understand the problem deeply. Then give a clear, honest verdict.

DIAGNOSIS PROCESS:
1. Ask 2-4 focused questions about the symptom (when it started, what triggers it, error messages, what changed recently, specs if relevant)
2. Based on their answers, determine whether this is fixable remotely via guided steps
3. Give your verdict

VERDICT — use exactly one of these two formats when you have enough information:

--- VERDICT: CAN FIX ---
✓ I can fix this.

Here's what I think is going on: [1-2 sentence diagnosis of the most likely cause based on their specific answers]

This is [easy/straightforward/fixable with a few steps] — [one sentence explaining why you're confident].

Ready to get started? It's $19 one-time. We work through it together until your computer is right.

--- VERDICT: CANNOT FIX ---
✗ You need a computer doctor — here's the honest reason.

[Explain exactly what the real problem appears to be — e.g. failing hard drive, bad RAM stick, power supply issue, motherboard damage, water damage]

This isn't something that can be fixed remotely. You'll need someone to physically [inspect/replace/repair] the [specific component].

What to do next: Take it to a local independent repair shop (skip Geek Squad — they charge 3x more). Ask specifically about [the specific issue]. Typical repair cost: [realistic price range in USD].

I'll write you a clear diagnostic summary to bring to the shop so you don't get taken advantage of — sign up free to get it, no charge.

RULES:
- Never give the verdict until you have enough information to be specific
- Be specific about the likely cause — never say "it could be many things"
- Keep responses short — no walls of text, no numbered lists unless listing steps
- Never say "certainly", "absolutely", "great question"
- Sound like an experienced mechanic, not a chatbot
- One question at a time — don't pile on`;

const FIX_SYSTEM = `You are Flint — The Fixer. One of The Thirteen Moons, built by Sovereign Digital LLC.

The user has PAID $19 for a one-time computer fix. You are now actively fixing their computer. You will not stop until it is fixed to their satisfaction or you have exhausted all remote options.

STYLE:
- One step at a time — never give more than one step at once
- After each step: "Did that work?" or "What happened?"
- If a step fails, try the next approach without making them feel bad
- Be specific: say exactly what to click, what to type, what to look for
- If they need a free tool or file: name the exact website
- Keep responses short and action-focused

SATISFACTION: Don't declare it fixed — let them confirm. Ask "Is it working better now?" periodically.

If you exhaust all remote options:
"I've walked you through everything that can be fixed remotely for this. The next step needs someone physically there. Here's exactly what to tell them: [clear technical summary of the issue and what was already tried]."`;

// ─── Free diagnosis — no auth required ──────────────────────────────────────
router.post("/fix/diagnose", async (req, res) => {
  const { message, history } = req.body as {
    message: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };

  if (!message?.trim()) return res.status(400).json({ error: "message is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const safeHistory = (history ?? []).slice(-14).map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      max_tokens: 500,
      messages: [
        { role: "system", content: DIAGNOSIS_SYSTEM },
        ...safeHistory,
        { role: "user", content: message },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) send({ choices: [{ delta: { content: delta } }] });
    }

    send("[DONE]");
    res.end();
  } catch (err) {
    req.log.error({ err }, "fix/diagnose error");
    send({ choices: [{ delta: { content: "Something went wrong. Please try again." } }] });
    send("[DONE]");
    res.end();
  }
});

// ─── Active fix — requires session token ────────────────────────────────────
router.post("/fix/session", async (req, res) => {
  const { message, history, sessionToken } = req.body as {
    message: string;
    history?: { role: "user" | "assistant"; content: string }[];
    sessionToken?: string;
  };

  if (!message?.trim()) return res.status(400).json({ error: "message is required" });

  if (!sessionToken || !isValidToken(sessionToken)) {
    return res.status(402).json({ error: "Payment required", paymentRequired: true });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const safeHistory = (history ?? []).slice(-24).map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      max_tokens: 600,
      messages: [
        { role: "system", content: FIX_SYSTEM },
        ...safeHistory,
        { role: "user", content: message },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) send({ choices: [{ delta: { content: delta } }] });
    }

    send("[DONE]");
    res.end();
  } catch (err) {
    req.log.error({ err }, "fix/session error");
    send({ choices: [{ delta: { content: "Something went wrong. Please try again." } }] });
    send("[DONE]");
    res.end();
  }
});

// ─── Create $19 Square payment link ─────────────────────────────────────────
router.post("/fix/checkout", async (req, res) => {
  try {
    const require = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sq = require("square") as any;
    const { SquareClient, SquareEnvironment } = sq;

    const client = new SquareClient({
      token: process.env.SQUARE_API_KEY!,
      environment: SquareEnvironment?.Production ?? "production",
    });

    const baseUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "http://localhost:8080";

    const idempotencyKey = `fix-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const response = await client.checkout.paymentLinks.create({
      idempotencyKey,
      quickPay: {
        name: "Flint Computer Fix — One-Time · $19",
        priceMoney: { amount: BigInt(1900), currency: "USD" },
        locationId: undefined,
      },
      checkoutOptions: {
        redirectUrl: `${baseUrl}/fix/success`,
        askForShippingAddress: false,
      },
    });

    const url = response?.result?.paymentLink?.url;
    if (!url) throw new Error("No payment URL");
    return res.json({ url });
  } catch (err) {
    req.log.error({ err }, "fix/checkout error");
    return res.status(500).json({ error: "Could not create payment link. Try again." });
  }
});

// ─── Activate session after payment ─────────────────────────────────────────
router.post("/fix/activate", (req, res) => {
  const { orderId } = req.body as { orderId?: string };
  if (!orderId) return res.status(400).json({ error: "orderId required" });
  const token = generateToken(orderId);
  return res.json({ sessionToken: token });
});

// ─── Token helpers ───────────────────────────────────────────────────────────
function generateToken(seed: string): string {
  const secret = process.env.SESSION_SECRET ?? "forge-fix-secret";
  const ts = Date.now();
  const payload = `${seed}:${ts}`;
  const sig = Buffer.from(`${payload}:${secret}`).toString("base64url").slice(0, 16);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

function isValidToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length < 3) return false;
    const ts = parseInt(parts[1] ?? "0", 10);
    return Date.now() - ts < 72 * 60 * 60 * 1000; // 72 hours
  } catch {
    return false;
  }
}

export default router;
