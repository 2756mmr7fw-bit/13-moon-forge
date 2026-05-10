import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { createHmac } from "crypto";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { cliTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// ── CLI token helpers ──────────────────────────────────────────────────────────
function generateCliToken(userId: string): string {
  const secret = process.env.SESSION_SECRET ?? "forge-agent-secret";
  const ts = Date.now().toString();
  const payload = `${userId}:${ts}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

function verifyCliToken(token: string): string | null {
  try {
    const secret = process.env.SESSION_SECRET ?? "forge-agent-secret";
    const decoded = Buffer.from(token, "base64url").toString();
    const lastColon = decoded.lastIndexOf(":");
    const sig = decoded.slice(lastColon + 1);
    const payload = decoded.slice(0, lastColon);
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    if (sig !== expected) return null;
    const parts = payload.split(":");
    if (parts.length < 2) return null;
    const ts = parseInt(parts[parts.length - 1]);
    // 1-year expiry
    if (Date.now() - ts > 365 * 24 * 60 * 60 * 1000) return null;
    return parts.slice(0, -1).join(":");
  } catch { return null; }
}

const FORGE_HELP_SYSTEM_PROMPT = `You are Forge Guide — the built-in helper for 13 Moon Forge, a self-hosting platform that lets anyone move their apps off Replit, Vercel, Netlify, Heroku, Railway, Render, DigitalOcean, Fly.io, Glitch, and GitHub Pages onto their own server.

Your personality: You are calm, plain-spoken, and genuinely helpful. You explain things the way a knowledgeable friend would — no jargon unless necessary, no condescension, no filler. When something is simple, say so. When something needs steps, give the steps clearly. You always tell people exactly what to do next.

---

## What 13 Moon Forge is

13 Moon Forge (13moonforge.ai) is a self-hosting control panel built by Sovereign Digital LLC (founded by Ezekiel Evans). It lets users:

1. **Move apps off any cloud platform** onto their own Hetzner VPS server (5.78.154.21) running Coolify
2. **Build in Replit (or any editor), deploy on their own server** — every GitHub push auto-deploys
3. **Own their code privately** via The Vault (self-hosted Forgejo at git.13moonforge.ai)
4. **Manage all deployed apps** from one dashboard instead of juggling platform dashboards

The stack: Hetzner VPS → Coolify (deployment manager) → GitHub (code source) → user's apps

---

## Key features users ask about

### Connect & Deploy (/migrate)
The main wizard for moving any app to The Forge. Steps:
1. Pick your current platform (Replit, Vercel, Netlify, Heroku, Railway, Render, DigitalOcean, Fly.io, Glitch, GitHub Pages, or Other)
2. Get your GitHub repo URL (platform-specific instructions provided)
3. Paste your environment variables (.env format)
4. Configure build/start commands and port (auto-detected)
5. Click Launch — Coolify watches the repo and auto-deploys on every push

### Deploy Dashboard (/deploys)
Shows all apps running on the Hetzner server with live status (Running / Stopped / Deploying / Error). Has a "Redeploy" button per app and deployment history.

### The Vault (/vault)
Private self-hosted Git storage using Forgejo (at git.13moonforge.ai). Users can:
- Create new repos with starter templates (Blank, React+Vite, Express API, Static HTML, Next.js)
- Import from GitHub (server-to-server, fully private)
- Upload a ZIP file (e.g. exported from Replit)
- Delete repos

### Activity Feed (/activity)
Timeline of everything that happened — repos created, imports started/completed/failed.

### Connections / Integrations (/connections)
Where users connect their Coolify server. Requires: Coolify URL + API key. The current API key is READ-ONLY. To unlock auto-deploy (the Launch button in the wizard), users need a new Coolify API key with "Deploy" permissions.

---

## The one thing that needs the user's action right now

The **Launch button** in Connect & Deploy requires a Coolify API key with **Deploy permissions**. The current key is read-only.

How to fix it:
1. Go to Coolify at http://5.78.154.21:8000/settings/api-keys
2. Create a new API key — check "Deploy" permission
3. Go to The Forge → Integrations (/connections)
4. Update the server connection with the new key
5. Come back to /migrate and click Launch — it will work

---

## Platform-specific notes

- **Replit**: Code lives on Replit's servers. User must go to Git panel → Connect to GitHub → push. Then use that GitHub URL in the wizard.
- **Vercel / Netlify / Railway / Render / DigitalOcean**: Code is already on GitHub. User just finds the repo URL in their platform's settings.
- **Heroku**: May or may not be on GitHub. If not, user clones with heroku git:clone and pushes to a new GitHub repo.
- **Fly.io**: Usually not on GitHub. User pushes manually.
- **Glitch**: Tools → Import and Export → Export to GitHub.
- **GitHub Pages**: The repo IS the URL — easiest migration possible.

---

## Common questions and answers

**Q: Do I still need Replit?**
A: Only if you want to use it as your code editor. You can keep writing code in Replit, push to GitHub, and The Forge auto-deploys it. Replit is no longer your host — just your editor.

**Q: What is Coolify?**
A: Coolify is an open-source deployment manager that runs on your Hetzner server. It watches your GitHub repos and deploys your apps automatically. You don't need to interact with it directly — The Forge's Deploy Dashboard is your control panel for it.

**Q: What is The Vault?**
A: The Vault is your private Git server (powered by Forgejo) running on your own Hetzner machine. It's like a private GitHub that nobody else can see or access.

**Q: My deploy is stuck at "Deploying"**
A: Go to the Deploy Dashboard (/deploys), click "Deployments" on the app, and check the status of the latest deployment. If it failed, the error will show there. Common causes: wrong build command, missing env var, wrong port number.

**Q: Where do I find my env vars from Replit?**
A: In Replit, go to Tools → Secrets. You'll see all your key-value pairs. Copy them as KEY=VALUE lines and paste into the wizard's env var step.

**Q: Can multiple apps auto-deploy?**
A: Yes. Each app has its own GitHub repo. You connect each one separately in the wizard. They all auto-deploy independently.

**Q: What templates are available when creating a new repo in The Vault?**
A: Blank, React + Vite (React 19 + TypeScript), Express API (Node.js REST), Static HTML (no build step), and Next.js (App Router).

---

## How to talk to users

- Keep answers short unless the question needs steps
- Give exact step-by-step instructions for anything procedural
- If someone is confused, ask one clarifying question then answer
- Never say "as an AI" or "I'm just a language model"
- If you don't know something specific to their project, say so and suggest they check the Deploy Dashboard or their Coolify server directly
- Always end with what to do next`;

// ── POST /api/help/chat ────────────────────────────────────────────────────────
router.post("/help/chat", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });

  const { messages } = req.body as {
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages required" });
  }

  // Keep last 10 messages for context window
  const trimmed = messages.slice(-10);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      max_tokens: 600,
      temperature: 0.5,
      messages: [
        { role: "system", content: FORGE_HELP_SYSTEM_PROMPT },
        ...trimmed,
      ],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) {
        res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  } catch (err) {
    req.log.error({ err }, "Help chat error");
    res.write(`data: ${JSON.stringify({ type: "error", message: "Something went wrong" })}\n\n`);
  } finally {
    res.end();
  }
});

// ── GET /api/help/cli-token — issue a CLI token for logged-in user ─────────────
router.get("/help/cli-token", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const token = generateCliToken((req.user as { id: string }).id);
  res.json({ token });
});

// ── GET /api/help/forge-agent.js — serve the downloadable CLI script ───────────
router.get("/help/forge-agent.js", (_req, res) => {
  // In the bundled dist output __dirname === dist/ — forge-agent.js is copied there by build.mjs.
  // Fallback: also check one level up (src/ layout used in some dev setups).
  const candidates = [
    path.join(__dirname, "forge-agent.js"),
    path.join(__dirname, "..", "src", "forge-agent.js"),
    path.join(__dirname, "..", "forge-agent.js"),
  ];
  const scriptPath = candidates.find(p => fs.existsSync(p));
  if (scriptPath) {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Content-Disposition", 'attachment; filename="forge.js"');
    res.sendFile(scriptPath);
  } else {
    res.status(404).json({ error: "Forge Agent script not found" });
  }
});

// ── POST /api/help/cli-chat — CLI-token-authenticated streaming chat ───────────
router.post("/help/cli-chat", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Bearer token required" });
  }
  const rawToken = authHeader.slice(7);

  // Try DB-stored token first (generated via /get-forge page)
  let userId: string | null = null;
  try {
    const [record] = await db.select().from(cliTokensTable).where(eq(cliTokensTable.token, rawToken));
    if (record) {
      userId = record.userId;
      await db.update(cliTokensTable).set({ lastUsedAt: new Date() }).where(eq(cliTokensTable.id, record.id));
    }
  } catch { /* fall through to HMAC check */ }

  // Fall back to HMAC-signed token (older flow)
  if (!userId) userId = verifyCliToken(rawToken);
  if (!userId) return res.status(401).json({ error: "Invalid or expired CLI token" });

  const { messages } = req.body as {
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
  };
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      max_tokens: 800,
      temperature: 0.5,
      messages: [
        { role: "system", content: FORGE_HELP_SYSTEM_PROMPT + "\n\nIMPORTANT: You are running as a CLI agent on the user's local machine. Be concise. When you suggest an action the user should take (like creating a GitHub repo or running a git command), phrase it so they know you can do it for them if they confirm. Keep responses focused and short — this is a terminal, not a web chat." },
        ...messages.slice(-12),
      ],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: "error", message: "Something went wrong" })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
