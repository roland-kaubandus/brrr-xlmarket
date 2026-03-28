FROM node:22-alpine AS builder

WORKDIR /app
ENV NODE_ENV=production

# Install all dependencies (including dev for build)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/.medusa ./.medusa
COPY --from=builder /app/medusa-config.js ./
COPY --from=builder /app/src ./src

EXPOSE 9000

CMD ["npm", "run", "start"]
