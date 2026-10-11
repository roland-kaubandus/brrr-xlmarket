#!/usr/bin/env node
/**
 * outlet-crossdisplay.mjs — Outlet = KODU (esmane), tüüp-kategooria = LISA-kuvamine (PRESERVATION-mudel).
 *
 * Tarmo lõplik loogika (2026-10-12, directive B p2 — KÄSITSI TYPE_DISPLAY ALLOWLIST EEMALDATUD):
 *   - KODU = Outlet L2 (avatud-pakend / rikutud-pakend / …). Tagastatud/rikutud toode tõstetakse
 *     OUTLETISSE (admin, Medusa). See on ESMANE seos.
 *   - TÜÜP = LISA-kuvamine: Outletisse tõstmisel SÄILITATAKSE toote tüüp-kategooria seos (Medusa tooted
 *     saavad olla MITMES kategoorias). Toode jääb KA oma tüüp-L3-s → storefront ristkuvab union'ist
 *     (getOutletBadges, commit 7356032f) → nähtav mõlemal lehel, silt «Outlet toode» kaasas.
 *   - SEE TÖÖTAB IGA TÜÜBIGA AUTOMAATSELT, ilma käsitsi lubaloendita (vana TYPE_DISPLAY per-tüüp = eemaldatud,
 *     hard rule #6: masin töötab ise, mitte inimese hoitav nimekiri).
 *
 * MIS SKRIPT TEEB (turvavõrk olemasolevatele — hard rule #5 hook):
 *   - Skännib KÕIK outlet-tooted. Jaotab: TYPED (on ≥1 tüüp-kategoorias → juba ristkuvatud, EI vaja midagi)
 *     vs UNTYPED (AINULT outlet-kodus, tüüp-link puudub/eemaldatud → anomaalia).
 *   - UNTYPED = turvavõrgu sihtmärk. OHUTU VAIKIMISI (hard rule #6): toode jääb Outletis NÄHTAVAKS (müügil,
 *     otsitav). Skript EI OLETA tüüpi (vale oletus → vale tüüp-lehel = halvem kui ristkuvamata). Selle asemel
 *     SIGNAALIB (Telegram + raport) toote id/title → nähtavus, et tüüp-link taastada (admin lisab tüüp-kategooria
 *     tagasi VÕI klassifikaator tuletab). Vaikne kadu EI juhtu.
 *
 * READ-ONLY: PRESERVATION-mudelis typed-tooted on JUBA mõlemas kategoorias (admin hoidis tüüp-lingi) → skriptil
 *   POLE midagi INSERT'ida. Seega skript on read-only (ei kirjuta DB-sse) → HARD RULE #9 järgi EI võta stack-lukku
 *   ja EI saa deadlock'ida. --execute = saada Telegram-signaal untyped-anomaaliate kohta; dry = ainult raport.
 *
 * TURVA / HARD RULE'd:
 *   - DB: docker exec db-k33g psql (staging — port 5435 EI ole hostil avatud, read-only SELECT).
 *   - Outlet L2-d loetakse DB-st (v4-outlet lapsed) — MITTE fikseeritud nimekiri (ei aegu, CLAUDE.md gotcha).
 *   - --execute → Telegram fail-loud kui untyped-anomaalia leitud (hard rule #5).
 *
 * KASUTUS:
 *   node scripts/outlet-crossdisplay.mjs            # raport (typed vs untyped), read-only
 *   node scripts/outlet-crossdisplay.mjs --execute  # + Telegram-signaal untyped-anomaaliatest
 */

import { execSync } from "node:child_process"

const EXECUTE = process.argv.includes("--execute")

// Outlet L2 KODU-handle'id loetakse DB-st (v4-outlet lapsed) — SSoT, ei aegu.
const OUTLET_ROOT_HANDLE = "v4-outlet"

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
  console.log("=== outlet-crossdisplay (Outlet=kodu + tüüp-lisakuvamine, PRESERVATION-mudel) ===")
  console.log(EXECUTE ? "MODE: EXECUTE (read-only skänn + Telegram-signaal)" : "MODE: dry-run (ainult raport)")

  // 1. Outlet L2 handle'id + id'd DB-st (v4-outlet lapsed).
  const outletRows = rows(
    `SELECT c.handle, c.id FROM product_category c
     JOIN product_category p ON p.id = c.parent_category_id
     WHERE p.handle = '${OUTLET_ROOT_HANDLE}' AND c.deleted_at IS NULL ORDER BY c.handle`)
  const OUTLET_L2_HANDLES = outletRows.map((r) => r[0])
  const outletL2Ids = outletRows.map((r) => r[1])
  if (!outletL2Ids.length) { console.error(`🔴 ei leidnud ${OUTLET_ROOT_HANDLE} lapsi (outlet L2)`); process.exit(1) }
  console.log(`\nOutlet L2 (DB-st): ${OUTLET_L2_HANDLES.join(", ")}`)

  // 2. Kõik outlet-tooted + nende praegused kategooria-handle'id.
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
  console.log(`\nOutlet-toodete arv: ${products.length}`)

  // 3. Jaota TYPED (ristkuvatud) vs UNTYPED (ainult outlet-kodus → anomaalia).
  const typed = []
  const untyped = []
  for (const p of products) {
    const homes = p.handles.filter((h) => OUTLET_L2_HANDLES.includes(h))
    const types = p.handles.filter((h) => !OUTLET_L2_HANDLES.includes(h))
    const rec = { ...p, homes, types }
    if (types.length) typed.push(rec); else untyped.push(rec)
  }

  console.log(`\n✅ TYPED (juba ristkuvatud — tüüp-link säilinud, nähtav mõlemal lehel): ${typed.length}`)
  for (const p of typed) console.log(`  • ${p.title}\n      kodu: ${p.homes.join(", ")}  |  tüüp: ${p.types.join(", ")}`)

  console.log(`\n⚠️  UNTYPED (AINULT outlet-kodus — tüüp-link puudub, ristkuvamata): ${untyped.length}`)
  for (const p of untyped) console.log(`  • ${p.title}  [${p.id}]\n      kodu: ${p.homes.join(", ") || "(puudub!)"}`)

  if (!untyped.length) {
    console.log("\n🟢 Kõik outlet-tooted on tüübiga → ristkuvamine automaatne (preservation töötab). Midagi teha pole.")
    return
  }

  // 4. UNTYPED anomaalia — OHUTU VAIKIMISI (hard rule #6): jäta Outletisse nähtavaks, EI oleta tüüpi. SIGNAALI.
  const msg = [
    `⚠️ XLM outlet-ristkuvamine: ${untyped.length} outlet-toodet ILMA tüüp-kategooriata (ristkuvamata, aga Outletis NÄHTAV).`,
    `Preservation-mudel: outlet-tõstmisel peab tüüp-link säilima (toode jääb KA oma tüüp-L3-s → ristkuvab automaatselt).`,
    `Taasta tüüp-link (admin lisab tüüp-kategooria tagasi) või lase klassifikaatoril tuletada. Tooted:`,
    ...untyped.slice(0, 15).map((p) => `• ${p.title} [${p.id}]`),
    untyped.length > 15 ? `…ja veel ${untyped.length - 15}` : "",
  ].filter(Boolean).join("\n")

  if (!EXECUTE) {
    console.log(`\n🟡 dry-run — signaali EI saadeta. Execute (+Telegram): node scripts/outlet-crossdisplay.mjs --execute`)
    return
  }

  try {
    const { sendTelegram } = await import("./lib/spend-guard.mjs")
    sendTelegram(msg)
    console.log(`\n📨 Telegram-signaal saadetud (${untyped.length} untyped-anomaalia).`)
  } catch (e) {
    console.error(`🔴 Telegram-signaal ebaõnnestus: ${e.message}`)
    process.exit(1)   // fail-loud: anomaalia leiti, aga signaal ei läinud → hook raporteerib HOIATUSE
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
