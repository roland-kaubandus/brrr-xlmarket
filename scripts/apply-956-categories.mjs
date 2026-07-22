#!/usr/bin/env node
// apply-956-categories.mjs — 956-backlogi AINUS kategooria-paigutaja (A-etapp, Tarmo 2026-07-22).
// TÄIELIK OVERRIDE: importer jooksis --defer-categories (tooted kategooriata). SEE skript on
// ainus kirjutaja product_category_product'i → üks kirjutus toote kohta (ei topeltkirjutust).
//
// Sisend: Opus 956-klassifikatsioon (row.l3) + käsitsi verifitseeritud override-kaart (override[sku].target).
//   Siht toote kohta = override[primary_sku].target || row.l3. Grupi-teadlik (SPU: primary + variant SKU-d).
// Jooksuta HOSTIL scripts/-kaustast (node_modules: pg). DATABASE_URL /tmp/xl-import.env-ist.
//
// Kasutus:
//   set -a; . /tmp/xl-import.env; set +a
//   node scripts/apply-956-categories.mjs --results <results.json> --override <override.json> --valid <valid-l3-ids.txt> [--execute]
// Ilma --execute = dry-run (plaan + jaotus, EI kirjuta).

import fs from "fs";
import pg from "pg";

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const EXECUTE = args.includes("--execute");
const RESULTS = arg("--results");
const OVERRIDE = arg("--override");
const VALID = arg("--valid");
if (!RESULTS || !OVERRIDE || !VALID) { console.error("Vaja: --results --override --valid"); process.exit(1); }

// 5 uut L3, mille new5-l3-956-migrate.sql lisab (peavad kehtivate hulgas olema)
const NEW_L3 = ["pcat_12fish_kahv", "pcat_12fish_pyynis", "pcat_22shelf_alus", "pcat_22cab_leke", "pcat_t3l2_9_sds"];

const rows = JSON.parse(fs.readFileSync(RESULTS, "utf8"));
const override = JSON.parse(fs.readFileSync(OVERRIDE, "utf8"));
const validL3 = new Set([...fs.readFileSync(VALID, "utf8").split(/\r?\n/).filter(Boolean), ...NEW_L3]);

// SKU → siht-kategooria
const skuTarget = {};
let badTarget = 0;
for (const r of rows) {
  const t = override[r.sku]?.target || r.l3;
  if (!t || !validL3.has(t)) { console.error(`  ⚠️ KEHTETU SIHT sku=${r.sku} target=${t} title=${(r.title||"").slice(0,50)}`); badTarget++; continue; }
  skuTarget[r.sku] = t;
}
console.log(`SKU→siht kaart: ${Object.keys(skuTarget).length} kehtivat, ${badTarget} kehtetut (peab 0 olema).`);
if (badTarget > 0) { console.error("KEHTETU SIHT → katkesta (paranda override/results)."); process.exit(1); }

const client = new pg.Client(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {
  host: process.env.PGHOST, port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.PGDATABASE,
});

const mostCommon = (a) => { const c = {}; let best = null, bn = 0; for (const x of a) { c[x] = (c[x] || 0) + 1; if (c[x] > bn) { bn = c[x]; best = x; } } return best; };

async function main() {
  await client.connect();

  // Kontroll: kas 5 uut L3 on DB-s olemas (migratsioon peab enne jooksma)
  const chk = await client.query(`SELECT id FROM product_category WHERE id = ANY($1)`, [NEW_L3]);
  const have = new Set(chk.rows.map(r => r.id));
  const missing = NEW_L3.filter(x => !have.has(x));
  if (missing.length) { console.error(`❌ Uued L3 puuduvad DB-st (jooksuta new5-l3-956-migrate.sql ENNE): ${missing.join(", ")}`); process.exit(1); }
  console.log(`✓ 5 uut L3 olemas DB-s.`);

  // Kategooriata VEVOR-tooted (= äsja imporditud --defer-categories'ga)
  const q = await client.query(`
    SELECT p.id, p.metadata
    FROM product p
    LEFT JOIN product_category_product pcp ON pcp.product_id = p.id
    WHERE p.external_id LIKE 'vevor:%' AND p.deleted_at IS NULL AND pcp.product_id IS NULL`);
  console.log(`Kategooriata VEVOR-tooteid (imporditud): ${q.rows.length}`);

  const assign = [];       // [product_id, category_id]
  const conflicts = [];    // variant-SKU-d ei nõustu
  const noMatch = [];      // ükski SKU pole kaardis
  const dist = {};

  for (const p of q.rows) {
    const m = p.metadata || {};
    const skus = [...new Set([m.vevor_sku, ...(Array.isArray(m.variant_skus) ? m.variant_skus : [])].filter(Boolean))];
    const targets = skus.map(s => skuTarget[s]).filter(Boolean);
    const distinct = [...new Set(targets)];
    let chosen = skuTarget[m.vevor_sku] || (targets.length ? mostCommon(targets) : null);
    if (!chosen) { noMatch.push({ id: p.id, sku: m.vevor_sku }); continue; }
    if (distinct.length > 1) conflicts.push({ id: p.id, primary: m.vevor_sku, distinct, chosen });
    assign.push([p.id, chosen]);
    dist[chosen] = (dist[chosen] || 0) + 1;
  }

  console.log(`\nPaigutatavaid tooteid: ${assign.length}`);
  console.log(`Konflikte (variant-SKU-d lahknevad, valisin primary/enamus): ${conflicts.length}`);
  console.log(`Ilma kaardita (ükski SKU ei matchi — UURI): ${noMatch.length}`);
  for (const n of noMatch.slice(0, 20)) console.log(`   noMatch product=${n.id} sku=${n.sku}`);
  for (const c of conflicts.slice(0, 20)) console.log(`   konflikt product=${c.id} primary=${c.primary} distinct=${c.distinct.join("/")} → ${c.chosen}`);

  console.log(`\nJaotus siht-kategooria kaupa (top 30):`);
  const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  for (const [cat, n] of sorted.slice(0, 30)) console.log(`   ${String(n).padStart(4)}  ${cat}${NEW_L3.includes(cat) ? "  (UUS L3)" : ""}`);
  console.log(`   distinct sihte: ${sorted.length}`);
  for (const nl of NEW_L3) console.log(`   UUS L3 ${nl}: ${dist[nl] || 0} toodet${(dist[nl] || 0) === 0 ? "  ⚠️ TÜHI → INV-STRUCT-01 FAIL" : ""}`);

  if (!EXECUTE) { console.log(`\n[DRY-RUN] --execute puudub, EI kirjutatud. ${assign.length} rida valmis.`); await client.end(); return; }

  // AINUS KIRJUTUS: batch INSERT product_category_product
  await client.query("BEGIN");
  let written = 0;
  const CH = 500;
  for (let i = 0; i < assign.length; i += CH) {
    const batch = assign.slice(i, i + CH);
    const vals = batch.map((_, j) => `($${j * 2 + 1}, $${j * 2 + 2})`).join(",");
    const flat = batch.flat();
    const res = await client.query(
      `INSERT INTO product_category_product (product_id, product_category_id) VALUES ${vals} ON CONFLICT DO NOTHING`, flat);
    written += res.rowCount;
  }
  await client.query("COMMIT");
  console.log(`\n✅ KIRJUTATUD: ${written} pcp-rida (${assign.length} kavandatust; erinevus = ON CONFLICT dedup).`);
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
