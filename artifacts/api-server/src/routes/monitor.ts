import { Router } from "express";
import { db, appSecretsTable } from "@workspace/db";
import { serverConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getTrafficStats } from "../lib/trafficTracker";

const router = Router();

// ─── Infrastructure provider catalogue ────────────────────────────────────────
// Maps service name keywords → category + canonical label.

export const INFRA_PROVIDERS: Record<string, { category: InfraCategory; label: string }> = {
  // VPS / Compute
  hetzner:      { category: "vps",       label: "Hetzner"        },
  digitalocean: { category: "vps",       label: "DigitalOcean"   },
  "digital ocean":{ category: "vps",     label: "DigitalOcean"   },
  vultr:        { category: "vps",       label: "Vultr"          },
  linode:       { category: "vps",       label: "Linode/Akamai"  },
  akamai:       { category: "vps",       label: "Linode/Akamai"  },
  ovh:          { category: "vps",       label: "OVH"            },
  contabo:      { category: "vps",       label: "Contabo"        },
  scaleway:     { category: "vps",       label: "Scaleway"       },
  exoscale:     { category: "vps",       label: "Exoscale"       },
  upcloud:      { category: "vps",       label: "UpCloud"        },
  civo:         { category: "vps",       label: "Civo"           },
  netcup:       { category: "vps",       label: "Netcup"         },
  // VPN
  protonvpn:    { category: "vpn",       label: "ProtonVPN"      },
  mullvad:      { category: "vpn",       label: "Mullvad"        },
  nordvpn:      { category: "vpn",       label: "NordVPN"        },
  wireguard:    { category: "vpn",       label: "WireGuard"      },
  openvpn:      { category: "vpn",       label: "OpenVPN"        },
  tailscale:    { category: "vpn",       label: "Tailscale"      },
  zerotier:     { category: "vpn",       label: "ZeroTier"       },
  surfshark:    { category: "vpn",       label: "Surfshark"      },
  expressvpn:   { category: "vpn",       label: "ExpressVPN"     },
  "private internet access": { category: "vpn", label: "PIA VPN" },
  pia:          { category: "vpn",       label: "PIA VPN"        },
  // CDN
  cloudflare:   { category: "cdn",       label: "Cloudflare"     },
  bunnycdn:     { category: "cdn",       label: "BunnyCDN"       },
  "bunny.net":  { category: "cdn",       label: "BunnyCDN"       },
  fastly:       { category: "cdn",       label: "Fastly"         },
  cloudfront:   { category: "cdn",       label: "CloudFront"     },
  keycdn:       { category: "cdn",       label: "KeyCDN"         },
  // DNS
  "dns provider": { category: "dns",     label: "DNS Provider"   },
  "route 53":   { category: "dns",       label: "Route 53"       },
  namecheap:    { category: "dns",       label: "Namecheap"      },
  porkbun:      { category: "dns",       label: "Porkbun"        },
  gandi:        { category: "dns",       label: "Gandi"          },
  njalla:       { category: "dns",       label: "Njalla"         },
  desec:        { category: "dns",       label: "deSEC"          },
  // Object storage
  "object storage": { category: "storage", label: "Object Storage" },
  wasabi:       { category: "storage",   label: "Wasabi"         },
  backblaze:    { category: "storage",   label: "Backblaze B2"   },
  "r2":         { category: "storage",   label: "Cloudflare R2"  },
  minio:        { category: "storage",   label: "MinIO"          },
  // Database
  supabase:     { category: "database",  label: "Supabase"       },
  planetscale:  { category: "database",  label: "PlanetScale"    },
  neon:         { category: "database",  label: "Neon"           },
  turso:        { category: "database",  label: "Turso"          },
  "mongodb atlas": { category: "database", label: "MongoDB Atlas" },
  "redis cloud":{ category: "database",  label: "Redis Cloud"    },
  upstash:      { category: "database",  label: "Upstash"        },
  cockroachdb:  { category: "database",  label: "CockroachDB"    },
  // Email
  sendgrid:     { category: "email",     label: "SendGrid"       },
  mailgun:      { category: "email",     label: "Mailgun"        },
  postmark:     { category: "email",     label: "Postmark"       },
  resend:       { category: "email",     label: "Resend"         },
  ses:          { category: "email",     label: "AWS SES"        },
  mailchimp:    { category: "email",     label: "Mailchimp"      },
  brevo:        { category: "email",     label: "Brevo"          },
  twilio:       { category: "email",     label: "Twilio"         },
  // Monitoring
  datadog:      { category: "monitoring", label: "Datadog"       },
  grafana:      { category: "monitoring", label: "Grafana"       },
  sentry:       { category: "monitoring", label: "Sentry"        },
  betterstack:  { category: "monitoring", label: "BetterStack"   },
  "better stack":{ category: "monitoring", label: "BetterStack"  },
  axiom:        { category: "monitoring", label: "Axiom"         },
  logtail:      { category: "monitoring", label: "Logtail"       },
  cronitor:     { category: "monitoring", label: "Cronitor"      },
  // Auth
  auth0:        { category: "auth",      label: "Auth0"          },
  okta:         { category: "auth",      label: "Okta"           },
  // Payments
  stripe:       { category: "payments",  label: "Stripe"         },
  square:       { category: "payments",  label: "Square"         },
  paypal:       { category: "payments",  label: "PayPal"         },
  // Security / antivirus / firewall
  "antivirus":  { category: "security",  label: "Antivirus"      },
  "antivirus / security": { category: "security", label: "Security" },
  bitwarden:    { category: "security",  label: "Bitwarden"      },
  crowdsec:     { category: "security",  label: "CrowdSec"       },
};

export type InfraCategory =
  | "vps" | "vpn" | "cdn" | "dns" | "storage"
  | "database" | "email" | "monitoring" | "auth" | "payments" | "security";

// ─── Coolify helpers ──────────────────────────────────────────────────────────

function normUrl(url: string) { return url.replace(/\/+$/, ""); }

async function cFetch(coolifyUrl: string, apiKey: string, path: string) {
  return fetch(`${normUrl(coolifyUrl)}/api/v1${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(6000),
  });
}

async function getConn(userId: string) {
  const [c] = await db
    .select()
    .from(serverConnectionsTable)
    .where(eq(serverConnectionsTable.userId, userId));
  return c ?? null;
}

// ─── GET /api/monitor/status ──────────────────────────────────────────────────
router.get("/monitor/status", async (req, res) => {
  const traffic = getTrafficStats();
  const conn    = await getConn(req.userId);

  // ── Infrastructure detection from Secrets Vault ───────────────────────────
  const secretRows = await db
    .select({ serviceName: appSecretsTable.serviceName })
    .from(appSecretsTable)
    .where(eq(appSecretsTable.userId, req.userId));

  const detectedProviders: { label: string; category: InfraCategory; key: string }[] = [];
  const seen = new Set<string>();
  for (const { serviceName } of secretRows) {
    const lower = serviceName.toLowerCase();
    for (const [key, meta] of Object.entries(INFRA_PROVIDERS)) {
      if (lower.includes(key) && !seen.has(meta.label)) {
        seen.add(meta.label);
        detectedProviders.push({ label: meta.label, category: meta.category, key });
      }
    }
  }

  // ── Coolify data ──────────────────────────────────────────────────────────
  let apps:        AppEntry[]    = [];
  let deployments: DeployEntry[] = [];
  let coolifyError: string | null = null;

  if (conn) {
    interface RawApp {
      id?: string | number; uuid?: string; name?: string;
      status?: string; fqdn?: string;
      updated_at?: string; created_at?: string;
    }
    interface RawDeploy {
      id?: string | number;
      application_name?: string; service_name?: string;
      status?: string; commit?: string; commit_message?: string;
      created_at?: string; finished_at?: string;
    }

    const normalizeStatus = (raw = ""): AppEntry["status"] => {
      const s = raw.toLowerCase();
      if (s.includes("running"))                          return "running";
      if (s.includes("stopped") || s.includes("exited")) return "stopped";
      if (s.includes("restart"))                          return "restarting";
      if (s.includes("start"))                            return "starting";
      if (s.includes("error") || s.includes("fail"))     return "error";
      return "unknown";
    };

    try {
      const [appsRes, servicesRes, deploysRes] = await Promise.allSettled([
        cFetch(conn.coolifyUrl, conn.coolifyApiKey, "/applications"),
        cFetch(conn.coolifyUrl, conn.coolifyApiKey, "/services"),
        cFetch(conn.coolifyUrl, conn.coolifyApiKey, "/deployments"),
      ]);

      const parseArr = async (r: PromiseSettledResult<Response>): Promise<unknown[]> => {
        if (r.status !== "fulfilled" || !r.value.ok) return [];
        const d = await r.value.json() as unknown;
        return Array.isArray(d) ? d : [];
      };

      const [rawApps, rawServices, rawDeploys] = await Promise.all([
        parseArr(appsRes), parseArr(servicesRes), parseArr(deploysRes),
      ]);

      const toApp = (item: unknown, kind: "app" | "service"): AppEntry => {
        const r = item as RawApp;
        return {
          id:        String(r.uuid ?? r.id ?? ""),
          name:      r.name ?? "Unnamed",
          kind,
          status:    normalizeStatus(r.status),
          url:       r.fqdn ?? null,
          updatedAt: r.updated_at ?? r.created_at ?? null,
        };
      };

      apps = [
        ...rawApps.map(a => toApp(a, "app")),
        ...rawServices.map(s => toApp(s, "service")),
      ];

      deployments = (rawDeploys as RawDeploy[]).slice(0, 20).map(d => {
        const rs = (d.status ?? "").toLowerCase();
        const status: DeployEntry["status"] =
          rs === "finished" || rs === "success" ? "success" :
          rs === "failed"   || rs === "error"   ? "failed"  :
          rs === "in_progress" || rs === "running" ? "running" :
          rs === "queued" ? "queued" : "unknown";

        return {
          id:            String(d.id ?? ""),
          appName:       d.application_name ?? d.service_name ?? "Unknown",
          status,
          commit:        d.commit ? d.commit.slice(0, 7) : null,
          commitMessage: d.commit_message ?? null,
          startedAt:     d.created_at ?? null,
          finishedAt:    d.finished_at ?? null,
        };
      });
    } catch (err) {
      req.log.warn({ err }, "monitor: Coolify fetch failed");
      coolifyError = "Could not reach Coolify";
    }
  }

  // ── Alert generation ──────────────────────────────────────────────────────
  const alerts: Alert[] = [];

  if (!conn) {
    alerts.push({
      id: "no-coolify", severity: "warning",
      title: "Coolify not connected",
      body: "Connect Coolify in App Hub to monitor your deployed apps.",
    });
  } else if (coolifyError) {
    alerts.push({
      id: "coolify-unreachable", severity: "critical",
      title: "Coolify unreachable",
      body: coolifyError,
    });
  }

  for (const app of apps) {
    if (app.status === "error") {
      alerts.push({ id: `app-error-${app.id}`, severity: "critical",
        title: `${app.name} — container error`,
        body: "The container is in an error state. Check Coolify logs immediately." });
    } else if (app.status === "stopped") {
      alerts.push({ id: `app-stopped-${app.id}`, severity: "warning",
        title: `${app.name} — stopped`,
        body: "This app is not running. It may need to be restarted in Coolify." });
    } else if (app.status === "restarting") {
      alerts.push({ id: `app-restart-${app.id}`, severity: "warning",
        title: `${app.name} — restart loop`,
        body: "Container is caught in a restart loop. Check recent logs for crash reason." });
    }
  }

  const recentFailed = deployments.filter(d => d.status === "failed").slice(0, 3);
  for (const d of recentFailed) {
    alerts.push({
      id: `deploy-fail-${d.id}`, severity: "warning",
      title: `Deploy failed — ${d.appName}`,
      body: d.commitMessage ? `"${d.commitMessage.slice(0, 80)}"` : "Check Coolify deployment logs.",
    });
  }

  // Traffic pressure — dynamically references detected VPS providers
  const vpsLabels = detectedProviders.filter(p => p.category === "vps").map(p => p.label);
  const vpnLabels = detectedProviders.filter(p => p.category === "vpn").map(p => p.label);
  const cdnLabels = detectedProviders.filter(p => p.category === "cdn").map(p => p.label);

  const vpsHint  = vpsLabels.length ? `(${vpsLabels.join(", ")})` : "(Hetzner, DigitalOcean, Vultr, etc.)";

  if (traffic.level === "critical") {
    alerts.push({ id: "traffic-critical", severity: "critical",
      title: `Traffic critical — upgrade your VPS now ${vpsHint}`,
      body: `~${traffic.estimatedRpm} req/min. Your server is under extreme load. Upgrade your compute plan immediately or add a second node.` });
    if (vpnLabels.length) {
      alerts.push({ id: "vpn-critical", severity: "critical",
        title: `VPN tunnel under stress — ${vpnLabels.join(", ")}`,
        body: "Critical traffic load may saturate your VPN tunnel. Consider upgrading your VPN plan or routing traffic directly." });
    }
  } else if (traffic.level === "high") {
    alerts.push({ id: "traffic-high", severity: "warning",
      title: `High traffic — consider upgrading compute ${vpsHint}`,
      body: `~${traffic.estimatedRpm} req/min. Sustained high traffic. A larger VPS or an additional node would add meaningful headroom.` });
    if (vpnLabels.length) {
      alerts.push({ id: "vpn-high", severity: "warning",
        title: `Check VPN bandwidth — ${vpnLabels.join(", ")}`,
        body: "High API traffic may be stressing your VPN tunnel capacity. Review your provider's bandwidth dashboard." });
    }
    if (!cdnLabels.length) {
      alerts.push({ id: "no-cdn", severity: "info",
        title: "No CDN detected — consider adding one",
        body: "Under high traffic, a CDN (Cloudflare, BunnyCDN) can offload static assets and reduce VPS pressure." });
    }
  } else if (traffic.level === "elevated") {
    alerts.push({ id: "traffic-elevated", severity: "info",
      title: "Traffic elevated — watching",
      body: `~${traffic.estimatedRpm} req/min. Comfortable for now. No action needed yet.` });
  }

  if (traffic.rlHitsThisMinute >= 5) {
    alerts.push({ id: "rl-pressure", severity: "warning",
      title: `${traffic.rlHitsThisMinute} users throttled this minute`,
      body: "Rate limits are firing. If persistent, you may need more compute capacity or a CDN/WAF layer." });
  }

  // No monitoring tools detected
  if (apps.length > 0 && !detectedProviders.some(p => p.category === "monitoring")) {
    alerts.push({ id: "no-monitoring", severity: "info",
      title: "No monitoring service detected",
      body: "Consider adding Sentry, BetterStack, Grafana, or Datadog to catch issues before your users do." });
  }

  return res.json({
    ok: true,
    summary: {
      totalApps:    apps.length,
      runningApps:  apps.filter(a => a.status === "running").length,
      problemApps:  apps.filter(a => ["error", "stopped", "restarting"].includes(a.status)).length,
      recentFails:  recentFailed.length,
      alertCount:   alerts.length,
      hasCritical:  alerts.some(a => a.severity === "critical"),
      hasWarning:   alerts.some(a => a.severity === "warning"),
    },
    traffic,
    apps,
    deployments:        deployments.slice(0, 10),
    detectedProviders,
    alerts: alerts.sort((a, b) => {
      const rank = { critical: 0, warning: 1, info: 2 } as const;
      return rank[a.severity] - rank[b.severity];
    }),
    coolifyConnected: !!conn,
    coolifyError,
  });
});

export default router;

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppEntry {
  id: string; name: string; kind: "app" | "service";
  status: "running" | "stopped" | "restarting" | "starting" | "error" | "unknown";
  url: string | null; updatedAt: string | null;
}

interface DeployEntry {
  id: string; appName: string;
  status: "success" | "failed" | "running" | "queued" | "unknown";
  commit: string | null; commitMessage: string | null;
  startedAt: string | null; finishedAt: string | null;
}

interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string; body: string;
}
