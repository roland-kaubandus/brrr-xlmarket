import fs from "node:fs"

const productGrid = fs.readFileSync(new URL("../components/ProductGrid.tsx", import.meta.url), "utf8")
const middleware = fs.readFileSync(new URL("../middleware.ts", import.meta.url), "utf8")
const meilisearch = fs.readFileSync(new URL("../lib/meilisearch.ts", import.meta.url), "utf8")

const failures = []

if (!productGrid.includes('fetch(`/api/products?')) {
  failures.push("ProductGrid must fetch through /api/products so browser product loading does not depend on a public /meili proxy.")
}

if (productGrid.includes('NEXT_PUBLIC_MEILI_URL') || productGrid.includes('"/meili"')) {
  failures.push("ProductGrid must not call MeiliSearch directly from the browser.")
}

if (!middleware.includes("'/meili/'")) {
  failures.push("middleware EXCLUDED must include /meili/ to avoid locale redirects for any legacy/proxied Meili route.")
}

if (!middleware.includes("meili")) {
  failures.push("middleware matcher must exclude meili paths.")
}

if (!meilisearch.includes("limit: options.limit ?? 24")) {
  failures.push("searchProducts must preserve limit: 0 so SSR totals/facets calls do not fetch an extra product page.")
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log("product loading routing checks passed")
