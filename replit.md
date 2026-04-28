# 13 Moon Forge

## Product Vision
AI-powered invention and building platform for Sovereign Digital LLC (13moonforge.ai — domain not yet acquired). Integrates multiple Moons (AI characters) including Forge #3, Hawk #2, Quill #5, Creed #6, Sage #7, Flint #13. The definitive escape route for developers leaving Replit/Heroku/Railway/Render and self-hosting on their own infrastructure.

**Subscriptions**: Exclusively via thepeoplestownsq.com — no in-app payments.

---

## Features & Pages

### Builder
- **The Anvil** (`/`) — Dashboard with stats and recent projects
- **My Projects** (`/projects`) — Project management with templates, pin/sort, portfolio builder
- **Workspace** (`/workspace`) — Forge-powered file system: folders, documents, plans, blueprints, portfolios, goals, code files. Forge chat creates any type from natural language. Keyword detection for export intent triggers ZIP download automatically. Full CRUD, pin, rename, PDF export, markdown editor. Full-text sidebar search (debounced, hits `/api/workspace/search`). DB: `workspace_items` table. API: `GET|POST /api/workspace`, `PUT|DELETE /api/workspace/:id`, `POST /api/workspace/forge`, `GET /api/workspace/search?q=`.
- **Forge Starters** (`/starters`) — 6 pre-built Moon workflow templates (Business Plan, Landing Page, Learn a Skill, Contract Review, Build an App, Find a Supplier). Each card lists steps and pre-fills prompts via localStorage handoff to Moon pages.
- **New Creation** (`/projects/new`) — Conversational Forge chat extracts project plan then one-click creates
- **Brainstorm** (`/brainstorm`) — AI idea generation with Moon Output Actions (Save to Workspace, Share Link, Chain to Moon) on every assistant message.

### Learn & Build Yourself
- **Write Code Yourself** (`/diy-code`) — Full Monaco editor (VS Code-quality). 16 languages. Zero credits, no AI required. Save directly to Workspace or download the file. For users who want to write their own code without using Forge.
- **Learn to Code** (`/sage`) — Sage AI tutor, now skill-level-aware.

### Skill Level System
- User sets their level via "My Skill Level" button at the bottom of the sidebar: Just Starting / Beginner / Novice / Intermediate / Pro
- Stored in localStorage (`13moonforge_skill_level`)
- All AI streaming routes read `x-skill-level` header and inject a matching system prompt instruction
- Skill levels: `absolute-beginner` → plain English + every-line explanations; `beginner` → encouraging + concept definitions; `novice` → 'why' explanations; `intermediate` → normal technical; `pro` → concise, code-first
- Explain Mode: `x-explain-mode: true` header makes Forge narrate "What I just did:" after every code block
- Implemented in: `artifacts/the-forge/src/lib/skillLevel.ts`, `components/skill-level-selector.tsx`, API in `forge.ts` `makeStreamRoute()`

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
- **Code Sources** (`/github`) — Unified hub connecting GitHub, GitLab, Bitbucket. Platform tabs with connected indicators. Per-platform auth (PAT for GH/GL, username+app-password for BB). Browse repos, read file trees, auto-import key files into Migration Wizard via localStorage handoff.
- **Migration Wizard** (`/wizard`) — 5-step guided migration flow: platform selector → streaming audit → migration plan checklist → server check → done state. Reads `wizard_import` from localStorage (set by Code Sources). Works with all Migration Hub tools.
- **Migration Hub** (`/migration`) — 7 streaming AI tools: Audit, Code Rewriter, Dockerfile, Nginx Config, CI/CD Pipeline, Env Fixer, DB Migration. **Commit-back**: after any code-producing tool completes, a "Push to GitHub/GitLab" button appears — user picks repo/branch/filepath/message and commits generated output directly.
- **Escape Routes** (`/leaving`) — Platform-specific guides for Replit, Heroku, Railway, Render — lock-in table + escape checklist + time/difficulty estimates
- **The Sovereign Stack** (`/sovereign`) — 7-criteria standard for portable self-hosted apps with interactive self-assessment quiz and Sovereign Seal badge HTML
- **App Hub** (`/app-hub`) — 4 tabs: Get Started, My Server (Coolify connection), App Catalog (6 Sovereign Digital apps w/ "Deploy" modal that provisions a Docker-image app directly in Coolify via `POST /api/deploy/provision`), Live Apps (real-time Coolify app status + redeploy). New API endpoints: `GET /api/deploy/servers-list`, `GET /api/deploy/projects-list`, `POST /api/deploy/provision`.
- **App Registry** (`/registry`) — Community-submitted self-hostable open-source apps. Browse grid with stack badges + Docker pull commands. Submit form (name, tagline, description, stack, GitHub URL, Docker image). All submissions pending review before appearing publicly.
- **Secrets Vault** (`/secrets`) — AES-256-GCM encrypted API key storage. Add keys by provider (Cloudflare, AWS, Stripe, VPN, Antivirus, CDN, DNS, etc.), grouped by app. Reveal/copy/delete/export as .env. Import via .env paste or upload. Routes: `GET|POST /api/secrets`, `PATCH|DELETE /api/secrets/:id`, `GET /api/secrets/:id/reveal`, `POST /api/secrets/import`, `GET /api/secrets/export`.
- **Admin Panel** (`/admin`) — Registry review dashboard. Only visible in sidebar for users listed in `ADMIN_USER_IDS` env var. Tabs: Pending / Approved / Rejected. Approve, reject, delete submissions. Routes: `GET /api/admin/check`, `GET /api/admin/registry`, `POST /api/admin/registry/:id/approve`, `POST /api/admin/registry/:id/reject`, `DELETE /api/admin/registry/:id`.
- **App Monitor** (`/monitor`) — Live infrastructure health dashboard. Auto-refreshes every 30s. Shows: colored status banner (all-clear/issues/critical), traffic pressure gauge with req/min + route breakdown, Coolify app health grid (per-app status dot + URL + last updated), infrastructure capacity cards (auto-detected from Secrets Vault — covers VPS, VPN, CDN, DNS, storage, database, email, monitoring, auth, payments, security), recent deployment history, alert feed ordered by severity. Alerts include: stopped/erroring apps, deploy failures, high traffic (with provider-specific upgrade advice), rate-limit pressure, missing monitoring tools. Route: `GET /api/monitor/status`.

### Account
- **Account** (`/account`) — Clerk UserProfile (profile, security, connected accounts) + quick-info card (name, email, member-since) + subscription card linking to Town Square + upgrade link. Shows sign-in prompt when logged out.

### Onboarding
- First-visit modal (`OnboardingModal` in `components/onboarding-modal.tsx`) — appears once (localStorage flag `13moonforge_onboarded`). Three paths: Migrate existing app → `/wizard`, Build something new → `/projects/new`, Explore tools → `/`.

---

## AI Integration
Uses Replit AI Integrations (OpenAI-compatible, no user API key needed). All routes stream SSE events back to the client.

**Moon API** — Thirteen Moons subscription at thepeoplestownsq.com:
- **Verify**: `GET https://thepeoplestownsq.com/api/moon/verify?userId={userId}&moon=forge|flint|hawk|...` with `x-moon-api-key` header
- **Deduct**: `POST https://thepeoplestownsq.com/api/moon/deduct` with `{userId, moonName, count: 1}`
- Service layer: `artifacts/api-server/src/lib/moonApi.ts`
- SSE event `subscription_required` triggers UI subscribe gate

**User identity**: Clerk-authenticated JWT (preferred, via `getAuth(req).userId` on the API) with `x-user-id` header fallback for anonymous / non-Clerk requests. `ClerkProvider` wraps the entire React tree; sign-in/sign-up routes (`/sign-in`, `/sign-up`) render outside the sidebar Layout. `ClerkTokenInitializer` (in `App.tsx`) calls `setAuthTokenGetter` so `getAuthToken()` from `@workspace/api-client-react` returns the Clerk bearer token throughout the app.

**Secrets migration**: On first sign-in, `SecretsVault` calls `POST /api/secrets/migrate` with the localStorage anon UUID to re-attribute any pre-login secrets to the Clerk userId. One-time only (flag stored in `localStorage["13moonforge_secrets_migrated"]`).

**Rate limiting** (`artifacts/api-server/src/app.ts` via `express-rate-limit`):
- Global: 300 req / 15 min per IP
- AI routes (`/api/ai`, `/api/forge`, `/api/flint`, `/api/sage`, `/api/hawk`, `/api/moon`): 60 req / hour
- Secrets writes (POST/DELETE on `/api/secrets`): 30 req / 15 min
- Checkout: 10 req / 5 min

**Moon subscription caching** (`artifacts/api-server/src/lib/moonApi.ts`): server-side in-memory Map with 5-min TTL per userId to avoid hammering TPTS on every page load.

**Sharing & Forge Report**:
- `POST /api/share` — creates a shareable public link for any Moon output. Stores in `shared_outputs` table. Returns `{ id, url, createdAt }`.
- `GET /api/share/:id` — public (no auth). Returns the shared output or 404/403. Rendered at public route `/share/:id` (no Layout wrapper).
- `DELETE /api/share/:id` — revokes a share (owner only).
- `POST /api/forge-report` — generates and emails a Forge activity digest via Resend. Body: `{ email, firstName? }`. Includes session count, saved prompt count, workspace file count, recently used Moons, and a weekly tip.
- `GET /api/workspace/search?q=` — full-text search across user's workspace items (name + content ILIKE). Returns up to 30 results with contextual snippets. Used by the search bar in the Workspace sidebar.

**Moon Output Actions** (`artifacts/the-forge/src/components/moon-output-actions.tsx`): reusable component shown on AI responses across Moon pages (Brainstorm, Sage). Three actions:
1. Save to Workspace — POSTs the content to `/api/workspace` as a note file.
2. Share Link — POSTs to `/api/share`, shows copy-link button on success.
3. Chain to Moon — dropdown of all Moon pages; pre-fills the content via localStorage handoff pattern.

**Route guards**: `ProtectedRoute` component (`components/protected-route.tsx`) wraps all pages except `/pricing` and `/payment/success`. Unauthenticated users are redirected to `/sign-in?redirect_url=<current_path>` with a spinner shown while Clerk loads.

**Admin access**: Two supported env vars (both comma-separated, both optional):
- `ADMIN_EMAILS=Ezekiel@thepeoplestownsq.com` — matches by email address via Clerk backend lookup (set and active)
- `ADMIN_USER_IDS=user_xxx,user_yyy` — matches by raw Clerk user ID (faster, no API call)
Email check uses `createClerkClient` with `CLERK_SECRET_KEY`; results cached per-user for 10 minutes. The `/api/admin/check` endpoint returns `{ isAdmin: true/false }` for the current signed-in user.

---

## Secrets
- `MOON_API_KEY` — Thirteen Moons API key
- `TPTS_MOON_API_KEY` — TPTS Moon API key
- `CLERK_SECRET_KEY` — Clerk backend secret (server-side only)
- `CLERK_PUBLISHABLE_KEY` / `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `SESSION_SECRET` — Express session secret + AES-256-GCM key derivation for Secrets Vault
- `TSQ_MOON_API_KEY` — Town Square Moon API key
- `TPTS_INBOUND_KEY` — TPTS inbound API key
- `SQUARE_API_KEY` — Square payments (future)
- `ADMIN_WEBHOOK_URL` — (optional) Discord/Slack/custom webhook URL; receives embed on each new registry submission

---

## API Routes
- `artifacts/api-server/src/routes/forge.ts` — all streaming AI routes (audit, rewrite, docker, nginx, cicd, env, pgdump, etc.)
- `artifacts/api-server/src/routes/deploy.ts` — server connection, registry CRUD, Coolify live apps, redeploy
- `artifacts/api-server/src/routes/github.ts` — status, connect, disconnect, repos, tree, file, commit
- `artifacts/api-server/src/routes/gitlab.ts` — status, connect, disconnect, repos, tree, file, commit (full write)
- `artifacts/api-server/src/routes/bitbucket.ts` — status, connect, disconnect, repos, tree, file (read-only)
- `artifacts/api-server/src/routes/secrets.ts` — AES-256-GCM encrypted secrets vault CRUD (`GET|POST /api/secrets`, `PATCH|DELETE /api/secrets/:id`, `GET /api/secrets/:id/reveal`, `POST /api/secrets/import`, `GET /api/secrets/export`, `POST /api/secrets/migrate`)
- `artifacts/api-server/src/routes/admin.ts` — admin-only registry management (requireAdmin middleware checks ADMIN_USER_IDS env var)
- `artifacts/api-server/src/routes/index.ts` — route registration

**Frontend API base**: `import.meta.env.BASE_URL.replace(/\/$/, "")`  
**NOT** `@/lib/api` — that file does not exist.

---

## Database Schema
- `lib/db/src/schema/` — Drizzle ORM schema files
- `serverConnectionsTable` — Coolify server connections per user (in `deploy.ts`)
- `registryAppsTable` — community app submissions (id, name, tagline, description, stack, githubUrl, dockerImage, submittedByUserId, status: pending/approved/rejected, sovereignCertified, minRam)
- `moon_entitlements` — TPTS webhook-synced Moon subscription entitlements per user
- `chat_sessions` — persistent Brainstorm (and future Moon) chat history per user
- `saved_prompts` — user-saved prompts with moonId, title, prompt text
- `user_tpts_links` — links Forge userId to a TPTS email for subscription lookup
- `shared_outputs` — public shareable Moon output links (UUID PK, userId, moonId, title, content, isPublic)
- Push: `pnpm --filter @workspace/db run push-force`

---

## Coolify Integration
- Stored per-user in `serverConnectionsTable` (API key masked in responses)
- Validated via `GET {coolifyUrl}/api/v1/healthcheck` before saving
- Deploy routes use Coolify REST API for health check and (future) deployment

---

## Production Deployment (Self-Hosting Forge)
Forge passes its own Sovereign Stack standard — it has a production Dockerfile:
- `Dockerfile` — multi-stage: deps → web-build → api-build → runner. Copies frontend build into `dist/public` and serves via `express.static` (only in `NODE_ENV=production`).
- `docker-compose.yml` — Forge API + Postgres 16. Maps env vars (DATABASE_URL, SESSION_SECRET, MOON_API_KEY).
- `.dockerignore` — excludes node_modules, .env files, mockup-sandbox, dist artifacts.
- **Build**: `docker compose up --build`
- **API port**: 8080 (configurable via `PORT` env)

**Publishing Docker images** (for App Catalog): `.github/workflows/publish-images.yml` — triggered on `v*` tags or manually via workflow_dispatch. Builds and pushes `sovereigndigital/{forge,hawk,quill,creed,sage,flint}:latest` + versioned tags to Docker Hub (requires `DOCKERHUB_USERNAME` + `DOCKERHUB_TOKEN` GitHub secrets). Multi-arch: `linux/amd64` + `linux/arm64`. Individual app Dockerfiles are expected at `apps/{name}/Dockerfile`.

---

## Blueprint — Ideas Parked for Later

### Antivirus ↔ Forge Integration (BUILT — pending antivirus-side config)
**Deployed**: Two-way link between 13 Moon Antivirus and Forge.

**URLs**:
- Antivirus web: `https://13moonantivirus.ai` / `https://13-moon-ai-antivirus.replit.app`
- Forge ingest URL (dev): `https://<replit-dev-domain>/api/ingest/document`

**The flow**:
Email arrives with code/PDF → Antivirus extracts content → POSTs to Forge `/api/ingest/document` → lands in Workspace automatically

**Forge API routes** (`artifacts/api-server/src/routes/antivirus.ts`):
- `GET /api/antivirus/status` — returns ingest URL and setup instructions (public)
- `GET /api/antivirus/ping` — health check for antivirus to verify Forge is reachable (auth: `TPTS_INBOUND_KEY`)
- `POST /api/ingest/document` — receives `{ userId, content, filename, type, source }`, creates Workspace item (auth: `TPTS_INBOUND_KEY`)

**Forge page**: `/antivirus` — shows ingest URL (copyable), step-by-step setup, test connection button, recommendation for Replit migration use case

**Auth**: Shared secret via `TPTS_INBOUND_KEY` bearer token in `Authorization` header

**Both directions fully live** — probe confirmed antivirus returns 200 with schema.

**Antivirus push URL (Forge → Antivirus)**:
- Dev: `https://a3cbb751-539c-43bf-8aea-a8f136876d1d-00-11g6l6u26jhof.spock.replit.dev/api/inbound/from-forge`
- Prod: `https://13moonantivirus.ai/api/inbound/from-forge`
- Probe (no auth): `GET /api/inbound/from-forge/status`

**Forge API endpoints added**:
- `GET /api/antivirus/probe` — Forge pings antivirus to verify it's reachable
- `POST /api/antivirus/send` — Forge sends `{ filename, content, type, note }` to antivirus

---

## Workspace
pnpm workspace monorepo, TypeScript, Node.js 24.

- **API server**: Express 5, port 8080, `artifacts/api-server/`
- **Frontend**: React + Vite, `artifacts/the-forge/`
- **DB**: `lib/db/` with Drizzle ORM + PostgreSQL
- **Build**: `pnpm run build` | **Typecheck**: `pnpm run typecheck`
- **DB push**: `pnpm --filter @workspace/db run push-force`
