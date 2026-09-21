/**
 * sync-synonyms.mjs — taasta Meili synonyms DB product_synonym tabelist.
 *
 * MIKS: index-meilisearch.mjs (täis-reindex) konfigureerib index-settingud →
 * KUSTUTAB synonyms. Vaja iga reindeksi JÄREL uuesti sünkida (KORDUV gotcha).
 *
 * Env: DATABASE_URL, MEILISEARCH_HOST, MEILISEARCH_KEY (või MEILI_MASTER_KEY)
 */
import pg from "pg"

const DB_URL = process.env.DATABASE_URL
const MEILI = process.env.MEILISEARCH_HOST || "http://meili:7700"
const KEY = process.env.MEILISEARCH_KEY || process.env.MEILI_MASTER_KEY
if (!DB_URL) { console.error("DATABASE_URL puudub"); process.exit(1) }
if (!KEY) { console.error("MEILISEARCH_KEY/MEILI_MASTER_KEY puudub"); process.exit(1) }

async function meili(path, method = "GET", body) {
  const r = await fetch(MEILI + path, {
    method,
    headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  const t = await r.text()
  if (!r.ok) throw new Error(`Meili ${r.status} ${method} ${path}: ${t.slice(0, 200)}`)
  return t ? JSON.parse(t) : {}
}

;(async () => {
  const db = new pg.Client({ connectionString: DB_URL })
  await db.connect()
  let rows
  try {
    // word + synonyms + variants (A2 kirjapildi-variandid: õ→o, kokku/lahku) — KÕIK lähevad Meili gruppi.
    ;({ rows } = await db.query(
      "SELECT word, synonyms, COALESCE(variants, '{}') AS variants FROM product_synonym " +
      "WHERE word IS NOT NULL AND word <> ''"
    ))
  } finally {
    await db.end()
  }
  // TÄIS-ÜHENDATUD (kahesuunaline): iga vorm grupis → kõik teised. Meili synonyms EI ole vaikimisi
  // sümmeetriline — kui otsid sünonüümi, peab ka tema → word olema kirjas. Ehita graaf per grupp.
  const m = new Map() // form → Set(muud vormid)
  const add = (a, b) => { if (!m.has(a)) m.set(a, new Set()); if (b !== a) m.get(a).add(b) }
  for (const r of rows) {
    const forms = [r.word, ...(r.synonyms || []), ...(r.variants || [])]
      .map((s) => String(s).toLowerCase().trim()).filter(Boolean)
    const uniq = [...new Set(forms)]
    if (uniq.length < 2) continue
    for (const a of uniq) for (const b of uniq) add(a, b)
  }
  const out = {}
  for (const [w, s] of m) if (s.size) out[w] = [...s]

  const res = await meili("/indexes/products/settings/synonyms", "PUT", out)
  // oota task valmis
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    const t = await meili("/tasks/" + res.taskUid)
    if (t.status === "succeeded") { console.log("OK synonyms:", Object.keys(out).length, "sõna"); return }
    if (t.status === "failed") throw new Error("synonyms task failed: " + JSON.stringify(t.error))
  }
  throw new Error("synonyms task timeout")
})().catch((e) => { console.error("VIGA:", e.message); process.exit(1) })
