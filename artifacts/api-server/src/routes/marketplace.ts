import { Router } from "express";
import { db } from "@workspace/db";
import { marketplaceInstallsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

const router = Router();

const COOLIFY_URL    = () => (process.env.FORGE_COOLIFY_URL ?? "").replace(/\/+$/, "");
const COOLIFY_KEY    = () => process.env.FORGE_COOLIFY_API_KEY ?? "";
const PROJECT_UUID   = () => process.env.FORGE_COOLIFY_PROJECT_UUID ?? "";
const SERVER_UUID    = () => process.env.FORGE_COOLIFY_SERVER_UUID ?? "";
const FORGE_DOMAIN   = process.env.FORGE_DOMAIN ?? "13moonforge.ai";

// ─── App catalogue ────────────────────────────────────────────────────────────

export interface MarketplaceApp {
  slug:        string;
  name:        string;
  tagline:     string;
  description: string;
  category:    string;
  icon:        string;
  coolifyType: string;  // Coolify service type slug
  dockerImage?: string;
  defaultPort: number;
  envVars:     Array<{ key: string; description: string; generate?: "password" | "secret" }>;
  links:       { docs?: string; github?: string };
}

export const MARKETPLACE_APPS: MarketplaceApp[] = [
  {
    slug: "ghost", name: "Ghost", tagline: "Professional publishing platform",
    description: "The world's most popular open source headless Node.js CMS. Perfect for blogs, newsletters, and memberships.",
    category: "CMS", icon: "👻", coolifyType: "ghost", defaultPort: 2368,
    envVars: [
      { key: "url", description: "Your site URL (auto-filled)" },
      { key: "GHOST_CONTENT_API_KEY", description: "Content API key", generate: "secret" },
    ],
    links: { docs: "https://ghost.org/docs", github: "https://github.com/TryGhost/Ghost" },
  },
  {
    slug: "wordpress", name: "WordPress", tagline: "The world's most popular CMS",
    description: "Power over 40% of the web. Full CMS with themes, plugins, and WooCommerce for e-commerce.",
    category: "CMS", icon: "🔵", coolifyType: "wordpress", defaultPort: 80,
    envVars: [
      { key: "WORDPRESS_DB_PASSWORD", description: "Database password", generate: "password" },
      { key: "WORDPRESS_TABLE_PREFIX", description: "DB table prefix (e.g. wp_)" },
    ],
    links: { docs: "https://wordpress.org/documentation", github: "https://github.com/WordPress/WordPress" },
  },
  {
    slug: "n8n", name: "n8n", tagline: "Workflow automation for developers",
    description: "Self-hosted automation tool. Connect 400+ apps and automate workflows without writing code.",
    category: "Automation", icon: "⚡", coolifyType: "n8n", defaultPort: 5678,
    envVars: [
      { key: "N8N_ENCRYPTION_KEY", description: "Encryption key for credentials", generate: "secret" },
      { key: "N8N_BASIC_AUTH_PASSWORD", description: "Admin password", generate: "password" },
    ],
    links: { docs: "https://docs.n8n.io", github: "https://github.com/n8n-io/n8n" },
  },
  {
    slug: "plausible", name: "Plausible", tagline: "Privacy-first analytics",
    description: "GDPR-compliant, cookie-free analytics. Lightweight script, clear dashboards, no tracking your users.",
    category: "Analytics", icon: "📊", coolifyType: "plausible", defaultPort: 8000,
    envVars: [
      { key: "SECRET_KEY_BASE", description: "Secret key", generate: "secret" },
      { key: "TOTP_VAULT_KEY", description: "TOTP vault key", generate: "secret" },
    ],
    links: { docs: "https://plausible.io/docs", github: "https://github.com/plausible/analytics" },
  },
  {
    slug: "directus", name: "Directus", tagline: "Headless CMS & data platform",
    description: "Wrap any SQL database with a dynamic REST+GraphQL API. The most flexible headless CMS for developers.",
    category: "CMS", icon: "🔷", coolifyType: "directus", defaultPort: 8055,
    envVars: [
      { key: "KEY", description: "Project identifier key", generate: "secret" },
      { key: "SECRET", description: "Security secret", generate: "secret" },
      { key: "ADMIN_PASSWORD", description: "Admin password", generate: "password" },
    ],
    links: { docs: "https://docs.directus.io", github: "https://github.com/directus/directus" },
  },
  {
    slug: "umami", name: "Umami", tagline: "Simple, fast, privacy-focused analytics",
    description: "Open-source alternative to Google Analytics. Simple, clean, self-hosted.",
    category: "Analytics", icon: "🌊", coolifyType: "umami", defaultPort: 3000,
    envVars: [
      { key: "APP_SECRET", description: "App secret", generate: "secret" },
    ],
    links: { docs: "https://umami.is/docs", github: "https://github.com/umami-software/umami" },
  },
  {
    slug: "meilisearch", name: "Meilisearch", tagline: "Lightning fast search engine",
    description: "Self-hosted search with typo-tolerance. Drop-in Algolia replacement for any app.",
    category: "Search", icon: "🔍", coolifyType: "meilisearch", defaultPort: 7700,
    envVars: [
      { key: "MEILI_MASTER_KEY", description: "Master key", generate: "secret" },
    ],
    links: { docs: "https://www.meilisearch.com/docs", github: "https://github.com/meilisearch/meilisearch" },
  },
  {
    slug: "appwrite", name: "Appwrite", tagline: "Open-source Firebase alternative",
    description: "Backend server for web, mobile & Flutter devs. Auth, database, storage, functions in one.",
    category: "Backend", icon: "✏️", coolifyType: "appwrite", defaultPort: 80,
    envVars: [
      { key: "APPWRITE_SECRET_KEY", description: "Secret key", generate: "secret" },
    ],
    links: { docs: "https://appwrite.io/docs", github: "https://github.com/appwrite/appwrite" },
  },
  {
    slug: "nocodb", name: "NocoDB", tagline: "Open-source Airtable alternative",
    description: "Turn any database into a smart spreadsheet. Great for non-technical teams.",
    category: "Database", icon: "🗃️", coolifyType: "nocodb", defaultPort: 8080,
    envVars: [
      { key: "NC_AUTH_JWT_SECRET", description: "JWT secret", generate: "secret" },
    ],
    links: { docs: "https://docs.nocodb.com", github: "https://github.com/nocodb/nocodb" },
  },
  {
    slug: "pocketbase", name: "PocketBase", tagline: "Backend in a single file",
    description: "Open Source backend with realtime database, auth, file storage and admin dashboard in a single binary.",
    category: "Backend", icon: "📦", coolifyType: "pocketbase", defaultPort: 8090,
    envVars: [],
    links: { docs: "https://pocketbase.io/docs", github: "https://github.com/pocketbase/pocketbase" },
  },
  {
    slug: "gitea", name: "Gitea", tagline: "Self-hosted Git service",
    description: "Your own GitHub. Lightweight, runs everywhere. Code hosting, CI/CD, and package registry.",
    category: "DevTools", icon: "🐙", coolifyType: "gitea", defaultPort: 3000,
    envVars: [
      { key: "GITEA__security__SECRET_KEY", description: "Security key", generate: "secret" },
    ],
    links: { docs: "https://docs.gitea.com", github: "https://github.com/go-gitea/gitea" },
  },
  {
    slug: "vaultwarden", name: "Vaultwarden", tagline: "Self-hosted password manager",
    description: "Unofficial Bitwarden-compatible server. Full password manager under your control.",
    category: "Security", icon: "🔐", coolifyType: "vaultwarden", defaultPort: 80,
    envVars: [
      { key: "ADMIN_TOKEN", description: "Admin panel token", generate: "secret" },
    ],
    links: { docs: "https://github.com/dani-garcia/vaultwarden/wiki", github: "https://github.com/dani-garcia/vaultwarden" },
  },
];

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

// ─── GET /api/marketplace/apps ────────────────────────────────────────────────
router.get("/marketplace/apps", (_req, res) => {
  return res.json({ apps: MARKETPLACE_APPS.map(a => ({
    ...a, envVars: a.envVars.map(e => ({ key: e.key, description: e.description }))
  })) });
});

// ─── GET /api/marketplace/installs ────────────────────────────────────────────
router.get("/marketplace/installs", async (req, res) => {
  const installs = await db
    .select()
    .from(marketplaceInstallsTable)
    .where(eq(marketplaceInstallsTable.userId, req.userId));
  return res.json({ installs });
});

// ─── POST /api/marketplace/install ───────────────────────────────────────────
router.post("/marketplace/install", async (req, res) => {
  const { slug, name, adminEmail } = req.body as {
    slug: string; name?: string; adminEmail?: string;
  };

  const app = MARKETPLACE_APPS.find(a => a.slug === slug);
  if (!app) return res.status(404).json({ error: "App not found in marketplace" });

  const subdomain = `${slug}-${req.userId.slice(0, 5)}-${randomBytes(3).toString("hex")}`;
  const adminPassword = randomBytes(12).toString("hex");
  const resourceName = name ?? `${slug}-${randomBytes(4).toString("hex")}`;

  // Build env vars: auto-generate secrets
  const envs = app.envVars.map(v => ({
    key: v.key,
    value: v.generate === "password" ? adminPassword
         : v.generate === "secret"   ? randomBytes(32).toString("hex")
         : "",
  })).filter(v => v.value);

  let coolifyId: string | null = null;
  let url: string | null = `https://${subdomain}.${FORGE_DOMAIN}`;

  if (COOLIFY_URL() && COOLIFY_KEY() && PROJECT_UUID() && SERVER_UUID()) {
    try {
      const r = await coolify("/services", {
        method: "POST",
        body: JSON.stringify({
          type: app.coolifyType,
          name: resourceName,
          server_uuid: SERVER_UUID(),
          project_uuid: PROJECT_UUID(),
          environment_name: "production",
          instant_deploy: true,
          fqdn: `https://${subdomain}.${FORGE_DOMAIN}`,
          ...(envs.length > 0 ? { envs } : {}),
        }),
      });

      if (r.ok) {
        const data = await r.json() as { uuid?: string; fqdn?: string };
        coolifyId = data.uuid ?? null;
        if (data.fqdn) url = data.fqdn.startsWith("http") ? data.fqdn : `https://${data.fqdn}`;
      }
    } catch { /* log and continue */ }
  }

  const [install] = await db.insert(marketplaceInstallsTable).values({
    userId: req.userId,
    appSlug: slug,
    appName: app.name,
    coolifyResourceId: coolifyId,
    subdomain,
    url,
    status: coolifyId ? "installing" : "ready",
    adminEmail: adminEmail ?? null,
    adminPassword,
  }).returning();

  return res.json({
    ok: true,
    install,
    credentials: { adminEmail, adminPassword, url },
  });
});

// ─── DELETE /api/marketplace/installs/:id ────────────────────────────────────
router.delete("/marketplace/installs/:id", async (req, res) => {
  const [install] = await db
    .select()
    .from(marketplaceInstallsTable)
    .where(and(
      eq(marketplaceInstallsTable.id, parseInt(req.params.id)),
      eq(marketplaceInstallsTable.userId, req.userId)
    ));
  if (!install) return res.status(404).json({ error: "Not found" });

  if (install.coolifyResourceId && COOLIFY_KEY()) {
    await coolify(`/services/${install.coolifyResourceId}`, { method: "DELETE" }).catch(() => {});
  }

  await db.delete(marketplaceInstallsTable)
    .where(eq(marketplaceInstallsTable.id, parseInt(req.params.id)));

  return res.json({ ok: true });
});

// ─── GET /api/marketplace/installs/:id/status ────────────────────────────────
router.get("/marketplace/installs/:id/status", async (req, res) => {
  const [install] = await db
    .select()
    .from(marketplaceInstallsTable)
    .where(and(
      eq(marketplaceInstallsTable.id, parseInt(req.params.id)),
      eq(marketplaceInstallsTable.userId, req.userId)
    ));
  if (!install) return res.status(404).json({ error: "Not found" });
  if (!install.coolifyResourceId) return res.json({ status: install.status });

  try {
    const r = await coolify(`/services/${install.coolifyResourceId}`);
    if (!r.ok) return res.json({ status: install.status });
    const data = await r.json() as { status?: string };
    const raw = (data.status ?? "").toLowerCase();
    const status = raw.includes("running") ? "ready"
      : raw.includes("start") ? "installing"
      : raw.includes("stop") ? "stopped"
      : raw.includes("error") ? "error"
      : install.status;
    await db.update(marketplaceInstallsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(marketplaceInstallsTable.id, install.id));
    return res.json({ status });
  } catch {
    return res.json({ status: install.status });
  }
});

export default router;
