import { Router } from "express";
import { db } from "@workspace/db";
import { userBucketsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

const router = Router();

const COOLIFY_URL  = () => (process.env.FORGE_COOLIFY_URL ?? "").replace(/\/+$/, "");
const COOLIFY_KEY  = () => process.env.FORGE_COOLIFY_API_KEY ?? "";
const PROJECT_UUID = () => process.env.FORGE_COOLIFY_PROJECT_UUID ?? "";
const SERVER_UUID  = () => process.env.FORGE_COOLIFY_SERVER_UUID ?? "";
const FORGE_DOMAIN = process.env.FORGE_DOMAIN ?? "13moonforge.ai";

function coolify(path: string, opts: RequestInit = {}) {
  return fetch(`${COOLIFY_URL()}/api/v1${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${COOLIFY_KEY()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(opts.headers ?? {}),
    },
  });
}

// ─── GET /api/storage/buckets ─────────────────────────────────────────────────
router.get("/storage/buckets", async (req, res) => {
  const buckets = await db
    .select()
    .from(userBucketsTable)
    .where(eq(userBucketsTable.userId, req.userId));
  return res.json({ buckets });
});

// ─── POST /api/storage/buckets ────────────────────────────────────────────────
router.post("/storage/buckets", async (req, res) => {
  const { name } = req.body as { name?: string };
  const bucketName = (name ?? "bucket").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 30) || "forge-bucket";
  const resourceName = `minio-${req.userId.slice(0, 6)}-${randomBytes(4).toString("hex")}`;
  const accessKey = `forge${randomBytes(8).toString("hex")}`;
  const secretKey = randomBytes(24).toString("hex");

  let coolifyId: string | null = null;
  let endpoint: string | null = null;
  let publicUrl: string | null = null;

  // Try to provision MinIO via Coolify
  if (COOLIFY_URL() && COOLIFY_KEY() && PROJECT_UUID() && SERVER_UUID()) {
    try {
      const r = await coolify("/services", {
        method: "POST",
        body: JSON.stringify({
          type: "minio",
          name: resourceName,
          server_uuid: SERVER_UUID(),
          project_uuid: PROJECT_UUID(),
          environment_name: "production",
          instant_deploy: true,
          envs: [
            { key: "MINIO_ROOT_USER",     value: accessKey },
            { key: "MINIO_ROOT_PASSWORD", value: secretKey },
          ],
        }),
      });

      if (r.ok) {
        const data = await r.json() as { uuid?: string };
        coolifyId = data.uuid ?? null;
        if (coolifyId) {
          endpoint  = `http://${resourceName}.${FORGE_DOMAIN}:9000`;
          publicUrl = `https://storage-${req.userId.slice(0, 6)}.${FORGE_DOMAIN}`;
        }
      }
    } catch { /* fall through to manual record */ }
  }

  // If no Coolify, use the shared Forge MinIO instance (if configured)
  if (!endpoint) {
    endpoint  = process.env.FORGE_MINIO_ENDPOINT ?? `https://storage.${FORGE_DOMAIN}`;
    publicUrl = `${endpoint}/${bucketName}`;
  }

  const [bucket] = await db.insert(userBucketsTable).values({
    userId: req.userId,
    name: bucketName,
    coolifyResourceId: coolifyId,
    accessKey,
    secretKey,
    endpoint,
    publicUrl,
    status: coolifyId ? "provisioning" : "ready",
  }).returning();

  return res.json({ ok: true, bucket });
});

// ─── GET /api/storage/buckets/:id ─────────────────────────────────────────────
router.get("/storage/buckets/:id", async (req, res) => {
  const [bucket] = await db
    .select()
    .from(userBucketsTable)
    .where(and(eq(userBucketsTable.id, parseInt(req.params.id)), eq(userBucketsTable.userId, req.userId)));
  if (!bucket) return res.status(404).json({ error: "Not found" });
  return res.json({ bucket });
});

// ─── DELETE /api/storage/buckets/:id ─────────────────────────────────────────
router.delete("/storage/buckets/:id", async (req, res) => {
  const [bucket] = await db
    .select()
    .from(userBucketsTable)
    .where(and(eq(userBucketsTable.id, parseInt(req.params.id)), eq(userBucketsTable.userId, req.userId)));
  if (!bucket) return res.status(404).json({ error: "Not found" });

  if (bucket.coolifyResourceId && COOLIFY_KEY()) {
    await coolify(`/services/${bucket.coolifyResourceId}`, { method: "DELETE" }).catch(() => {});
  }

  await db.delete(userBucketsTable)
    .where(eq(userBucketsTable.id, parseInt(req.params.id)));

  return res.json({ ok: true });
});

// ─── GET /api/storage/buckets/:id/credentials ─────────────────────────────────
router.get("/storage/buckets/:id/credentials", async (req, res) => {
  const [bucket] = await db
    .select()
    .from(userBucketsTable)
    .where(and(eq(userBucketsTable.id, parseInt(req.params.id)), eq(userBucketsTable.userId, req.userId)));
  if (!bucket) return res.status(404).json({ error: "Not found" });

  return res.json({
    endpoint: bucket.endpoint,
    accessKey: bucket.accessKey,
    secretKey: bucket.secretKey,
    publicUrl: bucket.publicUrl,
    region: bucket.region,
    sdkConfig: {
      endpoint: bucket.endpoint,
      accessKeyId: bucket.accessKey,
      secretAccessKey: bucket.secretKey,
      region: bucket.region,
      forcePathStyle: true,
    },
  });
});

export default router;
