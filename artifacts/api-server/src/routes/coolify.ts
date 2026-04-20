import { Router } from "express";
import { db } from "@workspace/db";
import { serverConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, "");
}

async function coolifyFetch(coolifyUrl: string, apiKey: string, path: string) {
  const base = normalizeUrl(coolifyUrl);
  return fetch(`${base}/api/v1${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(6000),
  });
}

async function getConn(userId: string) {
  const [conn] = await db
    .select()
    .from(serverConnectionsTable)
    .where(eq(serverConnectionsTable.userId, userId));
  return conn ?? null;
}

// ─── GET /api/coolify/apps ────────────────────────────────────────────────────
// List all apps deployed on user's Coolify instance with live status.
router.get("/coolify/apps", async (req, res) => {
  const conn = await getConn(req.userId);
  if (!conn) return res.json({ connected: false, apps: [] });

  try {
    const [appsRes, servicesRes] = await Promise.allSettled([
      coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, "/applications"),
      coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, "/services"),
    ]);

    const apps: unknown[] = [];
    const services: unknown[] = [];

    if (appsRes.status === "fulfilled" && appsRes.value.ok) {
      const data = await appsRes.value.json() as unknown;
      if (Array.isArray(data)) apps.push(...data);
    }
    if (servicesRes.status === "fulfilled" && servicesRes.value.ok) {
      const data = await servicesRes.value.json() as unknown;
      if (Array.isArray(data)) services.push(...data);
    }

    interface RawApp {
      id?: string | number;
      uuid?: string;
      name?: string;
      status?: string;
      fqdn?: string;
      updated_at?: string;
      created_at?: string;
    }

    const normalize = (item: unknown, kind: "app" | "service") => {
      const r = item as RawApp;
      const raw = (r.status ?? "unknown").toLowerCase();
      const status =
        raw.includes("running") ? "running" :
        raw.includes("stopped") || raw.includes("exited") ? "stopped" :
        raw.includes("restart") ? "restarting" :
        raw.includes("start") ? "starting" :
        raw.includes("error") || raw.includes("fail") ? "error" :
        "unknown";

      return {
        id: r.uuid ?? r.id ?? "",
        name: r.name ?? "Unnamed",
        kind,
        status,
        url: r.fqdn ?? null,
        updatedAt: r.updated_at ?? r.created_at ?? null,
      };
    };

    return res.json({
      connected: true,
      apps: [
        ...apps.map(a => normalize(a, "app")),
        ...services.map(s => normalize(s, "service")),
      ],
    });
  } catch (err) {
    req.log.error({ err }, "coolify/apps GET failed");
    return res.json({ connected: true, apps: [], error: "Could not reach Coolify" });
  }
});

// ─── GET /api/coolify/deployments ─────────────────────────────────────────────
// Recent deployment history from user's Coolify instance.
router.get("/coolify/deployments", async (req, res) => {
  const conn = await getConn(req.userId);
  if (!conn) return res.json({ connected: false, deployments: [] });

  try {
    const r = await coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, "/deployments");

    if (!r.ok) {
      return res.json({ connected: true, deployments: [], error: `Coolify returned ${r.status}` });
    }

    const data = await r.json() as unknown;
    const raw = Array.isArray(data) ? data : [];

    interface RawDeploy {
      id?: string | number;
      application_id?: string;
      application_name?: string;
      service_name?: string;
      status?: string;
      commit?: string;
      commit_message?: string;
      created_at?: string;
      finished_at?: string;
    }

    const deployments = raw.slice(0, 30).map((d: unknown) => {
      const item = d as RawDeploy;
      const rawStatus = (item.status ?? "").toLowerCase();
      const status =
        rawStatus === "finished" || rawStatus === "success" ? "success" :
        rawStatus === "failed" || rawStatus === "error" ? "failed" :
        rawStatus === "in_progress" || rawStatus === "running" ? "running" :
        rawStatus === "queued" ? "queued" :
        rawStatus === "cancelled" ? "cancelled" :
        "unknown";

      return {
        id: item.id ?? "",
        appName: item.application_name ?? item.service_name ?? "Unknown app",
        status,
        commit: item.commit ? item.commit.slice(0, 7) : null,
        commitMessage: item.commit_message ?? null,
        startedAt: item.created_at ?? null,
        finishedAt: item.finished_at ?? null,
      };
    });

    return res.json({ connected: true, deployments });
  } catch (err) {
    req.log.error({ err }, "coolify/deployments GET failed");
    return res.json({ connected: true, deployments: [], error: "Could not reach Coolify" });
  }
});

export default router;
