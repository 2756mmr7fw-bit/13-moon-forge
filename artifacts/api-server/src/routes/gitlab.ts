import { Router } from "express";
import { db } from "@workspace/db";
import { gitlabConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const GL = "https://gitlab.com/api/v4";

function glFetch(token: string, path: string, opts: RequestInit = {}) {
  return fetch(`${GL}${path}`, {
    ...opts,
    headers: {
      "PRIVATE-TOKEN": token,
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
  });
}

async function getConn(userId: string) {
  const [row] = await db.select().from(gitlabConnectionsTable).where(eq(gitlabConnectionsTable.userId, userId));
  return row ?? null;
}

router.get("/gitlab/status", async (req, res) => {
  try {
    const conn = await getConn(req.userId);
    if (!conn) return res.json({ connected: false });
    return res.json({ connected: true, username: conn.username, avatarUrl: conn.avatarUrl, connectedAt: conn.connectedAt });
  } catch (err) {
    req.log.error({ err }, "gitlab/status failed");
    return res.status(500).json({ error: "Failed to check GitLab status" });
  }
});

router.post("/gitlab/connect", async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token?.trim()) return res.status(400).json({ error: "Personal access token is required" });

  let username = "";
  let avatarUrl = "";
  try {
    const r = await glFetch(token.trim(), "/user");
    if (!r.ok) {
      const body = await r.json().catch(() => ({})) as Record<string, unknown>;
      return res.status(400).json({ error: (body.message as string) ?? `GitLab returned ${r.status}` });
    }
    const user = await r.json() as Record<string, unknown>;
    username  = user.username as string;
    avatarUrl = user.avatar_url as string ?? "";
  } catch {
    return res.status(400).json({ error: "Could not reach GitLab. Check your token." });
  }

  try {
    const existing = await getConn(req.userId);
    if (existing) {
      await db.update(gitlabConnectionsTable)
        .set({ accessToken: token.trim(), username, avatarUrl, connectedAt: new Date() })
        .where(eq(gitlabConnectionsTable.userId, req.userId));
    } else {
      await db.insert(gitlabConnectionsTable).values({ userId: req.userId, accessToken: token.trim(), username, avatarUrl: avatarUrl || null });
    }
    return res.json({ ok: true, username, avatarUrl });
  } catch (err) {
    req.log.error({ err }, "gitlab/connect failed");
    return res.status(500).json({ error: "Failed to save GitLab connection" });
  }
});

router.delete("/gitlab/disconnect", async (req, res) => {
  try {
    await db.delete(gitlabConnectionsTable).where(eq(gitlabConnectionsTable.userId, req.userId));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "gitlab/disconnect failed");
    return res.status(500).json({ error: "Failed to disconnect" });
  }
});

router.get("/gitlab/repos", async (req, res) => {
  try {
    const conn = await getConn(req.userId);
    if (!conn) return res.status(401).json({ error: "GitLab not connected" });

    const r = await glFetch(conn.accessToken, "/projects?membership=true&per_page=100&order_by=last_activity_at&simple=true");
    if (!r.ok) return res.status(r.status).json({ error: "Failed to fetch repos" });

    const repos = await r.json() as Record<string, unknown>[];
    return res.json(repos.map(p => ({
      id:            p.id,
      fullName:      p.path_with_namespace,
      name:          p.name,
      private:       p.visibility !== "public",
      language:      null,
      description:   p.description,
      updatedAt:     p.last_activity_at,
      defaultBranch: p.default_branch ?? "main",
      htmlUrl:       p.web_url,
    })));
  } catch (err) {
    req.log.error({ err }, "gitlab/repos failed");
    return res.status(500).json({ error: "Failed to fetch repos" });
  }
});

router.get("/gitlab/tree", async (req, res) => {
  const { repo, branch = "main" } = req.query as Record<string, string>;
  if (!repo) return res.status(400).json({ error: "repo is required" });

  try {
    const conn = await getConn(req.userId);
    if (!conn) return res.status(401).json({ error: "GitLab not connected" });

    const encodedRepo = encodeURIComponent(repo);
    const r = await glFetch(conn.accessToken, `/projects/${encodedRepo}/repository/tree?recursive=true&per_page=100&ref=${branch}`);
    if (!r.ok) return res.status(r.status).json({ error: "Failed to fetch file tree" });

    const items = await r.json() as Record<string, unknown>[];
    const files = items
      .filter(f => f.type === "blob")
      .map(f => ({ path: f.path as string, size: 0 }))
      .filter(f => !f.path.startsWith("node_modules/") && !f.path.startsWith("dist/") && !f.path.startsWith("build/"));
    return res.json(files);
  } catch (err) {
    req.log.error({ err }, "gitlab/tree failed");
    return res.status(500).json({ error: "Failed to fetch file tree" });
  }
});

router.post("/gitlab/file", async (req, res) => {
  const { repo, path, branch = "main" } = req.body as Record<string, string>;
  if (!repo || !path) return res.status(400).json({ error: "repo and path are required" });

  try {
    const conn = await getConn(req.userId);
    if (!conn) return res.status(401).json({ error: "GitLab not connected" });

    const encodedRepo  = encodeURIComponent(repo);
    const encodedPath  = encodeURIComponent(path);
    const r = await glFetch(conn.accessToken, `/projects/${encodedRepo}/repository/files/${encodedPath}?ref=${branch}`);
    if (!r.ok) return res.status(r.status).json({ error: `File not found: ${path}` });

    const data = await r.json() as { content?: string; encoding?: string };
    if (!data.content) return res.status(404).json({ error: "No content returned" });

    const content = Buffer.from(data.content, "base64").toString("utf-8");
    return res.json({ content, path });
  } catch (err) {
    req.log.error({ err }, "gitlab/file failed");
    return res.status(500).json({ error: "Failed to fetch file" });
  }
});

router.post("/gitlab/commit", async (req, res) => {
  const { repo, branch = "main", message, files } =
    req.body as { repo: string; branch?: string; message: string; files: { path: string; content: string }[] };

  if (!repo || !message || !files?.length) return res.status(400).json({ error: "repo, message and files required" });

  try {
    const conn = await getConn(req.userId);
    if (!conn) return res.status(401).json({ error: "GitLab not connected" });

    const encodedRepo = encodeURIComponent(repo);

    // Check which files exist to determine create vs update
    const actions = await Promise.all(files.map(async file => {
      const checkPath = encodeURIComponent(file.path);
      const check = await glFetch(conn.accessToken, `/projects/${encodedRepo}/repository/files/${checkPath}?ref=${branch}`);
      return {
        action:    check.ok ? "update" : "create",
        file_path: file.path,
        content:   file.content,
        encoding:  "text",
      };
    }));

    const r = await glFetch(conn.accessToken, `/projects/${encodedRepo}/repository/commits`, {
      method: "POST",
      body: JSON.stringify({ branch, commit_message: message, actions }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({})) as Record<string, unknown>;
      return res.status(r.status).json({ ok: false, error: String(err.message ?? r.status) });
    }
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "gitlab/commit failed");
    return res.status(500).json({ error: "Failed to commit" });
  }
});

export default router;
