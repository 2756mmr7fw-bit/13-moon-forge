import { Router } from "express";
import { db } from "@workspace/db";
import { serverConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const DO_API = "https://api.digitalocean.com/v2";

function doFetch(token: string, path: string, options: RequestInit = {}) {
  return fetch(`${DO_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

// Cloud-init script to install Coolify on any Ubuntu server
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

// GET /api/digitalocean/regions
router.get("/digitalocean/regions", async (req, res) => {
  const token = req.headers["x-do-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "DigitalOcean API token required" });

  try {
    const r = await doFetch(token, "/regions?per_page=100");
    if (!r.ok) return res.status(r.status).json({ error: "Invalid DigitalOcean token" });

    interface DORegion { slug: string; name: string; available: boolean }
    const data = await r.json() as { regions: DORegion[] };
    const regions = data.regions
      .filter(r => r.available)
      .map(r => ({ slug: r.slug, name: r.name }));
    return res.json({ regions });
  } catch (err) {
    req.log.error({ err }, "digitalocean/regions failed");
    return res.status(500).json({ error: "Could not reach DigitalOcean API" });
  }
});

// GET /api/digitalocean/sizes
router.get("/digitalocean/sizes", async (req, res) => {
  const token = req.headers["x-do-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "DigitalOcean API token required" });

  try {
    const r = await doFetch(token, "/sizes?per_page=200");
    if (!r.ok) return res.status(r.status).json({ error: "Could not fetch sizes" });

    interface DOSize {
      slug: string; description: string; vcpus: number;
      memory: number; disk: number; price_monthly: number; available: boolean;
    }
    const data = await r.json() as { sizes: DOSize[] };
    const wanted = ["s-1vcpu-2gb", "s-2vcpu-4gb", "s-4vcpu-8gb", "s-8vcpu-16gb"];
    const sizes = data.sizes
      .filter(s => s.available && wanted.includes(s.slug))
      .map(s => ({
        slug: s.slug,
        description: s.description,
        vcpus: s.vcpus,
        memory: s.memory,
        disk: s.disk,
        priceMonthly: s.price_monthly,
      }))
      .sort((a, b) => a.priceMonthly - b.priceMonthly);
    return res.json({ sizes });
  } catch (err) {
    req.log.error({ err }, "digitalocean/sizes failed");
    return res.status(500).json({ error: "Could not fetch sizes" });
  }
});

// POST /api/digitalocean/provision
router.post("/digitalocean/provision", async (req, res) => {
  const { doToken, size, region, serverName } = req.body as Record<string, string>;
  if (!doToken?.trim()) return res.status(400).json({ error: "DigitalOcean API token is required" });
  if (!size?.trim()) return res.status(400).json({ error: "Size is required" });
  if (!region?.trim()) return res.status(400).json({ error: "Region is required" });

  const name = (serverName?.trim() || "forge-server")
    .toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 63);

  try {
    const createRes = await doFetch(doToken.trim(), "/droplets", {
      method: "POST",
      body: JSON.stringify({
        name,
        region: region.trim(),
        size: size.trim(),
        image: "ubuntu-22-04-x64",
        user_data: COOLIFY_CLOUD_INIT,
        ipv6: false,
        monitoring: true,
      }),
    });

    interface DODroplet {
      id: number; name: string; status: string;
      networks: { v4: Array<{ ip_address: string; type: string }> };
    }
    const body = await createRes.json() as { droplet?: DODroplet; message?: string };
    if (!createRes.ok) return res.status(createRes.status).json({ error: body.message ?? "Failed to create droplet" });

    const droplet = body.droplet!;
    const ip = droplet.networks?.v4?.find(n => n.type === "public")?.ip_address ?? "";
    const coolifyUrl = ip ? `http://${ip}:8000` : "";

    const existing = await db.select().from(serverConnectionsTable).where(eq(serverConnectionsTable.userId, req.userId));
    if (existing.length > 0) {
      await db.update(serverConnectionsTable).set({ name, coolifyUrl: coolifyUrl || "pending", coolifyApiKey: "pending", updatedAt: new Date() }).where(eq(serverConnectionsTable.userId, req.userId));
    } else {
      await db.insert(serverConnectionsTable).values({ userId: req.userId, name, coolifyUrl: coolifyUrl || "pending", coolifyApiKey: "pending" });
    }

    return res.json({ ok: true, dropletId: droplet.id, name: droplet.name, ip, coolifyUrl, status: droplet.status });
  } catch (err) {
    req.log.error({ err }, "digitalocean/provision failed");
    return res.status(500).json({ error: "Failed to create DigitalOcean droplet" });
  }
});

// GET /api/digitalocean/droplet-status/:dropletId
router.get("/digitalocean/droplet-status/:dropletId", async (req, res) => {
  const token = req.headers["x-do-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "Token required" });

  try {
    const r = await doFetch(token, `/droplets/${req.params.dropletId}`);
    if (!r.ok) return res.status(r.status).json({ error: "Droplet not found" });

    interface DODropletDetail { droplet: { id: number; name: string; status: string; networks: { v4: Array<{ ip_address: string; type: string }> } } }
    const data = await r.json() as DODropletDetail;
    const d = data.droplet;
    const ip = d.networks?.v4?.find(n => n.type === "public")?.ip_address ?? "";

    let coolifyReady = false;
    if (ip && d.status === "active") {
      try {
        const hc = await fetch(`http://${ip}:8000/api/v1/healthcheck`, { signal: AbortSignal.timeout(3000) });
        coolifyReady = hc.status < 500;
      } catch { coolifyReady = false; }
    }

    return res.json({ dropletId: d.id, name: d.name, status: d.status, ip, coolifyReady, coolifyUrl: ip ? `http://${ip}:8000` : "" });
  } catch (err) {
    req.log.error({ err }, "digitalocean/droplet-status failed");
    return res.status(500).json({ error: "Could not check droplet status" });
  }
});

export default router;
