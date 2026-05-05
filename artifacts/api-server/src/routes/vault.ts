import { Router } from "express";
import { db } from "@workspace/db";
import { reposTable, importsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import multiparty from "multiparty";
import { TEMPLATES, type TemplateName } from "./templates";

const execAsync = promisify(exec);
const router = Router();

const FORGEJO_URL = process.env["FORGEJO_URL"] ?? "";
const FORGEJO_TOKEN = process.env["FORGEJO_TOKEN"] ?? "";
const FORGEJO_ADMIN_USER = process.env["FORGEJO_ADMIN_USER"] ?? "forge-admin";

function forgejoHeaders() {
  return {
    "Authorization": `token ${FORGEJO_TOKEN}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

async function forgejoApi(method: string, endpoint: string, body?: unknown) {
  const res = await fetch(`${FORGEJO_URL}/api/v1${endpoint}`, {
    method,
    headers: forgejoHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ── GET /api/vault/repos ────────────────────────────────────────────────────
router.get("/vault/repos", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  try {
    const repos = await db
      .select()
      .from(reposTable)
      .orderBy(desc(reposTable.updatedAt));
    res.json(repos);
  } catch (err) {
    req.log.error({ err }, "Failed to list repos");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/vault/repos ───────────────────────────────────────────────────
const TEMPLATE_NAMES: [TemplateName, ...TemplateName[]] = ["blank", "react-vite", "express", "static-html", "nextjs"];

const CreateRepoBody = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/, "Repo name can only contain letters, numbers, dashes, dots, or underscores"),
  description: z.string().max(500).optional(),
  visibility: z.enum(["private", "public"]).default("private"),
  projectId: z.number().int().optional(),
  template: z.enum(TEMPLATE_NAMES).default("blank"),
});

router.post("/vault/repos", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const body = CreateRepoBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.message });

  if (!FORGEJO_URL || !FORGEJO_TOKEN) {
    return res.status(503).json({ error: "Vault not configured. Please set FORGEJO_URL and FORGEJO_TOKEN." });
  }

  try {
    // Create repo in Forgejo
    const forgejoRes = await forgejoApi("POST", `/user/repos`, {
      name: body.data.name,
      description: body.data.description ?? "",
      private: body.data.visibility === "private",
      auto_init: true,
      default_branch: "main",
    });

    if (!forgejoRes.ok) {
      req.log.error({ status: forgejoRes.status, data: forgejoRes.data }, "Forgejo create repo failed");
      return res.status(502).json({ error: `Vault error: ${(forgejoRes.data as { message?: string }).message ?? "Unknown error"}` });
    }

    const forgejoRepo = forgejoRes.data as { id: number; owner: { login: string }; full_name: string; clone_url: string };

    const [repo] = await db.insert(reposTable).values({
      name: body.data.name,
      description: body.data.description ?? null,
      visibility: body.data.visibility,
      forgejoRepoId: forgejoRepo.id,
      forgejoOwner: forgejoRepo.owner.login,
      forgejoFullName: forgejoRepo.full_name,
      cloneUrl: forgejoRepo.clone_url,
      projectId: body.data.projectId ?? null,
    }).returning();

    // Push template files if a non-blank template was chosen
    const templateName = body.data.template ?? "blank";
    const template = TEMPLATES[templateName];
    if (template && template.files.length > 0) {
      const owner = forgejoRepo.owner.login;
      const repoName = body.data.name;
      for (const file of template.files) {
        try {
          await forgejoApi("POST", `/repos/${owner}/${repoName}/contents/${file.path}`, {
            message: `Initial commit: add ${file.path}`,
            content: Buffer.from(file.content).toString("base64"),
          });
        } catch (e) {
          req.log.warn({ file: file.path, err: e }, "Template file push failed — skipping");
        }
      }
    }

    res.status(201).json(repo);
  } catch (err) {
    req.log.error({ err }, "Failed to create repo");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/vault/repos/:id ─────────────────────────────────────────────
router.delete("/vault/repos/:id", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) return res.status(400).json({ error: "Invalid repo id" });

  try {
    const [repo] = await db.select().from(reposTable).where(eq(reposTable.id, id));
    if (!repo) return res.status(404).json({ error: "Repo not found" });

    if (FORGEJO_URL && FORGEJO_TOKEN && repo.forgejoOwner && repo.name) {
      await forgejoApi("DELETE", `/repos/${repo.forgejoOwner}/${repo.name}`);
    }

    await db.delete(reposTable).where(eq(reposTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete repo");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/vault/import/github ────────────────────────────────────────────
const GithubImportBody = z.object({
  githubUrl: z.string().url(),
  githubToken: z.string().optional(),
  repoName: z.string().min(1).max(100).optional(),
  visibility: z.enum(["private", "public"]).default("private"),
  projectId: z.number().int().optional(),
});

router.post("/vault/import/github", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const body = GithubImportBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.message });

  if (!FORGEJO_URL || !FORGEJO_TOKEN) {
    return res.status(503).json({ error: "Vault not configured. Please set FORGEJO_URL and FORGEJO_TOKEN." });
  }

  const urlParts = body.data.githubUrl.replace(/\.git$/, "").split("/");
  const derivedName = body.data.repoName ?? urlParts[urlParts.length - 1] ?? "imported-repo";

  try {
    // Insert repo + import records immediately so we can respond 202 right away
    const [repo] = await db.insert(reposTable).values({
      name: derivedName,
      description: `Imported from ${body.data.githubUrl}`,
      visibility: body.data.visibility,
      projectId: body.data.projectId ?? null,
    }).returning();

    const [imp] = await db.insert(importsTable).values({
      repoId: repo.id,
      source: "github",
      sourceUrl: body.data.githubUrl,
      sourceRepoName: derivedName,
      status: "importing",
    }).returning();

    res.status(202).json({ repo, import: imp, message: "Import started" });

    // Use Forgejo's native migration API — server-to-server, no local git or disk needed
    try {
      const migrateRes = await forgejoApi("POST", "/repos/migrate", {
        clone_addr: body.data.githubUrl,
        repo_name: derivedName,
        private: body.data.visibility === "private",
        mirror: false,
        auth_token: body.data.githubToken ?? undefined,
        wiki: false,
        issues: false,
        pull_requests: false,
        releases: false,
        milestones: false,
        labels: false,
      });

      if (!migrateRes.ok) {
        throw new Error((migrateRes.data as { message?: string }).message ?? "Migration failed");
      }

      const forgejoRepo = migrateRes.data as { id: number; owner: { login: string }; full_name: string; clone_url: string };

      await db.update(reposTable).set({
        forgejoRepoId: forgejoRepo.id,
        forgejoOwner: forgejoRepo.owner.login,
        forgejoFullName: forgejoRepo.full_name,
        cloneUrl: forgejoRepo.clone_url,
        updatedAt: new Date(),
      }).where(eq(reposTable.id, repo.id));

      await db.update(importsTable)
        .set({ status: "done", updatedAt: new Date() })
        .where(eq(importsTable.id, imp.id));
    } catch (err) {
      req.log.error({ err }, "GitHub migration failed");
      await db.update(importsTable)
        .set({ status: "error", errorMessage: String(err), updatedAt: new Date() })
        .where(eq(importsTable.id, imp.id));
    }
  } catch (err) {
    req.log.error({ err }, "GitHub import setup failed");
  }
});

// ── POST /api/vault/import/zip ───────────────────────────────────────────────
router.post("/vault/import/zip", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });

  if (!FORGEJO_URL || !FORGEJO_TOKEN) {
    return res.status(503).json({ error: "Vault not configured. Please set FORGEJO_URL and FORGEJO_TOKEN." });
  }

  const form = new multiparty.Form({ maxFilesSize: 100 * 1024 * 1024 });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: "Failed to parse upload" });

    const repoName = (fields["repoName"]?.[0] ?? "uploaded-repo").replace(/[^a-zA-Z0-9_.-]/g, "-");
    const visibility = (fields["visibility"]?.[0] === "public") ? "public" : "private";
    const projectId = fields["projectId"]?.[0] ? parseInt(fields["projectId"][0]) : undefined;
    const zipFile = files["file"]?.[0];

    if (!zipFile) return res.status(400).json({ error: "No file uploaded" });

    try {
      // Create repo in Forgejo
      const forgejoRes = await forgejoApi("POST", `/user/repos`, {
        name: repoName,
        description: "Uploaded via ZIP import",
        private: visibility === "private",
        auto_init: false,
      });

      if (!forgejoRes.ok) {
        return res.status(502).json({ error: `Vault error: ${(forgejoRes.data as { message?: string }).message ?? "Unknown"}` });
      }

      const forgejoRepo = forgejoRes.data as { id: number; owner: { login: string }; full_name: string; clone_url: string };

      const [repo] = await db.insert(reposTable).values({
        name: repoName,
        description: "Uploaded via ZIP import",
        visibility,
        forgejoRepoId: forgejoRepo.id,
        forgejoOwner: forgejoRepo.owner.login,
        forgejoFullName: forgejoRepo.full_name,
        cloneUrl: forgejoRepo.clone_url,
        projectId: projectId ?? null,
      }).returning();

      const [imp] = await db.insert(importsTable).values({
        repoId: repo.id,
        source: "zip",
        sourceRepoName: repoName,
        status: "importing",
      }).returning();

      res.status(202).json({ repo, import: imp, message: "Import started" });

      // Process ZIP in background
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vault-zip-"));
      try {
        await execAsync(`unzip -o "${zipFile.path}" -d "${tmpDir}/src"`);
        await execAsync(`git init "${tmpDir}/repo"`);
        await execAsync(`cp -r "${tmpDir}/src/." "${tmpDir}/repo/"`);
        await execAsync(`git -C "${tmpDir}/repo" add -A`);
        await execAsync(`git -C "${tmpDir}/repo" -c user.email="vault@13moonforge.ai" -c user.name="Vault" commit -m "Initial import from ZIP"`);

        const pushUrl = forgejoRepo.clone_url.replace("https://", `https://${FORGEJO_ADMIN_USER}:${FORGEJO_TOKEN}@`);
        await execAsync(`git -C "${tmpDir}/repo" remote add origin "${pushUrl}"`);
        await execAsync(`git -C "${tmpDir}/repo" push -u origin HEAD:main`);

        await db.update(importsTable).set({ status: "done", updatedAt: new Date() }).where(eq(importsTable.id, imp.id));
        await db.update(reposTable).set({ updatedAt: new Date() }).where(eq(reposTable.id, repo.id));
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
        await fs.unlink(zipFile.path).catch(() => {});
      }
    } catch (err) {
      req.log.error({ err }, "ZIP import failed");
    }
  });
});

// ── GET /api/vault/imports ───────────────────────────────────────────────────
router.get("/vault/imports", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  try {
    const imports = await db.select().from(importsTable).orderBy(desc(importsTable.createdAt)).limit(50);
    res.json(imports);
  } catch (err) {
    req.log.error({ err }, "Failed to list imports");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/vault/status ────────────────────────────────────────────────────
router.get("/vault/status", async (_req, res) => {
  if (!FORGEJO_URL || !FORGEJO_TOKEN) {
    return res.json({ configured: false, message: "Vault not yet configured" });
  }
  try {
    const r = await forgejoApi("GET", "/settings/api");
    res.json({ configured: true, online: r.ok, forgejoUrl: FORGEJO_URL });
  } catch {
    res.json({ configured: true, online: false, forgejoUrl: FORGEJO_URL });
  }
});

export default router;
