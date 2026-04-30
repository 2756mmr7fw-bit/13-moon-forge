import { Router } from "express";
import { db } from "@workspace/db";
import { serverConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const HETZNER_API = "https://api.hetzner.cloud/v1";

function hetznerFetch(token: string, path: string, options: RequestInit = {}) {
  return fetch(`${HETZNER_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

// ─── GET /api/hetzner/server-types ─────────────────────────────────────────
// Returns available server types filtered to the ones we offer
router.get("/hetzner/server-types", async (req, res) => {
  const token = req.headers["x-hetzner-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "Hetzner API token required" });

  try {
    const r = await hetznerFetch(token, "/server_types?per_page=50");
    if (!r.ok) {
      const body = await r.json().catch(() => ({})) as Record<string, unknown>;
      return res.status(r.status).json({ error: (body.error as Record<string,string>)?.message ?? "Invalid Hetzner token" });
    }

    interface HetznerServerType {
      id: number;
      name: string;
      description: string;
      cores: number;
      memory: number;
      disk: number;
      prices: Array<{ location: string; price_monthly: { gross: string } }>;
    }

    const data = await r.json() as { server_types: HetznerServerType[] };
    const wanted = ["cx22", "cx32", "cx42"];
    const types = (data.server_types ?? [])
      .filter((t) => wanted.includes(t.name.toLowerCase()))
      .map((t) => {
        const price = t.prices?.[0]?.price_monthly?.gross ?? "?";
        return {
          id: t.id,
          name: t.name,
          description: t.description,
          cores: t.cores,
          memory: t.memory,
          disk: t.disk,
          priceMonthly: parseFloat(price).toFixed(2),
        };
      })
      .sort((a, b) => parseFloat(a.priceMonthly) - parseFloat(b.priceMonthly));

    return res.json({ types });
  } catch (err) {
    req.log.error({ err }, "hetzner/server-types failed");
    return res.status(500).json({ error: "Could not reach Hetzner API" });
  }
});

// ─── GET /api/hetzner/locations ────────────────────────────────────────────
router.get("/hetzner/locations", async (req, res) => {
  const token = req.headers["x-hetzner-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "Hetzner API token required" });

  try {
    const r = await hetznerFetch(token, "/locations?per_page=50");
    if (!r.ok) return res.status(r.status).json({ error: "Could not fetch locations" });

    interface HetznerLocation {
      id: number;
      name: string;
      description: string;
      country: string;
      city: string;
    }

    const data = await r.json() as { locations: HetznerLocation[] };
    const locations = (data.locations ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      country: l.country,
      city: l.city,
    }));

    return res.json({ locations });
  } catch (err) {
    req.log.error({ err }, "hetzner/locations failed");
    return res.status(500).json({ error: "Could not fetch locations" });
  }
});

// ─── POST /api/hetzner/provision ───────────────────────────────────────────
// Creates a Hetzner server + cloud-init script that installs Coolify automatically.
// Body: { hetznerToken, serverType, location, serverName }
router.post("/hetzner/provision", async (req, res) => {
  const { hetznerToken, serverType, location, serverName } = req.body as Record<string, string>;

  if (!hetznerToken?.trim()) return res.status(400).json({ error: "Hetzner API token is required" });
  if (!serverType?.trim()) return res.status(400).json({ error: "Server type is required" });
  if (!location?.trim()) return res.status(400).json({ error: "Location is required" });

  const name = (serverName?.trim() || "forge-server")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 63);

  // Cloud-init: install Docker, then Coolify, then expose Coolify API
  const userData = `#!/bin/bash
set -e
# Update system
apt-get update -y
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Coolify (non-interactive)
mkdir -p /data/coolify/ssh/keys /data/coolify/source /data/coolify/proxy
curl -fsSL https://cdn.coollabs.io/coolify/install.sh -o /tmp/coolify-install.sh
chmod +x /tmp/coolify-install.sh

# Run install with env vars to skip interactive prompts
DISABLE_TELEMETRY=1 bash /tmp/coolify-install.sh --force

# Wait for Coolify to fully start (up to 3 minutes)
for i in $(seq 1 36); do
  if curl -sf http://localhost:8000/api/v1/healthcheck > /dev/null 2>&1; then
    echo "Coolify is up"
    break
  fi
  echo "Waiting for Coolify... attempt $i"
  sleep 5
done

# Open firewall ports
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
echo "y" | ufw enable || true

echo "Forge provisioning complete"
`;

  try {
    // Create the server
    const createRes = await hetznerFetch(hetznerToken.trim(), "/servers", {
      method: "POST",
      body: JSON.stringify({
        name,
        server_type: serverType.trim(),
        location: location.trim(),
        image: "ubuntu-22.04",
        user_data: userData,
        start_after_create: true,
      }),
    });

    const createBody = await createRes.json() as Record<string, unknown>;
    if (!createRes.ok) {
      const errMsg = ((createBody.error as Record<string, unknown>)?.message as string) ?? `Hetzner returned ${createRes.status}`;
      return res.status(createRes.status).json({ error: errMsg });
    }

    interface HetznerServer {
      id: number;
      name: string;
      public_net: { ipv4: { ip: string } };
      status: string;
    }

    const server = createBody.server as HetznerServer;
    const ipv4 = server.public_net?.ipv4?.ip;

    // Save a pending record so the user can track provisioning
    // We store the IP — Coolify URL will be set once it's ready
    const existing = await db
      .select()
      .from(serverConnectionsTable)
      .where(eq(serverConnectionsTable.userId, req.userId));

    const coolifyUrl = `http://${ipv4}:8000`;

    if (existing.length > 0) {
      await db
        .update(serverConnectionsTable)
        .set({
          name: serverName?.trim() || "Forge Server",
          coolifyUrl,
          coolifyApiKey: "pending",
          updatedAt: new Date(),
        })
        .where(eq(serverConnectionsTable.userId, req.userId));
    } else {
      await db.insert(serverConnectionsTable).values({
        userId: req.userId,
        name: serverName?.trim() || "Forge Server",
        coolifyUrl,
        coolifyApiKey: "pending",
      });
    }

    return res.json({
      ok: true,
      serverId: server.id,
      serverName: server.name,
      ip: ipv4,
      coolifyUrl,
      status: server.status,
      message: "Server is being created. Coolify will be ready in about 3-5 minutes.",
    });
  } catch (err) {
    req.log.error({ err }, "hetzner/provision failed");
    return res.status(500).json({ error: "Failed to create Hetzner server" });
  }
});

// ─── GET /api/hetzner/server-status/:serverId ──────────────────────────────
// Poll Hetzner for server status + try to ping Coolify
router.get("/hetzner/server-status/:serverId", async (req, res) => {
  const token = req.headers["x-hetzner-token"] as string;
  if (!token?.trim()) return res.status(400).json({ error: "Hetzner API token required" });

  try {
    const r = await hetznerFetch(token, `/servers/${req.params.serverId}`);
    if (!r.ok) return res.status(r.status).json({ error: "Server not found" });

    interface HetznerServerDetail {
      server: {
        id: number;
        name: string;
        status: string;
        public_net: { ipv4: { ip: string } };
      };
    }

    const data = await r.json() as HetznerServerDetail;
    const server = data.server;
    const ip = server.public_net?.ipv4?.ip;

    // Try to ping Coolify
    let coolifyReady = false;
    if (ip && server.status === "running") {
      try {
        const healthCheck = await fetch(`http://${ip}:8000/api/v1/healthcheck`, {
          signal: AbortSignal.timeout(3000),
        });
        coolifyReady = healthCheck.ok;
      } catch {
        coolifyReady = false;
      }
    }

    return res.json({
      serverId: server.id,
      serverName: server.name,
      status: server.status,
      ip,
      coolifyReady,
      coolifyUrl: `http://${ip}:8000`,
    });
  } catch (err) {
    req.log.error({ err }, "hetzner/server-status failed");
    return res.status(500).json({ error: "Could not check server status" });
  }
});

export default router;
