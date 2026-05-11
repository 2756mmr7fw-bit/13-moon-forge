import { Router } from "express";
import { db } from "@workspace/db";
import { serverConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const VULTR_API = "https://api.vultr.com/v2";

function vultrFetch(token: string, path: string, options: RequestInit = {}) {
  return fetch(`${VULTR_API}${path}`, {
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

// GET /api/vultr/regions
router.get("/vultr/regions", async (req, res) => {
  const token = req.headers["x-vultr-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "Vultr API token required" });

  try {
    const r = await vultrFetch(token, "/regions?per_page=100");
    if (!r.ok) return res.status(r.status).json({ error: "Invalid Vultr token" });

    interface VultrRegion { id: string; city: string; country: string; continent: string }
    const data = await r.json() as { regions: VultrRegion[] };
    const regions = data.regions.map(r => ({
      id: r.id, name: `${r.city}, ${r.country}`, country: r.country,
    }));
    return res.json({ regions });
  } catch (err) {
    req.log.error({ err }, "vultr/regions failed");
    return res.status(500).json({ error: "Could not reach Vultr API" });
  }
});

// GET /api/vultr/plans
router.get("/vultr/plans", async (req, res) => {
  const token = req.headers["x-vultr-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "Vultr API token required" });

  try {
    const r = await vultrFetch(token, "/plans?type=vc2&per_page=100");
    if (!r.ok) return res.status(r.status).json({ error: "Could not fetch plans" });

    interface VultrPlan {
      id: string; vcpu_count: number; ram: number;
      disk: number; monthly_cost: number; type: string;
    }
    const data = await r.json() as { plans: VultrPlan[] };
    const wanted = [1024, 2048, 4096, 8192];
    const plans = data.plans
      .filter(p => wanted.includes(p.ram))
      .map(p => ({
        id: p.id,
        vcpus: p.vcpu_count,
        memory: p.ram,
        disk: p.disk,
        priceMonthly: p.monthly_cost,
      }))
      .sort((a, b) => a.priceMonthly - b.priceMonthly);
    return res.json({ plans });
  } catch (err) {
    req.log.error({ err }, "vultr/plans failed");
    return res.status(500).json({ error: "Could not fetch plans" });
  }
});

// POST /api/vultr/provision
router.post("/vultr/provision", async (req, res) => {
  const { vultrToken, plan, region, serverName } = req.body as Record<string, string>;
  if (!vultrToken?.trim()) return res.status(400).json({ error: "Vultr API token is required" });
  if (!plan?.trim()) return res.status(400).json({ error: "Plan is required" });
  if (!region?.trim()) return res.status(400).json({ error: "Region is required" });

  const label = (serverName?.trim() || "forge-server")
    .toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 63);

  try {
    const createRes = await vultrFetch(vultrToken.trim(), "/instances", {
      method: "POST",
      body: JSON.stringify({
        region: region.trim(),
        plan: plan.trim(),
        os_id: 1743,
        label,
        user_data: Buffer.from(COOLIFY_CLOUD_INIT).toString("base64"),
        backups: "disabled",
      }),
    });

    interface VultrInstance { id: string; label: string; status: string; main_ip: string }
    const body = await createRes.json() as { instance?: VultrInstance; error?: string };
    if (!createRes.ok) return res.status(createRes.status).json({ error: body.error ?? "Failed to create instance" });

    const inst = body.instance!;
    const ip = inst.main_ip ?? "";
    const coolifyUrl = ip && ip !== "0.0.0.0" ? `http://${ip}:8000` : "";

    const existing = await db.select().from(serverConnectionsTable).where(eq(serverConnectionsTable.userId, req.userId));
    if (existing.length > 0) {
      await db.update(serverConnectionsTable).set({ name: label, coolifyUrl: coolifyUrl || "pending", coolifyApiKey: "pending", updatedAt: new Date() }).where(eq(serverConnectionsTable.userId, req.userId));
    } else {
      await db.insert(serverConnectionsTable).values({ userId: req.userId, name: label, coolifyUrl: coolifyUrl || "pending", coolifyApiKey: "pending" });
    }

    return res.json({ ok: true, instanceId: inst.id, name: inst.label, ip, coolifyUrl, status: inst.status });
  } catch (err) {
    req.log.error({ err }, "vultr/provision failed");
    return res.status(500).json({ error: "Failed to create Vultr instance" });
  }
});

// GET /api/vultr/instance-status/:instanceId
router.get("/vultr/instance-status/:instanceId", async (req, res) => {
  const token = req.headers["x-vultr-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "Token required" });

  try {
    const r = await vultrFetch(token, `/instances/${req.params.instanceId}`);
    if (!r.ok) return res.status(r.status).json({ error: "Instance not found" });

    interface VultrInstanceDetail { instance: { id: string; label: string; status: string; main_ip: string } }
    const data = await r.json() as VultrInstanceDetail;
    const inst = data.instance;
    const ip = inst.main_ip ?? "";
    const validIp = ip && ip !== "0.0.0.0" ? ip : "";

    let coolifyReady = false;
    if (validIp && inst.status === "active") {
      try {
        const hc = await fetch(`http://${validIp}:8000/api/v1/healthcheck`, { signal: AbortSignal.timeout(3000) });
        coolifyReady = hc.status < 500;
      } catch { coolifyReady = false; }
    }

    return res.json({ instanceId: inst.id, name: inst.label, status: inst.status, ip: validIp, coolifyReady, coolifyUrl: validIp ? `http://${validIp}:8000` : "" });
  } catch (err) {
    req.log.error({ err }, "vultr/instance-status failed");
    return res.status(500).json({ error: "Could not check instance status" });
  }
});

export default router;
