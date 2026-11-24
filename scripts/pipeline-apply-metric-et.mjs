#!/usr/bin/env node
/**
 * pipeline-apply-metric-et.mjs — IMPERIAAL→MEETRILINE ET samm (HOST-run, k33g) + BACKFILL-runner.
 *
 * HARD RULE #5: ÜKS transform (scripts/lib/metric-et.mjs), KAKS kutsujat:
 *   - HOOK   : --skus /tmp/pl-new-skus.txt   (öine DELTA, uued tooted — import-pipeline.sh)
 *   - BACKFILL: --all                         (kogu avaldatud korpus, ühekordne)
 * Sama funktsioon, eri sisend → backfill ja hook EI lahkne.
 *
 * ULATUS (Tarmo GO 2026-11-24): title_et + description_et + metadata.specs (spetsid AINULT kus meetriline puudub).
 * KUJU: "<meetriline> <ühik> (<imperiaal>)"; koma-kümnend; imperiaal-token korrastatud (8FT→8 ft).
 * ERANDID: rehvid/veljed · telerid/ekraanid · toru-/keermemõõdud · jalgrattad/velotrenažöörid · foto/etiketi-mõõdud
 *          → kogu toode SKIP (excProduct), fail-closed.
 * VÄRAVAD (fail-closed, rida vahele): imperiaal-vahemik · metricOffenders (tagasiarvutus) · srcConflictGate.
 *
 * SSoT = LIVE DB (mitte snapshot). Loeb title_et/description_et/specs + kategooria-nimed (excProduct)
 *        iga toote kohta otse DB-st → arvutab transformi → kirjutab ainult kus muutus.
 * HANDLE EI MUUTU: UPDATE puudutab AINULT metadata-välju (jsonb_set) + updated_at.
 * IDEMPOTENTNE: UPDATE ... WHERE vana-väärtus-match → topelt-teisendus võimatu.
 * ROLLBACK: jagatud backup-tabel `metric_et_backup` (väli-veeruga) + ajatempliga undo-JSON.
 *
 * FAIL-LOUD:
 *   - SÜSTEEMNE (DB kättesaamatu, konteiner puudub, SQL-viga) → throw (exit != 0) → pipeline Telegram.
 *   - ÜKSIK väli (värav kinni) → SKIP + logi, EI peata (transform-tasandil, fail-closed).
 *
 * Kasutus:
 *   node scripts/pipeline-apply-metric-et.mjs --all --dry                     # backfill DRY (näita mõju)
 *   node scripts/pipeline-apply-metric-et.mjs --all --execute                 # backfill LIVE
 *   node scripts/pipeline-apply-metric-et.mjs --skus /tmp/pl-new-skus.txt --dry
 *   node scripts/pipeline-apply-metric-et.mjs --skus /tmp/pl-new-skus.txt --execute   # hook
 *   [--fields title_et,description_et,specs]  # vaikimisi kõik kolm
 *
 * Väljund (orchestraatorile): APPLIED=<n> GATE_SKIP=<n> EXC_SKIP=<n> NOOP=<n> FAILED=<n>
 */

import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"
import { transformField, transformSpecs, excProduct, etSource } from "./lib/metric-et.mjs"

// ── argumendid ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const has = (f) => argv.includes(f)
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : "" }
const EXECUTE = has("--execute")
const ALL = has("--all")
const SKUS_FILE = val("--skus")
const SAMPLES = parseInt(val("--samples") || "10", 10)
const FORCE_WINDOW = has("--force-window")
const EMIT = val("--emit")  // kirjuta audit-ühilduv JSON (nagu metric-et-dry.mjs) — LIVE-väljundi auditiks
const FIELDS = (val("--fields") || "title_et,description_et,specs").split(",").map((s) => s.trim()).filter(Boolean)
const WANT = new Set(FIELDS)
for (const f of FIELDS) if (!["title_et", "description_et", "specs"].includes(f)) { console.error(`❌ tundmatu väli '${f}'`); process.exit(2) }

if (!ALL && !SKUS_FILE) { console.error("❌ vaja kas --all VÕI --skus <fail>"); process.exit(2) }

// ── vaikne aken 02:45–04:30 EET: DB-write keelatud (restic/varundus) ──────────
function inQuietWindow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Tallinn", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date())
  const h = parseInt(parts.find((p) => p.type === "hour").value, 10)
  const m = parseInt(parts.find((p) => p.type === "minute").value, 10)
  const mins = h * 60 + m
  return mins >= (2 * 60 + 45) && mins <= (4 * 60 + 30) // 02:45–04:30
}

// HARD RULE #9: DB-write → stack-lukk (re-entrant). DRY EI lukusta.
import { acquireStackLock } from "./lib/stack-lock.mjs"
if (EXECUTE) {
  if (inQuietWindow() && !FORCE_WINDOW) {
    console.error("🕑 vaikne aken 02:45–04:30 EET — DB-write keelatud (restic). Oota aknast väljas (või --force-window).")
    process.exit(1)
  }
  try { acquireStackLock({ holder: "pipeline-apply-metric-et", waitMs: Number(process.env.XL_DBWRITE_WAIT_MS) || 60_000 }) }
  catch (e) { console.error(`🔒 stack-lukk (deploy käib?): ${e.message}`); process.exit(1) }
}

// ── DB-konteiner (dünaamiline — nimi muutub rebuild'il) ───────────────────────
const DB_NAME = process.env.DB_NAME || (() => {
  try {
    const names = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" }).split("\n")
    return names.find((n) => /^db-k33g/.test(n.trim()))?.trim() || ""
  } catch { return "" }
})()
if (!DB_NAME) { console.error("❌ db-k33g konteinerit ei leitud (docker ps) — SÜSTEEMNE"); process.exit(1) }

function psql(sql, { capture = true } = {}) {
  try {
    const out = execFileSync(
      "docker", ["exec", "-i", DB_NAME, "psql", "-U", "xlmarket", "-d", "xlmarket", "-tA", "-v", "ON_ERROR_STOP=1", "-f", "-"],
      { input: sql, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 },
    )
    return capture ? out : ""
  } catch (e) {
    const msg = String(e.stderr || e.message || e)
    throw new Error(`psql nurjus (SÜSTEEMNE): ${msg.slice(0, 300)}`)
  }
}

console.log(`=== IMPERIAAL→MEETRILINE ET (${EXECUTE ? "EXECUTE" : "DRY-RUN"}) · ${ALL ? "BACKFILL --all" : "DELTA --skus"} · väljad=${FIELDS.join(",")} ===`)
console.log(`  db=${DB_NAME}`)

// ── sihtread: title_et/description_et/specs + kategooria-nimed (excProduct) ────
// Ainult avaldatud (published) tooted — nagu dry-snapshot (19714).
const CAT_AGG =
  `COALESCE((SELECT array_agg(pc.name)
     FROM product_category_product pcp
     JOIN product_category pc ON pc.id = pcp.product_category_id AND pc.deleted_at IS NULL
     WHERE pcp.product_id = p.id), ARRAY[]::text[])`
const BASE_COLS =
  `p.id, p.handle,
   p.metadata->>'title_et' AS title_et,
   p.metadata->>'description_et' AS description_et,
   p.metadata->'specs' AS specs,
   ${CAT_AGG} AS cats`

let selectSql
if (ALL) {
  selectSql =
    `SELECT row_to_json(t) FROM (
       SELECT ${BASE_COLS}
       FROM product p
       WHERE p.deleted_at IS NULL AND p.status = 'published'
     ) t;`
} else {
  if (!fs.existsSync(SKUS_FILE)) { console.error(`❌ --skus fail puudub: ${SKUS_FILE}`); process.exit(1) }
  const skus = fs.readFileSync(SKUS_FILE, "utf8").split("\n").map((s) => s.trim()).filter(Boolean)
  console.log(`  delta: ${skus.length} SKU nimekirjas (${SKUS_FILE})`)
  if (skus.length === 0) { console.log("  0 SKU deltas → vahele\nAPPLIED=0\nGATE_SKIP=0\nEXC_SKIP=0\nNOOP=0\nFAILED=0"); process.exit(0) }
  const jsonArr = JSON.stringify(skus)
  selectSql =
    `SELECT row_to_json(t) FROM (
       SELECT DISTINCT ${BASE_COLS}
       FROM product p
       JOIN product_variant v ON v.product_id = p.id AND v.deleted_at IS NULL
       JOIN (SELECT jsonb_array_elements_text($JSON$${jsonArr}$JSON$::jsonb) AS sku) s ON s.sku = v.sku
       WHERE p.deleted_at IS NULL
     ) t;`
}

const rowsRaw = psql(selectSql)
const rows = rowsRaw.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l))
console.log(`  sihtread DB-st: ${rows.length}`)

// ── rakenda transform (puhas JS) ─────────────────────────────────────────────
// changed[field] = [{ id, handle, old, new }]
const changed = { title_et: [], description_et: [], specs: [] }
const stat = {
  title_et: { gate: 0, noop: 0 }, description_et: { gate: 0, noop: 0 },
  specs: { gate: 0 }, exc: 0,
}
let excSkip = 0
const gateSamples = []
const samples = []
const emitRecords = []

for (const r of rows) {
  const specs = r.specs && typeof r.specs === "object" ? r.specs : null
  const prod = { title_et: r.title_et || "", description_et: r.description_et || "", cats: r.cats || [], specs }
  const exc = excProduct(prod)
  if (exc) { stat.exc++; excSkip++; continue } // erand: kogu toode puutumata (fail-closed)
  const source = etSource(prod)

  let tChanged = null, dChanged = null, sTouched = []
  if (WANT.has("title_et") && prod.title_et) {
    const rt = transformField(prod.title_et, { source, isException: null })
    if (rt.skip) { stat.title_et.gate++; if (gateSamples.length < SAMPLES) gateSamples.push({ handle: r.handle, field: "title_et", off: rt.offenders, txt: prod.title_et }) }
    else if (rt.changed) {
      changed.title_et.push({ id: r.id, handle: r.handle, old: prod.title_et, new: rt.out })
      tChanged = rt.out
      if (samples.length < SAMPLES) samples.push({ field: "title_et", before: prod.title_et, after: rt.out })
    }
  }
  if (WANT.has("description_et") && prod.description_et) {
    const rd = transformField(prod.description_et, { source, isException: null })
    if (rd.skip) stat.description_et.gate++
    else if (rd.changed) { changed.description_et.push({ id: r.id, handle: r.handle, old: prod.description_et, new: rd.out }); dChanged = rd.out }
  }
  if (WANT.has("specs") && specs && Object.keys(specs).length) {
    const rs = transformSpecs(specs, { source, isException: null })
    if (rs.skipped?.length) stat.specs.gate += rs.skipped.length
    if (rs.changed) { changed.specs.push({ id: r.id, handle: r.handle, old: JSON.stringify(specs), new: JSON.stringify(rs.specs) }); sTouched = rs.touched || [] }
  }

  if (EMIT && (tChanged || dChanged || sTouched.length)) {
    emitRecords.push({
      handle: r.handle,
      title_before: tChanged ? prod.title_et : null, title_after: tChanged,
      desc_before: dChanged ? prod.description_et : null, desc_after: dChanged,
      specs_touched: sTouched,
      source_excerpt: source.slice(0, 400),
    })
  }
}

if (EMIT) {
  fs.writeFileSync(EMIT, JSON.stringify({ created: new Date().toISOString(), total: rows.length, changed: emitRecords.length, records: emitRecords }, null, 2))
  console.error(`[emit] ${emitRecords.length} muudetud kirjet → ${EMIT}`)
}

const totalChanged = changed.title_et.length + changed.description_et.length + changed.specs.length
const totalGate = stat.title_et.gate + stat.description_et.gate + stat.specs.gate
console.log(`  MUUDETAV: title_et=${changed.title_et.length} · description_et=${changed.description_et.length} · specs(tooteid)=${changed.specs.length}`)
console.log(`  SKIP: erand-tooteid=${stat.exc} · värav(title+desc+spec)=${totalGate} (fail-closed, EI kirjuta)`)
if (samples.length) {
  console.log(`  — näidised (enne → pärast):`)
  for (const s of samples.slice(0, SAMPLES)) console.log(`     [${s.field}] "${s.before.slice(0, 60)}"  →  "${s.after.slice(0, 60)}"`)
}
if (gateSamples.length) {
  console.log(`  — värava-skip näidised (fail-closed):`)
  for (const g of gateSamples) console.log(`     ⚠ [${g.field}] ${g.txt.slice(0, 55)} :: ${(g.off || []).join("; ")}`)
}

// ── väli → kirjutus-konfiguratsioon ───────────────────────────────────────────
const FIELD_W = {
  title_et:       { setExpr: "metadata = jsonb_set(p.metadata, '{title_et}', to_jsonb(d.new), true)",       whereMatch: "p.metadata->>'title_et' = d.old" },
  description_et: { setExpr: "metadata = jsonb_set(p.metadata, '{description_et}', to_jsonb(d.new), true)", whereMatch: "p.metadata->>'description_et' = d.old" },
  specs:          { setExpr: "metadata = jsonb_set(p.metadata, '{specs}', d.new::jsonb, true)",             whereMatch: "p.metadata->'specs' = d.old::jsonb" },
}
const BACKUP_TABLE = "metric_et_backup"

let applied = 0, failed = 0
if (!EXECUTE) {
  console.log(`  [DRY] EI kirjuta. (--execute rakendaks ${totalChanged} välja-muudatust)`)
} else if (totalChanged === 0) {
  console.log(`  0 muudetavat → kirjutust pole (steady-state / juba teisendatud)`)
} else {
  // undo-JSON (ajatempliga) — kõik vanad väärtused (iga välja kohta), ENNE kirjutust
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const undoPath = path.join("/opt/xlmarket-github/reports", `metric-et-undo-${ts}.json`)
  const undoRecords = []
  for (const f of ["title_et", "description_et", "specs"]) {
    for (const c of changed[f]) undoRecords.push({ id: c.id, handle: c.handle, field: f, old: c.old, new: c.new })
  }
  fs.writeFileSync(undoPath, JSON.stringify({ created: new Date().toISOString(), db: DB_NAME, count: undoRecords.length, records: undoRecords }, null, 2))
  console.log(`  undo → ${undoPath} (${undoRecords.length} kirjet)`)

  // backup-tabel: jagatud, väli-veeruga (title_et/description_et/specs), ON CONFLICT DO NOTHING
  // specs-i old/new on JSON-string (text), title/desc on text — hoitakse text-ina.
  let totalApplied = 0
  for (const f of ["title_et", "description_et", "specs"]) {
    if (!WANT.has(f) || changed[f].length === 0) continue
    const conf = FIELD_W[f]
    const payload = JSON.stringify(changed[f].map((c) => ({ id: c.id, old: c.old, new: c.new })))
    const writeSql =
      `BEGIN;
       CREATE TABLE IF NOT EXISTS ${BACKUP_TABLE} (
         product_id text NOT NULL, field text NOT NULL, old_val text NOT NULL, new_val text NOT NULL,
         applied_at timestamptz DEFAULT now(), PRIMARY KEY (product_id, field)
       );
       INSERT INTO ${BACKUP_TABLE} (product_id, field, old_val, new_val)
         SELECT id, '${f}', old, new FROM jsonb_to_recordset($JSON$${payload}$JSON$::jsonb) AS d(id text, old text, new text)
         ON CONFLICT (product_id, field) DO NOTHING;
       WITH upd AS (
         UPDATE product p SET ${conf.setExpr}, updated_at = now()
         FROM jsonb_to_recordset($JSON$${payload}$JSON$::jsonb) AS d(id text, old text, new text)
         WHERE p.id = d.id AND ${conf.whereMatch}
         RETURNING p.id
       )
       SELECT 'APPLIED=' || count(*)::text FROM upd;
       COMMIT;`
    let raw
    try { raw = psql(writeSql) }
    catch (e) { console.error(`❌ [${f}] ${e.message}`); process.exit(1) }
    const n = parseInt((raw.match(/APPLIED=(\d+)/) || [])[1] || "0", 10)
    const miss = changed[f].length - n
    totalApplied += n
    failed += miss
    console.log(`  ✅ [${f}] kirjutatud: ${n}${miss ? ` (⚠ ${miss} ei matchinud — vahepeal muutunud/idempotent)` : ""}`)
  }
  applied = totalApplied
  console.log(`  ✅ KOKKU kirjutatud: ${applied} (backup: ${BACKUP_TABLE})`)
}

// ── masin-loetav väljund orchestraatorile ────────────────────────────────────
console.log(`APPLIED=${EXECUTE ? applied : 0}`)
console.log(`GATE_SKIP=${totalGate}`)
console.log(`EXC_SKIP=${excSkip}`)
console.log(`NOOP=0`)
console.log(`FAILED=${failed}`)
