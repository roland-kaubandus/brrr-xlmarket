FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Build
RUN npm run build 2>/dev/null || true

EXPOSE 9000

CMD ["npm", "run", "start"]
