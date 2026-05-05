import { Router } from "express";
import { db } from "@workspace/db";
import { cliTokensTable, userAppsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

const router = Router();
const FORGE_DOMAIN = process.env.FORGE_DOMAIN ?? "13moonforge.ai";

// ─── Middleware: accept Bearer token for CLI routes ───────────────────────────
async function resolveCliUserId(token: string): Promise<string | null> {
  const [record] = await db
    .select()
    .from(cliTokensTable)
    .where(eq(cliTokensTable.token, token));
  if (!record) return null;
  await db.update(cliTokensTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(cliTokensTable.id, record.id));
  return record.userId;
}

async function cliAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization as string | undefined;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const userId = await resolveCliUserId(token);
    if (userId) { req.userId = userId; return next(); }
  }
  if (req.session?.userId) return next();
  return res.status(401).json({ error: "Unauthorized. Run: forge login" });
}

// ─── GET /api/cli/install ─────────────────────────────────────────────────────
// Serve the install script: curl -fsSL https://13moonforge.ai/api/cli/install | bash
router.get("/cli/install", (_req, res) => {
  const script = `#!/usr/bin/env bash
# Forge CLI installer
set -e

FORGE_URL="https://${FORGE_DOMAIN}"
INSTALL_DIR="\${HOME}/.forge"
BIN_DIR="/usr/local/bin"
TOKEN_FILE="\${INSTALL_DIR}/token"

mkdir -p "\$INSTALL_DIR"

forge_cmd() {
cat > "\${INSTALL_DIR}/forge" << 'FORGE_SCRIPT'
#!/usr/bin/env bash
FORGE_URL="https://${FORGE_DOMAIN}"
TOKEN_FILE="\${HOME}/.forge/token"

req() {
  local method=\$1; shift
  local path=\$1; shift
  local token=""
  [ -f "\$TOKEN_FILE" ] && token=\$(cat "\$TOKEN_FILE")
  curl -s -X "\$method" \\
    -H "Authorization: Bearer \$token" \\
    -H "Content-Type: application/json" \\
    "\${FORGE_URL}\${path}" "\$@"
}

case "\$1" in
  login)
    echo "Opening browser to get your CLI token..."
    echo "Visit: \${FORGE_URL}/hosting"
    echo "Click 'Generate CLI Token', then paste it here:"
    read -r -p "Token: " token
    echo "\$token" > "\$TOKEN_FILE"
    chmod 600 "\$TOKEN_FILE"
    echo "Logged in."
    ;;
  apps)
    req GET /api/cli/apps | \\
      node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const a=JSON.parse(d).apps||[];a.forEach(x=>console.log(x.status.padEnd(10)+x.name.padEnd(24)+x.subdomain+'.${FORGE_DOMAIN}'));})"
    ;;
  logs)
    if [ -z "\$2" ]; then echo "Usage: forge logs <app-name>"; exit 1; fi
    req GET "/api/cli/apps/\$2/logs" | \\
      node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{(JSON.parse(d).logs||[]).forEach(l=>console.log(l));})"
    ;;
  deploy)
    if [ -z "\$2" ]; then echo "Usage: forge deploy <github-user/repo> [name]"; exit 1; fi
    local repo=\$2
    local name=\${3:-\$(basename \$2)}
    echo "Deploying \$repo as \$name..."
    req POST /api/cli/deploy -d "{\\"repo\\":\\"\$repo\\",\\"name\\":\\"\$name\\"}" | \\
      node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const r=JSON.parse(d);console.log(r.ok?'Deployed: '+r.app?.url:r.error||'Failed');})"
    ;;
  env)
    if [ -z "\$2" ]; then echo "Usage: forge env <app-name> [set KEY VALUE | list]"; exit 1; fi
    local app=\$2
    case "\$3" in
      set)
        req POST "/api/cli/apps/\$app/env" -d "{\\"key\\":\\"\$4\\",\\"value\\":\\"\$5\\"}" | \\
          node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const r=JSON.parse(d);console.log(r.ok?'Set.':r.error||'Failed');})"
        ;;
      *)
        req GET "/api/cli/apps/\$app/env" | \\
          node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{(JSON.parse(d).vars||[]).forEach(v=>console.log(v.key+'=***'));})"
        ;;
    esac
    ;;
  redeploy)
    if [ -z "\$2" ]; then echo "Usage: forge redeploy <app-name>"; exit 1; fi
    req POST "/api/cli/apps/\$2/redeploy" | \\
      node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const r=JSON.parse(d);console.log(r.ok?'Redeploying...':r.error||'Failed');})"
    ;;
  db)
    case "\$2" in
      list)
        req GET /api/cli/databases | \\
          node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{(JSON.parse(d).databases||[]).forEach(x=>console.log(x.status.padEnd(12)+x.name));})"
        ;;
      create)
        local name=\${3:-mydb}
        echo "Provisioning Postgres '\$name'..."
        req POST /api/cli/databases -d "{\\"name\\":\\"\$name\\"}" | \\
          node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const r=JSON.parse(d);console.log(r.ok?'Created. Connection string:\\n'+r.database?.connectionString:r.error||'Failed');})"
        ;;
      *)
        echo "Usage: forge db [list|create <name>]"
        ;;
    esac
    ;;
  version)
    echo "Forge CLI v0.1.0"
    ;;
  *)
    echo "Forge CLI — Deploy apps from The Forge"
    echo ""
    echo "Usage: forge <command>"
    echo ""
    echo "Commands:"
    echo "  login                     Authenticate with your Forge account"
    echo "  apps                      List your deployed apps"
    echo "  logs <app>                View app logs"
    echo "  deploy <user/repo> [name] Deploy from GitHub"
    echo "  redeploy <app>            Redeploy an app"
    echo "  env <app> [set KEY VALUE] Manage environment variables"
    echo "  db [list|create <name>]   Manage databases"
    echo "  version                   Show CLI version"
    ;;
esac
FORGE_SCRIPT
chmod +x "\${INSTALL_DIR}/forge"
}

forge_cmd

if [ -w "\$BIN_DIR" ]; then
  ln -sf "\${INSTALL_DIR}/forge" "\${BIN_DIR}/forge"
  echo "forge installed to \${BIN_DIR}/forge"
else
  sudo ln -sf "\${INSTALL_DIR}/forge" "\${BIN_DIR}/forge" 2>/dev/null || {
    echo "forge installed to \${INSTALL_DIR}/forge"
    echo "Add to PATH: export PATH=\\"\\${HOME}/.forge:\\$PATH\\""
  }
fi

echo ""
echo "Run 'forge login' to get started."
`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", "inline; filename=install.sh");
  return res.send(script);
});

// ─── POST /api/cli/token ──────────────────────────────────────────────────────
router.post("/cli/token", async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Not logged in" });

  const token = randomBytes(32).toString("hex");
  const name = (req.body as { name?: string }).name ?? "CLI";

  const [record] = await db.insert(cliTokensTable).values({
    userId: req.session.userId,
    token,
    name,
  }).returning();

  return res.json({ ok: true, token: record.token });
});

// ─── DELETE /api/cli/token/:id ────────────────────────────────────────────────
router.delete("/cli/token/:id", async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Not logged in" });
  await db.delete(cliTokensTable).where(
    and(eq(cliTokensTable.id, parseInt(req.params.id)), eq(cliTokensTable.userId, req.session.userId))
  );
  return res.json({ ok: true });
});

// ─── GET /api/cli/tokens ──────────────────────────────────────────────────────
router.get("/cli/tokens", async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Not logged in" });
  const tokens = await db.select({
    id: cliTokensTable.id,
    name: cliTokensTable.name,
    lastUsedAt: cliTokensTable.lastUsedAt,
    createdAt: cliTokensTable.createdAt,
  }).from(cliTokensTable).where(eq(cliTokensTable.userId, req.session.userId));
  return res.json({ tokens });
});

// ─── CLI app routes (accept Bearer token) ─────────────────────────────────────

router.get("/cli/apps", cliAuth, async (req, res) => {
  const apps = await db
    .select()
    .from(userAppsTable)
    .where(eq(userAppsTable.userId, req.userId));
  return res.json({ apps });
});

router.get("/cli/apps/:name/logs", cliAuth, async (req, res) => {
  const [app] = await db
    .select()
    .from(userAppsTable)
    .where(and(eq(userAppsTable.subdomain, req.params.name), eq(userAppsTable.userId, req.userId)));
  if (!app) return res.status(404).json({ error: "App not found" });
  if (!app.coolifyResourceId) return res.json({ logs: [] });

  const COOLIFY_URL = process.env.FORGE_COOLIFY_URL ?? "";
  const COOLIFY_KEY = process.env.FORGE_COOLIFY_API_KEY ?? "";
  if (!COOLIFY_URL || !COOLIFY_KEY) return res.json({ logs: [] });

  try {
    const r = await fetch(`${COOLIFY_URL.replace(/\/+$/, "")}/api/v1/applications/${app.coolifyResourceId}/logs?lines=100`, {
      headers: { Authorization: `Bearer ${COOLIFY_KEY}`, Accept: "application/json" },
    });
    if (!r.ok) return res.json({ logs: [] });
    const data = await r.json() as { logs?: string };
    const lines = String(data.logs ?? "").split("\n").filter(Boolean);
    return res.json({ logs: lines });
  } catch {
    return res.json({ logs: [] });
  }
});

router.post("/cli/apps/:name/redeploy", cliAuth, async (req, res) => {
  const [app] = await db
    .select()
    .from(userAppsTable)
    .where(and(eq(userAppsTable.subdomain, req.params.name), eq(userAppsTable.userId, req.userId)));
  if (!app) return res.status(404).json({ error: "App not found" });

  const COOLIFY_URL = process.env.FORGE_COOLIFY_URL ?? "";
  const COOLIFY_KEY = process.env.FORGE_COOLIFY_API_KEY ?? "";
  if (app.coolifyResourceId && COOLIFY_URL && COOLIFY_KEY) {
    await fetch(`${COOLIFY_URL.replace(/\/+$/, "")}/api/v1/applications/${app.coolifyResourceId}/restart`, {
      method: "GET",
      headers: { Authorization: `Bearer ${COOLIFY_KEY}` },
    });
  }
  await db.update(userAppsTable).set({ status: "deploying", updatedAt: new Date() }).where(eq(userAppsTable.id, app.id));
  return res.json({ ok: true });
});

router.get("/cli/apps/:name/env", cliAuth, async (req, res) => {
  const [app] = await db
    .select()
    .from(userAppsTable)
    .where(and(eq(userAppsTable.subdomain, req.params.name), eq(userAppsTable.userId, req.userId)));
  if (!app) return res.status(404).json({ error: "App not found" });
  if (!app.coolifyResourceId) return res.json({ vars: [] });

  const COOLIFY_URL = process.env.FORGE_COOLIFY_URL ?? "";
  const COOLIFY_KEY = process.env.FORGE_COOLIFY_API_KEY ?? "";
  try {
    const r = await fetch(`${COOLIFY_URL.replace(/\/+$/, "")}/api/v1/applications/${app.coolifyResourceId}/envs`, {
      headers: { Authorization: `Bearer ${COOLIFY_KEY}`, Accept: "application/json" },
    });
    if (!r.ok) return res.json({ vars: [] });
    const data = await r.json();
    return res.json({ vars: Array.isArray(data) ? data : [] });
  } catch {
    return res.json({ vars: [] });
  }
});

router.post("/cli/apps/:name/env", cliAuth, async (req, res) => {
  const [app] = await db
    .select()
    .from(userAppsTable)
    .where(and(eq(userAppsTable.subdomain, req.params.name), eq(userAppsTable.userId, req.userId)));
  if (!app) return res.status(404).json({ error: "App not found" });
  if (!app.coolifyResourceId) return res.status(400).json({ error: "App not deployed" });

  const { key, value } = req.body as { key: string; value: string };
  const COOLIFY_URL = process.env.FORGE_COOLIFY_URL ?? "";
  const COOLIFY_KEY = process.env.FORGE_COOLIFY_API_KEY ?? "";
  const r = await fetch(`${COOLIFY_URL.replace(/\/+$/, "")}/api/v1/applications/${app.coolifyResourceId}/envs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${COOLIFY_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!r.ok) return res.status(500).json({ error: "Failed" });
  return res.json({ ok: true });
});

router.post("/cli/deploy", cliAuth, async (req, res) => {
  const { repo, name, branch = "main" } = req.body as { repo: string; name?: string; branch?: string };
  if (!repo) return res.status(400).json({ error: "repo is required" });

  const deployRes = await fetch(`${process.env.APP_URL ?? ""}/api/launch/deploy`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `connect.sid=cli` },
    body: JSON.stringify({ repo, name: name ?? repo.split("/").pop(), branch }),
  });

  return res.status(deployRes.status).json(await deployRes.json());
});

router.get("/cli/databases", cliAuth, async (req, res) => {
  const { userDatabasesTable: dbt } = await import("@workspace/db");
  const dbs = await db.select().from(dbt).where(eq(dbt.userId, req.userId));
  return res.json({ databases: dbs });
});

router.post("/cli/databases", cliAuth, async (req, res) => {
  const deployRes = await fetch(`${process.env.APP_URL ?? "http://localhost:8080"}/api/launch/databases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  });
  return res.status(deployRes.status).json(await deployRes.json());
});

export default router;
