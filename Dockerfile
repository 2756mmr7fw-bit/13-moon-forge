FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

# ─── Dependency layer ─────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/db/package.json ./lib/db/
COPY artifacts/the-forge/package.json ./artifacts/the-forge/
COPY artifacts/api-server/package.json ./artifacts/api-server/
RUN pnpm install --frozen-lockfile

# ─── Build frontend ──────────────────────────────────────────────────────────
FROM deps AS web-build
COPY lib/db ./lib/db
COPY artifacts/the-forge ./artifacts/the-forge
RUN pnpm --filter @workspace/the-forge run build

# ─── Build API server ────────────────────────────────────────────────────────
FROM deps AS api-build
COPY lib/db ./lib/db
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
COPY artifacts/api-server/package.json ./artifacts/api-server/

RUN pnpm install --prod --frozen-lockfile --filter @workspace/api-server

COPY --from=api-build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=web-build /app/artifacts/the-forge/dist  ./artifacts/api-server/dist/public
COPY lib/db/src ./lib/db/src

EXPOSE 8080
CMD ["node", "artifacts/api-server/dist/index.js"]
