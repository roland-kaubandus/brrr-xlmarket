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
    backendUrl: process.env.MEDUSA_BACKEND_URL || "https://xlmarket.ee",
    vite: () => ({
      server: {
        allowedHosts: ["xlmarket.ee", "dev.xlmarket.ee", "localhost"],
      },
    }),
  },
  plugins: [
    {
      resolve: "@rokmohar/medusa-plugin-meilisearch",
      options: {
        config: {
          host: process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700",
          // Fallback env-aliastele (vaikne crash kui MEILISEARCH_API_KEY puudu).
          apiKey:
            process.env.MEILISEARCH_API_KEY ||
            process.env.MEILISEARCH_KEY ||
            process.env.MEILI_MASTER_KEY,
        },
        settings: {
          products: {
            // NB: plugin'i loader (loaders/index.js) rakendab neid indexSettinguid
            // IGAL Medusa boot'il (Coolify redeploy / restart), sõltumata
            // SKIP_MEILISEARCH_STARTUP_INDEXING'ist (see keelab ainult dokumentide
            // reindexi, MITTE settingute rakendamist). Kui need on minimaalsed,
            // kirjutab boot üle searchable+displayed → hinnad €0.00, kategooriad
            // tühjad, ET-tõlked peidus (juhtus 2026-06-04). PEAVAD olema sünkroonis
            // backend/scripts/index-meilisearch.mjs settingutega (SSoT seal).
            indexSettings: {
              searchableAttributes: ["title_et", "title_en", "description_et", "description_en", "categories", "sku", "handle"],
              displayedAttributes: ["*"],
              filterableAttributes: [
                "categories", "category_handles", "subcategory", "price", "in_stock", "translated", "filter_tokens",
                "taxonomy.l1_slug", "taxonomy.l2_slug", "taxonomy.l3_slug", "taxonomy.ancestors",
                "vertical_slugs", "handle",
              ],
              sortableAttributes: ["price", "created_at", "title_en"],
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
          {
            resolve: "./src/modules/montonio",
            id: "montonio",
            options: {
              accessKey: process.env.MONTONIO_ACCESS_KEY,
              secretKey: process.env.MONTONIO_SECRET_KEY,
              environment: process.env.MONTONIO_ENV || "sandbox",
              storeUrl: process.env.NEXT_PUBLIC_BASE_URL || "https://xlmarket.ee",
              backendUrl: process.env.MEDUSA_BACKEND_URL || "https://api.xlmarket.ee",
            },
          },
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
