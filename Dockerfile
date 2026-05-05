FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

# ─── Dependency layer ─────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/replit-auth-web/package.json ./lib/replit-auth-web/
COPY lib/integrations-openai-ai-server/package.json ./lib/integrations-openai-ai-server/
COPY artifacts/the-forge/package.json ./artifacts/the-forge/
COPY artifacts/api-server/package.json ./artifacts/api-server/
RUN pnpm install

# ─── Build frontend ──────────────────────────────────────────────────────────
FROM deps AS web-build
ARG CACHEBUST=2
COPY tsconfig.base.json ./
COPY lib/ ./lib/
COPY artifacts/the-forge ./artifacts/the-forge
RUN pnpm --filter @workspace/the-forge run build

# ─── Build API server ────────────────────────────────────────────────────────
FROM deps AS api-build
COPY tsconfig.base.json ./
COPY lib/ ./lib/
COPY artifacts/api-server ./artifacts/api-server
RUN pnpm --filter @workspace/api-server run build

# ─── Production image ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/integrations-openai-ai-server/package.json ./lib/integrations-openai-ai-server/
COPY artifacts/api-server/package.json ./artifacts/api-server/

RUN pnpm install --prod --filter @workspace/api-server

COPY --from=api-build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=web-build /app/artifacts/the-forge/dist/public  ./artifacts/api-server/dist/public
COPY lib/db/src ./lib/db/src

EXPOSE 8080
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
