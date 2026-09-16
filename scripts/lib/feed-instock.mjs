// feed-instock.mjs — jagatud abifunktsioon: too Meili'st NENDE toodete id-komplekt, mis on OSTETAVAD
// (in_stock = true). Väline feed (osta.ee, Facebook Commerce) TOHIB eksportida AINULT ostetavaid tooteid
// (Tarmo otsus 5, LÜNK 1b): väljamüüdud/otsas/arhiveeritud tooted on storefront'il nähtavad "väljamüüdud"-
// sildiga, AGA väljas-feedis EI tohi neid pakkuda "in stock"-ina (klient ostaks Facebookist tarnimatu toote).
//
// ÜKS tõe-allikas: `in_stock` Meili's = isOosFromFeed (index-meilisearch.mjs) = sama predikaat mis
// storefront-kaart + toote-API. Feed filtreerib SAMA tõe vastu → ei lahkne.
//
// Meili doc.id === Medusa product.id (index-meilisearch.mjs transform: id: row.id) → filter product.id järgi.

const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_KEY || ""
const INDEX = "products"
const PAGE = 1000

/**
 * Tagastab Set<string> — Meili in_stock=true toodete id-d. Viskab (fail-loud) kui Meili maas —
 * kutsuja peab otsustama: parem katkestada kui eksportida KÕIK (sh väljamüüdud) või MITTE ÜHTKI.
 */
export async function fetchInStockIds() {
  if (!MEILI_KEY) throw new Error("MEILISEARCH_KEY env puudub — feed-filter ei saa Meili in_stock tõde lugeda")
  const ids = new Set()
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(`${MEILI_HOST}/indexes/${INDEX}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${MEILI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        q: "",
        filter: ["in_stock = true"],
        limit: PAGE,
        offset,
        attributesToRetrieve: ["id"],
      }),
    })
    if (!res.ok) throw new Error(`Meili in_stock päring HTTP ${res.status}`)
    const data = await res.json()
    const hits = data.hits || []
    for (const h of hits) if (h.id) ids.add(String(h.id))
    if (hits.length < PAGE) break
  }
  if (ids.size === 0) {
    // Tühi komplekt = kahtlane (Meili tühi / filter katki). Parem katkestada kui genereerida tühi feed
    // VÕI (kui kutsuja ignoreeriks) eksportida kõik. Fail-loud.
    throw new Error("Meili tagastas 0 in_stock toodet — kahtlane (indeks tühi?). Feed katkestatud.")
  }
  return ids
}
