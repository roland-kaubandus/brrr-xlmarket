#!/usr/bin/env node
/**
 * outlet-crossdisplay.mjs — Outlet = KODU (esmane), tüüp-kategooria = valikuline LISA-kuvamine.
 *
 * Tarmo lõplik loogika (2026-09-19, Osa 48):
 *   - KODU = Outlet L2 (rikutud-pakend / defektiga / leiunurk). Toode tagastatud/rikutud
 *     → tõstetakse OUTLETISSE (üks kodu, nagu Wind Turbine praegu). See on ESMANE seos.
 *   - KUVAMINE EDASI = valikuline. Kui outlet-tootel on sobiv tüüp (nt Wind Turbine →
 *     Tuulegeneraatorid), lisame LISA kategooria-seose → toode kuvatakse ka tüüp-lehel.
 *   - Ühekordne (Leiunurk, tüübitu) → jääb AINULT Outletisse (pole selles mapis).
 *
 * VASTUPIDINE varasemale (tüüp=kodu, outlet=topelt). Nüüd: outlet=kodu, tüüp=lisa.
 *
 * MIS TEHAKSE (additiivne — EI eemalda KUNAGI outlet-kodu):
 *   - Iga TYPE_DISPLAY kirje puhul: kui toode on outlet-L2-s, LISA (INSERT ON CONFLICT
 *     DO NOTHING) tüüp-kategooria seos. Kodu-seos jääb puutumata.
 *   - Idempotent: teistkordne jooks ei tee midagi (ON CONFLICT DO NOTHING).
 *
 * SILT REISIB KAASA (storefront juba tehtud, commit 7356032f): sildid tuletatakse
 * product.categories union'ist → kui toode on outlet-L2 + tüüp-kategoorias, mõlemal
 * lehel näitab "Outlet toode" + L2-silt. Selle skripti LISA-seos ongi see, mis paneb
 * toote tüüp-lehele; sildid tulevad automaatselt kaasa.
 *
 * PÄRAST JOOKSU: index-meilisearch.mjs (taxonomy.ancestors ehitatakse ümber union'ina
 * kõigist seostest → toode ilmub mõlemale kategoorialehele) + Coolify redeploy pole vaja
 * (struktuur ei muutu, ainult toote-lingid → AINULT Meili reindeks, vt CLAUDE.md deploy-nüanss).
 *
 * KASUTUS:
 *   node scripts/outlet-crossdisplay.mjs            # dry-run + diagnostika
 *   node scripts/outlet-crossdisplay.mjs --execute  # rakenda LISA-seosed
 *
 * ⚠️ BACKEND HETKEL MAAS — skript on VALMIS, aga EI ole jooksutatud. Käivita kui backend üleval.
 */

import pg from "pg"

const PG_CONFIG = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5435),
  user: process.env.PGUSER || "xlmarket",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || "xlmarket",
}

const EXECUTE = process.argv.includes("--execute")

// Outlet L2 KODU-handle'id (SSoT: taxonomy.yaml v4-outlet child'id).
const OUTLET_L2_HANDLES = [
  "v4-outlet-rikutud-pakend",
  "v4-outlet-defektiga-toode",
  "v4-outlet-leiunurk",
]

/**
 * VALIKULINE TÜÜP-KUVAMINE (reviewed, konservatiivne). Iga kirje: outlet-toode, mis
 * saab LISA kuvamise tüüp-kategoorias. match = kuidas toode tuvastada (title-regex või
 * sku); type_handle = tüüp-kategooria, kuhu LISA-kuvada.
 *
 * Leiunurk / ühekordsed / tüübitud tooted EI ole siin → jäävad AINULT Outletisse (õige).
 * Uue outlet-toote tüüp-kuvamise lisamiseks: lisa kirje siia + jooksuta uuesti (idempotent).
 */
const TYPE_DISPLAY = [
  {
    label: "Wind Turbine → Tuulegeneraatorid",
    match: { title_re: /wind turbine|tuulegeneraator/i },
    type_handle:
      "v4-elektritarvikud-ja-valgustus-taastuvenergia-ja-generaatorid-tuulegeneraatorid",
  },
]

async function main() {
  console.log("=== outlet-crossdisplay (Outlet=kodu + valikuline tüüp-kuvamine) ===")
  console.log(EXECUTE ? "MODE: EXECUTE" : "MODE: dry-run")

  const c = new pg.Client(PG_CONFIG)
  await c.connect()

  // 1. Resolve kõik vajalikud kategooria-ID'd (outlet L2 + tüüp-handle'id).
  const wantedHandles = [
    ...OUTLET_L2_HANDLES,
    ...TYPE_DISPLAY.map((t) => t.type_handle),
  ]
  const catRes = await c.query(
    `SELECT id, handle, name FROM product_category
     WHERE handle = ANY($1) AND deleted_at IS NULL`,
    [wantedHandles]
  )
  const idByHandle = new Map(catRes.rows.map((r) => [r.handle, r.id]))
  const missing = wantedHandles.filter((h) => !idByHandle.has(h))
  if (missing.length) {
    console.error("PUUDU kategooriad DB-s:", missing)
    await c.end()
    process.exit(1)
  }
  const outletL2Ids = OUTLET_L2_HANDLES.map((h) => idByHandle.get(h))

  // 2. DIAGNOSTIKA: kõik tooted outlet-L2-des + nende praegused seosed.
  const prodRes = await c.query(
    `SELECT p.id, p.title,
            array_agg(DISTINCT pc2.handle) AS handles
     FROM product_category_product pcp
     JOIN product p ON p.id = pcp.product_id AND p.deleted_at IS NULL
     JOIN product_category_product pcp2 ON pcp2.product_id = p.id
     JOIN product_category pc2 ON pc2.id = pcp2.product_category_id AND pc2.deleted_at IS NULL
     WHERE pcp.product_category_id = ANY($1)
     GROUP BY p.id, p.title
     ORDER BY p.title`,
    [outletL2Ids]
  )
  console.log(`\nOutlet-toodete arv (L2-des): ${prodRes.rows.length}`)
  for (const p of prodRes.rows) {
    const outletHandles = p.handles.filter((h) => OUTLET_L2_HANDLES.includes(h))
    const typeHandles = p.handles.filter((h) => !OUTLET_L2_HANDLES.includes(h))
    console.log(`  • ${p.title.slice(0, 70)}`)
    console.log(`      kodu: ${outletHandles.join(", ") || "(puudub!)"}`)
    console.log(`      muud seosed: ${typeHandles.length ? typeHandles.join(", ") : "(pole)"}`)
  }

  // 3. Rakenda TYPE_DISPLAY: LISA tüüp-seos igale sobivale outlet-tootele (additiivne).
  const outletProductIds = new Set(prodRes.rows.map((r) => r.id))
  const productById = new Map(prodRes.rows.map((r) => [r.id, r]))
  const planned = []
  for (const rule of TYPE_DISPLAY) {
    const typeId = idByHandle.get(rule.type_handle)
    for (const p of prodRes.rows) {
      if (rule.match.title_re && !rule.match.title_re.test(p.title)) continue
      if (rule.match.sku && !String(p.title).includes(rule.match.sku)) continue
      // Juba seotud selle tüübiga? → jäta vahele (idempotent-diagnostika).
      const already = p.handles.includes(rule.type_handle)
      planned.push({ product_id: p.id, title: p.title, typeId, type_handle: rule.type_handle, label: rule.label, already })
    }
  }

  console.log(`\nPlaneeritud LISA tüüp-kuvamised: ${planned.length}`)
  for (const pl of planned) {
    console.log(`  ${pl.already ? "○ (juba olemas)" : "+ LISA"} ${pl.title.slice(0, 55)} → ${pl.type_handle} [${pl.label}]`)
  }

  const toAdd = planned.filter((pl) => !pl.already)
  // Sanity: iga sihitud toode PEAB olema outlet-kodus (muidu pole outlet-toode → ei ristkuva).
  for (const pl of toAdd) {
    if (!outletProductIds.has(pl.product_id)) {
      console.error(`STOP: ${pl.title} pole outlet-L2-s — ei tohi ristkuvada.`)
      await c.end()
      process.exit(1)
    }
  }

  if (toAdd.length === 0) {
    console.log("\nMidagi lisada pole (kõik juba olemas või tühi). Valmis.")
    await c.end()
    return
  }

  if (EXECUTE) {
    await c.query("BEGIN")
    for (const pl of toAdd) {
      // ADDITIIVNE: LISA tüüp-seos. Outlet-kodu jääb PUUTUMATA (ei DELETE).
      await c.query(
        `INSERT INTO product_category_product (product_id, product_category_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [pl.product_id, pl.typeId]
      )
    }
    await c.query("COMMIT")
    console.log(`\nCOMMITTED: ${toAdd.length} LISA tüüp-kuvamise seost lisatud (kodud puutumata).`)
    console.log("JÄRGMINE: node backend/scripts/index-meilisearch.mjs (taxonomy.ancestors reindeks)")
    console.log("  → tooted ilmuvad tüüp-lehele, sildid reisivad kaasa. Struktuur ei muutu → redeploy pole vaja.")
  } else {
    console.log("\n(dry-run — pass --execute to apply)")
  }

  await c.end()
  void productById
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
