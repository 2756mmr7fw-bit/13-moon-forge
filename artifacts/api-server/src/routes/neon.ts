import { Router } from "express";

const router = Router();
const NEON_API = "https://console.neon.tech/api/v2";

function neonFetch(token: string, path: string, options: RequestInit = {}) {
  return fetch(`${NEON_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

// GET /api/neon/projects — list user's Neon projects
router.get("/neon/projects", async (req, res) => {
  const token = req.headers["x-neon-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "Neon API token required" });

  try {
    const r = await neonFetch(token, "/projects?limit=10");
    if (!r.ok) {
      const body = await r.json().catch(() => ({})) as { message?: string };
      return res.status(r.status).json({ error: body.message ?? "Invalid Neon token" });
    }

    interface NeonProject { id: string; name: string; region_id: string; created_at: string }
    const data = await r.json() as { projects: NeonProject[] };
    return res.json({ projects: data.projects.map(p => ({ id: p.id, name: p.name, region: p.region_id, createdAt: p.created_at })) });
  } catch (err) {
    req.log.error({ err }, "neon/projects failed");
    return res.status(500).json({ error: "Could not reach Neon API" });
  }
});

// GET /api/neon/databases/:projectId — list databases in a project
router.get("/neon/databases/:projectId", async (req, res) => {
  const token = req.headers["x-neon-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "Neon API token required" });

  try {
    // Get the default branch first
    const branchRes = await neonFetch(token, `/projects/${req.params.projectId}/branches`);
    if (!branchRes.ok) return res.status(branchRes.status).json({ error: "Could not fetch branches" });

    interface NeonBranch { id: string; name: string; primary: boolean }
    const branchData = await branchRes.json() as { branches: NeonBranch[] };
    const primaryBranch = branchData.branches.find(b => b.primary) ?? branchData.branches[0];
    if (!primaryBranch) return res.json({ databases: [] });

    const dbRes = await neonFetch(token, `/projects/${req.params.projectId}/branches/${primaryBranch.id}/databases`);
    if (!dbRes.ok) return res.status(dbRes.status).json({ error: "Could not fetch databases" });

    interface NeonDatabase { id: number; name: string; owner_name: string; created_at: string }
    const dbData = await dbRes.json() as { databases: NeonDatabase[] };
    return res.json({
      branchId: primaryBranch.id,
      databases: dbData.databases.map(d => ({ id: d.id, name: d.name, owner: d.owner_name, createdAt: d.created_at })),
    });
  } catch (err) {
    req.log.error({ err }, "neon/databases failed");
    return res.status(500).json({ error: "Could not fetch databases" });
  }
});

// POST /api/neon/databases — create a database in a project
router.post("/neon/databases", async (req, res) => {
  const token = req.headers["x-neon-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "Neon API token required" });

  const { projectId, branchId, dbName, ownerName } = req.body as {
    projectId?: string; branchId?: string; dbName?: string; ownerName?: string;
  };
  if (!projectId?.trim()) return res.status(400).json({ error: "projectId is required" });
  if (!dbName?.trim()) return res.status(400).json({ error: "dbName is required" });

  let targetBranchId = branchId?.trim();

  // If no branchId provided, fetch the primary branch
  if (!targetBranchId) {
    try {
      const branchRes = await neonFetch(token, `/projects/${projectId}/branches`);
      interface NeonBranch { id: string; primary: boolean }
      const branchData = await branchRes.json() as { branches: NeonBranch[] };
      targetBranchId = branchData.branches.find(b => b.primary)?.id ?? branchData.branches[0]?.id;
    } catch {
      return res.status(500).json({ error: "Could not determine branch" });
    }
  }

  if (!targetBranchId) return res.status(400).json({ error: "No branch available in project" });

  try {
    const createRes = await neonFetch(token, `/projects/${projectId}/branches/${targetBranchId}/databases`, {
      method: "POST",
      body: JSON.stringify({ database: { name: dbName.trim(), owner_name: ownerName?.trim() ?? "neondb_owner" } }),
    });

    const body = await createRes.json() as Record<string, unknown>;
    if (!createRes.ok) {
      return res.status(createRes.status).json({ error: (body.message as string) ?? "Failed to create database" });
    }

    // Get connection URI
    const connRes = await neonFetch(token, `/projects/${projectId}/connection_uri?branch_id=${targetBranchId}&database_name=${dbName.trim()}&role_name=${ownerName?.trim() ?? "neondb_owner"}`);
    let connectionUri = "";
    if (connRes.ok) {
      const connData = await connRes.json() as { uri?: string };
      connectionUri = connData.uri ?? "";
    }

    return res.json({ ok: true, database: body.database, connectionUri });
  } catch (err) {
    req.log.error({ err }, "neon/databases POST failed");
    return res.status(500).json({ error: "Failed to create database" });
  }
});

// GET /api/neon/connection-uri — get connection string for a specific DB
router.get("/neon/connection-uri", async (req, res) => {
  const token = req.headers["x-neon-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "Neon API token required" });

  const { projectId, branchId, dbName, roleName } = req.query as Record<string, string>;
  if (!projectId || !dbName) return res.status(400).json({ error: "projectId and dbName required" });

  try {
    const params = new URLSearchParams({ branch_id: branchId ?? "", database_name: dbName, role_name: roleName ?? "neondb_owner" });
    const r = await neonFetch(token, `/projects/${projectId}/connection_uri?${params}`);
    if (!r.ok) return res.status(r.status).json({ error: "Could not get connection URI" });

    const data = await r.json() as { uri?: string };
    return res.json({ uri: data.uri ?? "" });
  } catch (err) {
    req.log.error({ err }, "neon/connection-uri failed");
    return res.status(500).json({ error: "Failed to get connection URI" });
  }
});

export default router;
