# syntax=docker/dockerfile:1.7
# XLMarket storefront — Next.js 16 standalone build for Coolify

# ---------- Stage 1: deps ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ---------- Stage 2: builder ----------
FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_MEDUSA_URL=http://medusa:9000
ARG NEXT_PUBLIC_MEDUSA_KEY
ARG NEXT_PUBLIC_REGION_ID
ARG NEXT_PUBLIC_BASE_URL=https://xlmarket.eu
ARG NEXT_PUBLIC_MEILI_URL
ARG NEXT_PUBLIC_MEILI_KEY

ENV NEXT_PUBLIC_MEDUSA_URL=${NEXT_PUBLIC_MEDUSA_URL} \
    NEXT_PUBLIC_MEDUSA_KEY=${NEXT_PUBLIC_MEDUSA_KEY} \
    NEXT_PUBLIC_REGION_ID=${NEXT_PUBLIC_REGION_ID} \
    NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL} \
    NEXT_PUBLIC_MEILI_URL=${NEXT_PUBLIC_MEILI_URL} \
    NEXT_PUBLIC_MEILI_KEY=${NEXT_PUBLIC_MEILI_KEY} \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- Stage 3: runner ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3030 \
    HOSTNAME=0.0.0.0 \
    # Keela Node happy-eyeballs — väldib ~5s connect-stalle storefront→medusa fetch'idel
    # (Alpine/musl+Docker autoSelectFamily bug). Vt backend/Dockerfile.
    NODE_OPTIONS=--no-network-family-autoselection

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3030

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3030/api/health || exit 1

CMD ["node", "server.js"]
