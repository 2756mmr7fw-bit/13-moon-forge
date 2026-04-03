# The Forge — Website Builder

## Product
AI-powered website builder run by the character "Forge" (one of the 13 Moons). Users create projects, add pages, describe their site to Forge, and get complete HTML generated for every page. Built to eventually connect to the real Forge AI personality (coming April 7th).

## Features
- Project management (create/edit/delete with templates)
- Page management per project
- **Generate with Forge** — AI generates complete HTML/CSS for all pages from a description (streaming SSE)
- **Live preview** — Edit/Preview toggle in page editor renders HTML in iframe
- Dashboard with summary stats and recent projects

## AI Integration
Uses Replit AI Integrations (OpenAI, no user API key needed). Endpoint: `POST /api/forge/generate`. Streams SSE events back to client. Forge's personality lives in the system prompt in `artifacts/api-server/src/routes/forge.ts` — swap for real Forge AI on April 7th.

# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
