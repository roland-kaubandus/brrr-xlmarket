// archive-removal-proposals.mjs — leia feed_status='archived' tooted, mis on kadunud > N päeva (vaikimisi 365)
// → SOFT-KUSTUTAMISE-ETTEPANEK (otsus 4, LÜNK 1b).
//
// ELUTSÜKLI VIIMANE SAMM: in_feed → missing → archived (delist, aga leht+URL elus) → [see skript] → SOFT-DELETE.
//   archive-proposals.mjs seab 'archived' (>90p missing) = kaob otsingust/listingust, AGA /toode/URL renderdub 200.
//   SEE skript: kui archived on püsinud >365p (aasta ilma feedi naasmata) → soft-delete (product.deleted_at=now())
//   + 301 vanemasse kategooriasse (SEO: /toode/{handle} → /kategooriad/{deepest-cat}, MITTE 404).
//
// MIKS SOFT (mitte hard-delete): (a) PÖÖRATAV — deleted_at=NULL + redirect-rida kustutades taastad;
//   (b) SEO — 301 säilitab link-equity, väldib 404-piikki; (c) TAGASITULEK ODAV — kui SKU naaseb feedi,
//   hard-delete tähendaks "uus toode" = taas-import + sisu-regen ($$); soft-delete SKU on veel olemas.
//
// KORDUV-CHURN KAITSE: tooted mille feed_return_count > 0 (on varem archived→feedi naasnud) EI eemaldata —
//   nad churn'ivad tõenäoliselt taas → mõttetu ring (kustuta → naaseb → taas-import). Raport LOENDAB neid
//   eraldi kolonnis ("korduv-churn: EI eemalda"), et otsus oleks nähtav.
//   NB: feed_return_count lisati alles LÜNK 1b juures — ajaloolist churn'i EI OLE → praegu enamik 0.
//   Loendur muutub sisukaks kui churn edaspidi kordub (feed-status-stamp.mjs bump'ib igal tagasitulekul).
//
// Käivitus (medusa konteineris, /app/scripts):
//   node scripts/archive-removal-proposals.mjs                → RAPORT (>365p vaikimisi, buckets + korduv-churn)
//   node scripts/archive-removal-proposals.mjs --days 400     → muu lävi
//   node scripts/archive-removal-proposals.mjs --execute      → KINNITA: soft-delete + 301-redirect
//
// PÄRAST --execute: reindeks (kaob keepIds'ist) + storefront redeploy (middleware loeb uue redirect-map'i):
//   node scripts/export-slug-redirects.mjs   (dumpib product_redirect → slug-redirects.generated.json)
//   FEED_CACHE_PATH=/data/vevor-feed-cache.json node scripts/index-meilisearch.mjs
import pg from "pg"

const args = process.argv.slice(2)
const EXECUTE = args.includes("--execute")
const daysIdx = args.indexOf("--days")
const DAYS = daysIdx >= 0 && args[daysIdx + 1] ? parseInt(args[daysIdx + 1], 10) : 365
const LIMIT_SAMPLE = 15

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

// Kandidaadid: feed_status='archived', kadunud (last_seen) vanem kui DAYS, elus (deleted_at NULL).
// Toome KA korduv-churn'i read (feed_return_count>0) — raport näitab neid, aga EI eemalda.
// to_category_handle = SÜGAVAIM linkitud kategooria (pikim mpath) → ostja maandub lähimasse listingusse.
const { rows } = await c.query(
  `SELECT p.id, p.title, p.handle,
          p.metadata->>'vevor_sku'                                AS vevor_sku,
          p.metadata->>'last_seen_in_feed'                        AS last_seen,
          COALESCE((p.metadata->>'feed_return_count')::int, 0)    AS return_count,
          (CURRENT_DATE - (p.metadata->>'last_seen_in_feed')::date) AS days_gone,
          (SELECT pc.handle
             FROM product_category_product pcp
             JOIN product_category pc ON pc.id = pcp.product_category_id AND pc.deleted_at IS NULL
            WHERE pcp.product_id = p.id
            ORDER BY length(pc.mpath) DESC
            LIMIT 1)                                              AS cat_handle
   FROM product p
   WHERE p.metadata->>'feed_status' = 'archived'
     AND p.metadata ? 'last_seen_in_feed'
     AND (p.metadata->>'last_seen_in_feed')::date <= CURRENT_DATE - ($1 || ' days')::interval
     AND p.deleted_at IS NULL
   ORDER BY days_gone DESC`,
  [String(DAYS)]
)

// Jaga: eemaldatavad (return_count=0) vs korduv-churn kaitstud (return_count>0).
const removable = rows.filter((r) => Number(r.return_count) === 0)
const repeatChurn = rows.filter((r) => Number(r.return_count) > 0)
// Eemaldatavatest need, millel puudub kategooria → EI saa 301 sihti → jäta vahele (raporteeri eraldi).
const removableWithCat = removable.filter((r) => r.cat_handle)
const removableNoCat = removable.filter((r) => !r.cat_handle)

// Konteksti-arvud.
const { rows: ctx } = await c.query(`
  SELECT p.metadata->>'feed_status' AS fs, count(*)::int AS n
  FROM product p
  WHERE p.metadata ? 'feed_status' AND p.deleted_at IS NULL
  GROUP BY p.metadata->>'feed_status'
`)
const byStatus = Object.fromEntries(ctx.map((r) => [r.fs, r.n]))

console.log(`\n=== SOFT-KUSTUTAMISE-ETTEPANEK (archived & kadunud > ${DAYS} päeva) ===`)
console.log(`Feed-olekud (elus): in_feed=${byStatus.in_feed || 0}, missing=${byStatus.missing || 0}, archived=${byStatus.archived || 0}`)
console.log(`\nKandidaate (archived & kadunud >${DAYS}p): ${rows.length}`)
console.log(`  → eemaldatavaid (feed_return_count=0):        ${removable.length}`)
console.log(`     millel kategooria olemas (301 võimalik):  ${removableWithCat.length}`)
console.log(`     ILMA kategooriata (301 võimatu → jäta):   ${removableNoCat.length}`)
console.log(`  → KORDUV-CHURN (feed_return_count>0, EI EEMALDA): ${repeatChurn.length}`)

if (removableWithCat.length > 0) {
  const buckets = { ">730p": 0, "545-730p": 0, [`${DAYS}-545p`]: 0 }
  for (const r of removableWithCat) {
    const d = Number(r.days_gone)
    if (d > 730) buckets[">730p"]++
    else if (d > 545) buckets["545-730p"]++
    else buckets[`${DAYS}-545p`]++
  }
  console.log("\nVanuse-jaotus (eemaldatavad):", Object.entries(buckets).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(", "))
  console.log(`\nNäidis (vanimad ${Math.min(LIMIT_SAMPLE, removableWithCat.length)}):`)
  console.log(`  ${"päevi".padStart(6)}  ${"churn".padStart(5)}  vevor_sku            → /kategooriad/{siht}`)
  for (const r of removableWithCat.slice(0, LIMIT_SAMPLE)) {
    console.log(`  ${String(r.days_gone).padStart(6)}  ${String(r.return_count).padStart(5)}  ${(r.vevor_sku || "").padEnd(20)} ${(r.title || "").slice(0, 40)}  → /kategooriad/${r.cat_handle}`)
  }
}

if (repeatChurn.length > 0) {
  console.log(`\n⚠️  KORDUV-CHURN (kaitstud, EI eemaldata — churn'ib tõenäoliselt taas):`)
  for (const r of repeatChurn.slice(0, LIMIT_SAMPLE)) {
    console.log(`  ${String(r.days_gone).padStart(6)}p  naasnud ${r.return_count}×  ${(r.vevor_sku || "")}  ${(r.title || "").slice(0, 45)}`)
  }
}

if (removableNoCat.length > 0) {
  console.log(`\n⚠️  ILMA KATEGOORIATA (${removableNoCat.length}) — 301-sihti pole, jäetakse alles (käsitsi ülevaatus):`)
  for (const r of removableNoCat.slice(0, LIMIT_SAMPLE)) {
    console.log(`  ${String(r.days_gone).padStart(6)}p  ${(r.vevor_sku || "")}  /toode/${r.handle}`)
  }
}

if (!EXECUTE) {
  console.log(`\n→ RAPORT ainult. Soft-kustutamiseks (Tarmo kinnitus): node scripts/archive-removal-proposals.mjs --days ${DAYS} --execute`)
  await c.end()
  process.exit(0)
}

if (removableWithCat.length === 0) {
  console.log("\nMidagi soft-kustutada pole (eemaldatavaid kategooriaga 0).")
  await c.end()
  process.exit(0)
}

// --execute: tehinguga (a) product_redirect UPSERT + (b) product.deleted_at=now(). Kõik-või-mitte-midagi.
await c.query("BEGIN")
try {
  // Tabel olemas? (idempotentne — kui migratsioon 003 pole veel jooksnud, loo siin).
  await c.query(`
    CREATE TABLE IF NOT EXISTS product_redirect (
      from_handle        TEXT PRIMARY KEY,
      to_category_handle TEXT NOT NULL,
      reason             TEXT NOT NULL DEFAULT 'removed-365p',
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)

  const fromHandles = removableWithCat.map((r) => r.handle)
  const toCats = removableWithCat.map((r) => r.cat_handle)
  const ids = removableWithCat.map((r) => r.id)

  // 301-redirect read (upsert, et --execute oleks korratav).
  await c.query(
    `INSERT INTO product_redirect (from_handle, to_category_handle, reason)
     SELECT unnest($1::text[]), unnest($2::text[]), 'removed-365p'
     ON CONFLICT (from_handle) DO UPDATE SET to_category_handle = EXCLUDED.to_category_handle`,
    [fromHandles, toCats]
  )

  // Soft-delete: product.deleted_at=now(). Reindeks jätab kustutatud vahele (keepIds),
  // storefront getProduct tagastab null → middleware 301 (kui redeploy'itud) VÕI page notFound → nüüd redirect.
  const CHUNK = 2000
  let done = 0
  for (let i = 0; i < ids.length; i += CHUNK) {
    const idc = ids.slice(i, i + CHUNK)
    await c.query(
      `UPDATE product SET deleted_at = NOW()
       FROM (SELECT unnest($1::text[]) AS id) d
       WHERE product.id = d.id AND product.deleted_at IS NULL`,
      [idc]
    )
    done += idc.length
  }
  await c.query("COMMIT")
  console.log(`\n✅ Soft-kustutatud: ${done} toodet (deleted_at=now()).`)
  console.log(`   301-redirect read salvestatud: ${fromHandles.length} (product_redirect tabelis).`)
  console.log(`\n   JÄRGMISED SAMMUD (muidu redirect + delist ei jõustu):`)
  console.log(`   1) node scripts/export-slug-redirects.mjs   (product_redirect → slug-redirects.generated.json)`)
  console.log(`   2) FEED_CACHE_PATH=/data/vevor-feed-cache.json node scripts/index-meilisearch.mjs  (kaob indeksist)`)
  console.log(`   3) git push (main + taxonomy-v4) + Coolify redeploy k33g  (middleware saab uue map'i)`)
} catch (e) {
  await c.query("ROLLBACK")
  console.error("❌ Tehing tagasi keeratud (ROLLBACK):", e.message)
  await c.end()
  process.exit(1)
}

await c.end()
