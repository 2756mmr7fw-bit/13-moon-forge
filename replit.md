# 13 Moon Forge

AI-powered invention and building platform for developers to create, manage, and deploy applications on their own infrastructure.

## Run & Operate

- **Run in development**: `pnpm dev`
- **Build**: `pnpm run build`
- **Typecheck**: `pnpm run typecheck`
- **DB Push**: `pnpm --filter @workspace/db run push-force`
- **Required Env Vars**: `MOON_API_KEY`, `TPTS_MOON_API_KEY`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`/`VITE_CLERK_PUBLISHABLE_KEY`, `SESSION_SECRET`, `TSQ_MOON_API_KEY`, `TPTS_INBOUND_KEY`, `ADMIN_WEBHOOK_URL` (optional), `DATABASE_URL_PROD`, `OIDC_CLIENT_ID`, `APP_URL`, `NODE_ENV`, `PORT`.

## Stack

- **Frameworks**: React, Express 5
- **Runtime**: Node.js 24
- **ORM**: Drizzle ORM
- **Validation**: _Populate as you build_
- **Build Tool**: Vite
- **Authentication**: Clerk

## Where things live

- **API Server**: `artifacts/api-server/`
- **Frontend**: `artifacts/the-forge/`
- **Database Schema**: `lib/db/src/schema/`
- **Clerk Integration**: `App.tsx` (initialization), `components/protected-route.tsx` (route guards)
- **Moon API Service Layer**: `artifacts/api-server/src/lib/moonApi.ts`
- **Skill Level Logic**: `artifacts/the-forge/src/lib/skillLevel.ts`
- **Docker Build**: `Dockerfile`
- **Docker Compose**: `docker-compose.yml`
- **Docker Image Publishing Workflow**: `.github/workflows/publish-images.yml`

## Architecture decisions

- **Monorepo Structure**: Uses `pnpm workspace` for managing API server, frontend, and database code.
- **Unified Docker Image**: A single Docker container serves both the Express API and the React frontend as static files, simplifying deployment to self-hosted environments.
- **Subscription Model**: All subscriptions are handled externally via thepeoplestownsq.com; no in-app payments are processed directly.
- **AI Integration**: Leverages Replit AI Integrations (OpenAI-compatible) with all responses streamed via Server-Sent Events (SSE).
- **Secrets Management**: Employs AES-256-GCM encryption for the `Secrets Vault`, with migration logic for anonymous users to authenticated Clerk users.
- **Skill-Level Aware AI**: AI responses are dynamically adjusted based on a user's selected skill level, influencing prompt instructions and explanation depth.

## Product

- **Builder**: Project management (My Projects), AI-powered workspace (Workspace), templated workflows (Forge Starters), conversational project creation (New Creation), and AI idea generation (Brainstorm).
- **Learn & Build Yourself**: Code editor (Write Code Yourself), AI tutor (Learn to Code), and timed bug-fixing tests (Forge Academy).
- **Creator Tools**: Various AI assistants and specialized tools for specific creative tasks (e.g., Game Doc Builder, Launch Kit, Legal Decoder).
- **Self-Host**: Tools for migrating and deploying applications to self-managed infrastructure, including Code Sources (GitHub/GitLab/Bitbucket integration), Migration Wizard/Hub, Sovereign Stack adherence, App Hub, App Registry, Secrets Vault, and App Monitor.
- **Account Management**: User profiles, subscription linking, and onboarding flows.

## User preferences

- **Skill Level**: Users can set their preferred skill level (Just Starting, Beginner, Novice, Intermediate, Pro) which influences the AI's communication style and explanation depth.
- **Explain Mode**: An optional "Explain Mode" header (`x-explain-mode: true`) can be sent to make Forge narrate explanations after every code block.

## Gotchas

- **DB Push**: Always run `pnpm --filter @workspace/db run push-force` to apply schema changes.
- **Coolify Integration**: Coolify server connections require validation via `GET {coolifyUrl}/api/v1/healthcheck` before saving.
- **Admin Access**: Admin features are only visible for users listed in `ADMIN_USER_IDS` or `ADMIN_EMAILS` environment variables.
- **Secrets Migration**: Anonymous secrets are migrated to a Clerk user ID only once upon first sign-in.
- **Third-party API Keys**: Ensure all necessary API keys (Moon, Clerk, TPTS, etc.) are correctly set in environment variables for full functionality.

## Pointers

- **Clerk Documentation**: [https://clerk.com/docs](https://clerk.com/docs)
- **Drizzle ORM Documentation**: [https://orm.drizzle.team/docs](https://orm.drizzle.team/docs)
- **Vite Documentation**: [https://vitejs.dev/guide/](https://vitejs.dev/guide/)
- **Express Documentation**: [https://expressjs.com/en/4x/api.html](https://expressjs.com/en/4x/api.html)
- **Coolify Documentation**: [https://coolify.io/docs](https://coolify.io/docs)
- **Replit AI Integrations**: [https://replit.com/docs/ai/integrations](https://replit.com/docs/ai/integrations)