// archive-proposals.mjs — leia feed_status='missing' tooted, mis on kadunud > N päeva → ARHIVEERIMIS-ETTEPANEK.
//
// Vaikimisi = RAPORT (Tarmo vaatab üle, KINNITAB). --execute seab feed_status='archived' (= delist).
// Arhiveerimine EI kustuta ega peida lehte: toode jääb Medusa's `published` → toote-API loeb Medusa'st
// → LEHT + URL renderdub 200 (SEO SÄILIB). Ainult Meili-indeks jätab archived vahele (index-meilisearch.mjs
// filter) → kaob otsingust + ProductGrid'ist + kategooria-listingust.
//
// TAGASITULEK: kui SKU tuleb feedi tagasi, feed-status-stamp.mjs un-archive'ib automaatselt (SKU järgi,
// EI loo uut). Seega arhiveerimine on täielikult pööratav.
//
// Käivitus (konteineris):
//   node scripts/archive-proposals.mjs                 → raport (>90p vaikimisi)
//   node scripts/archive-proposals.mjs --days 120      → muu lävi
//   node scripts/archive-proposals.mjs --execute       → KINNITA: sea archived (+ juhis reindeksiks)
import pg from "pg"

const args = process.argv.slice(2)
const EXECUTE = args.includes("--execute")
const daysIdx = args.indexOf("--days")
const DAYS = daysIdx >= 0 && args[daysIdx + 1] ? parseInt(args[daysIdx + 1], 10) : 90
const LIMIT_SAMPLE = 15

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

// Kandidaadid: feed_status='missing' JA last_seen_in_feed vanem kui DAYS päeva.
const { rows } = await c.query(
  `SELECT p.id, p.title, p.handle,
          p.metadata->>'vevor_sku'         AS vevor_sku,
          p.metadata->>'last_seen_in_feed' AS last_seen,
          (CURRENT_DATE - (p.metadata->>'last_seen_in_feed')::date) AS days_missing
   FROM product p
   WHERE p.metadata->>'feed_status' = 'missing'
     AND p.metadata ? 'last_seen_in_feed'
     AND (p.metadata->>'last_seen_in_feed')::date <= CURRENT_DATE - ($1 || ' days')::interval
     AND p.deleted_at IS NULL
   ORDER BY days_missing DESC`,
  [String(DAYS)]
)

// Konteksti-arvud: kui palju on missing kokku (ka <DAYS), kui palju juba archived.
const { rows: ctx } = await c.query(`
  SELECT p.metadata->>'feed_status' AS fs, count(*)::int AS n
  FROM product p
  WHERE p.metadata ? 'feed_status' AND p.deleted_at IS NULL
  GROUP BY p.metadata->>'feed_status'
`)
const byStatus = Object.fromEntries(ctx.map((r) => [r.fs, r.n]))

console.log(`\n=== ARHIVEERIMIS-ETTEPANEK (kadunud > ${DAYS} päeva) ===`)
console.log(`Feed-olekud kokku: in_feed=${byStatus.in_feed || 0}, missing=${byStatus.missing || 0}, archived=${byStatus.archived || 0}`)
console.log(`\nKandidaate (missing & kadunud >${DAYS}p): ${rows.length}`)

if (rows.length > 0) {
  const buckets = { ">180p": 0, "90-180p": 0, [`${DAYS}-90p`]: 0 }
  for (const r of rows) {
    const d = Number(r.days_missing)
    if (d > 180) buckets[">180p"]++
    else if (d > 90) buckets["90-180p"]++
    else buckets[`${DAYS}-90p`]++
  }
  console.log("Vanuse-jaotus:", Object.entries(buckets).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(", "))
  console.log(`\nNäidis (vanimad ${Math.min(LIMIT_SAMPLE, rows.length)}):`)
  for (const r of rows.slice(0, LIMIT_SAMPLE)) {
    console.log(`  ${r.days_missing}p  ${r.vevor_sku}  ${(r.title || "").slice(0, 55)}  /toode/${r.handle}`)
  }
}

if (!EXECUTE) {
  console.log(`\n→ RAPORT ainult. Arhiveerimiseks (Tarmo kinnitus): node scripts/archive-proposals.mjs --days ${DAYS} --execute`)
  await c.end()
  process.exit(0)
}

if (rows.length === 0) { console.log("\nMidagi arhiveerida pole."); await c.end(); process.exit(0) }

// --execute: sea feed_status='archived'. Delist jõustub järgmisel reindeksil (index jätab archived vahele).
const ids = rows.map((r) => r.id)
const CHUNK = 2000
let done = 0
for (let i = 0; i < ids.length; i += CHUNK) {
  const idc = ids.slice(i, i + CHUNK)
  await c.query(
    `UPDATE product p
     SET metadata = COALESCE(p.metadata, '{}'::jsonb) || jsonb_build_object('feed_status', 'archived')
     FROM (SELECT unnest($1::text[]) AS id) d
     WHERE p.id = d.id`,
    [idc]
  )
  done += idc.length
}
console.log(`\n✅ Arhiveeritud (feed_status='archived'): ${done} toodet.`)
console.log(`   Leht+URL jäävad elus (Medusa published). Delist jõustub reindeksil:`)
console.log(`   FEED_CACHE_PATH=/data/vevor-feed-cache.json node scripts/index-meilisearch.mjs`)
console.log(`   (või oota 4h refresh-feed-cache.sh cron'i).`)

await c.end()
