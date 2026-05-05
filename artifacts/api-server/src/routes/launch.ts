import { Router } from "express";
import { db } from "@workspace/db";
import { userAppsTable, githubConnectionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomBytes, createHmac, timingSafeEqual } from "crypto";

const router = Router();

const FORGE_COOLIFY_URL     = process.env.FORGE_COOLIFY_URL ?? "";
const FORGE_COOLIFY_KEY     = process.env.FORGE_COOLIFY_API_KEY ?? "";
const FORGE_DOMAIN          = process.env.FORGE_DOMAIN ?? "13moonforge.ai";
const FORGE_PROJECT_UUID    = process.env.FORGE_COOLIFY_PROJECT_UUID ?? "";
const FORGE_SERVER_UUID     = process.env.FORGE_COOLIFY_SERVER_UUID ?? "";

function coolify(path: string, opts: RequestInit = {}) {
  const base = FORGE_COOLIFY_URL.replace(/\/+$/, "");
  return fetch(`${base}/api/v1${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${FORGE_COOLIFY_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(opts.headers ?? {}),
    },
  });
}

function ghFetch(token: string, path: string) {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function getApp(idStr: string, userId: string) {
  const id = parseInt(idStr);
  if (isNaN(id)) return null;
  const [app] = await db
    .select()
    .from(userAppsTable)
    .where(and(eq(userAppsTable.id, id), eq(userAppsTable.userId, userId)));
  return app ?? null;
}

async function detectStack(token: string, repo: string, branch: string): Promise<{ stack: string; port: number; buildPack: string }> {
  const treeRes = await ghFetch(token, `/repos/${repo}/git/trees/${branch}?recursive=1`);
  if (!treeRes.ok) return { stack: "node", port: 3000, buildPack: "nixpacks" };

  const tree = await treeRes.json() as { tree?: { path: string }[] };
  const paths = (tree.tree ?? []).map(f => f.path);

  if (paths.includes("Dockerfile") || paths.includes("dockerfile")) {
    return { stack: "docker", port: 8080, buildPack: "dockerfile" };
  }
  if (paths.includes("docker-compose.yml") || paths.includes("docker-compose.yaml")) {
    return { stack: "compose", port: 8080, buildPack: "dockercompose" };
  }
  if (paths.some(p => p === "requirements.txt" || p === "pyproject.toml" || p === "setup.py")) {
    return { stack: "python", port: 8000, buildPack: "nixpacks" };
  }
  if (paths.includes("go.mod")) {
    return { stack: "go", port: 8080, buildPack: "nixpacks" };
  }
  if (paths.includes("Gemfile")) {
    return { stack: "ruby", port: 3000, buildPack: "nixpacks" };
  }
  if (paths.includes("package.json")) {
    const hasSrc = paths.some(p => p.startsWith("src/") || p === "index.js" || p === "server.js" || p === "app.js");
    if (!hasSrc && (paths.includes("index.html") || paths.some(p => p.endsWith(".html")))) {
      return { stack: "static", port: 80, buildPack: "static" };
    }
    return { stack: "node", port: 3000, buildPack: "nixpacks" };
  }
  if (paths.some(p => p.endsWith(".html"))) {
    return { stack: "static", port: 80, buildPack: "static" };
  }
  return { stack: "node", port: 3000, buildPack: "nixpacks" };
}

function getCoolifyIds() {
  return {
    projectUuid: FORGE_PROJECT_UUID,
    serverUuid: FORGE_SERVER_UUID,
  };
}

function mapCoolifyStatus(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("running")) return "live";
  if (s.includes("stop")) return "stopped";
  if (s.includes("error") || s.includes("fail") || s.includes("exited")) return "error";
  if (s.includes("deploy") || s.includes("building") || s.includes("starting")) return "deploying";
  return "pending";
}

// ─── GET /api/launch/apps ────────────────────────────────────────────────────
router.get("/launch/apps", async (req, res) => {
  try {
    const apps = await db
      .select()
      .from(userAppsTable)
      .where(eq(userAppsTable.userId, req.userId))
      .orderBy(userAppsTable.createdAt);

    return res.json({ apps });
  } catch (err) {
    req.log.error({ err }, "launch/apps GET failed");
    return res.status(500).json({ error: "Failed to load apps" });
  }
});

// ─── POST /api/launch/deploy ──────────────────────────────────────────────────
router.post("/launch/deploy", async (req, res) => {
  if (!FORGE_COOLIFY_URL || !FORGE_COOLIFY_KEY) {
    return res.status(503).json({ error: "Managed hosting not configured yet." });
  }

  const { repo, branch = "main", name, envVars = {} } = req.body as {
    repo: string;
    branch?: string;
    name: string;
    envVars?: Record<string, string>;
  };

  if (!repo || !name) {
    return res.status(400).json({ error: "repo and name are required" });
  }

  const subdomain = slugify(name);
  if (!subdomain) return res.status(400).json({ error: "Invalid app name" });

  const existingSubdomain = await db
    .select({ id: userAppsTable.id })
    .from(userAppsTable)
    .where(eq(userAppsTable.subdomain, subdomain));
  if (existingSubdomain.length > 0) {
    return res.status(400).json({ error: `The name "${name}" is already taken. Choose a different name.` });
  }

  const [githubConn] = await db
    .select()
    .from(githubConnectionsTable)
    .where(eq(githubConnectionsTable.userId, req.userId));

  if (!githubConn) {
    return res.status(400).json({ error: "Connect your GitHub account first." });
  }

  const { stack, port, buildPack } = await detectStack(githubConn.accessToken, repo, branch);
  const fqdn = `https://${subdomain}.${FORGE_DOMAIN}`;
  const webhookSecret = randomBytes(24).toString("hex");

  try {
    const { projectUuid, serverUuid } = getCoolifyIds();
    if (!projectUuid || !serverUuid) {
      return res.status(503).json({ error: "Could not connect to hosting infrastructure." });
    }

    const coolifyPayload: Record<string, unknown> = {
      project_uuid: projectUuid,
      server_uuid: serverUuid,
      environment_name: "production",
      git_repository: `https://github.com/${repo}`,
      git_branch: branch,
      build_pack: buildPack,
      name: `${subdomain}-${req.userId.slice(0, 6)}`,
      fqdn,
      ports_exposes: String(port),
      instant_deploy: true,
      git_commit_sha: "HEAD",
    };

    if (Object.keys(envVars).length > 0) {
      coolifyPayload.environment_variables = Object.entries(envVars).map(([key, value]) => ({ key, value }));
    }

    const createRes = await coolify("/applications", {
      method: "POST",
      body: JSON.stringify(coolifyPayload),
    });

    let coolifyId: string | null = null;
    if (createRes.ok) {
      const created = await createRes.json() as { uuid?: string; id?: string };
      coolifyId = created.uuid ?? created.id ?? null;
    } else {
      const errBody = await createRes.text();
      req.log.warn({ status: createRes.status, body: errBody }, "Coolify create failed");
    }

    const [app] = await db.insert(userAppsTable).values({
      userId: req.userId,
      name,
      subdomain,
      githubRepo: repo,
      githubBranch: branch,
      stack,
      coolifyResourceId: coolifyId,
      coolifyResourceType: "application",
      status: coolifyId ? "deploying" : "pending",
      url: fqdn,
      port,
      webhookSecret,
    }).returning();

    return res.json({ ok: true, app });
  } catch (err) {
    req.log.error({ err }, "launch/deploy failed");
    return res.status(500).json({ error: "Deploy failed. Please try again." });
  }
});

// ─── GET /api/launch/apps/:id/logs ───────────────────────────────────────────
router.get("/launch/apps/:id/logs", async (req, res) => {
  const app = await getApp(req.params.id, req.userId);
  if (!app) return res.status(404).json({ error: "Not found" });
  if (!app.coolifyResourceId || !FORGE_COOLIFY_KEY) return res.json({ logs: [] });

  try {
    const r = await coolify(`/applications/${app.coolifyResourceId}/logs?lines=200`);
    if (!r.ok) return res.json({ logs: [] });
    const data = await r.json() as { logs?: string } | string[] | string;

    let lines: string[] = [];
    if (typeof data === "string") {
      lines = data.split("\n").filter(Boolean);
    } else if (Array.isArray(data)) {
      lines = data.map(String);
    } else if (data && typeof data === "object" && "logs" in data) {
      lines = String(data.logs ?? "").split("\n").filter(Boolean);
    }
    return res.json({ logs: lines });
  } catch (err) {
    req.log.error({ err }, "launch/logs failed");
    return res.json({ logs: [] });
  }
});

// ─── GET /api/launch/apps/:id/status ─────────────────────────────────────────
router.get("/launch/apps/:id/status", async (req, res) => {
  const app = await getApp(req.params.id, req.userId);
  if (!app) return res.status(404).json({ error: "Not found" });
  if (!app.coolifyResourceId || !FORGE_COOLIFY_KEY) return res.json({ status: app.status });

  try {
    const r = await coolify(`/applications/${app.coolifyResourceId}`);
    if (!r.ok) return res.json({ status: app.status });

    const data = await r.json() as { status?: string };
    const status = mapCoolifyStatus(data.status ?? "");

    if (status !== app.status) {
      await db.update(userAppsTable)
        .set({ status, updatedAt: new Date() })
        .where(eq(userAppsTable.id, app.id));
    }
    return res.json({ status });
  } catch (err) {
    req.log.error({ err }, "launch/status failed");
    return res.json({ status: app.status });
  }
});

// ─── GET /api/launch/apps/:id/env ────────────────────────────────────────────
router.get("/launch/apps/:id/env", async (req, res) => {
  const app = await getApp(req.params.id, req.userId);
  if (!app) return res.status(404).json({ error: "Not found" });
  if (!app.coolifyResourceId || !FORGE_COOLIFY_KEY) return res.json({ vars: [] });

  try {
    const r = await coolify(`/applications/${app.coolifyResourceId}/envs`);
    if (!r.ok) return res.json({ vars: [] });
    const data = await r.json();
    return res.json({ vars: Array.isArray(data) ? data : [] });
  } catch (err) {
    req.log.error({ err }, "launch/env GET failed");
    return res.json({ vars: [] });
  }
});

// ─── POST /api/launch/apps/:id/env ───────────────────────────────────────────
router.post("/launch/apps/:id/env", async (req, res) => {
  const app = await getApp(req.params.id, req.userId);
  if (!app) return res.status(404).json({ error: "Not found" });
  if (!app.coolifyResourceId) return res.status(400).json({ error: "App not yet deployed to infrastructure." });

  const { key, value } = req.body as { key: string; value: string };
  if (!key) return res.status(400).json({ error: "key is required" });

  try {
    const r = await coolify(`/applications/${app.coolifyResourceId}/envs`, {
      method: "POST",
      body: JSON.stringify({ key, value: value ?? "" }),
    });
    if (!r.ok) {
      const errText = await r.text();
      req.log.warn({ status: r.status, body: errText }, "Coolify env POST failed");
      return res.status(500).json({ error: "Failed to add env var" });
    }
    const created = await r.json();
    return res.json({ ok: true, var: created });
  } catch (err) {
    req.log.error({ err }, "launch/env POST failed");
    return res.status(500).json({ error: "Failed to add env var" });
  }
});

// ─── DELETE /api/launch/apps/:id/env/:envUuid ────────────────────────────────
router.delete("/launch/apps/:id/env/:envUuid", async (req, res) => {
  const app = await getApp(req.params.id, req.userId);
  if (!app) return res.status(404).json({ error: "Not found" });
  if (!app.coolifyResourceId) return res.status(400).json({ error: "App not deployed" });

  try {
    const r = await coolify(
      `/applications/${app.coolifyResourceId}/envs/${req.params.envUuid}`,
      { method: "DELETE" }
    );
    if (!r.ok) return res.status(500).json({ error: "Failed to delete env var" });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "launch/env DELETE failed");
    return res.status(500).json({ error: "Failed to delete env var" });
  }
});

// ─── PATCH /api/launch/apps/:id/domain ───────────────────────────────────────
router.patch("/launch/apps/:id/domain", async (req, res) => {
  const app = await getApp(req.params.id, req.userId);
  if (!app) return res.status(404).json({ error: "Not found" });

  const { domain } = req.body as { domain: string };
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();

  if (!cleanDomain) return res.status(400).json({ error: "domain is required" });

  try {
    if (app.coolifyResourceId && FORGE_COOLIFY_KEY) {
      const fqdn = `https://${cleanDomain},https://${app.subdomain}.${FORGE_DOMAIN}`;
      await coolify(`/applications/${app.coolifyResourceId}`, {
        method: "PATCH",
        body: JSON.stringify({ fqdn }),
      });
    }

    await db.update(userAppsTable)
      .set({ customDomain: cleanDomain, updatedAt: new Date() })
      .where(eq(userAppsTable.id, app.id));

    return res.json({ ok: true, domain: cleanDomain });
  } catch (err) {
    req.log.error({ err }, "launch/domain PATCH failed");
    return res.status(500).json({ error: "Failed to update domain" });
  }
});

// ─── POST /api/launch/apps/:id/autodeploy ────────────────────────────────────
router.post("/launch/apps/:id/autodeploy", async (req, res) => {
  const app = await getApp(req.params.id, req.userId);
  if (!app) return res.status(404).json({ error: "Not found" });

  const { enabled } = req.body as { enabled: boolean };

  await db.update(userAppsTable)
    .set({ autoDeployEnabled: enabled, updatedAt: new Date() })
    .where(eq(userAppsTable.id, app.id));

  const webhookUrl = `https://${FORGE_DOMAIN}/api/launch/webhook/${app.webhookSecret}`;
  return res.json({ ok: true, enabled, webhookUrl, webhookSecret: app.webhookSecret });
});

// ─── POST /api/launch/webhook/:secret ────────────────────────────────────────
router.post("/launch/webhook/:secret", async (req, res) => {
  const { secret } = req.params;
  if (!secret || secret.length < 16) return res.status(400).json({ error: "Invalid" });

  const [app] = await db
    .select()
    .from(userAppsTable)
    .where(and(eq(userAppsTable.webhookSecret, secret), eq(userAppsTable.autoDeployEnabled, true)));

  if (!app) return res.status(404).json({ error: "Not found" });

  const sig = req.headers["x-hub-signature-256"] as string | undefined;
  if (sig && app.webhookSecret) {
    const body = JSON.stringify(req.body);
    const expected = "sha256=" + createHmac("sha256", app.webhookSecret).update(body).digest("hex");
    try {
      if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return res.status(401).json({ error: "Invalid signature" });
      }
    } catch {
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  const event = req.headers["x-github-event"] as string | undefined;
  if (event !== "push") return res.json({ ok: true, skipped: true });

  const payload = req.body as { ref?: string };
  const pushedBranch = payload.ref?.replace("refs/heads/", "") ?? "";
  if (pushedBranch && pushedBranch !== app.githubBranch) {
    return res.json({ ok: true, skipped: true, reason: "branch mismatch" });
  }

  try {
    if (app.coolifyResourceId && FORGE_COOLIFY_KEY) {
      await coolify(`/applications/${app.coolifyResourceId}/restart`, { method: "GET" });
    }
    await db.update(userAppsTable)
      .set({ status: "deploying", updatedAt: new Date() })
      .where(eq(userAppsTable.id, app.id));
    return res.json({ ok: true, triggered: true });
  } catch (err) {
    req.log.error({ err }, "webhook redeploy failed");
    return res.status(500).json({ error: "Redeploy failed" });
  }
});

// ─── POST /api/launch/apps/:id/redeploy ──────────────────────────────────────
router.post("/launch/apps/:id/redeploy", async (req, res) => {
  const id = parseInt(req.params.id);
  const [app] = await db
    .select()
    .from(userAppsTable)
    .where(and(eq(userAppsTable.id, id), eq(userAppsTable.userId, req.userId)));

  if (!app) return res.status(404).json({ error: "App not found" });

  try {
    if (app.coolifyResourceId && FORGE_COOLIFY_KEY) {
      await coolify(`/applications/${app.coolifyResourceId}/restart`, { method: "GET" });
    }
    await db.update(userAppsTable).set({ status: "deploying", updatedAt: new Date() }).where(eq(userAppsTable.id, id));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "launch/redeploy failed");
    return res.status(500).json({ error: "Redeploy failed" });
  }
});

// ─── DELETE /api/launch/apps/:id ─────────────────────────────────────────────
router.delete("/launch/apps/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [app] = await db
    .select()
    .from(userAppsTable)
    .where(and(eq(userAppsTable.id, id), eq(userAppsTable.userId, req.userId)));

  if (!app) return res.status(404).json({ error: "App not found" });

  try {
    if (app.coolifyResourceId && FORGE_COOLIFY_KEY) {
      await coolify(`/applications/${app.coolifyResourceId}?delete_configurations=true&delete_volumes=true`, {
        method: "DELETE",
      });
    }
    await db.delete(userAppsTable).where(eq(userAppsTable.id, id));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "launch/delete failed");
    return res.status(500).json({ error: "Failed to delete app" });
  }
});

// ─── POST /api/launch/detect ─────────────────────────────────────────────────
router.post("/launch/detect", async (req, res) => {
  const { repo, branch = "main" } = req.body as { repo: string; branch?: string };
  if (!repo) return res.status(400).json({ error: "repo is required" });

  const [githubConn] = await db
    .select()
    .from(githubConnectionsTable)
    .where(eq(githubConnectionsTable.userId, req.userId));

  if (!githubConn) return res.status(401).json({ error: "GitHub not connected" });

  const result = await detectStack(githubConn.accessToken, repo, branch);
  return res.json(result);
});

export default router;
