#!/usr/bin/env node
/**
 * pipeline-strip-titles.mjs — TITLE-STRIP samm [3.5] (HOST-run, k33g) + BACKFILL-runner.
 *
 * HARD RULE #5: ÜKS transform (scripts/lib/brand-strip.mjs), KAKS kutsujat:
 *   - HOOK [3.5] : --skus /tmp/pl-new-skus.txt   (öine DELTA, ~100 SKU — import-pipeline.sh)
 *   - BACKFILL   : --all                          (kogu korpus, ühekordne)
 * Sama funktsioon, eri sisend → backfill ja hook EI lahkne.
 *
 * ASUKOHT: peale [3] import-new (draft toore "VEVOR" title), ENNE [4] classify (loeb title'it).
 * BRÄND-TEADLIK: deriveBrandSlug SSoT (mitte VEVOR-hardcode) — per-toode metadata'st.
 * HANDLE EI MUUTU: UPDATE puudutab AINULT `title` (+ updated_at). Handle = eraldi veerg.
 * IDEMPOTENTNE: UPDATE ... WHERE p.title = old_title → topelt-strip võimatu.
 * ROLLBACK: jagatud backup-tabel `title_strip_backup_20260824` (backfill + hook, ON CONFLICT DO NOTHING).
 *
 * FAIL-LOUD:
 *   - SÜSTEEMNE (DB kättesaamatu, konteiner puudub, SQL-viga) → throw (exit != 0) → pipeline Telegram.
 *   - ÜKSIK title (E1: strip → tühi/liiga lühike) → SKIP + logi, EI peata (transform-tasandil).
 *
 * Kasutus:
 *   node scripts/pipeline-strip-titles.mjs --skus /tmp/pl-new-skus.txt --dry      # delta DRY (näita mõju)
 *   node scripts/pipeline-strip-titles.mjs --skus /tmp/pl-new-skus.txt --execute  # delta LIVE (hook)
 *   node scripts/pipeline-strip-titles.mjs --all --dry                            # backfill DRY
 *   node scripts/pipeline-strip-titles.mjs --all --execute                        # backfill LIVE
 *
 * Väljund (orchestraatorile): STRIPPED=<n> SKIPPED=<n> NOOP=<n> FAILED=<n>
 */

import { execFileSync } from "child_process"
import fs from "fs"
import { deriveBrandSlug, stripBrandPrefix } from "./lib/brand-strip.mjs"

// ── argumendid ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const has = (f) => argv.includes(f)
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : "" }
const EXECUTE = has("--execute")
const ALL = has("--all")
const SKUS_FILE = val("--skus")
const BACKUP_TABLE = "title_strip_backup_20260824"
const SAMPLES = parseInt(val("--samples") || "8", 10)

if (!ALL && !SKUS_FILE) { console.error("❌ vaja kas --all VÕI --skus <fail>"); process.exit(2) }

// ── DB-konteiner (dünaamiline — nimi muutub rebuild'il) ───────────────────────
const DB_NAME = process.env.DB_NAME || (() => {
  try {
    const names = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" }).split("\n")
    return names.find((n) => /^db-k33g/.test(n.trim()))?.trim() || ""
  } catch { return "" }
})()
if (!DB_NAME) { console.error("❌ db-k33g konteinerit ei leitud (docker ps) — SÜSTEEMNE"); process.exit(1) }

// psql: SQL stdin-ist (-f -), tulem tab-vaba (-tA). Dollar-quoting katab title-eritähed.
function psql(sql, { capture = true } = {}) {
  try {
    const out = execFileSync(
      "docker", ["exec", "-i", DB_NAME, "psql", "-U", "xlmarket", "-d", "xlmarket", "-tA", "-v", "ON_ERROR_STOP=1", "-f", "-"],
      { input: sql, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
    )
    return capture ? out : ""
  } catch (e) {
    const msg = String(e.stderr || e.message || e)
    throw new Error(`psql nurjus (SÜSTEEMNE): ${msg.slice(0, 300)}`)
  }
}

console.log(`=== TITLE-STRIP [3.5] (${EXECUTE ? "EXECUTE" : "DRY-RUN"}) · ${ALL ? "BACKFILL --all" : "DELTA --skus"} ===`)
console.log(`  db=${DB_NAME}`)

// ── sihtread: --skus (delta, join variant.sku) VÕI --all (kogu korpus) ────────
let selectSql
if (ALL) {
  selectSql =
    `SELECT row_to_json(t) FROM (
       SELECT p.id, p.title,
              p.metadata->>'source' AS source, p.metadata->>'supplier_sku' AS supplier_sku,
              p.metadata->>'vevor_sku' AS vevor_sku, p.metadata->>'vevor_product_type' AS vevor_product_type,
              p.metadata->>'vevor_upc' AS vevor_upc
       FROM product p WHERE p.deleted_at IS NULL
     ) t;`
} else {
  if (!fs.existsSync(SKUS_FILE)) { console.error(`❌ --skus fail puudub: ${SKUS_FILE}`); process.exit(1) }
  const skus = fs.readFileSync(SKUS_FILE, "utf8").split("\n").map((s) => s.trim()).filter(Boolean)
  console.log(`  delta: ${skus.length} SKU nimekirjas (${SKUS_FILE})`)
  if (skus.length === 0) { console.log("  0 SKU deltas → strip vahele\nSTRIPPED=0\nSKIPPED=0\nNOOP=0\nFAILED=0"); process.exit(0) }
  const jsonArr = JSON.stringify(skus)
  selectSql =
    `SELECT row_to_json(t) FROM (
       SELECT DISTINCT p.id, p.title,
              p.metadata->>'source' AS source, p.metadata->>'supplier_sku' AS supplier_sku,
              p.metadata->>'vevor_sku' AS vevor_sku, p.metadata->>'vevor_product_type' AS vevor_product_type,
              p.metadata->>'vevor_upc' AS vevor_upc
       FROM product p
       JOIN product_variant v ON v.product_id = p.id AND v.deleted_at IS NULL
       JOIN (SELECT jsonb_array_elements_text($JSON$${jsonArr}$JSON$::jsonb) AS sku) s ON s.sku = v.sku
       WHERE p.deleted_at IS NULL
     ) t;`
}

const rowsRaw = psql(selectSql)
const rows = rowsRaw.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l))
console.log(`  sihtread DB-st: ${rows.length}`)

// ── rakenda transform (puhas JS) — bränd per-toode metadata'st ────────────────
const changed = []   // { id, old, new, brand }
const skipped = []   // { id, title, brand, reason }  (E1-tüüp)
let noop = 0
for (const r of rows) {
  const meta = {
    source: r.source, supplier_sku: r.supplier_sku,
    vevor_sku: r.vevor_sku, vevor_product_type: r.vevor_product_type, vevor_upc: r.vevor_upc,
  }
  const brand = deriveBrandSlug(meta)
  const res = stripBrandPrefix(r.title, brand)
  if (res.changed) changed.push({ id: r.id, old: r.title, new: res.newTitle, brand: brand || "?" })
  else if (res.skip) skipped.push({ id: r.id, title: r.title, brand: brand || "?", reason: res.reason })
  else noop++
}

// ── näita mõju (DRY + EXECUTE mõlemad — before→after) ─────────────────────────
console.log(`  STRIP teeks: ${changed.length} · SKIP (E1): ${skipped.length} · muutmata (no-op): ${noop}`)
if (changed.length) {
  console.log(`  — näidised (enne → pärast, handle muutumatu):`)
  for (const c of changed.slice(0, SAMPLES)) {
    console.log(`     [${c.brand}] "${c.old.slice(0, 55)}"  →  "${c.new.slice(0, 55)}"`)
  }
}
if (skipped.length) {
  console.log(`  — SKIP (strip teeks katkise → käsitsi-parandus, reports/title-parandus-nimekiri.md):`)
  for (const s of skipped.slice(0, SAMPLES)) console.log(`     ⏭  [${s.brand}] ${s.id} "${s.title.slice(0, 50)}" (${s.reason})`)
}

let failed = 0
if (!EXECUTE) {
  console.log(`  [DRY] EI kirjuta. (--execute rakendaks ${changed.length} stripi)`)
} else if (changed.length === 0) {
  console.log(`  0 stripitavat → kirjutust pole (steady-state / juba puhas)`)
} else {
  // ── kirjuta: 1 transaktsioon, dollar-quoted JSON (title-escape kindel), jagatud backup + idempotent UPDATE ──
  const payload = JSON.stringify(changed.map((c) => ({ id: c.id, old: c.old, new: c.new })))
  const writeSql =
    `BEGIN;
     CREATE TABLE IF NOT EXISTS ${BACKUP_TABLE} (
       product_id text PRIMARY KEY, old_title text NOT NULL, new_title text NOT NULL, stripped_at timestamptz DEFAULT now()
     );
     INSERT INTO ${BACKUP_TABLE} (product_id, old_title, new_title)
       SELECT id, old, new FROM jsonb_to_recordset($JSON$${payload}$JSON$::jsonb) AS d(id text, old text, new text)
       ON CONFLICT (product_id) DO NOTHING;
     WITH upd AS (
       UPDATE product p SET title = d.new, updated_at = now()
       FROM jsonb_to_recordset($JSON$${payload}$JSON$::jsonb) AS d(id text, old text, new text)
       WHERE p.id = d.id AND p.title = d.old
       RETURNING p.id
     )
     SELECT 'STRIP_APPLIED=' || count(*)::text FROM upd;
     COMMIT;`
  let appliedRaw
  try {
    appliedRaw = psql(writeSql)
  } catch (e) {
    // SÜSTEEMNE (transaktsioon rullub tagasi) → fail-loud, pipeline peatub.
    console.error(`❌ ${e.message}`)
    process.exit(1)
  }
  const applied = parseInt((appliedRaw.match(/STRIP_APPLIED=(\d+)/) || [])[1] || "0", 10)
  console.log(`  ✅ kirjutatud: ${applied} title strippitud (backup: ${BACKUP_TABLE})`)
  // Üksik-fail = need read, mis ei matchinud (title juba muutunud vahepeal = idempotent no-op, EI viga).
  failed = changed.length - applied
  if (failed > 0) console.log(`  ⚠️ ${failed} rida ei matchinud (title vahepeal muutunud / idempotent) — skip, EI peata`)
}

// ── masin-loetav väljund orchestraatorile ────────────────────────────────────
console.log(`STRIPPED=${EXECUTE ? changed.length - failed : 0}`)
console.log(`SKIPPED=${skipped.length}`)
console.log(`NOOP=${noop}`)
console.log(`FAILED=${failed}`)
