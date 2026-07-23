// feed-status-stamp.mjs — stamp `last_seen_in_feed` + `feed_status` iga feed-managed toote metadata'sse.
//
// MIKS: churn'inud tooted (feedist kadunud) jäid kataloogi "hõredate lehtedena" ilma jäljeta,
// millal nad viimati feedis olid → ei saanud vanuse järgi arhiveerida. See skript annab igale
// feed-managed tootele feed-oleku + viimati-nähtud kuupäeva, mille alusel archive-proposals.mjs
// pakub >90p kadunuid arhiveerimiseks (Tarmo kinnitab).
//
// FEED-MANAGED = variant.sku === metadata.vevor_sku (sama churn-loogika mis index-meilisearch.mjs).
// Custom/Outlet tooted (sku ≠ vevor_sku) EI ole feed-managed → EI stamp'ita (jäävad puutumata).
//
// OLEKU-LOOGIKA (iga jooksu juures):
//   in-feed (SKU cache'is):  feed_status=in_feed, last_seen_in_feed=TÄNA (bump).
//                            Kui oli 'archived' → TAGASITULEK → un-archive (in_feed). Logitakse.
//   kadunud (pole cache'is): feed_status='missing' (VÕI jäta 'archived' kui juba arhiveeritud).
//                            last_seen_in_feed: kui puudub → BOOTSTRAP=created_at (ühekordne;
//                            aprilli orb-batch). Kui olemas → SÄILITA (viimane päris-feedis kuupäev).
//
// Stamp ISE EI delist'i midagi — ainult archive-proposals.mjs --execute seab 'archived' (= otsingust/
// listingust välja). Seega turvaline joosta iga feed-refresh'i juures (refresh-feed-cache.sh samm).
//
// Käivitus (konteineris): FEED_CACHE_PATH=/data/vevor-feed-cache.json node scripts/feed-status-stamp.mjs
//   --dry-run  → arvuta + raporteeri, ÄRA kirjuta.
import pg from "pg"
import fs from "fs"

const DRY = process.argv.includes("--dry-run")
const CACHE_PATH = process.env.FEED_CACHE_PATH || "/data/vevor-feed-cache.json"
const TODAY = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

function loadInFeed() {
  if (!fs.existsSync(CACHE_PATH)) {
    console.error(`❌ Feed-cache puudub: ${CACHE_PATH} — katkestan (ei taha valelikult kõiki 'missing'iks stampida).`)
    process.exit(2)
  }
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"))
  const bySku = cache.bySku || {}
  if (Object.keys(bySku).length === 0) {
    console.error("❌ Feed-cache TÜHI — katkestan (guard: tühi cache → ei stamp'i kõiki 'missing'iks).")
    process.exit(2)
  }
  return { inFeed: new Set(Object.keys(bySku)), generatedAt: cache.generatedAt || "?" }
}

const { inFeed, generatedAt } = loadInFeed()
console.log(`Feed-cache: ${inFeed.size} SKU-d (generatedAt=${generatedAt}). TÄNA=${TODAY}. ${DRY ? "[DRY-RUN]" : ""}`)

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

const { rows } = await c.query(`
  SELECT p.id, p.created_at,
         p.metadata->>'vevor_sku'          AS vevor_sku,
         v.sku                             AS variant_sku,
         p.metadata->>'last_seen_in_feed'  AS last_seen,
         p.metadata->>'feed_status'        AS feed_status
  FROM product p
  JOIN product_variant v ON v.product_id = p.id AND v.deleted_at IS NULL
  WHERE p.metadata->>'vevor_sku' IS NOT NULL AND p.deleted_at IS NULL
`)

const ids = [], lastSeens = [], statuses = []
const stat = { in_feed: 0, missing: 0, archived: 0, returns: 0, bootstrapped: 0, skippedNonManaged: 0 }

for (const r of rows) {
  const managed = r.vevor_sku && r.variant_sku && String(r.vevor_sku).trim() === String(r.variant_sku).trim()
  if (!managed) { stat.skippedNonManaged++; continue }

  const sku = String(r.vevor_sku).trim()
  let feedStatus, lastSeen

  if (inFeed.has(sku)) {
    // IN-FEED: bump last_seen, un-archive kui vaja.
    feedStatus = "in_feed"
    lastSeen = TODAY
    if (r.feed_status === "archived") stat.returns++ // tagasitulek: leiti SKU järgi, EI loo uut
    stat.in_feed++
  } else {
    // KADUNUD: säilita arhiveeritu-olek; muidu 'missing'. last_seen = säilita VÕI bootstrap created_at.
    feedStatus = r.feed_status === "archived" ? "archived" : "missing"
    if (r.last_seen) {
      lastSeen = r.last_seen // säilita viimane päris-feedis kuupäev
    } else {
      lastSeen = new Date(r.created_at).toISOString().slice(0, 10) // BOOTSTRAP (ühekordne)
      stat.bootstrapped++
    }
    if (feedStatus === "archived") stat.archived++; else stat.missing++
  }

  ids.push(r.id); lastSeens.push(lastSeen); statuses.push(feedStatus)
}

console.log(
  `\nFeed-managed: ${ids.length}` +
  `\n  in_feed:      ${stat.in_feed}` +
  `\n  missing:      ${stat.missing}` +
  `\n  archived:     ${stat.archived}` +
  `\n  tagasitulnud (archived→in_feed sel jooksul): ${stat.returns}` +
  `\n  bootstrap'itud (last_seen=created_at, ühekordne): ${stat.bootstrapped}` +
  `\n  vahele (mitte-managed, custom/outlet): ${stat.skippedNonManaged}`
)

if (DRY) { console.log("\n[DRY-RUN] Midagi ei kirjutatud."); await c.end(); process.exit(0) }

// Bulk-update jsonb merge'iga, chunk'itud (unnest).
const CHUNK = 2000
let written = 0
for (let i = 0; i < ids.length; i += CHUNK) {
  const idc = ids.slice(i, i + CHUNK), lsc = lastSeens.slice(i, i + CHUNK), fsc = statuses.slice(i, i + CHUNK)
  await c.query(
    `UPDATE product p
     SET metadata = COALESCE(p.metadata, '{}'::jsonb)
                    || jsonb_build_object('last_seen_in_feed', d.ls, 'feed_status', d.fs)
     FROM (SELECT unnest($1::text[]) AS id, unnest($2::text[]) AS ls, unnest($3::text[]) AS fs) d
     WHERE p.id = d.id`,
    [idc, lsc, fsc]
  )
  written += idc.length
  process.stdout.write(`  kirjutatud ${written}/${ids.length}\r`)
}
console.log(`\n✅ Stamp valmis: ${written} toodet uuendatud.`)

await c.end()
