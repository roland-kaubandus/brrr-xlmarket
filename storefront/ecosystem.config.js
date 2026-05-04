// Next.js standalone server does NOT auto-load .env.local at runtime — only
// `next dev` and `next build` do. We parse .env.local manually so PM2 cluster
// workers inherit MEILISEARCH_KEY, Medusa URL, etc. without a `dotenv` dep.
const fs = require("fs")
const path = require("path")
try {
  const envPath = path.join(__dirname, ".env.local")
  const content = fs.readFileSync(envPath, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    const key = m[1]
    let val = m[2]
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
} catch {
  // .env.local missing — fall back to whatever is already in process.env.
}

module.exports = {
  apps: [{
    name: "xlmarket-storefront",
    script: ".next/standalone/server.js",
    cwd: "/home/brrr/xlmarket/storefront",
    instances: 5,
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3030,
      HOSTNAME: "0.0.0.0",
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
      MEILISEARCH_HOST: process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700",
      MEILISEARCH_KEY: process.env.MEILISEARCH_KEY || "",
      NEXT_PUBLIC_MEDUSA_URL: process.env.NEXT_PUBLIC_MEDUSA_URL || "http://127.0.0.1:9001",
      NEXT_PUBLIC_MEDUSA_KEY: process.env.NEXT_PUBLIC_MEDUSA_KEY || "",
      NEXT_PUBLIC_REGION_ID: process.env.NEXT_PUBLIC_REGION_ID || "",
      NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY || "",
      NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST || "",
      // Admin edit mode (Risto + Tarmo) — see lib/admin-session.ts
      ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET || "",
      RISTO_ADMIN_EMAIL: process.env.RISTO_ADMIN_EMAIL || "",
      RISTO_ADMIN_PASS: process.env.RISTO_ADMIN_PASS || "",
      TARMO_ADMIN_EMAIL: process.env.TARMO_ADMIN_EMAIL || "",
      TARMO_ADMIN_PASS: process.env.TARMO_ADMIN_PASS || "",
      MEDUSA_ADMIN_API_KEY: process.env.MEDUSA_ADMIN_API_KEY || "",
    },
    max_memory_restart: "512M",
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: 5000,
  }],
}
