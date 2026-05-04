# syntax=docker/dockerfile:1.7
# XLMarket Medusa backend — multi-stage build for Coolify

# ---------- Stage 1: builder ----------
FROM node:22-alpine AS builder
WORKDIR /app

# DO NOT set NODE_ENV=production here — medusa build needs devDependencies (typescript, vite, esbuild)
ENV NPM_CONFIG_LOGLEVEL=warn

COPY package.json package-lock.json* ./
RUN npm ci --include=dev --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- Stage 2: runner ----------
# Medusa v2 production pattern: serve from .medusa/server/ which is self-contained
# (includes own package.json, public/admin/, compiled src/)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=9000 \
    HOSTNAME=0.0.0.0 \
    SKIP_MEILISEARCH_STARTUP_INDEXING=true

RUN apk add --no-cache dumb-init wget && \
    addgroup --system --gid 1001 medusa && \
    adduser --system --uid 1001 medusa

# Copy the entire built .medusa/server/ as the runtime root
COPY --from=builder --chown=medusa:medusa /app/.medusa/server/ ./
COPY --from=builder --chown=medusa:medusa /app/scripts/index-meilisearch.mjs ./scripts/index-meilisearch.mjs
COPY --from=builder --chown=medusa:medusa /app/src/filters ./src/filters
COPY --from=builder --chown=medusa:medusa /app/src/data/filter-profiles.yaml ./src/data/filter-profiles.yaml

# Install production deps using the package.json from .medusa/server
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# The Meilisearch plugin ships one-shot cron jobs that run a full product and
# category reindex during Medusa startup. On the live catalog this delays the
# API listener long enough for Coolify health checks to fail and leaves the
# storefront undeployed. Keep runtime indexing explicit instead of blocking boot.
RUN node <<'NODE'
const fs = require("fs")

const patches = [
  {
    file: "/app/node_modules/@rokmohar/medusa-plugin-meilisearch/.medusa/server/src/jobs/meilisearch-products-index.js",
    needle: "    logger.info('Starting product indexing...');",
    guard: "    if (process.env.SKIP_MEILISEARCH_STARTUP_INDEXING !== 'false') { logger.info('Skipping product indexing on startup'); return; }\n",
  },
  {
    file: "/app/node_modules/@rokmohar/medusa-plugin-meilisearch/.medusa/server/src/jobs/meilisearch-categories-index.js",
    needle: "    logger.info('Starting category indexing...');",
    guard: "    if (process.env.SKIP_MEILISEARCH_STARTUP_INDEXING !== 'false') { logger.info('Skipping category indexing on startup'); return; }\n",
  },
]

for (const { file, needle, guard } of patches) {
  const source = fs.readFileSync(file, "utf8")
  if (source.includes(guard)) continue
  if (!source.includes(needle)) {
    throw new Error(`Could not patch Meilisearch startup job: ${file}`)
  }
  fs.writeFileSync(file, source.replace(needle, `${guard}${needle}`))
}
NODE

USER medusa

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=300s --retries=5 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:9000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]
