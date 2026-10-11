#!/usr/bin/env node
/**
 * test-outlet-l2-images.mjs — OUTLET L2-PILTIDE test (Tarmo directive B p3, 2026-10-12).
 *
 * NÕUE: iga concept_only outlet-kategooria (L1 + L2-d, millel pole oma toote-pilti) peab
 * CONCEPT_CATEGORY_IMAGES kaardi kaudu resolvima OLEMASOLEVAKS atmosphere-webp'iks, mis LÄBIB
 * heledus-värava (hele valge taust, serva-mediaan-luma ≥ IMG_BRIGHT_MIN) — muidu renderdub %-ikoon
 * (puuduv kaart) või tume pilt (kataloogi ei sobi).
 *
 * TÕE-ALLIKAS = DB (v4-outlet + lapsed), MITTE fikseeritud nimekiri (CLAUDE.md: väravad ilma fiks-arvuta).
 * HEADUS-LOOGIKA = brightCheckScript SSoT (scripts/lib/l3-gates.mjs) → SAMA lävi/loogika mis ETAPP2
 * klassifikaatori pildi-värav (HARD RULE #5 — üks transform, mitu kutsujat). Sharp on ainult storefront-
 * konteineris (host-il pole) → heledus mõõdetakse seal, nagu classify-etapp2-create.mjs.
 *
 * READ-ONLY (ei kirjuta DB-sse ega faile) → stack-lukku EI võta (HARD RULE #9).
 *
 * Käivita: node scripts/test-outlet-l2-images.mjs
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { brightCheckScript, IMG_BRIGHT_MIN } from "./lib/l3-gates.mjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const BANNERS_TS = `${ROOT}/storefront/lib/concept-banners.ts`
const ATMO_HOST_DIR = `${ROOT}/storefront/public/images/cat-atmosphere`
const ATMO_CONTAINER_DIR = "/app/public/images/cat-atmosphere"
const OUTLET_ROOT = "v4-outlet"

let pass = 0, fail = 0
const ok = (cond, msg) => { if (cond) { pass++ } else { fail++; console.log(`  ❌ ${msg}`) } }

const dbName = () =>
  execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim()
const sfName = () =>
  execSync("docker ps --format '{{.Names}}' | grep '^storefront-k33g' | head -1", { encoding: "utf8" }).trim()

const DB = dbName()
const SF = sfName()
if (!DB) { console.error("🔴 db-k33g konteinerit ei leitud"); process.exit(2) }
if (!SF) { console.error("🔴 storefront-k33g konteinerit ei leitud"); process.exit(2) }

const rows = (sql) => {
  const o = execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -F '|' -v ON_ERROR_STOP=1 -f -`,
    { input: sql, encoding: "utf8" }).trim()
  return o ? o.split("\n").map((l) => l.split("|")) : []
}

// 1. DB-st: outlet L1 + L2-d, mis EI oma toote-pilti (image_url puudub) → renderdavad kaardi kaudu.
const outletRows = rows(
  `SELECT c.handle, c.name, coalesce(c.metadata->>'image_url','') AS img
   FROM product_category c WHERE c.handle = '${OUTLET_ROOT}' AND c.deleted_at IS NULL
   UNION ALL
   SELECT c.handle, c.name, coalesce(c.metadata->>'image_url','')
   FROM product_category c JOIN product_category p ON p.id = c.parent_category_id
   WHERE p.handle = '${OUTLET_ROOT}' AND c.deleted_at IS NULL
   ORDER BY 1`)
ok(outletRows.length >= 1, `DB-st leiti outlet-kategooriaid (sai ${outletRows.length})`)

const conceptNodes = outletRows.filter((r) => !r[2]) // image_url puudub → vajab kaardi-pilti
console.log(`\nOutlet concept_only kategooriad (DB, pildita): ${conceptNodes.length}`)
for (const [h, name] of conceptNodes) console.log(`  • ${h}  (${name})`)

// 2. Parsi CONCEPT_CATEGORY_IMAGES kaart concept-banners.ts-st.
const banners = fs.readFileSync(BANNERS_TS, "utf8")
const MAP = {}
for (const m of banners.matchAll(/"(v4-outlet[\w-]*)"\s*:\s*"([^"]+)"/g)) MAP[m[1]] = m[2]

// 3. Iga concept-node → kaart olemas + fail olemas host-il.
console.log(`\n=== kaart + fail (host) ===`)
const needBright = new Set()
for (const [h] of conceptNodes) {
  const p = MAP[h]
  ok(!!p, `kaardis puudub concept_only outlet-kategooria "${h}" → renderdaks %-ikooni`)
  if (!p) continue
  const base = path.basename(p)
  const hostFile = path.join(ATMO_HOST_DIR, base)
  const exists = fs.existsSync(hostFile)
  ok(exists, `kaardi-pilt puudub kettalt: ${h} → ${p}`)
  console.log(`  ${exists ? "🟢" : "🔴"} ${h} → ${base}`)
  if (exists) needBright.add(base)
}

// 4. Heledus-värav (konteineris, brightCheckScript SSoT). base-name ilma .webp = "handle".
if (needBright.size) {
  console.log(`\n=== heledus-värav (storefront-konteiner, lävi ≥ ${IMG_BRIGHT_MIN}) ===`)
  const handles = [...needBright].map((b) => b.replace(/\.webp$/, ""))
  const script = brightCheckScript(handles, ATMO_CONTAINER_DIR)
  const tmp = `/tmp/outlet-bright-${process.pid}.cjs`
  fs.writeFileSync(tmp, script)
  execSync(`docker cp ${tmp} ${SF}:/app/outlet-bright.cjs`)
  const out = JSON.parse(execSync(`docker exec ${SF} node /app/outlet-bright.cjs`, { encoding: "utf8" }).trim())
  for (const b of out) {
    if (b.missing) { ok(false, `heledus: ${b.h}.webp puudub konteineris`); console.log(`  🔴 ${b.h}: PUUDU`); continue }
    const good = b.luma >= IMG_BRIGHT_MIN
    ok(good, `heledus-värav kukkus: ${b.h} luma=${b.luma} < ${IMG_BRIGHT_MIN} (tume → regen valge taust)`)
    console.log(`  ${good ? "🟢" : "🔴"} ${b.h}: luma=${b.luma}`)
  }
  try { fs.unlinkSync(tmp) } catch {}
  try { execSync(`docker exec ${SF} rm -f /app/outlet-bright.cjs 2>/dev/null`) } catch {}
}

console.log("")
if (fail === 0) { console.log(`🟢 kokku: ${pass} läbis, ${fail} kukkus`); process.exit(0) }
console.log(`🔴 kokku: ${pass} läbis, ${fail} kukkus`); process.exit(1)
