import { Router } from "express";
import { db } from "@workspace/db";
import { userDatabasesTable, userAppsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

const router = Router();

const FORGE_COOLIFY_URL  = process.env.FORGE_COOLIFY_URL ?? "";
const FORGE_COOLIFY_KEY  = process.env.FORGE_COOLIFY_API_KEY ?? "";
const FORGE_PROJECT_UUID = process.env.FORGE_COOLIFY_PROJECT_UUID ?? "";
const FORGE_SERVER_UUID  = process.env.FORGE_COOLIFY_SERVER_UUID ?? "";

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

// ─── GET /api/launch/databases ────────────────────────────────────────────────
router.get("/launch/databases", async (req, res) => {
  try {
    const dbs = await db
      .select()
      .from(userDatabasesTable)
      .where(eq(userDatabasesTable.userId, req.userId))
      .orderBy(userDatabasesTable.createdAt);
    return res.json({ databases: dbs });
  } catch (err) {
    req.log.error({ err }, "launch/databases GET failed");
    return res.status(500).json({ error: "Failed to load databases" });
  }
});

// ─── POST /api/launch/databases ───────────────────────────────────────────────
router.post("/launch/databases", async (req, res) => {
  const { name, appId } = req.body as { name?: string; appId?: number };

  const dbName = (name ?? "db").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30) || "forgedb";
  const dbUser = "forge";
  const dbPass = randomBytes(16).toString("hex");
  const resourceName = `${dbName}-${req.userId.slice(0, 6)}-${randomBytes(4).toString("hex")}`;

  try {
    let coolifyId: string | null = null;
    let connStr: string | null = null;

    if (FORGE_COOLIFY_URL && FORGE_COOLIFY_KEY && FORGE_PROJECT_UUID && FORGE_SERVER_UUID) {
      const payload = {
        type: "standalone-postgresql",
        name: resourceName,
        server_uuid: FORGE_SERVER_UUID,
        project_uuid: FORGE_PROJECT_UUID,
        environment_name: "production",
        postgres_user: dbUser,
        postgres_password: dbPass,
        postgres_db: dbName,
        instant_deploy: true,
      };

      const r = await coolify("/databases", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (r.ok) {
        const created = await r.json() as { uuid?: string; internal_db_url?: string };
        coolifyId = created.uuid ?? null;
        connStr = created.internal_db_url ?? null;

        if (!connStr && coolifyId) {
          const infoRes = await coolify(`/databases/${coolifyId}`);
          if (infoRes.ok) {
            const info = await infoRes.json() as { internal_db_url?: string; db_url?: string };
            connStr = info.internal_db_url ?? info.db_url ?? null;
          }
        }
      } else {
        const errText = await r.text();
        req.log.warn({ status: r.status, body: errText }, "Coolify DB create failed — storing local record anyway");
      }
    }

    const internalHost = coolifyId ? resourceName : "localhost";
    if (!connStr) {
      connStr = `postgresql://${dbUser}:${dbPass}@${internalHost}:5432/${dbName}`;
    }

    const [record] = await db.insert(userDatabasesTable).values({
      userId: req.userId,
      name: name ?? dbName,
      appId: appId ?? null,
      coolifyResourceId: coolifyId,
      dbUser,
      dbName,
      dbPassword: dbPass,
      internalHost,
      port: 5432,
      status: coolifyId ? "provisioning" : "manual",
      connectionString: connStr,
    }).returning();

    return res.json({ ok: true, database: record });
  } catch (err) {
    req.log.error({ err }, "launch/databases POST failed");
    return res.status(500).json({ error: "Failed to provision database" });
  }
});

// ─── POST /api/launch/databases/:id/inject ────────────────────────────────────
// Inject DATABASE_URL into a linked app's env vars
router.post("/launch/databases/:id/inject", async (req, res) => {
  const dbId = parseInt(req.params.id);
  const { appId } = req.body as { appId: number };

  const [dbRecord] = await db
    .select()
    .from(userDatabasesTable)
    .where(and(eq(userDatabasesTable.id, dbId), eq(userDatabasesTable.userId, req.userId)));

  if (!dbRecord) return res.status(404).json({ error: "Database not found" });
  if (!dbRecord.connectionString) return res.status(400).json({ error: "No connection string available" });

  const [app] = await db
    .select()
    .from(userAppsTable)
    .where(and(eq(userAppsTable.id, appId), eq(userAppsTable.userId, req.userId)));

  if (!app) return res.status(404).json({ error: "App not found" });
  if (!app.coolifyResourceId) return res.status(400).json({ error: "App not deployed to infrastructure yet" });

  try {
    const r = await coolify(`/applications/${app.coolifyResourceId}/envs`, {
      method: "POST",
      body: JSON.stringify({ key: "DATABASE_URL", value: dbRecord.connectionString }),
    });

    if (!r.ok) {
      const errText = await r.text();
      req.log.warn({ status: r.status, body: errText }, "Inject DATABASE_URL failed");
      return res.status(500).json({ error: "Failed to inject env var" });
    }

    await db.update(userDatabasesTable)
      .set({ appId, updatedAt: new Date() })
      .where(eq(userDatabasesTable.id, dbId));

    return res.json({ ok: true, connectionString: dbRecord.connectionString });
  } catch (err) {
    req.log.error({ err }, "databases inject failed");
    return res.status(500).json({ error: "Failed to inject database" });
  }
});

// ─── DELETE /api/launch/databases/:id ────────────────────────────────────────
router.delete("/launch/databases/:id", async (req, res) => {
  const dbId = parseInt(req.params.id);
  const [dbRecord] = await db
    .select()
    .from(userDatabasesTable)
    .where(and(eq(userDatabasesTable.id, dbId), eq(userDatabasesTable.userId, req.userId)));

  if (!dbRecord) return res.status(404).json({ error: "Database not found" });

  try {
    if (dbRecord.coolifyResourceId && FORGE_COOLIFY_KEY) {
      await coolify(`/databases/${dbRecord.coolifyResourceId}`, { method: "DELETE" });
    }
    await db.delete(userDatabasesTable).where(eq(userDatabasesTable.id, dbId));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "databases DELETE failed");
    return res.status(500).json({ error: "Failed to delete database" });
  }
});

// ─── GET /api/launch/databases/:id/status ─────────────────────────────────────
router.get("/launch/databases/:id/status", async (req, res) => {
  const dbId = parseInt(req.params.id);
  const [dbRecord] = await db
    .select()
    .from(userDatabasesTable)
    .where(and(eq(userDatabasesTable.id, dbId), eq(userDatabasesTable.userId, req.userId)));

  if (!dbRecord) return res.status(404).json({ error: "Not found" });
  if (!dbRecord.coolifyResourceId) return res.json({ status: dbRecord.status });

  try {
    const r = await coolify(`/databases/${dbRecord.coolifyResourceId}`);
    if (!r.ok) return res.json({ status: dbRecord.status });

    const data = await r.json() as { status?: string; internal_db_url?: string };
    const rawStatus = (data.status ?? "").toLowerCase();
    const status = rawStatus.includes("running") ? "ready"
      : rawStatus.includes("stop") ? "stopped"
      : rawStatus.includes("error") ? "error"
      : dbRecord.status;

    const connStr = data.internal_db_url ?? dbRecord.connectionString;
    await db.update(userDatabasesTable)
      .set({ status, connectionString: connStr ?? dbRecord.connectionString, updatedAt: new Date() })
      .where(eq(userDatabasesTable.id, dbId));

    return res.json({ status, connectionString: connStr });
  } catch (err) {
    req.log.error({ err }, "databases status failed");
    return res.json({ status: dbRecord.status });
  }
});

export default router;
