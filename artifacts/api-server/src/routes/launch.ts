import { Router } from "express";
import { db } from "@workspace/db";
import { userAppsTable, githubConnectionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const FORGE_COOLIFY_URL = process.env.FORGE_COOLIFY_URL ?? "";
const FORGE_COOLIFY_KEY = process.env.FORGE_COOLIFY_API_KEY ?? "";
const FORGE_DOMAIN = process.env.FORGE_DOMAIN ?? "13moonforge.ai";

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

async function getCoolifyIds() {
  const [projectsRes, serversRes] = await Promise.all([
    coolify("/projects"),
    coolify("/servers"),
  ]);
  const projects = await projectsRes.json() as { uuid?: string; name?: string }[];
  const servers = await serversRes.json() as { uuid?: string; name?: string }[];

  const project = Array.isArray(projects) ? projects.find(p => p.name === "forge-hosted") ?? projects[0] : null;
  const server = Array.isArray(servers) ? servers[0] : null;

  return {
    projectUuid: project?.uuid ?? "",
    serverUuid: server?.uuid ?? "",
  };
}

// ─── GET /api/launch/apps ───────────────────────────────────────────────────
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

// ─── POST /api/launch/deploy ─────────────────────────────────────────────────
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

  try {
    const { projectUuid, serverUuid } = await getCoolifyIds();
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
    }).returning();

    return res.json({ ok: true, app });
  } catch (err) {
    req.log.error({ err }, "launch/deploy failed");
    return res.status(500).json({ error: "Deploy failed. Please try again." });
  }
});

// ─── POST /api/launch/apps/:id/redeploy ─────────────────────────────────────
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

// ─── GET /api/launch/detect ──────────────────────────────────────────────────
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
