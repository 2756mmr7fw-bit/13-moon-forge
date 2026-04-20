# 13 Moon Forge

## Product Vision
AI-powered invention and building platform for Sovereign Digital LLC (13moonforge.ai — domain not yet acquired). Integrates multiple Moons (AI characters) including Forge #3, Hawk #2, Quill #5, Creed #6, Sage #7, Flint #13. The definitive escape route for developers leaving Replit/Heroku/Railway/Render and self-hosting on their own infrastructure.

**Subscriptions**: Exclusively via thepeoplestownsq.com — no in-app payments.

---

## Features & Pages

### Builder
- **The Anvil** (`/`) — Dashboard with stats and recent projects
- **My Projects** (`/projects`) — Project management with templates
- **New Creation** (`/projects/new`) — Create new project
- **Brainstorm** (`/brainstorm`) — AI idea generation

### Creator Tools
- **Learn with Sage** (`/sage`) — Sage Moon AI tutor
- **Ask Hawk** (`/hawk`) — Hawk Moon AI assistant
- **Forge Tools** (`/tools`) — General Forge AI tools
- **Code Forge** (`/code-forge`) — Code generation and review
- **Game Doc Builder** (`/game-doc`) — Game design documents
- **Game Design Tools** (`/game-tools`) — Game mechanics and design
- **Launch Kit** (`/launch`) — Product launch assets
- **Legal Decoder** (`/legal`) — Legal document analysis
- **Snippet Vault** (`/snippets`) — Code snippet library

### Self-Host (sovereign infrastructure suite)
- **Migration Wizard** (`/wizard`) — 5-step guided migration flow: platform selector → streaming audit → migration plan checklist → server check → done state. Works with all Migration Hub tools.
- **Migration Hub** (`/migration`) — 7 streaming tools: Audit, Code Rewriter, Dockerfile, Nginx Config, CI/CD Pipeline, Env Fixer, DB Migration
- **Escape Routes** (`/leaving`) — Platform-specific guides for Replit, Heroku, Railway, Render — lock-in table + escape checklist + time/difficulty estimates
- **The Sovereign Stack** (`/sovereign`) — 7-criteria standard for portable self-hosted apps with interactive self-assessment quiz and Sovereign Seal badge HTML
- **App Hub** (`/app-hub`) — "Bring Your Own Server" model: Coolify setup guide, server connection form (validated live), Sovereign Digital app catalog, community registry placeholder

---

## AI Integration
Uses Replit AI Integrations (OpenAI-compatible, no user API key needed). All routes stream SSE events back to the client.

**Moon API** — Thirteen Moons subscription at thepeoplestownsq.com:
- **Verify**: `GET https://thepeoplestownsq.com/api/moon/verify?userId={userId}&moon=forge|flint|hawk|...` with `x-moon-api-key` header
- **Deduct**: `POST https://thepeoplestownsq.com/api/moon/deduct` with `{userId, moonName, count: 1}`
- Service layer: `artifacts/api-server/src/lib/moonApi.ts`
- SSE event `subscription_required` triggers UI subscribe gate

**User identity**: anonymous persistent UUID in `localStorage` (`13moonforge_user_id`), sent as `x-user-id` request header.

**Admin bypass user IDs**: 54504320, 54489134

---

## Secrets
- `MOON_API_KEY` — Thirteen Moons API key
- `TPTS_MOON_API_KEY` — TPTS Moon API key
- `TSQ_MOON_API_KEY` — Town Square Moon API key
- `TPTS_INBOUND_KEY` — TPTS inbound API key
- `SESSION_SECRET` — session secret
- `SQUARE_API_KEY` — Square payments (future)

---

## API Routes
- `artifacts/api-server/src/routes/forge.ts` — all streaming AI routes (audit, rewrite, docker, nginx, cicd, env, pgdump, etc.)
- `artifacts/api-server/src/routes/deploy.ts` — server connection, registry CRUD
- `artifacts/api-server/src/routes/index.ts` — route registration

**Frontend API base**: `import.meta.env.BASE_URL.replace(/\/$/, "")`  
**NOT** `@/lib/api` — that file does not exist.

---

## Database Schema
- `lib/db/src/schema/` — Drizzle ORM schema files
- `serverConnectionsTable` — Coolify server connections per user (in `deploy.ts`)
- `registryAppsTable` — community app submissions (id, name, tagline, description, stack, githubUrl, dockerImage, submittedByUserId, status: pending/approved/rejected, sovereignCertified, minRam)
- Push: `pnpm --filter @workspace/db run push-force`

---

## Coolify Integration
- Stored per-user in `serverConnectionsTable` (API key masked in responses)
- Validated via `GET {coolifyUrl}/api/v1/healthcheck` before saving
- Deploy routes use Coolify REST API for health check and (future) deployment

---

## Workspace
pnpm workspace monorepo, TypeScript, Node.js 24.

- **API server**: Express 5, port 8080, `artifacts/api-server/`
- **Frontend**: React + Vite, `artifacts/the-forge/`
- **DB**: `lib/db/` with Drizzle ORM + PostgreSQL
- **Build**: `pnpm run build` | **Typecheck**: `pnpm run typecheck`
- **DB push**: `pnpm --filter @workspace/db run push-force`
