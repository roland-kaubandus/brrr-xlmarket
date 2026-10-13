#!/usr/bin/env node
/**
 * en-pack-undo.mjs — pööra tagasi EN-paketi backfill-partii (HARD RULE #6: iga auto-tegu = undo).
 *
 * Loeb reports/en-pack-batches/<batch_id>.json (ledger.prev) ja taastab IGA puudutatud node'i:
 *   • taxonomy_node_translation (locale='en'): prev==null → DELETE; muidu UPDATE name=prev.
 *   • taxonomy_node_seo: prev==null → DELETE; muidu UPSERT prev-väärtustega (+ prev source_batch).
 *
 * Stack-lukk (DB-write, HARD RULE #9), transaktsioon. --dry = näita, ära kirjuta.
 *
 * Käsk: node scripts/en-pack-undo.mjs <batch_id> [--dry]
 *       node scripts/en-pack-undo.mjs --file reports/en-pack-batches/<id>.json [--dry]
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { acquireStackLock } from "./lib/stack-lock.mjs";

const REPO = "/opt/xlmarket-github";
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const fileArg = argv[argv.indexOf("--file") + 1];
const batchId = argv.find(a => !a.startsWith("--") && a !== fileArg);
const ledgerFile = (argv.includes("--file") && fileArg) ? fileArg : `${REPO}/reports/en-pack-batches/${batchId}.json`;
if (!fs.existsSync(ledgerFile)) { console.error(`🔴 ledger puudub: ${ledgerFile}`); process.exit(1); }
const L = JSON.parse(fs.readFileSync(ledgerFile, "utf8"));
const prev = L.prev || {};
const handles = Object.keys(prev);
console.log(`🧯 EN-UNDO batch=${L.batch_id} · ${handles.length} node'i${DRY ? " [DRY]" : ""}`);
if (!handles.length) { console.log("midagi tagasi pöörata (prev tühi — DRY-jooks?)"); process.exit(0); }

const DB = execSync("docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1", { encoding: "utf8" }).trim();
const sq = (s) => `'${String(s ?? "").replace(/'/g, "''")}'`;
const sqN = (s) => s == null ? "NULL" : sq(s);

const stmts = [];
let delTr = 0, updTr = 0, delSeo = 0, restSeo = 0;
for (const h of handles) {
  const p = prev[h];
  const id = p.node_id;
  if (p.tr == null) { stmts.push(`DELETE FROM taxonomy_node_translation WHERE node_id=${sq(id)} AND locale='en';`); delTr++; }
  else { stmts.push(`UPDATE taxonomy_node_translation SET name=${sq(p.tr)}, updated_at=NOW() WHERE node_id=${sq(id)} AND locale='en';`); updTr++; }
  if (p.seo == null) { stmts.push(`DELETE FROM taxonomy_node_seo WHERE node_id=${sq(id)};`); delSeo++; }
  else {
    stmts.push(`INSERT INTO taxonomy_node_seo (node_id, description_et, description_en, tagline_et, tagline_en, source_batch) VALUES (${sq(id)}, ${sqN(p.seo.description_et)}, ${sqN(p.seo.description_en)}, ${sqN(p.seo.tagline_et)}, ${sqN(p.seo.tagline_en)}, ${sqN(p.seo.source_batch)}) ON CONFLICT (node_id) DO UPDATE SET description_et=EXCLUDED.description_et, description_en=EXCLUDED.description_en, tagline_et=EXCLUDED.tagline_et, tagline_en=EXCLUDED.tagline_en, source_batch=EXCLUDED.source_batch, updated_at=NOW();`);
    restSeo++;
  }
}
console.log(`  translation: ${delTr} DELETE · ${updTr} taasta | seo: ${delSeo} DELETE · ${restSeo} taasta`);
if (DRY) { console.log("[DRY] ei kirjuta. Esimesed laused:\n" + stmts.slice(0, 4).join("\n")); process.exit(0); }

const release = acquireStackLock({ holder: "en-pack-undo", waitMs: Number(process.env.XL_DBWRITE_WAIT_MS) || 60_000 });
try {
  execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -v ON_ERROR_STOP=1 --single-transaction`,
    { input: stmts.join("\n"), stdio: ["pipe", "inherit", "inherit"] });
  console.log(`✅ UNDO valmis (${stmts.length} lauset). NB: jooksuta genyM + gen-category-tree + deploy, et nav taastuks.`);
} finally { release(); }
