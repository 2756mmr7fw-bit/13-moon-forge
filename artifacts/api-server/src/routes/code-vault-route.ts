import { Router } from "express";
import { db, codeVaultSnapshotsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// ─── GET /api/code-vault ──────────────────────────────────────────────────────
router.get("/code-vault", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(codeVaultSnapshotsTable)
      .where(eq(codeVaultSnapshotsTable.userId, req.userId))
      .orderBy(desc(codeVaultSnapshotsTable.createdAt))
      .limit(200);
    return res.json(rows);
  } catch (err) {
    req.log.error({ err }, "code-vault GET failed");
    return res.status(500).json({ error: "Failed to fetch snapshots" });
  }
});

// ─── POST /api/code-vault/snapshot ───────────────────────────────────────────
// Manually save a snapshot (user triggers from UI).
router.post("/code-vault/snapshot", async (req, res) => {
  const { appName, repoFullName, branch, commitSha, commitMessage } = req.body as {
    appName?: string; repoFullName?: string; branch?: string;
    commitSha?: string; commitMessage?: string;
  };

  if (!appName || !repoFullName) {
    return res.status(400).json({ error: "appName and repoFullName are required" });
  }

  try {
    // Fetch repo archive info from Forgejo
    const forgejoToken = process.env.FORGEJO_WRITE_TOKEN;
    const forgejoUrl = process.env.FORGEJO_URL ?? "https://git.13moonforge.ai";
    let fileCount: number | null = null;
    let downloadUrl: string | null = null;

    if (forgejoToken) {
      try {
        const branchName = branch ?? "main";
        downloadUrl = `${forgejoUrl}/${repoFullName}/archive/${branchName}.zip`;

        const treeRes = await fetch(
          `${forgejoUrl}/api/v1/repos/${repoFullName}/git/trees/${branchName}?recursive=true`,
          { headers: { Authorization: `token ${forgejoToken}` }, signal: AbortSignal.timeout(8000) }
        );
        if (treeRes.ok) {
          const tree = await treeRes.json() as { tree?: unknown[] };
          fileCount = tree.tree?.length ?? null;
        }
      } catch { /* non-fatal */ }
    }

    const [row] = await db.insert(codeVaultSnapshotsTable).values({
      userId: req.userId,
      appName,
      repoFullName,
      branch: branch ?? "main",
      commitSha: commitSha ?? null,
      commitMessage: commitMessage ?? null,
      fileCount,
      downloadUrl,
      source: "manual",
    }).returning();

    return res.json(row);
  } catch (err) {
    req.log.error({ err }, "code-vault snapshot failed");
    return res.status(500).json({ error: "Failed to save snapshot" });
  }
});

// ─── POST /api/code-vault/webhook ────────────────────────────────────────────
// Forgejo push webhook — auto-snapshots on every push.
router.post("/code-vault/webhook", async (req, res) => {
  try {
    const inboundKey = req.headers["x-forgejo-signature"] ?? req.headers["x-webhook-token"];
    const expectedKey = process.env.TPTS_INBOUND_KEY;
    if (expectedKey && inboundKey !== expectedKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const body = req.body as {
      repository?: { full_name?: string; name?: string };
      ref?: string;
      head_commit?: { id?: string; message?: string };
      commits?: { id?: string; message?: string }[];
      pusher?: { login?: string };
    };

    const repoFullName = body.repository?.full_name;
    const appName = body.repository?.name ?? repoFullName ?? "Unknown";
    const branch = (body.ref ?? "refs/heads/main").replace("refs/heads/", "");
    const latestCommit = body.head_commit ?? body.commits?.[0];
    const commitSha = latestCommit?.id?.slice(0, 8) ?? null;
    const commitMessage = latestCommit?.message?.split("\n")[0] ?? null;
    const pusherLogin = body.pusher?.login ?? null;

    if (!repoFullName) return res.json({ ok: true, skipped: "no repo" });

    // Find all users who have this repo in their vault (or use a system userId for admin)
    const systemUserId = pusherLogin ?? "webhook";

    await db.insert(codeVaultSnapshotsTable).values({
      userId: systemUserId,
      appName,
      repoFullName,
      branch,
      commitSha,
      commitMessage,
      source: "webhook",
    });

    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "code-vault webhook failed");
    return res.status(500).json({ error: "Webhook failed" });
  }
});

// ─── DELETE /api/code-vault/:id ───────────────────────────────────────────────
router.delete("/code-vault/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await db
      .delete(codeVaultSnapshotsTable)
      .where(and(eq(codeVaultSnapshotsTable.id, id), eq(codeVaultSnapshotsTable.userId, req.userId)));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "code-vault DELETE failed");
    return res.status(500).json({ error: "Failed to delete snapshot" });
  }
});

export default router;
