/**
 * import-new-drafts.mjs — KONTEINER-NATIIVNE draft-importer (feed-pipeline samm [3]).
 *
 * JOOKSUTUS: `medusa exec` (mitte tavaline node) — annab Medusa framework-konteineri (workflow'd +
 * moodulid) ILMA REST-admin-auth'ita. Sama muster mis sibling-cron-skriptid (pg/moodul otse, mitte HTTP).
 *   docker exec <medusa> npx medusa exec scripts/import-new-drafts.mjs -- --skus-file /tmp/x.txt --execute
 *
 * ROLL (propose-not-create): loob AINULT UUED SKU-d (feed ∖ DB) `status:"draft"`, KATEGOORIATA.
 * EI loo kategooriaid, EI publitseeri, EI puuduta olemasolevaid tooteid.
 *   - Kodu (kategooria) määrab samm [4] pipeline-classify.mjs (Opus, olemas-L3 auto ≥0.85; uus tüüp /
 *     madal kindlus → review-bucket → INIMENE). Klassifikaator flip'ib draft→published alles paigutusel.
 *   - Autoriteetse hinna (tiered computeRetail) paneb samm [5] pipeline-reprice.mjs ENNE reindeksit [7].
 *     Siin ainult PLATSHOIDJA (feed MAP * 1.15, SENTIDES nagu kogu kataloog); draft pole nähtav enne [5]+[7].
 *
 * MIKS ERALDI import-feed-v2.mjs asemel: v2 loob feed-teekonnast KATEGOORIAD (rikub SSoT +
 * propose-not-create) ja publitseerib kohe (kodutu-nähtav toode). See skript ei tee kumbagi.
 *
 * PIIRANG (teadlik, esimene versioon): iga uus SKU = eraldi 1-variandiline draft. SPU-grupeerimist
 * (mitme-variandi koond) EI tehta — see on täis-impordi (v2) töö. Propose-not-create faasis piisab.
 *
 * Argumendid (POSITSIOONILISED — medusa exec sööb ise `--flags`, seega ainult positsioon):
 *   arg0 = skus-fail   ainult loendis olevad SKU-d (orchestraatori comm-tulem; "-" = arvuta ise)
 *   arg1 = "execute"   loo draftid (muu/puudub = DRY: loe + raporteeri, EI kirjuta)
 *   arg2 = limit       piira loodavate arv (valikuline)
 * Näide: npx medusa exec scripts/import-new-drafts.mjs /tmp/pl-new-skus.txt execute
 *
 * Väljund (masin-loetav, orchestraatorile): read `NEW_DRAFTS=<n>` ja `CREATED=<n>`.
 * FAIL-LOUD: cache puudub / cache liiga väike / mõni create nurjus (execute) → throw (exit != 0).
 */

import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/core-flows"
import { randomUUID } from "crypto"
import fs from "fs"

const CACHE_PATH = process.env.FEED_CACHE_PATH || "/data/vevor-feed-cache.json"
const PRICE_MARKUP = 1.15          // PLATSHOIDJA — samm [5] reprice asendab autoriteetse computeRetail'iga
const MIN_CACHE_SKU = 10000        // < 10k = osaline/katkine cache → EI impordi (mass-vale oht)

function slugify(str) {
  return (str || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "")
}
function makeHandle(sku, title) {
  const base = slugify(title).slice(0, 60).replace(/-$/, "")
  return base ? `${base}-${slugify(sku)}` : slugify(sku)
}

// Ehita 1-variandiline draft cache-kirjest. KATEGOORIATA, status="draft". Hind SENTIDES (kogu kataloog nii).
// NB: shipping_profile'i EI pane siia — createProductsWorkflow'i upsert vajab unikaal-piirangut
// (product_id, shipping_profile_id), mida selles DB-s POLE (Medusa skeemi-triiv → ON CONFLICT crash).
// Link luuakse pärast loomist otse-INSERT'iga (vt attachShippingProfiles).
function buildDraftPayload(entry, salesChannelId) {
  const priceEur = typeof entry.priceEur === "number" && entry.priceEur > 0 ? entry.priceEur : 0
  const amount = Math.round(priceEur * PRICE_MARKUP * 100)   // sendid; platshoidja, [5] reprice asendab
  return {
    title: entry.title,
    handle: makeHandle(entry.sku, entry.title),
    description: entry.descriptionText || "",
    status: "draft",                                          // ← EI publitseeri (kodutu-nähtavuse vältimine)
    thumbnail: entry.image || undefined,
    images: entry.image ? [{ url: entry.image }] : [],
    options: [{ title: "Default", values: ["Default"] }],
    variants: [
      {
        title: "Default",
        sku: entry.sku,
        barcode: entry.upc || undefined,
        manage_inventory: true,
        prices: [{ amount, currency_code: "eur" }],
        options: { Default: "Default" },
      },
    ],
    sales_channels: salesChannelId ? [{ id: salesChannelId }] : [],
    metadata: {
      vevor_sku: entry.sku,
      vevor_upc: entry.upc || "",
      vevor_link: entry.link || "",
      vevor_product_type: entry.productType || "",
      vevor_spu: entry.spu || "",
      weight_kg: entry.weightKg || 0,
      selling_points: entry.sellingPoints || [],
      dimensions: entry.dimensions || null,
      brand: entry.brand || "",
      image_link: entry.image || "",
      draft_source: "import-new-drafts",   // päritolu-märgend (review/klassifikaatori jaoks)
      needs_category: true,                // klassifikaator [4] otsib neid (unhomed)
    },
    // categories: PUUDUB TAOTLUSLIKULT — kodu määrab samm [4].
  }
}

export default async function importNewDrafts({ container, args = [] }) {
  // Positsioonilised (medusa exec sööb --flags): arg0=skus-fail("-"=arvuta), arg1="execute", arg2=limit.
  const SKUS_FILE = args[0] && args[0] !== "-" ? args[0] : ""
  const EXECUTE = (args[1] || "").toLowerCase() === "execute"
  const LIMIT = args[2] ? parseInt(args[2], 10) || 0 : 0

  if (!fs.existsSync(CACHE_PATH)) throw new Error(`feed-cache puudub: ${CACHE_PATH}`)
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"))
  const bySku = cache.bySku || {}
  const cacheN = Object.keys(bySku).length
  if (cacheN < MIN_CACHE_SKU) throw new Error(`cache ainult ${cacheN} SKU (< ${MIN_CACHE_SKU}) — osaline feed, EI impordi`)

  console.log(`=== IMPORT-NEW-DRAFTS (${EXECUTE ? "EXECUTE" : "DRY-RUN"}) ===`)
  console.log(`  cache=${CACHE_PATH} (${cacheN} SKU)`)

  // ── Vaikimisi müügikanal + saatmisprofiil (workflow nõuab shipping_profile'i) ──
  const scModule = container.resolve(Modules.SALES_CHANNEL)
  const scList = await scModule.listSalesChannels({}, { take: 5 })
  const salesChannelId = (scList.find((s) => !s.is_disabled) || scList[0])?.id || ""
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const spList = await fulfillmentModule.listShippingProfiles({}, { take: 5 })
  const shippingProfileId = spList[0]?.id || ""
  console.log(`  sales_channel=${salesChannelId || "(puudub!)"} · shipping_profile=${shippingProfileId || "(puudub!)"}`)
  if (!shippingProfileId) throw new Error("saatmisprofiil puudub — createProductsWorkflow ebaõnnestuks")

  const productModule = container.resolve(Modules.PRODUCT)

  // ── Uute SKU-de loend: failist (kiire) VÕI arvuta moodulist (fallback) ──
  let newSkus
  if (SKUS_FILE) {
    if (!fs.existsSync(SKUS_FILE)) throw new Error(`--skus-file puudub: ${SKUS_FILE}`)
    const listed = fs.readFileSync(SKUS_FILE, "utf8").split("\n").map((s) => s.trim()).filter(Boolean)
    newSkus = listed.filter((s) => bySku[s])
    console.log(`  --skus-file: ${listed.length} loendis, ${newSkus.length} cache'is olemas`)
  } else {
    console.log("  --skus-file puudub → arvutan uued SKU-d toote-moodulist (aeglane)…")
    const existing = new Set()
    let offset = 0
    for (;;) {
      const page = await productModule.listProducts({}, { select: ["id", "metadata"], take: 200, skip: offset })
      if (!page.length) break
      for (const p of page) { const s = p.metadata?.vevor_sku; if (s) existing.add(String(s)) }
      offset += page.length
      if (page.length < 200) break
    }
    newSkus = Object.keys(bySku).filter((s) => !existing.has(s))
    console.log(`  DB=${existing.size} SKU · uusi (cache∖DB)=${newSkus.length}`)
  }

  if (LIMIT > 0 && newSkus.length > LIMIT) { console.log(`  --limit ${LIMIT} (${newSkus.length}→${LIMIT})`); newSkus = newSkus.slice(0, LIMIT) }

  console.log(`NEW_DRAFTS=${newSkus.length}`)
  if (newSkus.length === 0) { console.log("  0 uut SKU-d → import-samm vahele (steady-state)"); console.log("CREATED=0"); return }

  if (!EXECUTE) {
    console.log(`  [DRY] ${newSkus.length} draft'i loodaks (status=draft, kategooriata). Näidised:`)
    for (const s of newSkus.slice(0, 5)) console.log(`     · ${s}  ${(bySku[s].title || "").slice(0, 60)}`)
    console.log("CREATED=0")
    return
  }

  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  // Lingi vaikimisi saatmisprofiil OTSE (workflow'i katkise upsert'i asemel). Idempotent: ainult kui puudub.
  async function attachShippingProfiles(productIds) {
    if (!shippingProfileId || !productIds.length) return
    const rows = productIds.map((pid) => ({
      id: "prodsp_" + randomUUID().replace(/-/g, "").toUpperCase().slice(0, 26),
      product_id: pid,
      shipping_profile_id: shippingProfileId,
    }))
    await knex.raw(
      `INSERT INTO product_shipping_profile (id, product_id, shipping_profile_id, created_at, updated_at)
       SELECT v.id, v.product_id, v.shipping_profile_id, now(), now()
       FROM jsonb_to_recordset(?::jsonb) AS v(id text, product_id text, shipping_profile_id text)
       WHERE NOT EXISTS (SELECT 1 FROM product_shipping_profile e
                         WHERE e.product_id=v.product_id AND e.shipping_profile_id=v.shipping_profile_id AND e.deleted_at IS NULL)`,
      [JSON.stringify(rows)],
    )
  }

  // ── Loo draftid (kaupa 25 — workflow talub batch'i; väldib üht-hiigel-transaktsiooni) ──
  const products = newSkus.map((s) => buildDraftPayload(bySku[s], salesChannelId))
  let created = 0
  const failed = []
  const CHUNK = 25
  for (let i = 0; i < products.length; i += CHUNK) {
    const batch = products.slice(i, i + CHUNK)
    try {
      const { result } = await createProductsWorkflow(container).run({ input: { products: batch } })
      const ids = (result || []).map((p) => p.id).filter(Boolean)
      await attachShippingProfiles(ids)
      created += ids.length || batch.length
    } catch (e) {
      // Batch nurjus → proovi ükshaaval, et üks halb rida ei tapaks tervet batch'i.
      for (const p of batch) {
        try {
          const { result } = await createProductsWorkflow(container).run({ input: { products: [p] } })
          await attachShippingProfiles((result || []).map((r) => r.id).filter(Boolean))
          created++
        } catch (e2) { if (failed.length < 20) failed.push(`${p.variants?.[0]?.sku}: ${String(e2.message).slice(0, 140)}`) }
      }
    }
  }
  console.log(`CREATED=${created}`)
  console.log(`  loodud=${created} · vigu=${failed.length}`)
  if (failed.length > 0) {
    console.error(`❌ ${failed.length} draft'i loomine NURJUS (näited):`)
    for (const f of failed) console.error(`     · ${f}`)
    throw new Error(`${failed.length} draft'i loomine nurjus — pipeline ei tohi jätkata poolikult`)
  }
}
