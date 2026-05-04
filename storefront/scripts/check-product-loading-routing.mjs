import fs from "node:fs"

const productGrid = fs.readFileSync(new URL("../components/ProductGrid.tsx", import.meta.url), "utf8")
const productsApi = fs.readFileSync(new URL("../app/api/products/route.ts", import.meta.url), "utf8")
const medusa = fs.readFileSync(new URL("../lib/medusa.ts", import.meta.url), "utf8")
const middleware = fs.readFileSync(new URL("../middleware.ts", import.meta.url), "utf8")
const meilisearch = fs.readFileSync(new URL("../lib/meilisearch.ts", import.meta.url), "utf8")
const dockerfile = fs.readFileSync(new URL("../Dockerfile", import.meta.url), "utf8")
const healthRoute = fs.readFileSync(new URL("../app/api/health/route.ts", import.meta.url), "utf8")

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

if (!middleware.includes("LEGACY_SEARCH_SEGMENT = '/search'") || !middleware.includes("SEARCH_SEGMENT = '/otsing'")) {
  failures.push("middleware must redirect legacy /search URLs to /otsing.")
}

if (!productsApi.includes("enrichMissingPrices") || !productsApi.includes("getProductsByHandles")) {
  failures.push("/api/products must enrich missing Meili prices from Medusa so category cards do not render zero prices.")
}

if (!medusa.includes("export async function getProductsByHandles") || !medusa.includes('search.append("handle[]"')) {
  failures.push("Medusa client must support batch lookup by product handle for price enrichment.")
}

if (!meilisearch.includes("limit: options.limit ?? 24")) {
  failures.push("searchProducts must preserve limit: 0 so SSR totals/facets calls do not fetch an extra product page.")
}

if (!dockerfile.includes("http://127.0.0.1:3030/api/health")) {
  failures.push("storefront Docker healthcheck must use the lightweight /api/health route instead of SSR /.")
}

if (!healthRoute.includes("NextResponse.json({ ok: true })")) {
  failures.push("storefront /api/health route must return a lightweight ok response.")
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log("product loading routing checks passed")
