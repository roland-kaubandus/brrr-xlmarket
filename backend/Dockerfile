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
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=9000 \
    HOSTNAME=0.0.0.0

RUN apk add --no-cache dumb-init wget && \
    addgroup --system --gid 1001 medusa && \
    adduser --system --uid 1001 medusa

COPY --from=builder --chown=medusa:medusa /app/package.json /app/package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=builder --chown=medusa:medusa /app/.medusa ./.medusa
COPY --from=builder --chown=medusa:medusa /app/medusa-config.js ./
COPY --from=builder --chown=medusa:medusa /app/src ./src

USER medusa

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]
