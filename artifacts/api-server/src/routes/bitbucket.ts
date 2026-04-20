import { Router } from "express";
import { db } from "@workspace/db";
import { bitbucketConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const BB = "https://api.bitbucket.org/2.0";

function bbFetch(username: string, appPassword: string, path: string, opts: RequestInit = {}) {
  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");
  return fetch(`${BB}${path}`, {
    ...opts,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
  });
}

async function getConn(userId: string) {
  const [row] = await db.select().from(bitbucketConnectionsTable).where(eq(bitbucketConnectionsTable.userId, userId));
  return row ?? null;
}

router.get("/bitbucket/status", async (req, res) => {
  try {
    const conn = await getConn(req.userId);
    if (!conn) return res.json({ connected: false });
    return res.json({ connected: true, username: conn.bbUsername, displayName: conn.displayName, avatarUrl: conn.avatarUrl, connectedAt: conn.connectedAt });
  } catch (err) {
    req.log.error({ err }, "bitbucket/status failed");
    return res.status(500).json({ error: "Failed to check Bitbucket status" });
  }
});

router.post("/bitbucket/connect", async (req, res) => {
  const { username, appPassword } = req.body as { username?: string; appPassword?: string };
  if (!username?.trim() || !appPassword?.trim()) {
    return res.status(400).json({ error: "Bitbucket username and app password are required" });
  }

  let displayName = "";
  let avatarUrl = "";
  try {
    const r = await bbFetch(username.trim(), appPassword.trim(), "/user");
    if (!r.ok) {
      return res.status(400).json({ error: `Bitbucket returned ${r.status}. Check your credentials.` });
    }
    const user = await r.json() as Record<string, unknown>;
    displayName = (user.display_name as string) ?? username;
    const links = user.links as Record<string, unknown> | undefined;
    if (links?.avatar) {
      const av = links.avatar as Record<string, unknown>;
      avatarUrl = (av.href as string) ?? "";
    }
  } catch {
    return res.status(400).json({ error: "Could not reach Bitbucket. Check your credentials." });
  }

  try {
    const existing = await getConn(req.userId);
    if (existing) {
      await db.update(bitbucketConnectionsTable)
        .set({ bbUsername: username.trim(), appPassword: appPassword.trim(), displayName, avatarUrl, connectedAt: new Date() })
        .where(eq(bitbucketConnectionsTable.userId, req.userId));
    } else {
      await db.insert(bitbucketConnectionsTable).values({
        userId: req.userId,
        bbUsername: username.trim(),
        appPassword: appPassword.trim(),
        displayName,
        avatarUrl: avatarUrl || null,
      });
    }
    return res.json({ ok: true, username: username.trim(), displayName, avatarUrl });
  } catch (err) {
    req.log.error({ err }, "bitbucket/connect failed");
    return res.status(500).json({ error: "Failed to save Bitbucket connection" });
  }
});

router.delete("/bitbucket/disconnect", async (req, res) => {
  try {
    await db.delete(bitbucketConnectionsTable).where(eq(bitbucketConnectionsTable.userId, req.userId));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "bitbucket/disconnect failed");
    return res.status(500).json({ error: "Failed to disconnect" });
  }
});

router.get("/bitbucket/repos", async (req, res) => {
  try {
    const conn = await getConn(req.userId);
    if (!conn) return res.status(401).json({ error: "Bitbucket not connected" });

    const r = await bbFetch(conn.bbUsername, conn.appPassword, `/repositories/${conn.bbUsername}?pagelen=100&sort=-updated_on`);
    if (!r.ok) return res.status(r.status).json({ error: "Failed to fetch repos" });

    const data = await r.json() as { values: Record<string, unknown>[] };
    return res.json((data.values ?? []).map(repo => {
      const mainbranch = repo.mainbranch as Record<string, unknown> | undefined;
      return {
        id:            repo.uuid,
        fullName:      repo.full_name,
        name:          repo.name,
        private:       repo.is_private,
        language:      repo.language ?? null,
        description:   repo.description ?? null,
        updatedAt:     repo.updated_on,
        defaultBranch: (mainbranch?.name as string) ?? "main",
        htmlUrl:       (repo.links as Record<string, unknown> | undefined)?.html
                       ? ((repo.links as Record<string, unknown>).html as Record<string, string>).href
                       : "",
      };
    }));
  } catch (err) {
    req.log.error({ err }, "bitbucket/repos failed");
    return res.status(500).json({ error: "Failed to fetch repos" });
  }
});

router.get("/bitbucket/tree", async (req, res) => {
  const { repo, branch = "main" } = req.query as Record<string, string>;
  if (!repo) return res.status(400).json({ error: "repo is required" });

  try {
    const conn = await getConn(req.userId);
    if (!conn) return res.status(401).json({ error: "Bitbucket not connected" });

    // Bitbucket src endpoint lists files for a commit/branch
    const r = await bbFetch(conn.bbUsername, conn.appPassword, `/repositories/${repo}/src/${branch}/?pagelen=100&max_depth=5`);
    if (!r.ok) return res.status(r.status).json({ error: "Failed to fetch file tree" });

    const data = await r.json() as { values: Record<string, unknown>[] };
    const files = (data.values ?? [])
      .filter(f => f.type === "commit_file")
      .map(f => ({ path: f.path as string, size: (f.size as number) ?? 0 }))
      .filter(f => !f.path.startsWith("node_modules/") && !f.path.startsWith("dist/") && !f.path.startsWith("build/"));
    return res.json(files);
  } catch (err) {
    req.log.error({ err }, "bitbucket/tree failed");
    return res.status(500).json({ error: "Failed to fetch file tree" });
  }
});

router.post("/bitbucket/file", async (req, res) => {
  const { repo, path, branch = "main" } = req.body as Record<string, string>;
  if (!repo || !path) return res.status(400).json({ error: "repo and path are required" });

  try {
    const conn = await getConn(req.userId);
    if (!conn) return res.status(401).json({ error: "Bitbucket not connected" });

    // Bitbucket returns raw file content directly
    const auth = Buffer.from(`${conn.bbUsername}:${conn.appPassword}`).toString("base64");
    const r = await fetch(`${BB}/repositories/${repo}/src/${branch}/${path}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!r.ok) return res.status(r.status).json({ error: `File not found: ${path}` });

    const content = await r.text();
    return res.json({ content, path });
  } catch (err) {
    req.log.error({ err }, "bitbucket/file failed");
    return res.status(500).json({ error: "Failed to fetch file" });
  }
});

export default router;
