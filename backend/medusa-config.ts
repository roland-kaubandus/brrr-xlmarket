import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:3030",
      adminCors: process.env.ADMIN_CORS || "http://localhost:7001",
      authCors: process.env.AUTH_CORS || "http://localhost:3030,http://localhost:7001",
    },
  },
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL || "https://xlmarket.store",
    vite: () => ({
      server: {
        allowedHosts: ["xlmarket.store", "localhost", "100.93.186.17"],
      },
    }),
  },
  plugins: [
    {
      resolve: "@rokmohar/medusa-plugin-meilisearch",
      options: {
        config: {
          host: process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700",
          apiKey: process.env.MEILISEARCH_API_KEY || "MEILI_LEGACY_KEY_REDACTED",
        },
        settings: {
          products: {
            indexSettings: {
              searchableAttributes: ["title", "description", "handle"],
              displayedAttributes: ["id", "title", "description", "handle", "thumbnail", "variants", "options"],
            },
          },
        },
      },
    },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          // Montonio payment provider will be added here
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          // Email notification provider will be added here
        ],
      },
    },
  ],
})
