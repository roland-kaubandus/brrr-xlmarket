FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# Build-time env vars needed by Next.js
ARG NEXT_PUBLIC_MEDUSA_URL=http://medusa:9000
ARG NEXT_PUBLIC_MEDUSA_KEY
ARG NEXT_PUBLIC_REGION_ID
ARG NEXT_PUBLIC_BASE_URL=https://xlmarket.eu

ENV NEXT_PUBLIC_MEDUSA_URL=${NEXT_PUBLIC_MEDUSA_URL}
ENV NEXT_PUBLIC_MEDUSA_KEY=${NEXT_PUBLIC_MEDUSA_KEY}
ENV NEXT_PUBLIC_REGION_ID=${NEXT_PUBLIC_REGION_ID}
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}

# Build Next.js
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
