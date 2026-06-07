import { getCategories, type ProductCategory } from "./medusa"
import treeData from "./category-tree.generated.json"

// 2a viimistlus (2026-06-07): /store/product-categories on aeglane (2731 kat,
// >5s) → cold-cache'il 500'as. Robustsus:
//   1. AGRESSIIVNE cache + stale-while-revalidate — serveeri vana KOHE, värskenda
//      taustal (cold-fetch ei blokeeri ega 500'a user-facing'ut).
//   2. Pikem timeout (soe fetch jõuab lõpuni).
//   3. SSoT-fallback (category-tree.generated.json) kui Medusa-fetch ebaõnnestub
//      JA cache tühi → header-categories EI 500'a KUNAGI (HomeBentoGrid saab L1-d).
// MegaMenu on niikuinii puhtalt SSoT-bound (nav ei sõltu sellest API-st).

const FRESH_TTL_MS = 30 * 60 * 1000 // 30 min — "värske", ära värskenda
const STALE_TTL_MS = 24 * 60 * 60 * 1000 // 24h — kuni siia serveeri vana + bg-refresh
const FETCH_TIMEOUT_MS = 25_000 // soe fetch 2731 kat võtab >5s; anna ruumi

let cached: ProductCategory[] | null = null
let cachedAt = 0
let inflight: Promise<ProductCategory[]> | null = null

// SSoT (taksonoomia) → ProductCategory[] kuju. handle = id (SSoT on handle-põhine;
// HomeBentoGrid kasutab parent_category_id null = L1 + handle href/ikoonile).
function ssotFallback(): ProductCategory[] {
  const nodes = (treeData as { nodes: Record<string, {
    handle: string; name_en: string; name_et?: string; parent_handle: string | null
  }> }).nodes
  return Object.values(nodes).map((n) => ({
    id: n.handle,
    name: n.name_en,
    handle: n.handle,
    parent_category_id: n.parent_handle,
  }))
}

function fetchWithTimeout(): Promise<ProductCategory[]> {
  return Promise.race([
    getCategories(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Category fetch timeout")), FETCH_TIMEOUT_MS)
    ),
  ])
}

function refresh(): Promise<ProductCategory[]> {
  if (inflight) return inflight
  inflight = fetchWithTimeout()
    .then((cats) => {
      if (cats && cats.length) {
        cached = cats
        cachedAt = Date.now()
      }
      inflight = null
      return cached ?? cats
    })
    .catch((err) => {
      inflight = null
      throw err
    })
  return inflight
}

/**
 * Tagastab kõik kategooriad. EI 500'a KUNAGI:
 *  - värske cache → kohe
 *  - vana cache (kuni 24h) → kohe + bg-refresh (stale-while-revalidate)
 *  - cache tühi → proovi fetch (25s); ebaõnnestumisel SSoT-fallback
 */
export async function getCategoriesCached(): Promise<ProductCategory[]> {
  const now = Date.now()

  if (cached && now - cachedAt < FRESH_TTL_MS) {
    return cached // värske
  }

  if (cached && now - cachedAt < STALE_TTL_MS) {
    // Stale-while-revalidate: serveeri vana KOHE, värskenda taustal (ära oota, ära viska).
    void refresh().catch(() => {})
    return cached
  }

  // Cache tühi/aegunud >24h → pead ootama, AGA ebaõnnestumisel SSoT (mitte 500).
  try {
    return await refresh()
  } catch {
    if (cached) return cached
    // SSoT-fallback: märgi STALE'iks (FRESH_TTL taga) → järgmised päringud
    // serveerivad selle KOHE + bg-refresh Medusa poole (ei oota igal korral 25s).
    const ssot = ssotFallback()
    cached = ssot
    cachedAt = Date.now() - FRESH_TTL_MS - 1
    return ssot
  }
}
