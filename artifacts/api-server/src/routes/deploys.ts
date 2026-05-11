import { Router } from "express";
import { db } from "@workspace/db";
import { serverConnectionsTable, userAppsTable, showcaseAppsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

function isAdminUser(userId: string): boolean {
  const ids = (process.env.ADMIN_USER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  return ids.includes(userId);
}
import { z } from "zod";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeUrl(u: string) { return u.replace(/\/+$/, ""); }

async function coolifyFetch(
  base: string,
  key: string,
  path: string,
  opts: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: unknown }> {
  try {
    const res = await fetch(`${normalizeUrl(base)}/api/v1${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        ...(opts.headers as Record<string, string> ?? {}),
      },
      signal: AbortSignal.timeout(10000),
    });
    let data: unknown;
    try { data = await res.json(); } catch { data = null; }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: String(e) } };
  }
}

async function getConn(userId: string) {
  const [conn] = await db.select().from(serverConnectionsTable).where(eq(serverConnectionsTable.userId, userId));
  return conn ?? null;
}

// ── GET /api/deploys/apps ─────────────────────────────────────────────────────
// Lists all Coolify apps + services with normalized status
router.get("/deploys/apps", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const conn = await getConn(req.user.id);
  if (!conn) return res.json({ connected: false, apps: [] });

  const [appRes, svcRes] = await Promise.all([
    coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, "/applications"),
    coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, "/services"),
  ]);

  const normalize = (raw: string | null | undefined) => {
    const s = (raw ?? "").toLowerCase();
    if (s.includes("running")) return "running";
    if (s.includes("stop")) return "stopped";
    if (s.includes("restart")) return "restarting";
    if (s.includes("start")) return "starting";
    if (s.includes("error") || s.includes("fail") || s.includes("unhealthy")) return "error";
    if (s.includes("deploy")) return "deploying";
    return "unknown";
  };

  const apps: unknown[] = [];
  const appsData = Array.isArray(appRes.data) ? appRes.data : [];
  const svcsData = Array.isArray(svcRes.data) ? svcRes.data : [];

  for (const a of appsData as Record<string, unknown>[]) {
    apps.push({
      id: a.uuid ?? a.id,
      name: a.name ?? "Unnamed app",
      kind: "app",
      status: normalize(a.status as string),
      url: a.fqdn ?? a.url ?? null,
      gitUrl: a.git_repository ?? null,
      gitBranch: a.git_branch ?? "main",
      updatedAt: a.updated_at ?? null,
      canDeploy: true,
    });
  }
  for (const s of svcsData as Record<string, unknown>[]) {
    apps.push({
      id: s.uuid ?? s.id,
      name: s.name ?? "Unnamed service",
      kind: "service",
      status: normalize(s.status as string),
      url: s.fqdn ?? null,
      gitUrl: null,
      gitBranch: null,
      updatedAt: s.updated_at ?? null,
      canDeploy: false,
    });
  }

  res.json({ connected: true, coolifyUrl: conn.coolifyUrl, apps });
});

// ── GET /api/deploys/logs/:appId ──────────────────────────────────────────────
router.get("/deploys/logs/:appId", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const conn = await getConn(req.user.id);
  if (!conn) return res.status(400).json({ error: "No server connected" });

  const { appId } = req.params;
  const result = await coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, `/applications/${appId}/deployments`);
  if (!result.ok) return res.status(502).json({ error: "Could not fetch logs from Coolify" });
  res.json(result.data);
});

// ── POST /api/deploys/trigger/:appId ─────────────────────────────────────────
// Trigger a redeploy of an existing Coolify application
router.post("/deploys/trigger/:appId", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const conn = await getConn(req.user.id);
  if (!conn) return res.status(400).json({ error: "No server connected" });

  const { appId } = req.params;
  const result = await coolifyFetch(
    conn.coolifyUrl,
    conn.coolifyApiKey,
    `/applications/${appId}/restart`,
    { method: "GET" }
  );

  if (!result.ok) {
    const errData = result.data as Record<string, unknown> | null;
    const msg = typeof errData?.message === "string" ? errData.message : "Deploy trigger failed";
    const needsWriteKey = result.status === 403 || msg.toLowerCase().includes("permission");
    return res.status(result.ok ? 200 : 502).json({
      error: msg,
      needsWriteKey,
    });
  }

  res.json({ ok: true, message: "Deploy triggered" });
});

// ── POST /api/deploys/connect ─────────────────────────────────────────────────
// Create a new Coolify application from a GitHub repo URL
const ConnectBody = z.object({
  name: z.string().min(1).max(100),
  gitUrl: z.string().url(),
  gitBranch: z.string().default("main"),
  buildCommand: z.string().optional(),
  startCommand: z.string().optional(),
  port: z.number().int().min(1).max(65535).default(3000),
  envVars: z.record(z.string()).optional(),
});

router.post("/deploys/connect", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const conn = await getConn(req.user.id);
  if (!conn) return res.status(400).json({ error: "No server connected" });

  const body = ConnectBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues[0]?.message });

  // First, get the list of servers/environments from Coolify
  const serversRes = await coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, "/servers");
  const servers = Array.isArray(serversRes.data) ? serversRes.data as Record<string, unknown>[] : [];
  const serverId = servers[0]?.id ?? "0";

  const payload: Record<string, unknown> = {
    name: body.data.name,
    git_repository: body.data.gitUrl,
    git_branch: body.data.gitBranch,
    port_exposes: String(body.data.port),
    server_id: Number(serverId),
    project_id: null,
    environment_name: "production",
    ...(body.data.buildCommand ? { build_command: body.data.buildCommand } : {}),
    ...(body.data.startCommand ? { start_command: body.data.startCommand } : {}),
  };

  const createRes = await coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, "/applications/nixpacks", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!createRes.ok) {
    const errData = createRes.data as Record<string, unknown> | null;
    const msg = typeof errData?.message === "string" ? errData.message : "Failed to create app in Coolify";
    const needsWriteKey = createRes.status === 403 || msg.toLowerCase().includes("permission");
    return res.status(502).json({ error: msg, needsWriteKey });
  }

  const appData = createRes.data as Record<string, unknown>;
  const appId = String(appData.uuid ?? appData.id ?? "");

  // Push env vars if any
  if (body.data.envVars && Object.keys(body.data.envVars).length > 0 && appId) {
    const envPayload = Object.entries(body.data.envVars).map(([key, value]) => ({
      key, value, is_secret: key.toLowerCase().includes("secret") || key.toLowerCase().includes("password") || key.toLowerCase().includes("token"),
    }));
    await coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, `/applications/${appId}/envs/bulk`, {
      method: "PUT",
      body: JSON.stringify({ data: envPayload }),
    });
  }

  // Store in our DB (non-fatal if it fails — app was still created in Coolify)
  try {
    const slug = body.data.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const suffix = Math.random().toString(36).slice(2, 7);
    await db.insert(userAppsTable).values({
      userId: req.user.id,
      name: body.data.name,
      subdomain: `${slug}-${suffix}`,
      githubRepo: body.data.gitUrl,
      githubBranch: body.data.gitBranch,
      coolifyResourceId: appId,
      status: "deploying",
      port: body.data.port,
      autoDeployEnabled: true,
    });
  } catch (_e) {
    // Non-fatal
  }

  // Auto-add to Showcase — every Forge-hosted app gets broadcast automatically
  try {
    const adminActive = isAdminUser(req.user.id);
    await db.insert(showcaseAppsTable).values({
      name: body.data.name,
      tagline: "Hosted on 13 Moon Forge",
      description: "This app is hosted on 13 Moon Forge. Description coming soon.",
      listingType: "hosted",
      isFeatured: false,
      isActive: adminActive,
      isPlaceholder: false,
      submittedBy: req.user.id,
    });
  } catch (_e) {
    // Non-fatal — showcase entry will be created next deploy if this fails
  }

  res.json({ ok: true, appId, message: "App connected and deploying" });
});

// ── POST /api/deploys/env/:appId ──────────────────────────────────────────────
// Bulk-set env vars on an existing Coolify app
router.post("/deploys/env/:appId", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const conn = await getConn(req.user.id);
  if (!conn) return res.status(400).json({ error: "No server connected" });

  const { appId } = req.params;
  const { envVars } = req.body as { envVars?: Record<string, string> };
  if (!envVars || typeof envVars !== "object") return res.status(400).json({ error: "envVars required" });

  const envPayload = Object.entries(envVars).map(([key, value]) => ({
    key,
    value,
    is_secret: ["secret","password","token","key","api"].some(w => key.toLowerCase().includes(w)),
  }));

  const result = await coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, `/applications/${appId}/envs/bulk`, {
    method: "PUT",
    body: JSON.stringify({ data: envPayload }),
  });

  if (!result.ok) {
    const errData = result.data as Record<string, unknown> | null;
    const msg = typeof errData?.message === "string" ? errData.message : "Failed to set env vars";
    const needsWriteKey = result.status === 403 || msg.toLowerCase().includes("permission");
    return res.status(502).json({ error: msg, needsWriteKey });
  }

  res.json({ ok: true });
});

// ── GET /api/deploys/server-check ─────────────────────────────────────────────
router.get("/deploys/server-check", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const conn = await getConn(req.user.id);
  if (!conn) return res.json({ connected: false });

  const result = await coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, "/healthcheck");
  res.json({
    connected: result.ok,
    coolifyUrl: conn.coolifyUrl,
    serverName: conn.name ?? "My Server",
  });
});

export default router;
