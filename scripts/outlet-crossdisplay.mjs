#!/usr/bin/env node
/**
 * outlet-crossdisplay.mjs — Outlet = KODU (esmane), tüüp-kategooria = valikuline LISA-kuvamine.
 *
 * Tarmo lõplik loogika (2026-09-19, Osa 48):
 *   - KODU = Outlet L2 (avatud-pakend / rikutud-pakend / …). Toode tagastatud/rikutud → tõstetakse
 *     OUTLETISSE (üks kodu). See on ESMANE seos.
 *   - KUVAMINE EDASI = valikuline. Kui outlet-tootel on sobiv tüüp (nt Wind Turbine →
 *     Tuulegeneraatorid), lisame LISA kategooria-seose → toode kuvatakse ka tüüp-lehel.
 *   - Ühekordne / tüübitu → jääb AINULT Outletisse (pole TYPE_DISPLAY-s).
 *
 * MIS TEHAKSE (additiivne — EI eemalda KUNAGI outlet-kodu):
 *   - Iga TYPE_DISPLAY kirje puhul: kui toode on outlet-L2-s, LISA (INSERT ON CONFLICT DO NOTHING)
 *     tüüp-kategooria seos. Kodu-seos jääb puutumata. Idempotent (teistkordne jooks ei tee midagi).
 *
 * SILT REISIB KAASA (storefront commit 7356032f): sildid tuletatakse product.categories union'ist →
 * kui toode on outlet-L2 + tüüp-kategoorias, mõlemal lehel näitab "Outlet toode" + L2-silt.
 *
 * PÄRAST JOOKSU: index-meilisearch.mjs (taxonomy.ancestors ehitatakse union'ina kõigist seostest →
 * toode ilmub mõlemale kategoorialehele). Struktuur EI muutu → Coolify redeploy pole vaja (CLAUDE.md deploy-nüanss).
 *
 * KASUTUS:
 *   node scripts/outlet-crossdisplay.mjs            # dry-run + diagnostika (read-only, EI lukusta)
 *   node scripts/outlet-crossdisplay.mjs --execute  # rakenda LISA-seosed (STACK-LUKK + Telegram)
 *
 * TURVA / HARD RULE'd:
 *   - DB: docker exec db-k33g psql (staging — port 5435 EI ole hostil avatud). Ei pg.Client localhost.
 *   - Outlet L2-d loetakse DB-st (v4-outlet lapsed) — MITTE fikseeritud nimekiri (ei aegu, CLAUDE.md gotcha).
 *   - --execute võtab STACK-LUKU (HARD RULE #9) enne kirjutust. XL_STACK_LOCK_HELD=1 → kutsuja hoiab juba
 *     (re-entrant kaugkutse, nt pipeline) → oma lukku EI võta (väldib PID-faili ummiku bash↔node).
 *   - --execute → Telegram fail-loud + kokkuvõte (HARD RULE #5).
 */

import { execSync } from "node:child_process"

const EXECUTE = process.argv.includes("--execute")

// Outlet L2 KODU-handle'id loetakse DB-st (v4-outlet lapsed) — SSoT, ei aegu.
const OUTLET_ROOT_HANDLE = "v4-outlet"

/**
 * VALIKULINE TÜÜP-KUVAMINE (reviewed, konservatiivne). match = kuidas toode tuvastada (title-regex või
 * sku); type_handle = tüüp-kategooria, kuhu LISA-kuvada. Tüübitud/ühekordsed EI ole siin (jäävad Outletisse).
 */
const TYPE_DISPLAY = [
  {
    label: "Wind Turbine → Tuulegeneraatorid",
    match: { title_re: /wind turbine|tuulegeneraator/i },
    type_handle:
      "v4-elektritarvikud-ja-valgustus-taastuvenergia-ja-generaatorid-tuulegeneraatorid",
  },
]

const getDB = () =>
  execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim()
let DB = getDB()
if (!DB) { console.error("🔴 db-k33g konteinerit ei leitud"); process.exit(2) }
const q = (sql) => {
  DB = getDB()
  return execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -F '|' -v ON_ERROR_STOP=1 -f -`,
    { input: sql, encoding: "utf8", maxBuffer: 1 << 30 }).trim()
}
const rows = (sql) => { const o = q(sql); return o ? o.split("\n").map((l) => l.split("|")) : [] }
const esc = (s) => String(s).replace(/'/g, "''")

async function main() {
  console.log("=== outlet-crossdisplay (Outlet=kodu + valikuline tüüp-kuvamine) ===")
  console.log(EXECUTE ? "MODE: EXECUTE" : "MODE: dry-run")

  // 1. Outlet L2 handle'id DB-st (v4-outlet lapsed) + nende id'd.
  const outletRows = rows(
    `SELECT c.handle, c.id FROM product_category c
     JOIN product_category p ON p.id = c.parent_category_id
     WHERE p.handle = '${OUTLET_ROOT_HANDLE}' AND c.deleted_at IS NULL ORDER BY c.handle`)
  const OUTLET_L2_HANDLES = outletRows.map((r) => r[0])
  const outletL2Ids = outletRows.map((r) => r[1])
  if (!outletL2Ids.length) { console.error(`🔴 ei leidnud ${OUTLET_ROOT_HANDLE} lapsi (outlet L2)`); process.exit(1) }
  console.log(`\nOutlet L2 (DB-st): ${OUTLET_L2_HANDLES.join(", ")}`)

  // 2. TYPE_DISPLAY tüüp-handle'ide id'd.
  const typeHandles = [...new Set(TYPE_DISPLAY.map((t) => t.type_handle))]
  const typeRows = rows(
    `SELECT handle, id FROM product_category WHERE handle IN (${typeHandles.map((h) => `'${esc(h)}'`).join(",")}) AND deleted_at IS NULL`)
  const idByHandle = new Map(typeRows.map((r) => [r[0], r[1]]))
  const missing = typeHandles.filter((h) => !idByHandle.has(h))
  if (missing.length) { console.error("🔴 PUUDU tüüp-kategooriad DB-s:", missing); process.exit(1) }

  // 3. Kõik tooted outlet-L2-des + nende praegused kategooria-handle'id.
  const idList = outletL2Ids.map((i) => `'${esc(i)}'`).join(",")
  const prodRows = rows(
    `SELECT p.id, left(replace(p.title, '|', ' '), 80), string_agg(DISTINCT pc2.handle, ',')
     FROM product_category_product pcp
     JOIN product p ON p.id = pcp.product_id AND p.deleted_at IS NULL
     JOIN product_category_product pcp2 ON pcp2.product_id = p.id
     JOIN product_category pc2 ON pc2.id = pcp2.product_category_id AND pc2.deleted_at IS NULL
     WHERE pcp.product_category_id IN (${idList})
     GROUP BY p.id, p.title ORDER BY p.title`)
  const products = prodRows.map((r) => ({ id: r[0], title: r[1], handles: (r[2] || "").split(",").filter(Boolean) }))
  console.log(`\nOutlet-toodete arv (L2-des): ${products.length}`)
  for (const p of products) {
    const homes = p.handles.filter((h) => OUTLET_L2_HANDLES.includes(h))
    const types = p.handles.filter((h) => !OUTLET_L2_HANDLES.includes(h))
    console.log(`  • ${p.title}`)
    console.log(`      kodu: ${homes.join(", ") || "(puudub!)"}`)
    console.log(`      muud seosed: ${types.length ? types.join(", ") : "(pole)"}`)
  }

  // 4. Rakenda TYPE_DISPLAY: LISA tüüp-seos igale sobivale outlet-tootele (additiivne).
  const outletIds = new Set(products.map((p) => p.id))
  const planned = []
  for (const rule of TYPE_DISPLAY) {
    const typeId = idByHandle.get(rule.type_handle)
    for (const p of products) {
      if (rule.match.title_re && !rule.match.title_re.test(p.title)) continue
      if (rule.match.sku && !String(p.title).includes(rule.match.sku)) continue
      planned.push({ product_id: p.id, title: p.title, typeId, type_handle: rule.type_handle, label: rule.label, already: p.handles.includes(rule.type_handle) })
    }
  }
  console.log(`\nPlaneeritud LISA tüüp-kuvamised: ${planned.length}`)
  for (const pl of planned) console.log(`  ${pl.already ? "○ (juba olemas)" : "+ LISA"} ${pl.title.slice(0, 55)} → ${pl.type_handle} [${pl.label}]`)

  const toAdd = planned.filter((pl) => !pl.already)
  // Sanity: iga sihitud toode PEAB olema outlet-L2-s (muidu pole outlet-toode → ei ristkuva).
  for (const pl of toAdd) {
    if (!outletIds.has(pl.product_id)) { console.error(`🔴 STOP: ${pl.title} pole outlet-L2-s — ei tohi ristkuvada.`); process.exit(1) }
  }

  if (!EXECUTE) { console.log(`\n🟡 dry-run — DB PUUTUMATA. Lisada oleks: ${toAdd.length}. Execute: node scripts/outlet-crossdisplay.mjs --execute`); return }

  if (toAdd.length === 0) { console.log("\nMidagi lisada pole (kõik juba olemas). Valmis (idempotent no-op)."); return }

  // EXECUTE: stack-lukk (HARD RULE #9) + transaktsioon + Telegram (HARD RULE #5).
  const { sendTelegram } = await import("./lib/spend-guard.mjs")
  const applyWrite = async () => {
    const values = toAdd.map((pl) => `('${esc(pl.product_id)}','${esc(pl.typeId)}')`).join(",")
    q(`BEGIN;
       INSERT INTO product_category_product (product_id, product_category_id)
       VALUES ${values} ON CONFLICT DO NOTHING;
       COMMIT;`)
    console.log(`\n🟢 COMMITTED: ${toAdd.length} LISA tüüp-kuvamise seost lisatud (kodud puutumata).`)
    console.log("JÄRGMINE: docker exec <medusa> node scripts/index-meilisearch.mjs (taxonomy.ancestors reindeks)")
  }

  try {
    if (process.env.XL_STACK_LOCK_HELD === "1") {
      console.log("  (XL_STACK_LOCK_HELD=1 → kutsuja hoiab stack-lukku, re-entrant)")
      await applyWrite()
    } else {
      const { withStackLock } = await import("./lib/stack-lock.mjs")
      await withStackLock({ holder: "outlet-crossdisplay", waitMs: 60000 }, applyWrite)
    }
    try { sendTelegram(`✅ XLM outlet-ristkuvamine: ${toAdd.length} outlet-toodet lisatud tüüp-kategooriasse (${[...new Set(toAdd.map((p) => p.label))].join("; ")}). Reindeks järgneb → nähtav mõlemal lehel, silt «Outlet toode» kaasas.`) } catch { /* telegram-viga ei kukuta tööd */ }
  } catch (e) {
    try { sendTelegram(`🔴 XLM outlet-ristkuvamine FAIL: ${String(e.message).slice(0, 180)}`) } catch { /* */ }
    console.error(`🔴 outlet-crossdisplay viga: ${e.message}`)
    process.exit(1)
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
