FROM node:24-slim AS base
RUN npm install -g pnpm@10
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
RUN pnpm install --frozen-lockfile

# ─── Build frontend ──────────────────────────────────────────────────────────
FROM deps AS web-build
ARG CACHEBUST=4
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_PROXY_URL
ENV VITE_CLERK_PROXY_URL=$VITE_CLERK_PROXY_URL
COPY tsconfig.base.json ./
COPY lib/ ./lib/
COPY artifacts/the-forge ./artifacts/the-forge
RUN pnpm --filter @workspace/the-forge run build

# ─── Build API server ────────────────────────────────────────────────────────
FROM deps AS api-build
ARG BUILD_ID=dev
ENV BUILD_ID=$BUILD_ID
COPY tsconfig.base.json ./
COPY lib/ ./lib/
COPY artifacts/api-server ./artifacts/api-server
RUN pnpm --filter @workspace/api-server run build

# ─── Production image ─────────────────────────────────────────────────────────
FROM node:24-slim AS runner
RUN npm install -g pnpm@10
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ARG BUILD_ID=dev
ENV BUILD_ID=$BUILD_ID

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/replit-auth-web/package.json ./lib/replit-auth-web/
COPY lib/integrations-openai-ai-server/package.json ./lib/integrations-openai-ai-server/
COPY artifacts/api-server/package.json ./artifacts/api-server/

RUN pnpm install --prod --frozen-lockfile --filter @workspace/api-server

COPY --from=api-build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=web-build /app/artifacts/the-forge/dist/public  ./artifacts/api-server/dist/public

# Diagnostic entrypoint — captures crash output and serves it via HTTP if server exits
COPY entrypoint.sh ./entrypoint.sh

EXPOSE 8080
CMD ["/bin/sh", "/app/entrypoint.sh"]
