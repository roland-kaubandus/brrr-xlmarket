// create-l3.mjs — KANOONILINE L3-loomine: teeb KÕIK sammud atomaarselt ühes transaktsioonis:
//   (1) valideeri ema-L2 (olemas, depth=2) · (2) arvuta mpath ema-st · (3) unikaalsus (id, handle)
//   (4) INSERT product_category · (5) INSERT taxonomy_node_meta level=3 · (6) post-kontroll.
// JUUR: ad-hoc migrate-SQL (new5-l3-956-migrate.sql) jättis meta-rea lisamata → vaikiv auk
//   (meta-põhised tööriistad jätsid tooted vahele). See skript = ainus õige tee → auk ei kordu.
//   Jõustus-paar: INV-META-01 (inv-taxonomy.mjs) püüab käsitsi-augud, kui keegi mööda hiilib.
//
// ⚠️ TOODETE PAIGUTUS = ERALDI samm (apply-skript). L3 luuakse TÜHJALT → INV-STRUCT-01 loeb
//   tühja L3 FAIL-iks kuni tooted lisatud. Loo L3 → lisa tooted → alles siis inv-check.
//
// Käsk: node scripts/create-l3.mjs --defs <fail.json> [--dry]
//   defs = JSON-massiiv: [{id,name,description,handle,parent_id,rank?}]
import { execSync } from "node:child_process"
import fs from "node:fs"

const argv = process.argv
const defsFile = argv[argv.indexOf("--defs") + 1]
const DRY = argv.includes("--dry")
if (argv.indexOf("--defs") < 0 || !defsFile || !fs.existsSync(defsFile)) { console.error("--defs <fail.json> puudub/vigane"); process.exit(1) }
const defs = JSON.parse(fs.readFileSync(defsFile, "utf8"))
if (!Array.isArray(defs) || !defs.length) { console.error("defs peab olema mitte-tühi massiiv"); process.exit(1) }

const getDB = () => execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim()
const DB = getDB()
if (!DB) { console.error("db-k33g konteinerit ei leitud"); process.exit(2) }
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -F '|' -f -`, { input: sql, encoding: "utf8" }).trim()
const dq = (s) => `$DEF$${String(s).replace(/\$DEF\$/g, "")}$DEF$`   // dollar-quote (kirjeldus võib sisaldada koma/→/sulge)

// --- VALIDEERI kõik defs ENNE ühtki kirjutust ---
const errors = [], rows = []
for (const d of defs) {
  const { id, name, description, handle, parent_id } = d
  const rank = d.rank ?? 0
  if (!id || !name || !handle || !parent_id) { errors.push(`${id || "?"}: puuduv väli (id/name/handle/parent_id)`); continue }
  // ema-L2
  const p = q(`SELECT COALESCE(mpath,'')||'|'||(char_length(COALESCE(mpath,''))-char_length(replace(COALESCE(mpath,''),'.',''))) FROM product_category WHERE id='${parent_id}' AND deleted_at IS NULL;`)
  if (!p) { errors.push(`${id}: ema-L2 '${parent_id}' puudub`); continue }
  const [pmpath, pdotsStr] = p.split("|"); const pdepth = Number(pdotsStr) + 1
  if (pdepth !== 2) { errors.push(`${id}: ema '${parent_id}' pole L2 (depth=${pdepth}) — L3 ema PEAB olema L2`); continue }
  const mpath = `${pmpath}.${id}`
  // unikaalsus
  if (q(`SELECT 1 FROM product_category WHERE id='${id}';`)) { errors.push(`${id}: id juba olemas`); continue }
  const hdup = q(`SELECT id FROM product_category WHERE handle='${handle}' AND deleted_at IS NULL;`)
  if (hdup) { errors.push(`${id}: handle '${handle}' juba kasutusel (${hdup})`); continue }
  rows.push({ id, name, description: description || "", handle, mpath, rank, parent_id })
}
if (errors.length) { console.error("VALIDATSIOON FAIL:\n  " + errors.join("\n  ")); process.exit(1) }
console.log(`✓ Valideeritud ${rows.length} L3 (kõik ema-L2 OK, mpath arvutatud, id+handle unikaalsed)${DRY ? " [DRY]" : ""}`)
for (const r of rows) console.log(`   ${r.id}  «${r.name}»  mpath=${r.mpath}  rank=${r.rank}`)
if (DRY) { console.log("[DRY] EI kirjutatud."); process.exit(0) }

// --- ATOMAARNE KIRJUTUS: kategooria + meta ühes transaktsioonis ---
const sql = ["BEGIN;"]
for (const r of rows) {
  sql.push(`INSERT INTO product_category (id,name,description,handle,mpath,is_active,is_internal,rank,parent_category_id,created_at,updated_at)
    VALUES (${dq(r.id)},${dq(r.name)},${dq(r.description)},${dq(r.handle)},${dq(r.mpath)},true,false,${Number(r.rank)},${dq(r.parent_id)},now(),now());`)
  sql.push(`INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
    VALUES (${dq(r.id)},3,'active','manual',true,0,now(),now());`)
}
sql.push("COMMIT;")
try { execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -v ON_ERROR_STOP=1 -q -f -`, { input: sql.join("\n") }) }
catch (e) { console.error("KIRJUTUS FAIL (transaktsioon rollback'itud): " + String(e.stderr || e.message).slice(0, 300)); process.exit(1) }

// --- POST-KONTROLL: iga L3 omab kategooria + meta level=3, mpath õige ---
let ok = 0, bad = 0
for (const r of rows) {
  const chk = q(`SELECT
    (SELECT count(*) FROM product_category WHERE id='${r.id}' AND mpath='${r.mpath}' AND deleted_at IS NULL)||'|'||
    (SELECT count(*) FROM taxonomy_node_meta WHERE node_id='${r.id}' AND level=3);`)
  const [cat, meta] = chk.split("|")
  if (cat === "1" && meta === "1") { ok++ } else { bad++; console.error(`  🔴 ${r.id}: cat=${cat} meta=${meta} (oodatud 1|1)`) }
}
console.log(`\n✅ Loodud ${ok}/${rows.length} L3 (kategooria + meta atomaarselt).${bad ? ` 🔴 ${bad} POST-KONTROLL FAIL!` : ""}`)
console.log(`⚠️  JÄRGMINE SAMM: lisa tooted (apply-skript) — L3 on praegu TÜHI (INV-STRUCT-01 FAIL kuni täidetud).`)
process.exit(bad ? 1 : 0)
