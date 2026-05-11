import { Router } from "express";
import { db } from "@workspace/db";
import { serverConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const LINODE_API = "https://api.linode.com/v4";

function linodeFetch(token: string, path: string, options: RequestInit = {}) {
  return fetch(`${LINODE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

const COOLIFY_CLOUD_INIT = `#!/bin/bash
set -e
apt-get update -y && apt-get upgrade -y
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker
mkdir -p /data/coolify/ssh/keys /data/coolify/source /data/coolify/proxy
curl -fsSL https://cdn.coollabs.io/coolify/install.sh -o /tmp/coolify-install.sh
chmod +x /tmp/coolify-install.sh
DISABLE_TELEMETRY=1 bash /tmp/coolify-install.sh --force
for i in $(seq 1 36); do
  curl -sf http://localhost:8000/api/v1/healthcheck > /dev/null 2>&1 && break
  sleep 5
done
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 8000/tcp
echo "y" | ufw enable || true
echo "Forge provisioning complete"`;

// GET /api/linode/regions
router.get("/linode/regions", async (req, res) => {
  const token = req.headers["x-linode-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "Linode API token required" });

  try {
    const r = await linodeFetch(token, "/regions?page_size=100");
    if (!r.ok) return res.status(r.status).json({ error: "Invalid Linode token" });

    interface LinodeRegion { id: string; label: string; country: string; status: string }
    const data = await r.json() as { data: LinodeRegion[] };
    const regions = data.data
      .filter(r => r.status === "ok")
      .map(r => ({ id: r.id, name: r.label, country: r.country }));
    return res.json({ regions });
  } catch (err) {
    req.log.error({ err }, "linode/regions failed");
    return res.status(500).json({ error: "Could not reach Linode API" });
  }
});

// GET /api/linode/types
router.get("/linode/types", async (req, res) => {
  const token = req.headers["x-linode-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "Linode API token required" });

  try {
    const r = await linodeFetch(token, "/linode/types?page_size=100");
    if (!r.ok) return res.status(r.status).json({ error: "Could not fetch types" });

    interface LinodeType { id: string; label: string; vcpus: number; memory: number; disk: number; price: { monthly: number }; class: string }
    const data = await r.json() as { data: LinodeType[] };
    const wanted = ["nanode-1", "linode-2", "linode-4", "linode-8"];
    const types = data.data
      .filter(t => wanted.includes(t.id))
      .map(t => ({
        id: t.id,
        label: t.label,
        vcpus: t.vcpus,
        memory: t.memory,
        disk: t.disk,
        priceMonthly: t.price.monthly,
      }))
      .sort((a, b) => a.priceMonthly - b.priceMonthly);
    return res.json({ types });
  } catch (err) {
    req.log.error({ err }, "linode/types failed");
    return res.status(500).json({ error: "Could not fetch types" });
  }
});

// POST /api/linode/provision
router.post("/linode/provision", async (req, res) => {
  const { linodeToken, type, region, rootPass, serverName } = req.body as Record<string, string>;
  if (!linodeToken?.trim()) return res.status(400).json({ error: "Linode API token is required" });
  if (!type?.trim()) return res.status(400).json({ error: "Linode type is required" });
  if (!region?.trim()) return res.status(400).json({ error: "Region is required" });
  if (!rootPass?.trim()) return res.status(400).json({ error: "Root password is required" });

  const label = (serverName?.trim() || "forge-server")
    .toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 32);

  try {
    const createRes = await linodeFetch(linodeToken.trim(), "/linode/instances", {
      method: "POST",
      body: JSON.stringify({
        type: type.trim(),
        region: region.trim(),
        image: "linode/ubuntu22.04",
        label,
        root_pass: rootPass.trim(),
        metadata: { user_data: Buffer.from(COOLIFY_CLOUD_INIT).toString("base64") },
        booted: true,
      }),
    });

    interface LinodeInstance { id: number; label: string; status: string; ipv4: string[] }
    const body = await createRes.json() as (LinodeInstance & { errors?: Array<{ reason: string }> });
    if (!createRes.ok) {
      const errMsg = body.errors?.[0]?.reason ?? "Failed to create Linode";
      return res.status(createRes.status).json({ error: errMsg });
    }

    const ip = body.ipv4?.[0] ?? "";
    const coolifyUrl = ip ? `http://${ip}:8000` : "";

    const existing = await db.select().from(serverConnectionsTable).where(eq(serverConnectionsTable.userId, req.userId));
    if (existing.length > 0) {
      await db.update(serverConnectionsTable).set({ name: label, coolifyUrl: coolifyUrl || "pending", coolifyApiKey: "pending", updatedAt: new Date() }).where(eq(serverConnectionsTable.userId, req.userId));
    } else {
      await db.insert(serverConnectionsTable).values({ userId: req.userId, name: label, coolifyUrl: coolifyUrl || "pending", coolifyApiKey: "pending" });
    }

    return res.json({ ok: true, linodeId: body.id, name: body.label, ip, coolifyUrl, status: body.status });
  } catch (err) {
    req.log.error({ err }, "linode/provision failed");
    return res.status(500).json({ error: "Failed to create Linode instance" });
  }
});

// GET /api/linode/instance-status/:linodeId
router.get("/linode/instance-status/:linodeId", async (req, res) => {
  const token = req.headers["x-linode-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "Token required" });

  try {
    const r = await linodeFetch(token, `/linode/instances/${req.params.linodeId}`);
    if (!r.ok) return res.status(r.status).json({ error: "Instance not found" });

    interface LinodeDetail { id: number; label: string; status: string; ipv4: string[] }
    const data = await r.json() as LinodeDetail;
    const ip = data.ipv4?.[0] ?? "";

    let coolifyReady = false;
    if (ip && data.status === "running") {
      try {
        const hc = await fetch(`http://${ip}:8000/api/v1/healthcheck`, { signal: AbortSignal.timeout(3000) });
        coolifyReady = hc.status < 500;
      } catch { coolifyReady = false; }
    }

    return res.json({ linodeId: data.id, name: data.label, status: data.status, ip, coolifyReady, coolifyUrl: ip ? `http://${ip}:8000` : "" });
  } catch (err) {
    req.log.error({ err }, "linode/instance-status failed");
    return res.status(500).json({ error: "Could not check instance status" });
  }
});

export default router;
