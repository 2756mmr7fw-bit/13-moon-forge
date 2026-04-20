import { Router } from "express";
import { db } from "@workspace/db";
import { githubConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const GH = "https://api.github.com";

function ghFetch(token: string, path: string, opts: RequestInit = {}) {
  return fetch(`${GH}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers ?? {}),
    },
  });
}

async function getConn(userId: string) {
  const [row] = await db
    .select()
    .from(githubConnectionsTable)
    .where(eq(githubConnectionsTable.userId, userId));
  return row ?? null;
}

// ─── GET /api/github/status ─────────────────────────────────────────────────
router.get("/github/status", async (req, res) => {
  try {
    const conn = await getConn(req.userId);
    if (!conn) return res.json({ connected: false });
    return res.json({
      connected: true,
      username: conn.username,
      avatarUrl: conn.avatarUrl,
      connectedAt: conn.connectedAt,
    });
  } catch (err) {
    req.log.error({ err }, "github/status failed");
    return res.status(500).json({ error: "Failed to check GitHub status" });
  }
});

// ─── POST /api/github/connect ───────────────────────────────────────────────
router.post("/github/connect", async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token?.trim()) return res.status(400).json({ error: "Personal access token is required" });

  // Validate the token by calling /user
  let username = "";
  let avatarUrl = "";
  try {
    const r = await ghFetch(token.trim(), "/user");
    if (!r.ok) {
      const body = await r.json().catch(() => ({})) as Record<string, unknown>;
      return res.status(400).json({
        error: body.message ?? `GitHub returned ${r.status}. Check your token and try again.`,
      });
    }
    const user = await r.json() as Record<string, unknown>;
    username  = user.login as string;
    avatarUrl = user.avatar_url as string;
  } catch {
    return res.status(400).json({ error: "Could not reach GitHub. Check your internet connection." });
  }

  try {
    const existing = await getConn(req.userId);
    if (existing) {
      await db
        .update(githubConnectionsTable)
        .set({ accessToken: token.trim(), username, avatarUrl, connectedAt: new Date() })
        .where(eq(githubConnectionsTable.userId, req.userId));
    } else {
      await db.insert(githubConnectionsTable).values({
        userId: req.userId,
        accessToken: token.trim(),
        username,
        avatarUrl: avatarUrl || null,
      });
    }
    return res.json({ ok: true, username, avatarUrl });
  } catch (err) {
    req.log.error({ err }, "github/connect failed");
    return res.status(500).json({ error: "Failed to save GitHub connection" });
  }
});

// ─── DELETE /api/github/disconnect ──────────────────────────────────────────
router.delete("/github/disconnect", async (req, res) => {
  try {
    await db
      .delete(githubConnectionsTable)
      .where(eq(githubConnectionsTable.userId, req.userId));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "github/disconnect failed");
    return res.status(500).json({ error: "Failed to disconnect" });
  }
});

// ─── GET /api/github/repos ───────────────────────────────────────────────────
router.get("/github/repos", async (req, res) => {
  try {
    const conn = await getConn(req.userId);
    if (!conn) return res.status(401).json({ error: "GitHub not connected" });

    const r = await ghFetch(
      conn.accessToken,
      "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator",
    );
    if (!r.ok) return res.status(r.status).json({ error: "Failed to fetch repos" });

    const repos = await r.json() as Record<string, unknown>[];
    return res.json(
      repos.map(repo => ({
        id:          repo.id,
        fullName:    repo.full_name,
        name:        repo.name,
        private:     repo.private,
        language:    repo.language,
        description: repo.description,
        updatedAt:   repo.updated_at,
        defaultBranch: repo.default_branch,
        htmlUrl:     repo.html_url,
      })),
    );
  } catch (err) {
    req.log.error({ err }, "github/repos failed");
    return res.status(500).json({ error: "Failed to fetch repos" });
  }
});

// ─── GET /api/github/tree?repo=owner/name&branch=main ───────────────────────
router.get("/github/tree", async (req, res) => {
  const { repo, branch = "main" } = req.query as Record<string, string>;
  if (!repo) return res.status(400).json({ error: "repo is required" });

  try {
    const conn = await getConn(req.userId);
    if (!conn) return res.status(401).json({ error: "GitHub not connected" });

    // Try the provided branch, then fallback to 'master'
    let r = await ghFetch(conn.accessToken, `/repos/${repo}/git/trees/${branch}?recursive=1`);
    if (!r.ok && branch === "main") {
      r = await ghFetch(conn.accessToken, `/repos/${repo}/git/trees/master?recursive=1`);
    }
    if (!r.ok) return res.status(r.status).json({ error: "Failed to fetch file tree" });

    const data = await r.json() as { tree: Record<string, unknown>[] };
    const files = (data.tree ?? [])
      .filter((f: Record<string, unknown>) => f.type === "blob")
      .map((f: Record<string, unknown>) => ({ path: f.path, size: f.size }))
      .filter((f: { path: unknown }) => {
        const p = f.path as string;
        return !p.startsWith("node_modules/") &&
               !p.startsWith(".git/") &&
               !p.startsWith("dist/") &&
               !p.startsWith("build/") &&
               !p.startsWith(".cache/");
      });
    return res.json(files);
  } catch (err) {
    req.log.error({ err }, "github/tree failed");
    return res.status(500).json({ error: "Failed to fetch file tree" });
  }
});

// ─── POST /api/github/file ──────────────────────────────────────────────────
// Body: { repo, path, branch? }
router.post("/github/file", async (req, res) => {
  const { repo, path, branch = "main" } = req.body as Record<string, string>;
  if (!repo || !path) return res.status(400).json({ error: "repo and path are required" });

  try {
    const conn = await getConn(req.userId);
    if (!conn) return res.status(401).json({ error: "GitHub not connected" });

    const r = await ghFetch(
      conn.accessToken,
      `/repos/${repo}/contents/${path}?ref=${branch}`,
    );
    if (!r.ok) return res.status(r.status).json({ error: `File not found: ${path}` });

    const data = await r.json() as { content?: string; sha?: string; encoding?: string };
    if (!data.content) return res.status(404).json({ error: "No content returned" });

    const content = Buffer.from(data.content, "base64").toString("utf-8");
    return res.json({ content, sha: data.sha, path });
  } catch (err) {
    req.log.error({ err }, "github/file failed");
    return res.status(500).json({ error: "Failed to fetch file" });
  }
});

// ─── POST /api/github/commit ────────────────────────────────────────────────
// Body: { repo, branch, message, files: [{ path, content }] }
router.post("/github/commit", async (req, res) => {
  const { repo, branch = "main", message, files } =
    req.body as { repo: string; branch?: string; message: string; files: { path: string; content: string; sha?: string }[] };

  if (!repo || !message || !files?.length) {
    return res.status(400).json({ error: "repo, message and files are required" });
  }

  try {
    const conn = await getConn(req.userId);
    if (!conn) return res.status(401).json({ error: "GitHub not connected" });

    const results: { path: string; ok: boolean; error?: string }[] = [];

    for (const file of files) {
      // Get current SHA if not provided (needed for updates)
      let sha = file.sha;
      if (!sha) {
        const existing = await ghFetch(
          conn.accessToken,
          `/repos/${repo}/contents/${file.path}?ref=${branch}`,
        );
        if (existing.ok) {
          const existingData = await existing.json() as { sha?: string };
          sha = existingData.sha;
        }
      }

      const body: Record<string, unknown> = {
        message,
        content: Buffer.from(file.content, "utf-8").toString("base64"),
        branch,
      };
      if (sha) body.sha = sha;

      const r = await ghFetch(
        conn.accessToken,
        `/repos/${repo}/contents/${file.path}`,
        { method: "PUT", body: JSON.stringify(body) },
      );

      if (r.ok) {
        results.push({ path: file.path, ok: true });
      } else {
        const err = await r.json().catch(() => ({})) as Record<string, unknown>;
        results.push({ path: file.path, ok: false, error: String(err.message ?? r.status) });
      }
    }

    const allOk = results.every(r => r.ok);
    return res.json({ ok: allOk, results });
  } catch (err) {
    req.log.error({ err }, "github/commit failed");
    return res.status(500).json({ error: "Failed to commit files" });
  }
});

export default router;
